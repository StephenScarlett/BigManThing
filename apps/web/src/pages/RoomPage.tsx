import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  HOME_RARITIES,
  HOME_SKINS,
  homeFootprint,
  homePlacementError,
  homePrice,
  type HomeDesign,
  type HomeFamily,
  type HomeItem,
  type HomePlacement,
  type HomeRoll,
  type HomeSlot,
  type HomeState,
} from "@bmt/shared";
import { useAuth } from "@/lib/auth";
import {
  buyHome,
  claimGuessReward,
  finishPan,
  homeContext,
  rollHome,
  saveHome,
  startPan,
  unlockPan,
} from "@/features/home/home-api";
import { demoRoll, makeHomeDemo } from "@/features/home/home-demo";
import { ItemPicture, PixelAvatar, RoomScene } from "@/features/home/RoomScene";
import { CoconutCatch, PanMemory } from "@/features/home/HomeArcade";
import "@/features/home/home.css";

type Tab = "room" | "wardrobe" | "collections" | "arcade";
type PendingRoll = { family: HomeFamily; request: string };
const slots: HomeSlot[] = ["hair", "hat", "top", "bottom", "shoes"];

export default function RoomPage({ demo = false }: { demo?: boolean }) {
  const { user, profile, isGuest } = useAuth(),
    queryClient = useQueryClient();
  const owner = demo ? "preview" : (user?.id ?? ""),
    activeOwner = useRef(owner);
  activeOwner.current = owner;
  const queryKey = ["home", owner];
  const query = useQuery({
    queryKey,
    queryFn: homeContext,
    enabled: !demo && !!user,
    refetchInterval: 60000,
  });
  const [sample, setSample] = useState(makeHomeDemo),
    state = demo ? sample : query.data;
  const [draft, setDraft] = useState<{
    owner: string;
    revision: number;
    design: HomeDesign;
    base: string;
  } | null>(null);
  const [tab, setTab] = useState<Tab>("room"),
    [family, setFamily] = useState<HomeFamily>("wardrobe"),
    [slot, setSlot] = useState<HomeSlot>("hair");
  const [error, setError] = useState<string | null>(null),
    [notice, setNotice] = useState<string | null>(null),
    [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<string | null>(null),
    [newItem, setNewItem] = useState<string | null>(null),
    [rotation, setRotation] = useState<0 | 1>(0),
    [cell, setCell] = useState({ x: 0, y: 0 });
  const [avatar, setAvatar] = useState({ x: 5, y: 5 }),
    [receipt, setReceipt] = useState<HomeRoll | null>(null),
    [pendingRoll, setPendingRoll] = useState<PendingRoll | null>(null);
  const pending = useRef(false),
    rollRef = useRef<PendingRoll | null>(null),
    requests = useRef(new Map<string, string>());
  const design = draft?.owner === owner ? draft.design : state?.design;
  const dirty =
    !!draft &&
    draft.owner === owner &&
    JSON.stringify(draft.design) !== draft.base;
  const quantities = useMemo(
    () => new Map(state?.inventory.map((i) => [i.item_id, i.quantity]) ?? []),
    [state?.inventory],
  );
  const catalog = state?.catalog ?? [];

  useEffect(() => {
    const cached = queryClient.getQueryData<typeof draft>([
      "home-draft",
      owner,
    ]);
    setDraft(cached?.owner === owner ? cached : null);
    setSelected(null);
    setNewItem(null);
    setReceipt(null);
    setError(null);
    setNotice(null);
    setAvatar({ x: 5, y: 5 });
    let saved: PendingRoll | null = null;
    if (owner && !demo) {
      try {
        const raw = sessionStorage.getItem(`bmt:home:${owner}:roll`);
        if (raw) {
          const p = JSON.parse(raw);
          if (
            ["wardrobe", "room"].includes(p.family) &&
            typeof p.request === "string"
          )
            saved = p;
        }
      } catch {
        /* Optional retry storage. */
      }
    }
    requests.current.clear();
    rollRef.current = saved;
    setPendingRoll(saved);
    if (saved) setFamily(saved.family);
  }, [owner, demo]);
  useEffect(() => {
    if (!state) return;
    setDraft((d) =>
      !d ||
      d.owner !== owner ||
      (JSON.stringify(d.design) === d.base &&
        d.revision !== state.design_revision)
        ? {
            owner,
            revision: state.design_revision,
            design: structuredClone(state.design),
            base: JSON.stringify(state.design),
          }
        : d,
    );
    const saved = rollRef.current,
      found =
        saved && state.recent_rolls.find((r) => r.request_id === saved.request);
    if (found) {
      setReceipt(found);
      clearRoll();
    }
  }, [state, owner, dirty]);
  useEffect(() => {
    if (draft?.owner === owner)
      queryClient.setQueryData(["home-draft", owner], draft);
  }, [draft, owner, queryClient]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function clearRoll() {
    rollRef.current = null;
    setPendingRoll(null);
    try {
      sessionStorage.removeItem(`bmt:home:${owner}:roll`);
    } catch {
      /* Optional. */
    }
  }
  function updateDesign(next: HomeDesign) {
    if (!state || pending.current) return;
    setDraft((d) => ({
      owner,
      revision: d?.owner === owner ? d.revision : state.design_revision,
      design: next,
      base: d?.owner === owner ? d.base : JSON.stringify(state.design),
    }));
    setNotice(null);
  }
  function updateState(next: HomeState, replaceDesign = false) {
    if (demo) setSample(next);
    else queryClient.setQueryData(queryKey, next);
    if (replaceDesign)
      setDraft({
        owner,
        revision: next.design_revision,
        design: structuredClone(next.design),
        base: JSON.stringify(next.design),
      });
  }
  async function act(
    work: () => Promise<HomeState>,
    success: string,
    replaceDesign = false,
  ) {
    if (pending.current) return;
    const uid = owner;
    pending.current = true;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const next = await work();
      if (activeOwner.current !== uid) return;
      updateState(next, replaceDesign);
      setNotice(success);
    } catch (e) {
      if (activeOwner.current === uid)
        setError(
          e instanceof Error
            ? e.message
            : "Could not complete that action. Please retry.",
        );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  function requestFor(action: string): string {
    const pendingRequest = requests.current.get(action);
    if (pendingRequest) return pendingRequest;
    const key = `bmt:home:${owner}:${action}`;
    let id: string = crypto.randomUUID();
    try {
      id = sessionStorage.getItem(key) ?? id;
      sessionStorage.setItem(key, id);
    } catch {
      /* Memory still preserves this request on retry. */
    }
    requests.current.set(action, id);
    return id;
  }
  function clearRequest(action: string) {
    requests.current.delete(action);
    try {
      sessionStorage.removeItem(`bmt:home:${owner}:${action}`);
    } catch {
      /* Optional. */
    }
  }
  async function roll() {
    if (!state) return;
    const req = rollRef.current ?? { family, request: crypto.randomUUID() };
    rollRef.current = req;
    setPendingRoll(req);
    try {
      if (!demo)
        sessionStorage.setItem(`bmt:home:${owner}:roll`, JSON.stringify(req));
    } catch {
      /* Retry remains in memory. */
    }
    await act(async () => {
      const result = demo
        ? demoRoll(state, req.family, req.request)
        : await rollHome(req.family, req.request);
      if (activeOwner.current === owner) {
        setReceipt(result.roll);
        clearRoll();
      }
      return result.state;
    }, "Roll opened. Your inventory is up to date.");
  }
  async function buy(item: HomeItem) {
    if (!state) return;
    const action = `buy:${item.id}`,
      request = requestFor(action);
    await act(async () => {
      let next: HomeState;
      if (demo) {
        next = structuredClone(state);
        const cost = homePrice(item);
        if (next.coins < cost) throw new Error("Not enough sample coins.");
        const row = next.inventory.find((i) => i.item_id === item.id);
        if ((item.kind === "wearable" && row) || (row && row.quantity >= 8))
          throw new Error("Item limit reached.");
        next.coins -= cost;
        if (row) row.quantity++;
        else next.inventory.push({ item_id: item.id, quantity: 1 });
      } else next = await buyHome(item.id, request);
      if (activeOwner.current === owner) clearRequest(action);
      return next;
    }, `${item.label} added to your inventory.`);
  }
  function choosePlacement(id: string) {
    const p = design?.layout.find((p) => p.instance_id === id);
    if (!p) return;
    setSelected(id);
    setNewItem(null);
    setCell({ x: p.x, y: p.y });
    setRotation(p.rotation);
  }
  function place(x: number, y: number) {
    if (!design || !state || pending.current) return;
    if (!selected && !newItem) {
      moveAvatar(x, y);
      return;
    }
    const existing = design.layout.find((p) => p.instance_id === selected),
      itemId = existing?.item_id ?? newItem;
    if (!itemId) return;
    const p: HomePlacement = {
      instance_id: existing?.instance_id ?? crypto.randomUUID(),
      item_id: itemId,
      x,
      y,
      rotation,
    };
    const problem = homePlacementError(p, design.layout, catalog);
    if (problem) {
      setError(problem);
      return;
    }
    if (
      !existing &&
      (design.layout.length >= 24 ||
        design.layout.filter((p) => p.item_id === itemId).length >=
          (quantities.get(itemId) ?? 0))
    ) {
      setError("All your copies are placed, or the room has reached 24 items.");
      return;
    }
    updateDesign({
      ...design,
      layout: [
        ...design.layout.filter((o) => o.instance_id !== p.instance_id),
        p,
      ],
    });
    setCell({ x, y });
    setSelected(p.instance_id);
    setNewItem(null);
    setError(null);
  }
  function occupied(x: number, y: number) {
    return design?.layout.some((p) => {
      const i = catalog.find((i) => i.id === p.item_id);
      if (!i || i.layer === 0) return false;
      const { w, h } = homeFootprint(i, p);
      return x >= p.x && x < p.x + w && y >= p.y && y < p.y + h;
    });
  }
  function moveAvatar(x: number, y: number) {
    if (x >= 0 && y >= 0 && x < 8 && y < 8 && !occupied(x, y))
      setAvatar({ x, y });
  }
  function resetDraft() {
    if (state) {
      setDraft({
        owner,
        revision: state.design_revision,
        design: structuredClone(state.design),
        base: JSON.stringify(state.design),
      });
      setSelected(null);
      setNewItem(null);
      setError(null);
      setNotice("Loaded your saved room.");
    }
  }
  const selectedItem = catalog.find(
    (i) =>
      i.id ===
      (newItem ??
        design?.layout.find((p) => p.instance_id === selected)?.item_id),
  );

  return (
    <div className="home-space">
      <div className="home-intro">
        <div>
          <span className="home-eyebrow">A place for your daily wins</span>
          <h1>My lime</h1>
          <p>Play a little. Collect something. Make this place yours.</p>
        </div>
        <Link to="/guess" className="home-text-link">
          Play Guess Nah ↗
        </Link>
      </div>
      {demo && (
        <p className="home-preview-note" role="status">
          Offline preview · sample balances reset on reload. Nothing here
          changes an account. Artwork is temporary.
        </p>
      )}
      {!demo && isGuest && (
        <p className="home-preview-note">
          Guest progress belongs to this account. Keep access to it; account
          linking and recovery are a later milestone.
        </p>
      )}
      {(error || query.error) && (
        <div className="home-error" role="alert">
          {error ??
            (query.error instanceof Error
              ? query.error.message
              : "Could not load your room.")}{" "}
          <button
            className="home-text-link"
            disabled={busy}
            onClick={() => {
              setError(null);
              if (!demo) void query.refetch();
            }}
          >
            {demo ? "Dismiss" : "Refresh balances"}
          </button>
        </div>
      )}
      {notice && (
        <p className="home-notice" role="status">
          {notice}
        </p>
      )}
      {!state || !design ? (
        <p>Loading your place…</p>
      ) : (
        <>
          <div className="home-wallet" aria-label="Your balances">
            <span>
              <b>{state.tickets}</b> rolls
            </span>
            <span>
              <b>{state.coins}</b> Lime Coins
            </span>
            <span>
              <b>{state.streak}</b> day streak
            </span>
            <span className="home-wallet-date">{state.business_date}</span>
          </div>
          {state.claimable_guess.map((id) => (
            <div className="home-reward-claim" key={id}>
              <span>Guess Nah complete · 1 roll + 30 coins ready</span>
              <button
                className="home-button"
                disabled={busy}
                onClick={() =>
                  void act(
                    () => claimGuessReward(id),
                    "Daily reward collected.",
                  )
                }
              >
                Collect
              </button>
            </div>
          ))}
          <nav className="home-tabs" aria-label="My lime sections">
            {(["room", "wardrobe", "collections", "arcade"] as Tab[]).map(
              (t) => (
                <button
                  key={t}
                  aria-current={tab === t ? "page" : undefined}
                  onClick={() => {
                    setTab(t);
                    setSelected(null);
                    setNewItem(null);
                  }}
                >
                  {t === "room"
                    ? "My room"
                    : t === "wardrobe"
                      ? "My character"
                      : t === "collections"
                        ? "Rolls & collection"
                        : "Little arcade"}
                </button>
              ),
            )}
          </nav>
          <div className="home-workbench">
            <section className="home-stage">
              <div className="home-stage-label">
                <span>{profile?.username ?? "Your"} place</span>
                <span>8 × 8</span>
              </div>
              <RoomScene
                design={design}
                catalog={catalog}
                avatar={avatar}
                selected={selected}
                placing={!!selected || !!newItem}
                onTile={tab === "room" ? place : moveAvatar}
                onSelect={(id) => {
                  if (tab === "room" && !busy) choosePlacement(id);
                }}
                onStep={(dx, dy) => moveAvatar(avatar.x + dx, avatar.y + dy)}
              />
              <p className="home-stage-hint">
                {selectedItem
                  ? `Placing ${selectedItem.label} · tap a floor tile`
                  : "Tap an empty tile to move. Arrow keys work here too."}
              </p>
            </section>
            <aside className="home-panel home-room-notes">
              <span className="home-eyebrow">Your corner</span>
              <h2>
                {tab === "wardrobe"
                  ? "Dress for the lime"
                  : tab === "collections"
                    ? "Something to collect"
                    : tab === "arcade"
                      ? "Take a little break"
                      : "Move things around"}
              </h2>
              <p>
                {tab === "wardrobe"
                  ? "Skin tones and your starter wardrobe are always free. Pick a slot below and try something on."
                  : tab === "collections"
                    ? "Use a roll for a surprise, or save coins for the exact item you want."
                    : tab === "arcade"
                      ? "Short games with the same character. Pan Memory unlocks once; Coconut Catch is always open."
                      : "Choose furniture below, then tap a tile. Select a placed piece to move, rotate, or put it away."}
              </p>
              <div className="home-portrait">
                <svg
                  viewBox="-55 -85 110 100"
                  role="img"
                  aria-label="Your current character"
                >
                  <PixelAvatar design={design} catalog={catalog} scale={1.6} />
                </svg>
              </div>
              <div className="home-actions">
                <button
                  className="home-button"
                  disabled={busy || !dirty}
                  onClick={() =>
                    void act(
                      async () =>
                        demo
                          ? {
                              ...sample,
                              design: structuredClone(design),
                              design_revision: sample.design_revision + 1,
                            }
                          : await saveHome(
                              design,
                              draft?.revision ?? state.design_revision,
                            ),
                      "Room and outfit saved.",
                      true,
                    )
                  }
                >
                  {busy ? "Working…" : dirty ? "Save changes" : "Saved"}
                </button>
                <button
                  className="home-button quiet"
                  disabled={busy || !dirty}
                  onClick={resetDraft}
                >
                  Reset changes
                </button>
              </div>
              {dirty && (
                <p className="home-small">
                  Room and outfit edits save together. Save before leaving this
                  page.
                </p>
              )}
              {draft && draft.revision !== state.design_revision && dirty && (
                <p className="home-error">
                  A newer design was saved elsewhere. Reset changes to load it
                  before editing again.
                </p>
              )}
            </aside>
          </div>
          {tab === "room" && (
            <fieldset
              className="home-panel"
              disabled={busy}
              aria-label="Furniture and finishes"
            >
              <div className="home-panel-heading">
                <span className="home-eyebrow">Make yourself at home</span>
                <h2>Furniture & finishes</h2>
              </div>
              <div className="home-controls">
                <label>
                  Floor{" "}
                  <select
                    value={design.floor}
                    onChange={(e) =>
                      updateDesign({ ...design, floor: Number(e.target.value) })
                    }
                  >
                    <option value={0}>Warm wood</option>
                    <option value={1}>Sage tile</option>
                    <option value={2}>Blue tile</option>
                  </select>
                </label>
                <label>
                  Walls{" "}
                  <select
                    value={design.wall}
                    onChange={(e) =>
                      updateDesign({ ...design, wall: Number(e.target.value) })
                    }
                  >
                    <option value={0}>Cream</option>
                    <option value={1}>Sea glass</option>
                    <option value={2}>Lilac</option>
                  </select>
                </label>
              </div>
              <div className="home-items">
                {catalog
                  .filter((i) => i.kind === "furniture" && quantities.has(i.id))
                  .map((i) => {
                    const used = design.layout.filter(
                        (p) => p.item_id === i.id,
                      ).length,
                      available = (quantities.get(i.id) ?? 0) - used;
                    return (
                      <div
                        key={i.id}
                        className={`home-item ${newItem === i.id ? "is-selected" : ""}`}
                      >
                        <button
                          className="home-furniture-choice"
                          disabled={available < 1}
                          onClick={() => {
                            setNewItem(i.id);
                            setSelected(null);
                            setRotation(0);
                            setError(null);
                          }}
                        >
                          <ItemPicture item={i} />
                          <b>{i.label}</b>
                          <span>
                            {available} available · {used} placed
                          </span>
                        </button>
                        <button
                          className="home-button quiet"
                          disabled={
                            busy ||
                            state.coins < homePrice(i) ||
                            (quantities.get(i.id) ?? 0) >= 8
                          }
                          onClick={() => void buy(i)}
                        >
                          Extra copy · {homePrice(i)} coins
                        </button>
                      </div>
                    );
                  })}
              </div>
              <div className="home-placement-controls">
                <label>
                  Placed item{" "}
                  <select
                    value={selected ?? ""}
                    onChange={(e) =>
                      e.target.value
                        ? choosePlacement(e.target.value)
                        : (setSelected(null), setNewItem(null))
                    }
                  >
                    <option value="">Select an item</option>
                    {design.layout.map((p, i) => (
                      <option key={p.instance_id} value={p.instance_id}>
                        {catalog.find((c) => c.id === p.item_id)?.label} #
                        {i + 1}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Column{" "}
                  <select
                    value={cell.x}
                    onChange={(e) =>
                      setCell((c) => ({ ...c, x: Number(e.target.value) }))
                    }
                  >
                    {Array.from({ length: 8 }, (_, i) => (
                      <option key={i} value={i}>
                        {i + 1}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Row{" "}
                  <select
                    value={cell.y}
                    onChange={(e) =>
                      setCell((c) => ({ ...c, y: Number(e.target.value) }))
                    }
                  >
                    {Array.from({ length: 8 }, (_, i) => (
                      <option key={i} value={i}>
                        {i + 1}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  className="home-button quiet"
                  disabled={!selectedItem}
                  onClick={() => setRotation((r) => (r === 0 ? 1 : 0))}
                >
                  Rotate · {rotation === 0 ? "↗" : "↖"}
                </button>
                <button
                  className="home-button"
                  disabled={!selectedItem}
                  onClick={() => place(cell.x, cell.y)}
                >
                  Place here
                </button>
                <button
                  className="home-button quiet"
                  disabled={!selected}
                  onClick={() => {
                    updateDesign({
                      ...design,
                      layout: design.layout.filter(
                        (p) => p.instance_id !== selected,
                      ),
                    });
                    setSelected(null);
                  }}
                >
                  Put away
                </button>
                <button
                  className="home-text-link"
                  onClick={() => {
                    setSelected(null);
                    setNewItem(null);
                  }}
                >
                  Done placing
                </button>
              </div>
            </fieldset>
          )}
          {tab === "wardrobe" && (
            <fieldset
              className="home-panel"
              disabled={busy}
              aria-label="Character wardrobe"
            >
              <div className="home-panel-heading">
                <span className="home-eyebrow">Start with you</span>
                <h2>Character</h2>
              </div>
              <div className="home-skins" aria-label="Skin tone">
                {HOME_SKINS.map((c, i) => (
                  <button
                    key={c}
                    style={{ background: c }}
                    aria-label={`Skin tone ${i + 1}`}
                    aria-pressed={design.skin === i}
                    onClick={() => updateDesign({ ...design, skin: i })}
                  />
                ))}
              </div>
              <div className="home-filter" aria-label="Clothing slot">
                {slots.map((s) => (
                  <button
                    key={s}
                    aria-pressed={slot === s}
                    onClick={() => setSlot(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <div className="home-items">
                {slot === "hat" && (
                  <button
                    className="home-item"
                    onClick={() => {
                      const outfit = { ...design.outfit };
                      delete outfit.hat;
                      updateDesign({ ...design, outfit });
                    }}
                  >
                    <span className="home-no-hat">—</span>
                    <b>No hat</b>
                  </button>
                )}
                {catalog
                  .filter((i) => i.slot === slot && quantities.has(i.id))
                  .map((i) => (
                    <button
                      className={`home-item ${design.outfit[slot] === i.id ? "is-selected" : ""}`}
                      key={i.id}
                      onClick={() =>
                        updateDesign({
                          ...design,
                          outfit: { ...design.outfit, [slot]: i.id },
                        })
                      }
                    >
                      <ItemPicture item={i} />
                      <b>{i.label}</b>
                      <span>
                        {i.starter ? "Starter" : HOME_RARITIES[i.rarity]}
                      </span>
                    </button>
                  ))}
              </div>
              {!catalog.some(
                (i) => i.slot === slot && quantities.has(i.id),
              ) && (
                <p className="home-small">
                  You can find {slot} items in the wardrobe collection.
                </p>
              )}
            </fieldset>
          )}
          {tab === "collections" && (
            <section className="home-panel">
              <div className="home-panel-heading">
                <span className="home-eyebrow">Earned through play</span>
                <h2>Rolls & collection</h2>
              </div>
              <div className="home-filter">
                {(["wardrobe", "room"] as HomeFamily[]).map((f) => (
                  <button
                    key={f}
                    aria-pressed={family === f}
                    disabled={
                      busy || (!!pendingRoll && pendingRoll.family !== f)
                    }
                    onClick={() => setFamily(f)}
                  >
                    {f === "wardrobe" ? "Wardrobe" : "Room pieces"}
                  </button>
                ))}
              </div>
              <p>
                Base odds: Common 60% · Rare 28% · Epic 10% · Legendary 2%.
                Guaranteed Epic or better within 10 rolls; Legendary within 40.
                Each collection keeps its progress.
              </p>
              <p className="home-pity">
                {(() => {
                  const p = state.pity.find((p) => p.family === family)!;
                  return (
                    <>
                      Epic+ in at most <b>{10 - p.epic_misses}</b> · Legendary
                      in at most <b>{40 - p.legendary_misses}</b>
                    </>
                  );
                })()}
              </p>
              <div className="home-actions">
                <button
                  className="home-button"
                  disabled={busy || (state.tickets < 1 && !pendingRoll)}
                  onClick={() => void roll()}
                >
                  {pendingRoll
                    ? "Retry previous roll"
                    : demo
                      ? "Open sample roll"
                      : "Use 1 roll"}
                </button>
                <span className="home-small">
                  Duplicates become 5 / 15 / 40 / 100 coins by rarity.
                </span>
              </div>
              {receipt && (
                <div className="home-roll-receipt" role="status">
                  <span className="home-eyebrow">
                    {receipt.duplicate
                      ? "Already in your collection"
                      : "New in your collection"}
                  </span>
                  <b>{catalog.find((i) => i.id === receipt.item_id)?.label}</b>
                  <span>
                    {receipt.duplicate
                      ? `+${receipt.coins_returned} Lime Coins`
                      : "Ready to equip or place below."}
                  </span>
                </div>
              )}
              <details className="home-odds">
                <summary>Exact odds for your next {family} roll</summary>
                <p className="home-small">
                  Percentages are rounded to four decimal places. Guarantees
                  adjust these probabilities. On a guaranteed Legendary, unowned
                  Legendary items are preferred while any remain.
                </p>
                <table>
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Rarity</th>
                      <th>Chance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.odds[family].map((o) => (
                      <tr key={o.item_id}>
                        <td>
                          {catalog.find((i) => i.id === o.item_id)?.label}
                        </td>
                        <td>{HOME_RARITIES[o.rarity]}</td>
                        <td>{o.percent.toFixed(4)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
              <div className="home-items collection">
                {catalog
                  .filter((i) => i.family === family)
                  .map((i) => (
                    <div key={i.id} className={`home-item rarity-${i.rarity}`}>
                      <ItemPicture item={i} />
                      <span className="home-rarity">
                        {HOME_RARITIES[i.rarity]}
                      </span>
                      <b>{i.label}</b>
                      <span>
                        {quantities.has(i.id)
                          ? `Owned${i.kind === "furniture" ? ` ×${quantities.get(i.id)}` : ""}`
                          : "Not collected"}
                      </span>
                      <button
                        className="home-button quiet"
                        disabled={
                          busy ||
                          state.coins < homePrice(i) ||
                          (i.kind === "wearable" && quantities.has(i.id)) ||
                          (quantities.get(i.id) ?? 0) >= 8
                        }
                        onClick={() => void buy(i)}
                      >
                        {i.kind === "wearable" && quantities.has(i.id)
                          ? "Owned"
                          : `Buy · ${homePrice(i)} coins`}
                      </button>
                    </div>
                  ))}
              </div>
              <details className="home-odds">
                <summary>Recent rolls</summary>
                <ul>
                  {state.recent_rolls.map((r) => (
                    <li key={r.request_id}>
                      {catalog.find((i) => i.id === r.item_id)?.label} ·{" "}
                      {r.family}
                      {r.duplicate
                        ? ` · duplicate +${r.coins_returned} coins`
                        : " · new"}
                    </li>
                  ))}
                </ul>
              </details>
            </section>
          )}
          {tab === "arcade" && (
            <div className="home-arcade">
              <PanMemory
                state={state}
                busy={busy}
                onUnlock={() =>
                  void act(
                    async () =>
                      demo
                        ? {
                            ...sample,
                            coins: sample.coins - 150,
                            pan_unlocked: true,
                          }
                        : await unlockPan(requestFor("unlock-pan")),
                    "Pan Memory unlocked permanently.",
                  )
                }
                onStart={() =>
                  void act(
                    async () =>
                      demo
                        ? {
                            ...sample,
                            pan: {
                              id: crypto.randomUUID(),
                              pattern: [1, 3, 2, 4, 1, 2],
                              status: "playing",
                              activity_date: "Preview",
                              ready_at: new Date(
                                Date.now() + 8000,
                              ).toISOString(),
                              answer: null,
                            },
                          }
                        : await startPan(),
                    "Watch the six notes.",
                  )
                }
                onFinish={(answer) =>
                  void act(
                    async () =>
                      demo
                        ? {
                            ...sample,
                            tickets: sample.tickets + 1,
                            coins: sample.coins + 10,
                            pan: {
                              ...sample.pan!,
                              status:
                                JSON.stringify(answer) ===
                                JSON.stringify(sample.pan!.pattern)
                                  ? "won"
                                  : "lost",
                              answer,
                            },
                          }
                        : await finishPan(state.pan!.id, answer),
                    "Pan Memory finished. Daily reward collected.",
                  )
                }
              />
              <CoconutCatch design={design} catalog={catalog} />
            </div>
          )}
          <p className="home-footnote">
            Character and furniture art are placeholders for the asset pass.
            Earn rolls by finishing published dailies; draft practice earns no
            currency.
          </p>
        </>
      )}
    </div>
  );
}
