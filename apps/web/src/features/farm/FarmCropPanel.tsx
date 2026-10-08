import {useEffect,useState} from "react";
import {cropProgress,type CropStack,type FarmCropAction,type FarmCropReceipt,type FarmPlot} from "@bmt/shared";
import type {CropGame} from "./useFarmCrops";
export type CropPanelMode="plots"|"seeds"|"bag"|"chest"|"market";
export const CROP_ART_ROOT="/farm-art/crops-v1/";
export function CropIcon({art,alt=""}:{art:string;alt?:string}){
  const [missing,setMissing]=useState(false);
  return missing?<span className="crop-art-fallback" aria-hidden="true">✦</span>:<img className="crop-icon" src={CROP_ART_ROOT+art+".png"} alt={alt} onError={()=>setMissing(true)} />;
}
export function CropRecovery({game,onReceipt}:{game:CropGame;onReceipt(receipt:FarmCropReceipt):void}){
  return <>
    {game.error && <p role="alert">{game.error}</p>}
    {game.pending && !game.busy && <div className="crop-pending"><p>The last action has no confirmed response. Retry it before doing anything else.</p><button type="button" onClick={()=>void game.retry().then(r=>{if(r)onReceipt(r);})}>Retry crop action</button></div>}
    <button type="button" className="crop-refresh" disabled={game.busy} onClick={()=>void game.load()}>Refresh crops</button>
  </>;
}
export default function FarmCropPanel({game,mode:initialMode,plotId,demo,onReceipt,disabled=false}:{game:CropGame;mode:CropPanelMode;plotId?:string;demo:boolean;disabled?:boolean;onReceipt(receipt:FarmCropReceipt):void}){
  const [mode,setMode]=useState(initialMode),[selectedPlot,setSelectedPlot]=useState(plotId),[quantity,setQuantity]=useState(1),[tick,setTick]=useState(0);
  useEffect(()=>{const timer=setInterval(()=>setTick(t=>t+1),1000);return()=>clearInterval(timer);},[]);
  void tick;
  const s=game.state,locked=game.busy || !!game.pending || game.stale || disabled;
  const act=(action:FarmCropAction)=>{void game.act(action).then(r=>{if(r)onReceipt(r);});};
  if(!s)return <div><p role="status">{game.loading?"Opening your crops…":"Your crops are unavailable."}</p><CropRecovery game={game} onReceipt={onReceipt}/></div>;
  return <div className="farm-crop-panel">
    <p className="crop-wallet" data-testid="crop-wallet">{s.coins} {demo?"demo coins":"Lime Coins"} · {s.seed_quantity} mystery seeds</p>
    {demo && <p className="crop-demo-note">Temporary crop demo · grows in 45 seconds. Refreshing or leaving resets it. Your account, coins and saved items are unaffected.</p>}
    <nav className="crop-tabs" aria-label="Crop activities">{([["plots","Plots"],["seeds","Seeds"],["bag","Bag"],["chest","House chest"],["market","Sell"]] as const).map(([value,label])=><button type="button" key={value} aria-pressed={mode===value} onClick={()=>setMode(value)}>{label}</button>)}</nav>
    <CropRecovery game={game} onReceipt={onReceipt}/>
    <p role="status" className="crop-message">{game.busy?"Confirming your crop action…":game.message}</p>
    {mode==="plots" && <>
      <p>Plant one seed, then water it once. {demo?"Try the quick 45-second cycle here.":"Growth takes 24 hours and continues while you are away."} Nothing wilts, and ripe crops wait for you.</p>
      <div className="crop-plot-list">{s.plots.filter(p=>!selectedPlot || p.plot_id===selectedPlot).map(p=><PlotCard key={p.plot_id} plot={p} now={game.estimatedServerNow()} locked={locked} seeds={s.seed_quantity} canWater={s.watering_can} onAction={act}/>)}</div>
      {selectedPlot && <button type="button" onClick={()=>setSelectedPlot(undefined)}>View all plots</button>}
    </>}
    {mode==="seeds" && <>
      <div className="crop-seed-heading"><CropIcon art="seed"/><div><h3>Mystery seed · starter packet</h3><p>{s.seed_price} coins each · one crop per seed · {demo?"45 seconds":"24 hours"} after watering.</p></div></div>
      <p>You discover what grew only when it is ripe. Both outcomes share the same early appearance and growing time.</p>
      <ul className="crop-odds">{s.catalog.map(c=><li key={c.item_id}><CropIcon art={c.art}/><span><strong>{c.label}</strong> · {c.rarity}<br/>{c.percent}% chance · sells for {c.sale_value} coins</span></li>)}</ul>
      <label>Seed quantity <input type="number" min={1} max={50} step={1} value={quantity} onChange={e=>setQuantity(Number(e.target.value))}/></label>
      <button type="button" disabled={locked || !Number.isInteger(quantity) || quantity<1 || quantity>50 || s.coins<quantity*s.seed_price} onClick={()=>act({kind:"buy",quantity})}>Buy {quantity} {quantity===1?"seed":"seeds"} for {quantity*s.seed_price} coins</button>
      <p>Two free basic seeds are available each Trinidad day. Unclaimed days do not accumulate.</p>
      <button type="button" disabled={locked || s.restock_claimed} onClick={()=>act({kind:"restock"})}>{s.restock_claimed?"Today’s free seeds claimed":"Claim 2 free seeds"}</button>
    </>}
    {["bag","chest","market"].includes(mode) && <>
      <p>{mode==="chest"?"Stored produce is kept indefinitely. Return it to your bag when you want to sell it.":mode==="market"?"Choose an exact quantity and review the coin quote. Stored chest items stay out of these sales.":"Harvests stay in your bag until you store or sell them. Seeds and tools stay with your farm."}</p>
      {mode==="bag" && <ul><li>Watering can × 1</li><li>Fishing rod × 1 — fishing comes next</li><li>Mystery seed × {s.seed_quantity}</li></ul>}
      <div className="crop-stack-list">{s.goods.filter(g=>g.location===(mode==="chest"?"chest":"bag")).map(g=><StackCard key={g.location+g.item_id} stack={g} mode={mode} locked={locked} onAction={act}/>)}</div>
      {!s.goods.some(g=>g.location===(mode==="chest"?"chest":"bag")) && <p>{mode==="chest"?"Your chest has no produce yet.":"No harvested produce in your bag yet."}</p>}
    </>}
  </div>;
}
function PlotCard({plot,now,locked,seeds,canWater,onAction}:{plot:FarmPlot;now:number;locked:boolean;seeds:number;canWater:boolean;onAction(a:FarmCropAction):void}){
  const c=plot.crop,p=c?cropProgress(c,now):0;
  const remaining=c?.ready_at?Math.max(0,Date.parse(c.ready_at)-now):0;
  const wait=remaining>=3600000?`${Math.ceil(remaining/3600000)} hours`:remaining>=60000?`${Math.ceil(remaining/60000)} minutes`:`${Math.ceil(remaining/1000)} seconds`;
  return <article className="crop-plot-card" aria-label={plot.plot_id.replace("plot-","Plot ")} data-testid={plot.plot_id}>
    <CropIcon art={!c?"seed":c.reveal?c.reveal.art+"-plant":p>=.5?"growing":"sprout"}/>
    <div><h3>{plot.plot_id.replace("plot-","Plot ")}</h3>
      <p>{!c?"Empty plot":c.reveal?`${c.reveal.label} · ${c.reveal.rarity} · ready to harvest`:c.stage==="planted"?"Mystery seed · needs water":p>=1?"Checking ripeness — refresh crops":"Mystery crop · about "+wait+" left"}</p>
      {c?.stage==="growing" && <progress max={1} value={p} aria-label="Estimated crop growth"/>}
      {!c?<button type="button" disabled={locked || seeds<1} onClick={()=>onAction({kind:"plant",plot_id:plot.plot_id})}>Plant 1 seed</button>:c.stage==="planted"?<button type="button" disabled={locked || !canWater} onClick={()=>onAction({kind:"water",crop_id:c.id})}>Water once</button>:c.stage==="ready"?<button type="button" disabled={locked} onClick={()=>onAction({kind:"harvest",crop_id:c.id})}>Harvest {c.reveal?.label}</button>:<p><small>Grows offline. No more watering needed.</small></p>}
    </div>
  </article>;
}
function StackCard({stack:g,mode,locked,onAction}:{stack:CropStack;mode:string;locked:boolean;onAction(a:FarmCropAction):void}){
  const [quantity,setQuantity]=useState(1),[quote,setQuote]=useState<number|null>(null);
  const valid=Number.isInteger(quantity) && quantity>=1 && quantity<=Math.min(50,g.quantity);
  const sell=()=>{if(quote!=null){onAction({kind:"sell",item_id:g.item_id,quantity:quote});setQuote(null);}};
  return <article className="crop-stack-card" aria-label={`${g.label} in ${g.location}`}>
    <CropIcon art={g.art}/><div><h3>{g.label} × {g.quantity}</h3><p>{g.rarity} · {g.sale_value} coins each</p>
      <label>Quantity <input aria-label={`${g.label} quantity`} type="number" min={1} max={Math.min(50,g.quantity)} step={1} value={quantity} onChange={e=>{setQuantity(Number(e.target.value));setQuote(null);}}/></label>
      {mode!=="market" && <button type="button" disabled={locked || !valid} onClick={()=>onAction({kind:g.location==="bag"?"store":"withdraw",item_id:g.item_id,quantity})}>{g.location==="bag"?"Store in chest":"Return to bag"}</button>}
      {g.location==="bag" && <button type="button" disabled={locked || !valid} onClick={()=>setQuote(quantity)}>Sell {quantity} for {quantity*g.sale_value} coins</button>}
      {quote!=null && <div className="crop-sale-quote"><p>Sell {quote} {g.label} for <strong>{quote*g.sale_value} coins</strong>? This uses that produce.</p><button type="button" disabled={locked || quote>g.quantity} onClick={sell}>Confirm sale</button><button type="button" onClick={()=>setQuote(null)}>Keep it</button></div>}
    </div>
  </article>;
}
