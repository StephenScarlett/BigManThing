import {expect,type Page,type Route} from "@playwright/test";
import {DEFAULT_APPEARANCE,WORLDS,terrainTiles,CROP_PILOT_CATALOG,type FarmState,type FarmCropState} from "@bmt/shared";
export const A="20000000-0000-4000-8000-000000000101";export const B="20000000-0000-4000-8000-000000000102";
const user=(id:string)=>({id,aud:"authenticated",role:"authenticated",is_anonymous:true,app_metadata:{provider:"anonymous",providers:["anonymous"]},user_metadata:{},created_at:new Date().toISOString()});
export function session(id:string) {
  const now=Math.floor(Date.now()/1000),enc=(v:unknown)=>Buffer.from(JSON.stringify(v)).toString("base64url");
  return {access_token:`${enc({alg:"HS256",typ:"JWT"})}.${enc({sub:id,role:"authenticated",aud:"authenticated",iat:now,exp:now+3600})}.test-signature`,refresh_token:"test-refresh",expires_in:3600,expires_at:now+3600,token_type:"bearer",user:user(id)};
}
export function makeFarm(owner:string,nickname="My lime"):FarmState {
  const worlds=structuredClone(WORLDS);for(const w of Object.values(worlds))w.terrain=terrainTiles(w);
  return {owner_id:owner,world_version:1,worlds,appearance:{...DEFAULT_APPEARANCE},nickname,character_revision:1,position:{scene:"farm",actor:{...WORLDS.farm.spawn}},position_revision:1,position_recovered:false,starter_grant:{key:"farm-starter-v1",created_at:new Date().toISOString()},inventory:[{item_id:"watering-can-basic",label:"Watering can",kind:"tool",quantity:1},{item_id:"fishing-rod-basic",label:"Fishing rod",kind:"tool",quantity:1},{item_id:"mystery-seed-basic",label:"Mystery seed",kind:"seed",quantity:6}]};
}
export async function backend(page:Page,existing=false) {
  const farms=new Map<string,FarmState>(),receipts=new Map<string,{body:string;ack:unknown}>(),calls:{name:string;args:Record<string,any>}[]=[];
  if(existing)farms.set(A,makeFarm(A));
  const cropStates=new Map<string,FarmCropState>();
  const control={farms,calls,cropStates,dropCrop:false,failCrops:false,holdCrop:null as null|Promise<void>,dropPosition:false,dropCharacter:false,failLoad:false,holdCharacter:null as null|Promise<void>};
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
    if(name==="bmt_farm_crops_context" || name==="bmt_farm_crop_action") {
      if(!cropStates.has(owner))cropStates.set(owner,{owner_id:owner,rules_version:1,revision:1,server_now:new Date().toISOString(),business_date:"2026-10-08",coins:90,seed_quantity:6,watering_can:true,restock_claimed:false,seed_price:10,growth_seconds:86400,catalog:structuredClone(CROP_PILOT_CATALOG),plots:f.worlds.farm.props.filter(p=>p.kind==="plot").map(p=>({plot_id:p.id,crop:null})),goods:[]});
      const s=cropStates.get(owner)!;s.server_now=new Date().toISOString();
      for(const p of s.plots)if(p.crop?.ready_at && Date.parse(p.crop.ready_at)<=Date.now()){p.crop.stage="ready";p.crop.reveal=structuredClone(CROP_PILOT_CATALOG[0]!);}
      if(name==="bmt_farm_crops_context"){if(control.failCrops)await error("unavailable",503);else await respond(s);return;}
      const key=`crop:${owner}:${args.p_request}`,body=JSON.stringify(args),prior=receipts.get(key);
      if(prior){if(prior.body!==body)await error("request_payload_changed");else await respond({state:s,receipt:prior.ack});return;}
      if(args.p_revision!==s.revision){await error("crops_changed_reload");return;}
      const a=args.p_action;let message="Action confirmed",extra:Record<string,unknown>={};
      if(a.kind==="plant"){
        const p=s.plots.find(p=>p.plot_id===a.plot_id)!;if(p.crop || s.seed_quantity<1){await error("plot_occupied");return;}
        s.seed_quantity--;p.crop={id:crypto.randomUUID(),stage:"planted",planted_at:s.server_now,watered_at:null,ready_at:null,reveal:null};message="Mystery seed planted. Water it to start growing.";extra={plot_id:p.plot_id,crop_id:p.crop.id};
      }else if(a.kind==="water" || a.kind==="harvest"){
        const p=s.plots.find(p=>p.crop?.id===a.crop_id),c=p?.crop;if(!p || !c){await error("crop_gone");return;}extra={plot_id:p.plot_id,crop_id:c.id};
        if(a.kind==="water"){if(c.watered_at){await error("already_watered");return;}c.watered_at=s.server_now;c.ready_at=new Date(Date.now()+86400000).toISOString();c.stage="growing";message="Watered. This crop grows while you are away.";}
        else{if(c.stage!=="ready"){await error("crop_not_ready");return;}const def=c.reveal!,g=s.goods.find(g=>g.item_id===def.item_id && g.location==="bag");if(g)g.quantity++;else s.goods.push({...def,location:"bag",quantity:1});p.crop=null;extra.item_id=def.item_id;message="Tomato harvested and kept in your bag.";}
      }else if(a.kind==="buy"){
        if(s.coins<a.quantity*10){await error("not_enough_coins");return;}s.coins-=a.quantity*10;s.seed_quantity+=a.quantity;message="Seeds bought.";
      }else if(a.kind==="restock"){
        if(s.restock_claimed){await error("restock_already_claimed");return;}s.seed_quantity+=2;s.restock_claimed=true;message="Two free mystery seeds added for today.";
      }else{
        const source=a.kind==="withdraw"?"chest":"bag",target=a.kind==="store"?"chest":"bag";
        const g=s.goods.find(g=>g.item_id===a.item_id && g.location===source);
        if(!g || g.quantity<a.quantity){await error("not_enough_produce");return;}
        if(a.kind==="sell"){s.coins+=a.quantity*g.sale_value;message=`${a.quantity} Tomato sold for ${a.quantity*g.sale_value} Lime Coins.`;}
        else{const dest=s.goods.find(g=>g.item_id===a.item_id && g.location===target);if(dest)dest.quantity+=a.quantity;else s.goods.push({...g,location:target,quantity:a.quantity});message=a.kind==="store"?"Produce stored safely in your house chest.":"Produce returned to your bag.";}
        g.quantity-=a.quantity;s.goods=s.goods.filter(g=>g.quantity>0);
      }
      s.revision++;const receipt={request_id:args.p_request,action:a.kind,revision:s.revision,message,...extra};receipts.set(key,{body,ack:structuredClone(receipt)});
      if(control.holdCrop)await control.holdCrop;
      if(control.dropCrop){control.dropCrop=false;await route.abort();return;}
      await respond({state:s,receipt});return;
    }
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
export async function open(page:Page){await page.goto("/farm");}
export async function ready(page:Page){await expect(page.getByRole("button",{name:"Character",exact:true})).toBeEnabled();await expect(page.locator(".farm-viewport canvas")).toHaveCount(1);}
export async function walk(page:Page){await page.getByTestId("farm-world").focus();await page.keyboard.down("d");await page.waitForTimeout(250);await page.keyboard.up("d");}

