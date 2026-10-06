import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { DEFAULT_APPEARANCE, type Appearance, type FarmPosition, type FarmState } from "@bmt/shared";
import { useAuth } from "@/lib/auth";
import { createFarm, farmContext, FarmApiError, saveFarmCharacter, saveFarmPosition } from "@/features/farm/farm-api";
import FarmDemoPage from "./FarmDemoPage";

const key=(position:FarmPosition)=>JSON.stringify({scene:position.scene,actor:{x:Math.round(position.actor.x*100)/100,y:Math.round(position.actor.y*100)/100,facing:position.actor.facing}});
const conflicting=(e:unknown)=>e instanceof FarmApiError && ["character_changed_reload","position_changed_reload","world_changed_reload","owner_changed","invalid_position","request_payload_changed"].includes(e.code);
type PositionRequest={position:FarmPosition;revision:number;world:number;request:string};
type CharacterRequest={appearance:Appearance;nickname:string;revision:number;request:string};

/** Keying by identity drops old drafts, timers and responses on account changes. */
export default function FarmPage() {
  const {user,loading}=useAuth();
  if(loading || !user) return <p>Loading your account…</p>;
  return <OwnedFarm key={user.id} owner={user.id} />;
}
function OwnedFarm({owner}:{owner:string}) {
  const [farm,setFarm]=useState<FarmState|null>(null),state=useRef<FarmState|null>(null);
  const [loading,setLoading]=useState(true),[error,setError]=useState<string|null>(null),[conflict,setConflict]=useState(false);
  const [positionError,setPositionError]=useState<string|null>(null),[characterError,setCharacterError]=useState<string|null>(null);
  const [status,setStatus]=useState("Saved"),[creating,setCreating]=useState(false),[characterSaving,setCharacterSaving]=useState(false),[epoch,setEpoch]=useState(0);
  const live=useRef(false),generation=useRef(0),createRequest=useRef(crypto.randomUUID());
  const latestPosition=useRef<FarmPosition|null>(null),positionRequest=useRef<PositionRequest|null>(null),characterRequest=useRef<CharacterRequest|null>(null);
  const positionBusy=useRef(false),characterBusy=useRef(false),failed=useRef(false),blocked=useRef(false),debounce=useRef<ReturnType<typeof setTimeout>>();
  const flushRef=useRef<(manual?:boolean)=>Promise<void>>(async()=>{});
  const commit=(next:FarmState)=>{state.current=next;setFarm(next);};
  const update=(patch:Partial<FarmState>)=>{if(state.current)commit({...state.current,...patch});};
  const dirty=()=>!!state.current && !!latestPosition.current && key(latestPosition.current)!==key(state.current.position);
  const fail=(e:unknown,setMessage=setError)=>{
    setMessage(e instanceof Error?e.message:"Your farm could not be saved. Retry when your connection returns.");
    if(conflicting(e)){blocked.current=true;setConflict(true);}
  };
  const load=useCallback(async()=>{
    const g=++generation.current;
    blocked.current=true;setLoading(true);setError(null);setPositionError(null);setCharacterError(null);
    clearTimeout(debounce.current);
    try {
      const next=await farmContext(owner);
      if(!live.current || generation.current!==g)return;
      state.current=next;setFarm(next);latestPosition.current=next?.position ?? null;
      positionRequest.current=null;characterRequest.current=null;positionBusy.current=false;characterBusy.current=false;
      failed.current=false;blocked.current=false;setConflict(false);setCharacterSaving(false);setStatus("Saved");setEpoch(v=>v+1);
    } catch(e) {if(live.current && generation.current===g)fail(e);}
    finally {if(live.current && generation.current===g)setLoading(false);}
  },[owner]);
  useEffect(()=>{
    live.current=true;void load();
    return()=>{live.current=false;generation.current++;clearTimeout(debounce.current);};
  },[load]);

  const flush=async(manual=false)=>{
    if(!live.current || blocked.current || positionBusy.current || !state.current || (!manual && failed.current))return;
    if(!positionRequest.current && !dirty())return;
    const g=generation.current;
    positionRequest.current ??= {position:structuredClone(latestPosition.current!),revision:state.current.position_revision,world:state.current.world_version,request:crypto.randomUUID()};
    const request=positionRequest.current;
    positionBusy.current=true;setStatus("Saving position…");
    if(manual)setPositionError(null);
    try {
      const ack=await saveFarmPosition(owner,request.position,request.revision,request.world,request.request);
      if(!live.current || generation.current!==g)return;
      update(ack);positionRequest.current=null;failed.current=false;
      setPositionError(null);setStatus(dirty()?"Changes waiting to save":"Saved");
      if(dirty())debounce.current=setTimeout(()=>void flushRef.current(),800);
    } catch(e) {
      if(live.current && generation.current===g){failed.current=true;setStatus("Position not saved — retry when connected");fail(e,setPositionError);}
    } finally {if(live.current && generation.current===g)positionBusy.current=false;}
  };
  flushRef.current=flush;
  const checkpoint=useCallback((position:FarmPosition)=>{
    if(!live.current || blocked.current)return;
    latestPosition.current=structuredClone(position);
    clearTimeout(debounce.current);
    if(state.current && key(position)!==key(state.current.position)) {
      if(!positionBusy.current && !failed.current)setStatus("Changes waiting to save");
      debounce.current=setTimeout(()=>void flushRef.current(),800);
    }
  },[]);
  useEffect(()=>{
    const interval=setInterval(()=>void flushRef.current(),5000);
    const online=()=>void flushRef.current(true);
    const warn=(event:BeforeUnloadEvent)=>{if(dirty() || positionRequest.current){event.preventDefault();event.returnValue="";}};
    window.addEventListener("online",online);window.addEventListener("beforeunload",warn);
    return()=>{clearInterval(interval);window.removeEventListener("online",online);window.removeEventListener("beforeunload",warn);};
  },[]);
  const saveCharacter=async(appearance:Appearance,nickname:string)=>{
    if(characterBusy.current || blocked.current || !state.current)return;
    characterBusy.current=true;setCharacterSaving(true);setCharacterError(null);
    const g=generation.current;
    const send=async(request:CharacterRequest)=>{
      const ack=await saveFarmCharacter(owner,request.appearance,request.nickname,request.revision,request.request);
      if(!live.current || generation.current!==g)return false;
      update(ack);characterRequest.current=null;return true;
    };
    try {
      // Settle a response-lost request with its original body before any new edit.
      if(characterRequest.current && !await send(characterRequest.current))return;
      if(state.current && (JSON.stringify(state.current.appearance)!==JSON.stringify(appearance) || state.current.nickname!==nickname.trim())) {
        characterRequest.current={appearance:structuredClone(appearance),nickname:nickname.trim(),revision:state.current.character_revision,request:crypto.randomUUID()};
        await send(characterRequest.current);
      }
    } catch(e) {if(live.current && generation.current===g)fail(e,setCharacterError);}
    finally {if(live.current && generation.current===g){characterBusy.current=false;setCharacterSaving(false);}}
  };
  const create=async()=>{
    if(creating)return;
    setCreating(true);setError(null);const g=generation.current;
    try {
      const next=await createFarm(owner,{...DEFAULT_APPEARANCE},"My lime",createRequest.current);
      if(!live.current || generation.current!==g)return;
      commit(next);latestPosition.current=next.position;blocked.current=false;setStatus("Saved");setEpoch(v=>v+1);
    } catch(e) {if(live.current && generation.current===g)fail(e);}
    finally {if(live.current && generation.current===g)setCreating(false);}
  };
  if(loading)return <p role="status">Opening your farm…</p>;
  if(!farm)return <section className="farm-welcome card"><p className="farm-eyebrow">MY LIME</p><h1>Your own little patch.</h1><p>A furnished house, six plots, a pond, and a character you can make your own.</p><p>Your starter kit includes six mystery seeds, a watering can and a fishing rod. Planting and fishing come next; your farm and character can be saved now.</p>{error && <p role="alert">{error}</p>}<div><button type="button" className="btn-primary" disabled={creating || blocked.current} onClick={()=>void create()}>{creating?"Creating your farm…":"Create my farm"}</button> <button type="button" className="btn-secondary" onClick={()=>void load()}>Retry loading</button></div><Link to="/farm/demo">Try the temporary walking preview</Link></section>;
  return <FarmDemoPage key={epoch} persistence={{state:farm,status,error:characterError??positionError??error,conflict,characterSaving,onCheckpoint:checkpoint,onSaveCharacter:saveCharacter,onSavePosition:()=>void flushRef.current(true),onReload:()=>void load()}} />;
}
