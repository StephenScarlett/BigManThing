import { useEffect, useRef, useState } from "react";
import type { FarmController, FarmSnapshot, FarmActionEffect } from "./farm-engine";
import type {FarmPlot} from "@bmt/shared";
import type { Appearance, Interaction, World, SceneId, FarmPosition } from "./farm-world";
import type { FarmInput } from "./farm-input";

type Props = { input: FarmInput; paused: boolean; appearance: Appearance; controller: React.MutableRefObject<FarmController | null>; onSnapshot(snapshot: FarmSnapshot): void; onInspect(item: Interaction): void; onReady(ready: boolean): void; worlds?: Record<SceneId,World>; initialPosition?: FarmPosition;plots?:FarmPlot[];estimatedServerNow?:()=>number;actionEffect?:FarmActionEffect|null };

export default function FarmViewport({ input, paused, appearance, controller, onSnapshot, onInspect, onReady, worlds, initialPosition,plots,estimatedServerNow,actionEffect }: Props) {
  const [configuration] = useState(()=>({worlds,initialPosition,estimatedServerNow}));
  const host = useRef<HTMLDivElement>(null), latest = useRef({ paused, appearance,plots });
  const played=useRef<number|null>(null);
  latest.current = { paused, appearance,plots };
  const [error, setError] = useState<string | null>(null), [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const element = host.current!;
    let cancelled = false, local: FarmController | null = null;
    setError(null); onReady(false);
    const observer = new ResizeObserver(() => local?.resize(element.clientWidth, element.clientHeight));
    observer.observe(element);
    // The module (and Phaser) are excluded from main-game entry chunks.
    void import("./farm-engine").then(({ mountFarm }) => {
      if (cancelled) return;
      local = mountFarm(element, { input, onSnapshot, onInspect, ...configuration,plots:latest.current.plots,onReady: () => { if (!cancelled) onReady(true); } });
      controller.current = local;
      local.setAppearance(latest.current.appearance); local.setPaused(latest.current.paused);
    }).catch(() => { if (!cancelled) setError("The farm renderer could not start. Try again or use the room preview."); });
    return () => {
      cancelled = true; observer.disconnect(); input.clear(); local?.destroy();
      if (controller.current === local) controller.current = null;
    };
  }, [attempt, input, controller, onSnapshot, onInspect, onReady, configuration]);
  useEffect(() => { controller.current?.setPaused(paused); }, [paused, controller]);
  useEffect(() => { controller.current?.setAppearance(appearance); }, [appearance, controller]);
  useEffect(()=>{controller.current?.setCrops(plots??[]);},[plots,controller]);
  useEffect(()=>{if(!paused && actionEffect && controller.current && played.current!==actionEffect.nonce){played.current=actionEffect.nonce;controller.current.playAction(actionEffect);}},[actionEffect,paused,controller]);
  return <div className="farm-viewport-wrap">
    <div ref={host} className="farm-viewport" tabIndex={0} role="group" aria-label="Walkable farm. Use W A S D or arrow keys to move; E to interact." aria-describedby="farm-control-help" data-testid="farm-world" />
    {error && <div className="farm-renderer-error" role="alert"><p>{error}</p><button type="button" onClick={() => setAttempt(n => n + 1)}>Retry renderer</button></div>}
  </div>;
}
