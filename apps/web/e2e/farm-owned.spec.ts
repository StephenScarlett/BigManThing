import {test,expect} from "@playwright/test";
import {WORLDS} from "@bmt/shared";
import {A,B,session,makeFarm,backend,ready,open,walk} from "./farm-fixture";
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
