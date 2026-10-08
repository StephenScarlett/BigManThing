import {useCallback,useEffect,useRef,useState} from "react";
import type {FarmCropState,FarmCropAction,FarmCropReceipt} from "@bmt/shared";
import {farmCropsContext,farmCropAction,FarmApiError} from "./farm-api";
import {cropDemo} from "./crop-demo";
type Pending={action:FarmCropAction;revision:number;request:string};
const rejected=new Set(["crops_changed_reload","owner_changed","farm_required","plot_occupied","crop_gone","crop_not_ready","already_watered","no_seeds","not_enough_coins","not_enough_produce","restock_already_claimed","invalid_quantity","invalid_plot","invalid_crop_action","inventory_full","wallet_full","watering_can_required","request_payload_changed"]);
export type CropGame=ReturnType<typeof useFarmCrops>;
export function useFarmCrops(owner:string|undefined,plotIds:string[]){
  const [demo]=useState(()=>cropDemo(plotIds));
  const [state,setState]=useState<FarmCropState|null>(null),latest=useRef<FarmCropState|null>(null);
  const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState<string|null>(null),[message,setMessage]=useState("");
  const [pending,setPending]=useState<Pending|null>(null),request=useRef<Pending|null>(null),inflight=useRef(false),live=useRef(false);
  const [stale,setStale]=useState(false),generation=useRef(0),clock=useRef({server:0,local:0});
  const accept=useCallback((next:FarmCropState)=>{
    if(latest.current && (next.revision<latest.current.revision || (next.revision===latest.current.revision && Date.parse(next.server_now)<Date.parse(latest.current.server_now))))return;
    latest.current=next;clock.current={server:Date.parse(next.server_now),local:performance.now()};setState(next);
  },[]);
  const load=useCallback(async()=>{
    const g=generation.current;
    try{const next=owner?await farmCropsContext(owner):await demo.context();if(!live.current || g!==generation.current)return;
      if(!next)throw new Error("Your crops could not load. Create your farm first.");
      accept(next);setStale(false);if(!request.current)setError(null);
    }catch(e){if(live.current && g===generation.current)setError(e instanceof Error?e.message:"Your crops could not load. Retry when connected.");}
    finally{if(live.current && g===generation.current)setLoading(false);}
  },[owner,demo,accept]);
  useEffect(()=>{
    live.current=true;void load();
    const refresh=()=>{if(!document.hidden)void load();};
    const interval=setInterval(refresh,owner?30000:1000);
    document.addEventListener("visibilitychange",refresh);window.addEventListener("online",refresh);
    return()=>{live.current=false;generation.current++;clearInterval(interval);document.removeEventListener("visibilitychange",refresh);window.removeEventListener("online",refresh);};
  },[load,owner]);
  useEffect(()=>{
    if(!pending)return;const warn=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue="";};
    window.addEventListener("beforeunload",warn);return()=>window.removeEventListener("beforeunload",warn);
  },[pending]);
  const send=async(p:Pending):Promise<FarmCropReceipt|null>=>{
    if(inflight.current || !live.current)return null;
    inflight.current=true;setBusy(true);setError(null);const g=generation.current;
    try{
      const ack=owner?await farmCropAction(owner,p.action,p.revision,p.request):await demo.action(p.action,p.revision,p.request);
      if(!live.current || g!==generation.current)return null;
      accept(ack.state);request.current=null;setPending(null);setMessage(ack.receipt.message);return ack.receipt;
    }catch(e){if(live.current && g===generation.current){
      setError(e instanceof Error?e.message:"No response arrived. Retry the same action.");
      if(!owner || (e instanceof FarmApiError && rejected.has(e.code))){request.current=null;setPending(null);}
      if(e instanceof FarmApiError && ["crops_changed_reload","owner_changed","plot_occupied","crop_gone","already_watered","not_enough_produce"].includes(e.code))setStale(true);
    }return null;
    }finally{if(live.current && g===generation.current){inflight.current=false;setBusy(false);}}
  };
  const act=(a:FarmCropAction)=>{
    if(inflight.current || request.current || stale || !latest.current)return Promise.resolve(null);
    const p={action:structuredClone(a),revision:latest.current.revision,request:crypto.randomUUID()};request.current=p;setPending(p);return send(p);
  };
  return {state,busy,loading,error,message,pending,stale,load,act,retry:()=>request.current?send(request.current):Promise.resolve(null),estimatedServerNow:()=>clock.current.server+Math.max(0,performance.now()-clock.current.local)};
}
