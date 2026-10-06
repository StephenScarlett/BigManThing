import { test, expect, type Page, type Route } from "@playwright/test";
import { DEFAULT_APPEARANCE, WORLDS, terrainTiles, type FarmState } from "@bmt/shared";

const A="20000000-0000-4000-8000-000000000101",B="20000000-0000-4000-8000-000000000102";
const user=(id:string)=>({id,aud:"authenticated",role:"authenticated",is_anonymous:true,app_metadata:{provider:"anonymous",providers:["anonymous"]},user_metadata:{},created_at:new Date().toISOString()});
function session(id:string) {
  const now=Math.floor(Date.now()/1000),enc=(v:unknown)=>Buffer.from(JSON.stringify(v)).toString("base64url");
  return {access_token:`${enc({alg:"HS256",typ:"JWT"})}.${enc({sub:id,role:"authenticated",aud:"authenticated",iat:now,exp:now+3600})}.test-signature`,refresh_token:"test-refresh",expires_in:3600,expires_at:now+3600,token_type:"bearer",user:user(id)};
}
function makeFarm(owner:string,nickname="My lime"):FarmState {
  const worlds=structuredClone(WORLDS);for(const w of Object.values(worlds))w.terrain=terrainTiles(w);
  return {owner_id:owner,world_version:1,worlds,appearance:{...DEFAULT_APPEARANCE},nickname,character_revision:1,position:{scene:"farm",actor:{...WORLDS.farm.spawn}},position_revision:1,position_recovered:false,starter_grant:{key:"farm-starter-v1",created_at:new Date().toISOString()},inventory:[{item_id:"watering-can-basic",label:"Watering can",kind:"tool",quantity:1},{item_id:"fishing-rod-basic",label:"Fishing rod",kind:"tool",quantity:1},{item_id:"mystery-seed-basic",label:"Mystery seed",kind:"seed",quantity:6}]};
}
async function backend(page:Page,existing=false) {
  const farms=new Map<string,FarmState>(),receipts=new Map<string,{body:string;ack:unknown}>(),calls:{name:string;args:Record<string,any>}[]=[];
  if(existing)farms.set(A,makeFarm(A));
  const control={farms,calls,dropPosition:false,dropCharacter:false,failLoad:false,holdCharacter:null as null|Promise<void>};
  await page.addInitScript(data=>localStorage.setItem("sb-127-auth-token",JSON.stringify(data)),session(A));
  const headers={"access-control-allow-origin":"*","access-control-allow-headers":"authorization,apikey,content-type,x-client-info","content-type":"application/json"};
  await page.route("http://127.0.0.1:9/**",async(route:Route)=>{
    const req=route.request(),url=new URL(req.url());
    const respond=(data:unknown,status=200)=>route.fulfill({status,headers,body:JSON.stringify(data)});
    if(req.method()==="OPTIONS"){await respond(null);return;}
    let owner=A;try{owner=JSON.parse(Buffer.from((req.headers().authorization??"").split(".")[1]??"","base64url").toString()).sub??A;}catch{/* auth fixture */}
    if(url.pathname==="/auth/v1/user"){await respond(user(owner));return;}
    if(url.pathname.includes("/profiles")){await respond({id:owner,username:owner===A?"Player_A":"Player_B",avatar_url:null,is_admin:false});return;}
    const name=url.pathname.split("/").at(-1)!;
    if(!name.startsWith("bmt_farm_")){await respond(null);return;}
    const args=req.postDataJSON();calls.push({name,args});
    const error=(message:string,status=400)=>respond({code:"P0001",message,details:null,hint:null},status);
    if(args.p_owner!==owner){await error("owner_changed");return;}
    if(name==="bmt_farm_context") {
      if(control.failLoad){await error("unavailable",503);return;}
      await respond(farms.get(owner)??null);return;
    }
    if(name==="bmt_farm_create") {
      if(!farms.has(owner)){const f=makeFarm(owner,args.p_nickname);f.appearance=args.p_appearance;farms.set(owner,f);}
      await respond(farms.get(owner));return;
    }
    const f=farms.get(owner);if(!f){await error("farm_required");return;}
    const receiptKey=`${owner}:${args.p_request}`,body=JSON.stringify(args),prior=receipts.get(receiptKey);
    if(prior){if(prior.body!==body)await error("request_payload_changed");else await respond(prior.ack);return;}
    let ack:unknown;
    if(name==="bmt_farm_save_character") {
      if(args.p_revision!==f.character_revision){await error("character_changed_reload");return;}
      f.appearance=structuredClone(args.p_appearance);f.nickname=args.p_nickname.trim();f.character_revision++;
      ack={appearance:f.appearance,nickname:f.nickname,character_revision:f.character_revision};
      receipts.set(receiptKey,{body,ack:structuredClone(ack)});
      if(control.holdCharacter)await control.holdCharacter;
      if(control.dropCharacter){control.dropCharacter=false;await route.abort();return;}
    } else {
      if(args.p_revision!==f.position_revision){await error("position_changed_reload");return;}
      f.position=structuredClone(args.p_position);f.position_revision++;
      ack={position:f.position,position_revision:f.position_revision,world_version:f.world_version};
      receipts.set(receiptKey,{body,ack:structuredClone(ack)});
      if(control.dropPosition){control.dropPosition=false;await route.abort();return;}
    }
    await respond(ack);
  });
  return control;
}
async function open(page:Page){await page.goto("/farm");}
async function ready(page:Page){await expect(page.getByRole("button",{name:"Character",exact:true})).toBeEnabled();await expect(page.locator(".farm-viewport canvas")).toHaveCount(1);}
async function walk(page:Page){await page.getByTestId("farm-world").focus();await page.keyboard.down("d");await page.waitForTimeout(250);await page.keyboard.up("d");}

test("create an owned farm, save all character fields and restore the house checkpoint after reload",async({page},info)=>{
  const b=await backend(page);await open(page);
  await page.getByRole("button",{name:"Create my farm",exact:true}).click();await ready(page);
  await page.getByRole("button",{name:"Character",exact:true}).click();
  await page.getByLabel("Character name",{exact:true}).fill("Farmer Kai");
  for(const [label,value] of [["Body build","broad"],["Hairstyle","curls"],["Eye shape","sharp"],["Top","overshirt"],["Bottoms","shorts"],["Hat","cap"]])await page.getByRole("combobox",{name:label!,exact:true}).selectOption(value!);
  for(const slot of ["skin","shirt","eyes","pants","shoes","hat"])await page.getByRole("button",{name:`${slot} colour 2`,exact:true}).click();
  await page.getByRole("button",{name:"Save character",exact:true}).click();await expect(page.getByRole("dialog").getByText("Character saved.",{exact:true})).toBeVisible();
  await page.keyboard.press("Escape");await page.getByTestId("farm-world").focus();await page.keyboard.press("e");
  await expect(page.getByTestId("farm-location")).toContainText("Your house");await walk(page);
  await expect(page.getByTestId("farm-save-status")).toHaveText("Saved");
  const position=await page.getByTestId("farm-position").getAttribute("data-x");
  const before=structuredClone(b.farms.get(A)!);await page.reload();await ready(page);
  await expect(page.getByTestId("farm-location")).toContainText("Your house");await expect(page.getByTestId("farm-position")).toHaveAttribute("data-x",position!);
  await page.getByRole("button",{name:"Character",exact:true}).click();await expect(page.getByLabel("Character name",{exact:true})).toHaveValue("Farmer Kai");
  for(const [label,value] of [["Body build","broad"],["Hairstyle","curls"],["Eye shape","sharp"],["Top","overshirt"],["Bottoms","shorts"],["Hat","cap"]])await expect(page.getByRole("combobox",{name:label!,exact:true})).toHaveValue(value!);
  await page.keyboard.press("Escape");await page.getByRole("button",{name:"Bag",exact:true}).click();await expect(page.getByRole("dialog")).toContainText("Mystery seed × 6");
  await page.keyboard.press("Escape");await page.screenshot({path:info.outputPath("saved-farm.png"),fullPage:true});
  expect(b.farms.get(A)?.appearance).toEqual(before.appearance);expect(b.calls.filter(c=>c.name==="bmt_farm_create")).toHaveLength(1);
});

test("lost character and position responses retry the same request without duplicate saves or grants",async({page})=>{
  const b=await backend(page,true);await open(page);await ready(page);
  b.dropCharacter=true;await page.getByRole("button",{name:"Character",exact:true}).click();await page.getByLabel("Character name",{exact:true}).fill("Retry Farmer");
  await page.getByRole("button",{name:"Save character",exact:true}).click();await expect(page.getByRole("dialog").getByRole("alert")).toBeVisible();
  await page.getByRole("button",{name:"Save character",exact:true}).click();await expect(page.getByRole("dialog").getByText("Character saved.",{exact:true})).toBeVisible();await page.keyboard.press("Escape");
  b.dropPosition=true;await walk(page);await expect(page.getByTestId("farm-save-status")).toContainText("Position not saved");
  await page.getByRole("button",{name:"Save now",exact:true}).click();await expect(page.getByTestId("farm-save-status")).toHaveText("Saved");
  for(const name of ["bmt_farm_save_character","bmt_farm_save_position"]){const calls=b.calls.filter(c=>c.name===name);expect(calls).toHaveLength(2);expect(calls[0]!.args).toEqual(calls[1]!.args);}
  expect(b.farms.get(A)?.character_revision).toBe(2);expect(b.farms.get(A)?.position_revision).toBe(2);expect(b.farms.get(A)?.inventory.find(i=>i.kind==="seed")?.quantity).toBe(6);
});

test("another tab's checkpoint pauses this farm until the saved state is loaded",async({page})=>{
  const b=await backend(page,true);await open(page);await ready(page);
  const f=b.farms.get(A)!;f.position={scene:"house",actor:{...WORLDS.house.spawn}};f.position_revision++;
  await walk(page);await expect(page.getByRole("alert")).toContainText("another tab");await expect(page.getByTestId("farm-position")).toHaveAttribute("data-paused","true");
  await page.getByRole("button",{name:"Load saved farm",exact:true}).click();await ready(page);await expect(page.getByTestId("farm-location")).toContainText("Your house");
  await expect(page.getByTestId("farm-position")).toHaveAttribute("data-paused","false");expect(b.farms.get(A)?.position_revision).toBe(2);
});

test("an account change discards the first owner's draft and ignores their delayed save response",async({page})=>{
  const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
  const b=await backend(page,true);b.farms.set(B,makeFarm(B,"Second Farmer"));await open(page);await ready(page);
  let release!:()=>void;b.holdCharacter=new Promise<void>(r=>release=r);
  await page.getByRole("button",{name:"Character",exact:true}).click();await page.getByLabel("Character name",{exact:true}).fill("First owner's draft");await page.getByRole("button",{name:"Save character",exact:true}).click();
  await expect.poll(()=>b.calls.filter(c=>c.name==="bmt_farm_save_character").length).toBe(1);
  await page.evaluate(async(data)=>{const modulePath="/src/lib/supabase.ts";const {supabase}=await import(/* @vite-ignore */ modulePath);await supabase.auth.setSession({access_token:data.access_token,refresh_token:data.refresh_token});},session(B));
  await ready(page);await expect(page.getByRole("heading",{level:1})).toContainText("Second Farmer");release();await page.waitForTimeout(250);
  await page.getByRole("button",{name:"Character",exact:true}).click();await expect(page.getByLabel("Character name",{exact:true})).toHaveValue("Second Farmer");
  expect(b.calls.filter(c=>c.name==="bmt_farm_save_character").every(c=>c.args.p_owner===A)).toBe(true);expect(b.farms.get(B)?.character_revision).toBe(1);expect(errors).toEqual([]);
});

test("loading failures do not create a farm; retry recovers and starter kit remains once",async({page})=>{
  const b=await backend(page);b.failLoad=true;await open(page);await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByRole("button",{name:"Create my farm",exact:true})).toBeDisabled();expect(b.calls.some(c=>c.name==="bmt_farm_create")).toBe(false);
  b.failLoad=false;await page.getByRole("button",{name:"Retry loading",exact:true}).click();await expect(page.getByRole("button",{name:"Create my farm",exact:true})).toBeEnabled();
  await page.getByRole("button",{name:"Create my farm",exact:true}).click();await ready(page);await page.getByRole("button",{name:"Load saved farm",exact:true}).click();await ready(page);
  expect(b.farms.get(A)?.inventory.find(i=>i.kind==="seed")?.quantity).toBe(6);expect(b.calls.filter(c=>c.name==="bmt_farm_create")).toHaveLength(1);
});

test("disabled guest signup shows a recoverable error without creating farm state",async({page})=>{
  const errors:string[]=[],farmCalls:string[]=[];
  page.on("pageerror",error=>errors.push(error.message));
  await page.route("http://127.0.0.1:9/**",async route=>{
    const req=route.request(),path=new URL(req.url()).pathname;
    const headers={"access-control-allow-origin":"*","access-control-allow-headers":"authorization,apikey,content-type,x-client-info","content-type":"application/json"};
    if(req.method()==="OPTIONS"){await route.fulfill({status:200,headers,body:"null"});return;}
    if(path.includes("bmt_farm_"))farmCalls.push(path);
    if(path==="/auth/v1/signup")await route.fulfill({status:400,headers,body:JSON.stringify({code:"anonymous_provider_disabled",message:"Anonymous sign-ins are disabled"})});
    else await route.abort();
  });
  await open(page);
  await page.getByRole("button",{name:"Play as Guest",exact:true}).click();
  await expect(page.getByRole("alert")).toContainText("Continue with Google or email");
  await expect(page.getByRole("button",{name:"Play as Guest",exact:true})).toBeEnabled();
  await expect(page.getByRole("button",{name:"Continue with Google",exact:true})).toBeEnabled();
  await page.getByRole("button",{name:"Sign in with Email",exact:true}).click();
  await expect(page.getByRole("button",{name:"Send Magic Link",exact:true})).toBeEnabled();
  expect(farmCalls).toEqual([]);expect(errors).toEqual([]);
});
