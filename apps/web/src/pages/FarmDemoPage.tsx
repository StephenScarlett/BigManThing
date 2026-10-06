import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import FarmViewport from "@/features/farm/FarmViewport";
import FarmCharacterPreview from "@/features/farm/FarmCharacterPreview";
import { FarmInput, isTypingTarget, type Direction } from "@/features/farm/farm-input";
import { APPEARANCE_CHOICES, APPEARANCE_STYLES, DEFAULT_APPEARANCE, WORLDS, type Appearance, type Interaction, type FarmPosition, type FarmState } from "@/features/farm/farm-world";
import type { FarmController, FarmSnapshot } from "@/features/farm/farm-engine";
import "@/features/farm/farm.css";

type Panel = { kind: "character" | "bag" | "help" | "inspect"; item?: Interaction };
const directionSymbols: Record<Direction, string> = { up: "↑", left: "←", down: "↓", right: "→" };
export type FarmPersistence = {
  state: FarmState; status: string; error: string | null; conflict: boolean; characterSaving: boolean;
  onCheckpoint(position: FarmPosition): void;
  onSaveCharacter(appearance: Appearance, nickname: string): Promise<void>;
  onSavePosition(): void; onReload(): void;
};
export default function FarmDemoPage({ persistence }: { persistence?: FarmPersistence }) {
  const saved = useRef(persistence); saved.current=persistence;
  const worlds=persistence?.state.worlds ?? WORLDS;
  const [input] = useState(() => new FarmInput()), controller = useRef<FarmController | null>(null), root = useRef<HTMLElement>(null);
  const [appearance, setAppearance] = useState<Appearance>({ ...(persistence?.state.appearance ?? DEFAULT_APPEARANCE) }), [nickname, setNickname] = useState(persistence?.state.nickname ?? "My lime");
  const [ready, setReady] = useState(false), [userPaused, setUserPaused] = useState(false), [panel, setPanel] = useState<Panel | null>(null);
  const [snapshot, setSnapshot] = useState<FarmSnapshot>({ ...(persistence?.state.position ?? {scene:"farm",actor:{...worlds.farm.spawn}}), nearby: null, zoom: 1, paused: false });
  const paused = userPaused || !!panel || !!persistence?.conflict, enabled = useRef(false); enabled.current = ready && !paused;
  const inspect = useCallback((item: Interaction) => setPanel({ kind: "inspect", item }), []);
  const report = useCallback((next:FarmSnapshot)=>{setSnapshot(next);saved.current?.onCheckpoint({scene:next.scene,actor:next.actor});},[]);
  const characterDirty=!!persistence && (nickname!==persistence.state.nickname || JSON.stringify(appearance)!==JSON.stringify(persistence.state.appearance));
  useEffect(()=>{
    if(!characterDirty)return;
    const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue="";};
    window.addEventListener("beforeunload",warn);return()=>window.removeEventListener("beforeunload",warn);
  },[characterDirty]);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (!enabled.current || event.altKey || event.ctrlKey || event.metaKey || isTypingTarget(event.target) || !root.current?.contains(document.activeElement)) return;
      if (input.pressKey(event.code, event.repeat)) event.preventDefault();
    };
    const up = (event: KeyboardEvent) => input.releaseKey(event.code);
    const clear = () => { input.clear(); controller.current?.releaseInput(); };
    window.addEventListener("keydown", down); window.addEventListener("keyup", up);
    window.addEventListener("blur", clear); document.addEventListener("visibilitychange", clear);
    const focusOut = (event: FocusEvent) => { if (!(event.relatedTarget instanceof Node) || !root.current?.contains(event.relatedTarget)) clear(); };
    const element = root.current!; element.addEventListener("focusout", focusOut);
    return () => {
      clear(); window.removeEventListener("keydown", down); window.removeEventListener("keyup", up);
      window.removeEventListener("blur", clear); document.removeEventListener("visibilitychange", clear); element.removeEventListener("focusout", focusOut);
    };
  }, [input]);
  useEffect(() => { input.clear(); }, [paused, input]);
  const focusWorld = () => root.current?.querySelector<HTMLElement>(".farm-viewport")?.focus({ preventScroll: true });
  const world = worlds[snapshot.scene];
  return <section ref={root} className="farm-page" aria-labelledby="farm-title">
    <header className="farm-heading">
      <div><p className="farm-eyebrow">MY LIME · {persistence?"YOUR FARM":"WALKING PROTOTYPE"}</p><h1 id="farm-title">{persistence?`${persistence.state.nickname}’s little patch.`:"Your little patch."}</h1><p>A house, a pond, and room to grow.</p></div>
      <Link to={persistence?"/room":"/room/demo"} className="farm-text-link">{persistence?"Your collections":"Room collection preview"} ↗</Link>
    </header>
    {persistence?<div className="farm-save-bar"><p role="status" data-testid="farm-save-status">{persistence.status}{characterDirty?" · Unsaved character changes":""}</p><button type="button" onClick={persistence.onSavePosition} disabled={persistence.conflict}>Save now</button><button type="button" onClick={persistence.onReload}>Load saved farm</button>
      {persistence.error && <p role="alert">{persistence.error}</p>}
      {persistence.state.position_recovered && <p>Your last spot was blocked, so you’ve returned to a safe place.</p>}
    </div>:<p className="farm-preview-note">Temporary preview · no login needed. No crops, fish, coins or saved items are changed. Character choices reset when you leave.</p>}
    <div className="farm-shell">
      <div className="farm-toolbar">
        <span className="farm-location" data-testid="farm-location">{snapshot.scene === "farm" ? "The yard" : "Your house"}<small>{ready ? paused ? "Paused" : "Explore at your own pace" : "Preparing your patch…"}</small></span>
        <div className="farm-toolbar-actions">
          <button type="button" disabled={!ready} onClick={() => setPanel({ kind: "character" })}>Character</button>
          <button type="button" disabled={!ready} onClick={() => setPanel({ kind: "bag" })}>Bag</button>
          <button type="button" disabled={!ready} aria-pressed={userPaused} onClick={() => setUserPaused(p => !p)}>{userPaused ? "Resume" : "Pause"}</button>
          <button type="button" onClick={() => setPanel({ kind: "help" })} aria-label="Control help">?</button>
        </div>
      </div>
      <FarmViewport input={input} controller={controller} paused={paused} appearance={appearance} onSnapshot={report} onInspect={inspect} onReady={setReady} worlds={worlds} initialPosition={persistence?.state.position} />
      {!!snapshot.missingArt?.length && <p className="farm-preview-note" role="status">Some artwork could not load. Basic preview art is being used; reload to try again.</p>}
      {paused && <p className="farm-paused-label" aria-live="polite">{persistence?.conflict?"Movement paused. Load the saved farm to continue.":panel ? "Movement paused while the menu is open." : "Paused. Resume when you’re ready."}</p>}
      <div className="farm-controls">
        <div className="farm-dpad" role="group" aria-label="Movement controls">
          {(["up", "left", "down", "right"] as const).map(direction => <button key={direction} type="button" className={`farm-direction farm-direction-${direction}`} aria-label={`Move ${direction}`} disabled={!ready || paused}
            onPointerDown={event => { if (!enabled.current) return; event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); input.pressPointer(event.pointerId, direction); }}
            onPointerUp={event => input.releasePointer(event.pointerId)} onPointerCancel={event => input.releasePointer(event.pointerId)} onLostPointerCapture={event => input.releasePointer(event.pointerId)}
            onKeyDown={event => { if ((event.code === "Space" || event.code === "Enter") && enabled.current) { event.preventDefault(); input.pressPointer(-1, direction); } }}
            onKeyUp={event => { if (event.code === "Space" || event.code === "Enter") { event.preventDefault(); input.releasePointer(-1); } }} onBlur={() => input.releasePointer(-1)}>{directionSymbols[direction]}</button>)}
        </div>
        <div className="farm-context"><p id="farm-control-help">WASD / arrows to walk · E to interact</p><p aria-live="polite">{ready ? snapshot.nearby?.label ?? "Walk up to a door, plot or the dock." : "Loading the farm renderer…"}</p></div>
        <button className="farm-interact" type="button" disabled={!ready || paused || !snapshot.nearby} onClick={() => { input.requestAction(); focusWorld(); }}>{snapshot.nearby?.label ?? "Interact"}<small>E</small></button>
      </div>
    </div>
    {!persistence && <nav className="farm-waypoints" aria-label="Preview jump points">
      <span>Jump to test:</span>{world.interactions.map(item => <button key={item.id} type="button" disabled={!ready || paused} onClick={() => { controller.current?.jump(item.id); focusWorld(); }}>{item.id === "home-door" ? "House door" : item.label}</button>)}
    </nav>}
    <div className="farm-next"><p><strong>{persistence?"Your farm is saved.":"This is the foundation."}</strong> {persistence?"Next comes planting, your first harvest, fishing and selling.":"Next: saved farms, mystery crops, fishing and selling—then daily-game supplies and house comfort."}</p><Link to="/guess">Back to Guess Nah →</Link></div>
    <details className="farm-diagnostics"><summary>Movement diagnostics</summary><output data-testid="farm-position" data-scene={snapshot.scene} data-x={snapshot.actor.x.toFixed(2)} data-y={snapshot.actor.y.toFixed(2)} data-facing={snapshot.actor.facing} data-paused={String(snapshot.paused)}>{snapshot.scene} · feet {snapshot.actor.x.toFixed(1)}, {snapshot.actor.y.toFixed(1)} · facing {snapshot.actor.facing} · zoom {snapshot.zoom}×</output></details>
    {panel && <FarmDialog title={panel.kind === "character" ? "Your character" : panel.kind === "bag" ? "Your bag" : panel.kind === "help" ? "Make yourself at home" : panel.item!.label} onClose={() => setPanel(null)}>
      {panel.kind === "character" && <>
        <p>{persistence?"Try your look in every direction, then save your character. These starter choices are free.":"Try your look in every direction. These starter choices are temporary in this demo."}</p>
        <FarmCharacterPreview appearance={appearance} />
        <fieldset className="farm-character-form" disabled={!!persistence?.characterSaving || !!persistence?.conflict}>
        <label className="farm-name-label">{persistence?"Character name":"Nickname (preview only)"}<input value={nickname} maxLength={20} onChange={e => setNickname(e.target.value)} /></label>
        <div className="farm-style-controls">{(Object.keys(APPEARANCE_STYLES) as (keyof typeof APPEARANCE_STYLES)[]).map(slot => <label key={slot}>{({bodyType:"Body build",hairStyle:"Hairstyle",eyeStyle:"Eye shape",topStyle:"Top",bottomStyle:"Bottoms",hatStyle:"Hat"})[slot]}<select aria-label={({bodyType:"Body build",hairStyle:"Hairstyle",eyeStyle:"Eye shape",topStyle:"Top",bottomStyle:"Bottoms",hatStyle:"Hat"})[slot]} value={appearance[slot]} onChange={e=>setAppearance(a=>({...a,[slot]:e.target.value}))}>{APPEARANCE_STYLES[slot].map(option=><option key={option.id} value={option.id}>{option.label}</option>)}</select></label>)}</div>
        <div className="farm-palette-controls">{(Object.keys(APPEARANCE_CHOICES) as (keyof typeof APPEARANCE_CHOICES)[]).map(slot => <fieldset className="farm-swatches" key={slot}><legend>{({skin:"Skin",hair:"Hair",shirt:"Shirt",eyes:"Eyes",pants:"Bottoms",shoes:"Shoes",hat:"Hat"})[slot]}</legend>{APPEARANCE_CHOICES[slot].map((hex, i) => <button key={hex} type="button" aria-label={`${slot} colour ${i + 1}`} aria-pressed={appearance[slot] === hex} style={{ backgroundColor: hex }} onClick={() => setAppearance(a => ({ ...a, [slot]: hex }))} />)}</fieldset>)}</div>
        {persistence && <button type="button" className="farm-save-character" disabled={!characterDirty || !nickname.trim()} onClick={()=>{setNickname(n=>n.trim());void persistence.onSaveCharacter(appearance,nickname.trim());}}>{persistence.characterSaving?"Saving character…":"Save character"}</button>}
        </fieldset>
        {persistence && <p role="status">{characterDirty?"Your character has unsaved changes.":"Character saved."}</p>}
        {persistence?.error && <p role="alert">{persistence.error}</p>}
      </>}
      {panel.kind === "bag" && (persistence?<><p>Your starter kit is kept with this farm.</p><ul>{persistence.state.inventory.map(item=><li key={item.item_id}>{item.label} × {item.quantity}</li>)}<li>{worlds.farm.props.filter(p=>p.kind==="plot").length} starter plots</li></ul><p>Planting and fishing are coming next. Your seeds and tools will be ready.</p></>:<><p>These describe the starter kit planned for your first farm. They are not account inventory.</p><ul><li>Watering can — water a planted mystery seed.</li><li>Fishing rod — cast at the pond.</li><li>Six starter plots — land upgrades come later.</li></ul><p>Storage, crop and fish stacks, protected favourites and selling arrive with persistence.</p></>)}
      {panel.kind === "help" && <><p>Click the world, then use WASD or arrow keys. Hold the on-screen direction buttons on touch devices. Press E or the action button near a door to enter or leave.</p><p>Furniture, trees, water and the farm edges block your feet; rugs and the dock do not.</p><p>{persistence?"Your position saves after walking and periodically while you move. Use Save now and wait for Saved before leaving. Save character choices separately in Character.":"The jump points help test the farm. No preview interaction grants an economic reward."} Menus, pause, losing focus and leaving the tab release movement.</p></>}
      {panel.kind === "inspect" && <p>{persistence?({"seed-stall":"Your starter seeds are in your bag. Planting and new seed packets are coming next.",market:"Bring your future harvests and catches here to sell them or keep them for another goal.",orders:"Optional crop and fish requests will appear here once growing and fishing are ready.",plots:"These six plots belong to your farm. Planting and watering are coming next.",pond:"Your fishing rod is in your bag. Casting and catches are coming next.",storage:"This chest is part of your home. Harvest and fish storage will arrive with those activities.",furniture:"These furnishings belong to your starter house. Moving furniture and decorating are coming later."} as Record<string,string>)[panel.item!.id] ?? panel.item!.description:panel.item!.description}</p>}
    </FarmDialog>}
  </section>;
}

function FarmDialog({ title, onClose, children }: { title: string; onClose(): void; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null), close = useRef(onClose); close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = ref.current!; dialog.showModal();
    return () => { dialog.close(); if (previous?.isConnected) previous.focus({ preventScroll: true }); };
  }, []);
  return <dialog ref={ref} className="farm-dialog" aria-labelledby="farm-dialog-title" onCancel={event => { event.preventDefault(); close.current(); }}>
    <header><h2 id="farm-dialog-title">{title}</h2><button type="button" aria-label="Close menu" onClick={onClose}>×</button></header>
    <div className="farm-dialog-body">{children}</div>
    <footer><button type="button" onClick={onClose}>Back to the farm</button></footer>
  </dialog>;
}
