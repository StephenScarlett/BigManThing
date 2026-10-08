import { CROP_PILOT_CATALOG, type FarmCropState, type FarmCropAction, type FarmCropAck, type FarmCropReceipt } from "@bmt/shared";
/** Isolated, explicitly temporary. Never calls Supabase or grants account coins. */
export function cropDemo(plotIds:string[]) {
  const state:FarmCropState={owner_id:"demo",rules_version:1,revision:1,server_now:new Date().toISOString(),business_date:"demo",coins:90,seed_quantity:6,watering_can:true,restock_claimed:false,seed_price:10,growth_seconds:45,catalog:structuredClone(CROP_PILOT_CATALOG),plots:plotIds.map(plot_id=>({plot_id,crop:null})),goods:[]};
  const hidden=new Map<string,typeof CROP_PILOT_CATALOG[number]>(),receipts=new Map<string,{body:string;receipt:FarmCropReceipt}>();
  const context=():FarmCropState=>{
    state.server_now=new Date().toISOString();
    for(const p of state.plots)if(p.crop?.ready_at && Date.parse(p.crop.ready_at)<=Date.now()){
      p.crop.stage="ready";p.crop.reveal=hidden.get(p.crop.id)!;
    }
    return structuredClone(state);
  };
  return {context:async()=>context(),action:async(a:FarmCropAction,revision:number,request:string):Promise<FarmCropAck>=>{
    const body=JSON.stringify({a,revision}),prior=receipts.get(request);
    if(prior){if(prior.body!==body)throw Error("This demo request changed.");return {state:context(),receipt:prior.receipt};}
    if(revision!==state.revision)throw Error("Refresh the demo crops.");
    context();let message="",extra:Partial<FarmCropReceipt>={};
    if(a.kind==="plant"){
      const p=state.plots.find(p=>p.plot_id===a.plot_id);
      if(!p || p.crop || state.seed_quantity<1)throw Error("Choose an empty plot and keep a seed in your bag.");
      state.seed_quantity--;const id=crypto.randomUUID();
      hidden.set(id,structuredClone(state.catalog[Math.random()<.75?0:1]!));
      p.crop={id,stage:"planted",planted_at:state.server_now,watered_at:null,ready_at:null,reveal:null};
      message="Demo seed planted. Water it to start the 45-second preview.";extra={plot_id:p.plot_id,crop_id:id};
    }else if(a.kind==="water" || a.kind==="harvest"){
      const p=state.plots.find(p=>p.crop?.id===a.crop_id),c=p?.crop;
      if(!p || !c)throw Error("That crop is gone. Refresh the demo.");
      extra={plot_id:p.plot_id,crop_id:c.id};
      if(a.kind==="water"){
        if(c.watered_at)throw Error("Already watered.");
        c.watered_at=state.server_now;c.ready_at=new Date(Date.now()+45000).toISOString();c.stage="growing";
        message="Watered. Ready in 45 seconds in this temporary demo.";
      }else{
        if(c.stage!=="ready" || !c.reveal)throw Error("Still growing.");
        const def=c.reveal,stack=state.goods.find(g=>g.item_id===def.item_id && g.location==="bag");
        if(stack)stack.quantity++;else state.goods.push({...def,location:"bag",quantity:1});
        p.crop=null;hidden.delete(c.id);message=def.label+" harvested into your demo bag.";extra.item_id=def.item_id;
      }
    }else if(a.kind==="buy"){
      if(!Number.isInteger(a.quantity) || a.quantity<1 || a.quantity>50 || state.coins<a.quantity*10)throw Error("Not enough demo coins.");
      state.coins-=a.quantity*10;state.seed_quantity+=a.quantity;message="Demo seeds bought.";
    }else if(a.kind==="restock"){
      if(state.restock_claimed)throw Error("Already claimed in this demo.");
      state.seed_quantity+=2;state.restock_claimed=true;message="Two demo seeds added.";
    }else{
      const source=a.kind==="withdraw"?"chest":"bag",target=a.kind==="store"?"chest":"bag";
      const stack=state.goods.find(g=>g.item_id===a.item_id && g.location===source);
      if(!stack || !Number.isInteger(a.quantity) || a.quantity<1 || a.quantity>50 || stack.quantity<a.quantity)throw Error("That produce is not available.");
      if(a.kind==="sell"){const coins=stack.sale_value*a.quantity;state.coins+=coins;message=`Sold for ${coins} demo coins.`;extra.coins=coins;}
      else{const dest=state.goods.find(g=>g.item_id===a.item_id && g.location===target);if(dest)dest.quantity+=a.quantity;else state.goods.push({...stack,location:target,quantity:a.quantity});message=a.kind==="store"?"Stored in the demo chest.":"Returned to the demo bag.";}
      stack.quantity-=a.quantity;state.goods=state.goods.filter(g=>g.quantity>0);
    }
    state.revision++;
    const receipt:FarmCropReceipt={request_id:request,action:a.kind,revision:state.revision,message,...extra};
    receipts.set(request,{body,receipt});return {state:context(),receipt};
  }};
}
