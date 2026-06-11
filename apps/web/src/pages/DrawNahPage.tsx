import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { DrawNahCategory, DrawRoomSettings } from "@bmt/shared";
import { DRAW_NAH_CATEGORIES, DRAW_NAH_CATEGORY_LABELS } from "@bmt/shared";
import { getSocket } from "@/features/draw-nah/socket";
import { useDrawSocket } from "@/features/draw-nah/useDrawSocket";
import { useDrawStore } from "@/features/draw-nah/store";
import { Canvas } from "@/features/draw-nah/Canvas";
import { Chat } from "@/features/draw-nah/Chat";
import { PlayerList } from "@/features/draw-nah/PlayerList";
import { WordPicker } from "@/features/draw-nah/WordPicker";
import { EndScreen } from "@/features/draw-nah/EndScreen";
import { RoundSummaryModal } from "@/features/draw-nah/RoundSummaryModal";
import { useRoundCountdown } from "@/features/draw-nah/useRoundCountdown";
import { useAudioUnlock, useMuted } from "@/features/draw-nah/useSound";
import { useAuth } from "@/lib/auth";

export default function DrawNahPage() {
  const { roomCode } = useParams<{ roomCode?: string }>();
  if (roomCode) return <RoomView roomCode={roomCode.toUpperCase()} />;
  return <Lobby />;
}

// ── Pre-room: create or join ────────────────────────────────────────────────
function Lobby() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const nickname = profile?.username ?? "";
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function create() {
    setError(null);
    if (!nickname) return setError("Profile loading…");
    setBusy(true);
    getSocket().emit("room:create", { nickname }, (res) => {
      setBusy(false);
      if (!res.ok) return setError(res.error);
      navigate(`/draw/${res.room_code}`);
    });
  }

  function join() {
    setError(null);
    if (!nickname) return setError("Profile loading…");
    if (code.trim().length !== 6) return setError("Room codes are 6 characters.");
    setBusy(true);
    const upper = code.trim().toUpperCase();
    getSocket().emit("room:join", { nickname, room_code: upper }, (res) => {
      setBusy(false);
      if (!res.ok) return setError(res.error);
      navigate(`/draw/${upper}`);
    });
  }

  return (
    <div className="mx-auto max-w-xl">
      <header className="text-center mb-6">
        <div className="inline-flex items-center gap-1 rounded-full bg-brand-red/10 text-brand-red px-3 py-1 text-xs font-bold uppercase tracking-widest">
          Multiplayer
        </div>
        <h1 className="font-display text-7xl md:text-8xl tracking-wider mt-3 leading-none">
          <span className="text-brand-red">Draw</span> Nah
        </h1>
        <p className="text-ink-muted mt-3">
          Trini-style sketch & guess. 2–12 players.
        </p>
      </header>

      <div className="rounded-2xl border border-line bg-gradient-to-b from-surface-2 to-surface p-6 space-y-5 shadow-sm">
        <div className="flex items-center justify-between rounded-xl bg-surface px-4 py-3 border border-line">
          <span className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
            Playing as
          </span>
          <span className="font-mono font-bold text-brand-red">
            {nickname || "…"}
          </span>
        </div>

        <button
          type="button"
          onClick={create}
          disabled={busy}
          className="w-full rounded-xl bg-brand-red text-white py-3.5 text-base font-semibold hover:bg-brand-red-dim disabled:opacity-50 transition-all hover:shadow-glow"
        >
          Create new room
        </button>

        <div className="flex items-center gap-3 text-ink-muted text-[10px] uppercase tracking-widest font-semibold">
          <div className="flex-1 h-px bg-line" />
          or join a room
          <div className="flex-1 h-px bg-line" />
        </div>

        <div className="flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
            placeholder="ROOM CODE"
            className="flex-1 rounded-xl border border-line bg-surface px-4 py-3 font-mono uppercase tracking-[0.4em] text-center text-lg focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/20"
            maxLength={6}
          />
          <button
            type="button"
            onClick={join}
            disabled={busy}
            className="rounded-xl border-2 border-brand-red text-brand-red px-5 py-3 font-semibold hover:bg-brand-red hover:text-white disabled:opacity-50 transition-colors"
          >
            Join
          </button>
        </div>

        {error && (
          <div className="rounded-lg bg-feedback-wrong/10 border border-feedback-wrong/30 px-3 py-2 text-sm text-feedback-wrong">
            {error}
          </div>
        )}
      </div>

      <p className="text-center text-xs text-ink-muted mt-4">
        Change your name via the user menu (top-right).
      </p>
    </div>
  );
}

// ── In-room view ────────────────────────────────────────────────────────────
function RoomView({ roomCode }: { roomCode: string }) {
  useDrawSocket();
  useAudioUnlock();
  const navigate = useNavigate();
  const room = useDrawStore((s) => s.room);
  const myId = useDrawStore((s) => s.myId);
  const myWord = useDrawStore((s) => s.myWord);
  const myImageUrl = useDrawStore((s) => s.myImageUrl);
  const guessMask = useDrawStore((s) => s.guessMask);
  const currentSummary = useDrawStore((s) => s.currentSummary);
  const [joinAttempted, setJoinAttempted] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [muted, setMuted] = useMuted();
  const seconds = useRoundCountdown();

  const { profile } = useAuth();
  const nickname = profile?.username ?? "";

  useEffect(() => {
    if (joinAttempted) return;
    setJoinAttempted(true);
    const s = getSocket();
    const tryJoin = () => {
      if (!nickname || nickname.trim().length < 2) {
        navigate("/draw");
        return;
      }
      s.emit(
        "room:join",
        { nickname: nickname.trim(), room_code: roomCode },
        (res) => {
          if (!res.ok) setJoinError(res.error);
        },
      );
    };
    if (s.connected) tryJoin();
    else s.once("connect", tryJoin);
  }, [joinAttempted, nickname, navigate, roomCode]);

  function leave() {
    getSocket().emit("room:leave");
    useDrawStore.getState().resetAll();
    navigate("/draw");
  }

  function tryLeave() {
    if (room && room.state !== "lobby" && room.state !== "game_over") {
      setShowLeaveConfirm(true);
      return;
    }
    leave();
  }

  if (joinError) {
    return (
      <div className="mx-auto max-w-md card text-center">
        <h2 className="text-xl font-bold">Couldn't join</h2>
        <p className="text-ink-muted mt-1">{joinError}</p>
        <button
          type="button"
          onClick={() => navigate("/draw")}
          className="btn-primary mt-4 inline-flex"
        >
          Back
        </button>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-line bg-surface-2 p-8 text-center">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand-red/10">
          <span className="h-3 w-3 rounded-full bg-brand-red animate-pulse" />
        </div>
        <p className="text-ink-muted mt-3">Connecting to room {roomCode}…</p>
      </div>
    );
  }

  const isDrawer = room.current_drawer_id === myId;
  const isHost = room.players.find((p) => p.socket_id === myId)?.is_host;
  const drawing = room.state === "drawing";
  const inLobby = room.state === "lobby";
  const lowTime = drawing && seconds !== null && seconds <= 10;

  return (
    <>
      {inLobby ? (
        <LobbyCard
          room={room}
          isHost={!!isHost}
          onLeave={tryLeave}
          muted={muted}
          setMuted={setMuted}
        />
      ) : (
        <GameView
          isDrawer={isDrawer}
          drawing={drawing}
          myWord={myWord}
          myImageUrl={myImageUrl}
          guessMask={guessMask}
          room={room}
          seconds={seconds}
          lowTime={lowTime}
          muted={muted}
          setMuted={setMuted}
          onLeave={tryLeave}
        />
      )}

      {room.state === "round_end" && currentSummary && (
        <RoundSummaryModal summary={currentSummary} />
      )}

      {showLeaveConfirm && (
        <LeaveConfirm
          onCancel={() => setShowLeaveConfirm(false)}
          onLeave={leave}
        />
      )}
    </>
  );
}

// ── Lobby card (centered, single panel) ─────────────────────────────────────
function LobbyCard({
  room,
  isHost,
  onLeave,
  muted,
  setMuted,
}: {
  room: NonNullable<ReturnType<typeof useDrawStore.getState>["room"]>;
  isHost: boolean;
  onLeave: () => void;
  muted: boolean;
  setMuted: (v: boolean) => void;
}) {
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  function copy(kind: "code" | "link") {
    const value =
      kind === "code" ? room.room_code : window.location.href;
    void navigator.clipboard.writeText(value);
    setCopied(kind);
    setTimeout(() => setCopied(null), 1200);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-3xl border border-line bg-gradient-to-b from-surface-2 to-surface shadow-xl overflow-hidden">
        <header className="px-5 md:px-6 py-4 md:py-5 border-b border-line flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-ink-muted">
              Room code
            </div>
            <button
              type="button"
              onClick={() => copy("code")}
              className="mt-1 inline-flex items-center gap-3 group"
              title="Click to copy"
            >
              <span className="font-mono font-bold text-2xl md:text-3xl tracking-[0.3em] text-brand-red leading-none">
                {room.room_code}
              </span>
              <span className="text-xs text-ink-muted group-hover:text-brand-red transition-colors">
                {copied === "code" ? "✓" : "📋"}
              </span>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => copy("link")}
              className="rounded-xl border border-line px-3 py-2 text-xs font-semibold hover:bg-surface-2 transition-colors"
              title="Copy invite link"
            >
              {copied === "link" ? "✓ Copied" : "Copy link"}
            </button>
            <button
              type="button"
              onClick={() => setMuted(!muted)}
              className="rounded-xl border border-line w-9 h-9 flex items-center justify-center hover:bg-surface-2 transition-colors"
              aria-label={muted ? "Unmute" : "Mute"}
            >
              <span aria-hidden>{muted ? "🔇" : "🔊"}</span>
            </button>
            <button
              type="button"
              onClick={onLeave}
              className="rounded-xl border border-line px-3 py-2 text-xs font-semibold hover:bg-surface-2 transition-colors"
            >
              Leave
            </button>
          </div>
        </header>

        <section className="px-5 md:px-6 py-4 md:py-5 border-b border-line">
          <PlayerList />
        </section>

        <section className="px-5 md:px-6 py-4 md:py-5">
          <LobbySettings
            isHost={isHost}
            canStart={room.players.length >= 2}
            embedded
          />
        </section>
      </div>
    </div>
  );
}

// ── In-game top bar (slim app bar) ──────────────────────────────────────────
function GameTopBar({
  muted,
  setMuted,
  onLeave,
}: {
  muted: boolean;
  setMuted: (v: boolean) => void;
  onLeave: () => void;
}) {
  return (
    <div className="px-3 md:px-5 py-2 bg-surface border-b border-line flex items-center justify-between shrink-0">
      <button
        type="button"
        onClick={onLeave}
        className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
        title="Leave room"
      >
        <span className="text-ink-muted text-xl leading-none">‹</span>
        <span className="font-display text-base md:text-lg tracking-wider flex items-baseline gap-0.5">
          <span className="text-brand-red">BIG</span>
          <span className="text-ink">MAN</span>
          <span className="text-brand-red">THING</span>
        </span>
      </button>
      <button
        type="button"
        onClick={() => setMuted(!muted)}
        className="p-1.5 rounded-lg hover:bg-surface-2 transition-colors text-base"
        aria-label={muted ? "Unmute" : "Mute"}
        title={muted ? "Unmute" : "Mute"}
      >
        <span aria-hidden>{muted ? "🔇" : "🔊"}</span>
      </button>
    </div>
  );
}

// ── Game info bar with progress-bar timer ───────────────────────────────────
function GameInfoBar({
  room,
  seconds,
  lowTime,
  drawerName,
  isDrawer,
  myWord,
  guessMask,
}: {
  room: NonNullable<ReturnType<typeof useDrawStore.getState>["room"]>;
  seconds: number | null;
  lowTime: boolean;
  drawerName: string | null;
  isDrawer: boolean;
  myWord: string | null;
  guessMask: { length: number; mask: string } | null;
}) {
  const drawing = room.state === "drawing";
  const totalSec = room.settings.draw_time_seconds;
  const pct =
    drawing && seconds !== null
      ? Math.max(0, Math.min(100, (seconds / totalSec) * 100))
      : 0;

  return (
    <div className="px-3 md:px-5 py-1.5 md:py-2 bg-surface-2 border-b border-line shrink-0">
      <div className="flex items-center gap-2 md:gap-3 flex-wrap">
        <span className="text-xs text-ink-muted shrink-0">
          Round {room.current_round}/{room.settings.rounds}
        </span>
        <span className="h-4 w-px bg-line" />
        {isDrawer ? (
          <span className="text-xs md:text-sm px-2.5 py-0.5 rounded-full bg-brand-red/15 border border-brand-red/30 text-brand-red font-semibold truncate max-w-[60vw] md:max-w-none">
            🖌️ Yuh drawing{drawing && myWord ? `: ${myWord}` : ""}
          </span>
        ) : drawerName ? (
          <span className="text-xs md:text-sm px-2.5 py-0.5 rounded-full bg-brand-red/15 border border-brand-red/30 text-brand-red font-semibold truncate max-w-[50vw] md:max-w-none">
            🖌️ {drawerName} drawing
          </span>
        ) : null}

        {drawing && !isDrawer && guessMask && (
          <>
            <div className="hidden md:block flex-1" />
            <span className="font-mono text-base md:text-xl tracking-[0.25em] md:tracking-[0.3em] text-center shrink-0">
              {guessMask.mask.split("").join(" ")}
            </span>
          </>
        )}

        {drawing && seconds !== null && (
          <span
            className={`ml-auto font-mono text-sm font-bold tabular-nums shrink-0 ${
              lowTime ? "text-brand-red" : "text-ink"
            }`}
          >
            {seconds}s
          </span>
        )}
      </div>

      {drawing && (
        <div className="mt-1.5 h-1.5 w-full rounded-full bg-surface-3 overflow-hidden">
          <div
            className={`h-full rounded-full transition-[width] duration-200 ease-linear ${
              lowTime ? "bg-brand-red" : "bg-emerald-500"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

// ── Game view: full-screen 3-column app shell ───────────────────────────────
function GameView({
  isDrawer,
  drawing,
  myWord,
  myImageUrl,
  guessMask,
  room,
  seconds,
  lowTime,
  muted,
  setMuted,
  onLeave,
}: {
  isDrawer: boolean;
  drawing: boolean;
  myWord: string | null;
  myImageUrl: string | null;
  guessMask: { length: number; mask: string } | null;
  room: NonNullable<ReturnType<typeof useDrawStore.getState>["room"]>;
  seconds: number | null;
  lowTime: boolean;
  muted: boolean;
  setMuted: (v: boolean) => void;
  onLeave: () => void;
}) {
  const [mobilePanel, setMobilePanel] = useState<"none" | "players" | "chat">(
    "none",
  );
  // Reset mobile panel when phase changes
  useEffect(() => {
    setMobilePanel("none");
  }, [room.state]);

  const drawer = room.players.find(
    (p) => p.socket_id === room.current_drawer_id,
  );
  const drawerName = drawer ? drawer.nickname : null;

  return (
    <div
      className="fixed inset-0 z-40 bg-bg flex flex-col overflow-hidden"
      style={{
        paddingTop: "env(safe-area-inset-top, 0px)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <GameTopBar muted={muted} setMuted={setMuted} onLeave={onLeave} />
      <GameInfoBar
        room={room}
        seconds={seconds}
        lowTime={lowTime}
        drawerName={drawerName}
        isDrawer={isDrawer}
        myWord={myWord}
        guessMask={guessMask}
      />

      {/* Main content */}
      <div className="flex-1 min-h-0 px-2 py-2 md:px-3 md:py-3 relative">
        {/* Desktop: 3-column grid */}
        <div className="hidden md:grid md:grid-cols-[220px_minmax(0,1fr)_300px] lg:grid-cols-[240px_minmax(0,1fr)_320px] gap-3 h-full">
          {/* Left: PlayerList + DrawerReference */}
          <aside className="flex flex-col gap-2 min-h-0">
            <div className="flex-1 min-h-0">
              <PlayerList fill />
            </div>
            {isDrawer && drawing && (
              <DrawerReference word={myWord} imageUrl={myImageUrl} />
            )}
          </aside>

          {/* Center: Canvas / pickers / end-screen */}
          <main className="flex flex-col min-h-0 min-w-0">
            {(drawing || room.state === "round_end") && (
              <Canvas canDraw={isDrawer && drawing} />
            )}
            <WordPicker />
            <EndScreen />
          </main>

          {/* Right: Chat */}
          <aside className="flex flex-col min-h-0">
            <Chat />
          </aside>
        </div>

        {/* Mobile: full-width canvas, slide-over panels via floating buttons */}
        <div className="md:hidden flex flex-col h-full min-h-0 overflow-y-auto pb-16">
          {(drawing || room.state === "round_end") && (
            <Canvas canDraw={isDrawer && drawing} />
          )}
          <WordPicker />
          <EndScreen />

          {isDrawer && drawing && myImageUrl && (
            <div className="flex items-center gap-2 mt-1 px-2 py-1.5 rounded-lg bg-surface-2 border border-brand-red/30 shrink-0">
              <img
                src={myImageUrl}
                alt={myWord ?? ""}
                className="w-9 h-9 object-cover rounded bg-surface-3"
              />
              <span className="text-xs font-semibold text-brand-red truncate">
                {myWord}
              </span>
            </div>
          )}
        </div>

        {/* Mobile: Players slide-over */}
        {mobilePanel === "players" && (
          <div className="md:hidden fixed inset-0 z-40">
            <button
              type="button"
              className="absolute inset-0 bg-black/55"
              onClick={() => setMobilePanel("none")}
              aria-label="Close players panel"
            />
            <div className="relative h-full w-72 max-w-[85%] bg-bg shadow-2xl flex flex-col">
              <div className="flex-1 min-h-0 p-2">
                <PlayerList fill onClose={() => setMobilePanel("none")} />
              </div>
            </div>
          </div>
        )}

        {/* Mobile: Chat slide-over (bottom sheet) */}
        {mobilePanel === "chat" && (
          <div className="md:hidden fixed inset-0 z-40 flex flex-col">
            <div
              className="flex-1 bg-black/50"
              onClick={() => setMobilePanel("none")}
            />
            <div className="h-[65vh] min-h-[280px] bg-bg border-t border-line shadow-2xl rounded-t-2xl overflow-hidden flex flex-col">
              <div className="flex-1 min-h-0">
                <Chat onClose={() => setMobilePanel("none")} />
              </div>
            </div>
          </div>
        )}

        {/* Mobile: floating toggle buttons */}
        {mobilePanel === "none" && (
          <div
            className="md:hidden fixed bottom-3 left-3 right-3 z-30 flex justify-between pointer-events-none"
            style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
          >
            <button
              type="button"
              onClick={() => setMobilePanel("players")}
              className="pointer-events-auto flex items-center gap-1.5 px-4 py-2.5 rounded-full shadow-lg border border-line bg-surface-2 text-sm font-semibold"
            >
              👥{" "}
              <span className="text-xs text-ink-muted">
                {room.players.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setMobilePanel("chat")}
              className="pointer-events-auto flex items-center gap-1.5 px-4 py-2.5 rounded-full shadow-lg border border-line bg-surface-2 text-sm font-semibold"
            >
              💬
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Drawer reference image ──────────────────────────────────────────────────
function DrawerReference({
  word,
  imageUrl,
}: {
  word: string | null;
  imageUrl: string | null;
}) {
  return (
    <div className="rounded-2xl border-2 border-brand-red/40 bg-surface-2 overflow-hidden flex flex-col">
      <div className="px-3 py-1.5 bg-brand-red/10 border-b border-brand-red/20 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest text-brand-red">
          Reference
        </span>
        <span className="text-[10px] text-ink-muted">only you</span>
      </div>
      <div className="bg-surface-3 aspect-square flex items-center justify-center">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={word ?? "reference"}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="p-4 text-center text-ink-muted text-xs">
            No image — go off the word!
          </div>
        )}
      </div>
    </div>
  );
}

// ── Lobby settings (host) ───────────────────────────────────────────────────
function LobbySettings({
  isHost,
  canStart,
  embedded = false,
}: {
  isHost: boolean;
  canStart: boolean;
  embedded?: boolean;
}) {
  const room = useDrawStore((s) => s.room)!;
  const settings = room.settings;

  function update(partial: Partial<DrawRoomSettings>) {
    getSocket().emit("room:settings", partial);
  }

  function start() {
    getSocket().emit("game:start");
  }

  return (
    <div
      className={`space-y-4 ${
        embedded ? "" : "rounded-2xl border border-line bg-surface-2 p-4 md:p-5"
      }`}
    >
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-display text-lg tracking-wide">Game settings</h2>
          <p className="text-xs text-ink-muted">
            {isHost
              ? "Set the rules and start."
              : "Waiting for the host."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <InlineStepper
            label="Rounds"
            value={settings.rounds}
            min={1}
            max={10}
            step={1}
            disabled={!isHost}
            onChange={(v) => update({ rounds: v })}
          />
          <InlineStepper
            label="Time"
            value={settings.draw_time_seconds}
            min={30}
            max={180}
            step={15}
            suffix="s"
            disabled={!isHost}
            onChange={(v) => update({ draw_time_seconds: v })}
          />
        </div>
      </div>

      <fieldset>
        <legend className="text-[10px] font-semibold uppercase tracking-widest text-ink-muted">
          Categories{" "}
          <span className="font-normal normal-case tracking-normal">
            ·{" "}
            {settings.categories.length === 0
              ? "all"
              : `${settings.categories.length} selected`}
          </span>
        </legend>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {DRAW_NAH_CATEGORIES.map((cat) => {
            const active = settings.categories.includes(cat);
            return (
              <button
                key={cat}
                type="button"
                disabled={!isHost}
                onClick={() => {
                  const next: DrawNahCategory[] = active
                    ? settings.categories.filter((x) => x !== cat)
                    : [...settings.categories, cat];
                  update({ categories: next });
                }}
                className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                  active
                    ? "border-brand-red bg-brand-red text-white"
                    : "border-line text-ink-muted hover:border-ink hover:text-ink"
                } disabled:opacity-60 disabled:cursor-not-allowed`}
              >
                {DRAW_NAH_CATEGORY_LABELS[cat]}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
        <CompactToggle
          checked={settings.show_hints}
          disabled={!isHost}
          onChange={(v) => update({ show_hints: v })}
          label="Reveal hints"
        />
        <CompactToggle
          checked={settings.use_aliases}
          disabled={!isHost}
          onChange={(v) => update({ use_aliases: v })}
          label="Accept aliases"
        />
      </div>

      {isHost ? (
        <button
          type="button"
          onClick={start}
          disabled={!canStart}
          className="w-full rounded-xl bg-brand-red text-white py-2.5 text-sm font-semibold hover:bg-brand-red-dim disabled:opacity-50 hover:shadow-glow transition-all"
        >
          {canStart ? "Start game" : "Need 2+ players"}
        </button>
      ) : (
        <div className="text-center text-xs text-ink-muted italic">
          Waiting for host to start…
        </div>
      )}
    </div>
  );
}

function InlineStepper({
  label,
  value,
  min,
  max,
  step,
  suffix,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  disabled?: boolean;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-line bg-surface pl-3 pr-1 py-0.5">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-ink-muted">
        {label}
      </span>
      <button
        type="button"
        disabled={disabled || value <= min}
        onClick={() => onChange(Math.max(min, value - step))}
        className="h-6 w-6 rounded-full text-sm font-bold text-ink-muted hover:bg-surface-2 disabled:opacity-30"
        aria-label={`Decrease ${label}`}
      >
        −
      </button>
      <div className="font-mono text-sm font-bold tabular-nums w-9 text-center">
        {value}
        {suffix && <span className="text-ink-muted">{suffix}</span>}
      </div>
      <button
        type="button"
        disabled={disabled || value >= max}
        onClick={() => onChange(Math.min(max, value + step))}
        className="h-6 w-6 rounded-full text-sm font-bold text-ink-muted hover:bg-surface-2 disabled:opacity-30"
        aria-label={`Increase ${label}`}
      >
        +
      </button>
    </div>
  );
}

function CompactToggle({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <label
      className={`inline-flex items-center gap-2 select-none ${
        disabled ? "opacity-60" : "cursor-pointer"
      }`}
    >
      <span className="relative inline-flex">
        <input
          type="checkbox"
          disabled={disabled}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span
          aria-hidden
          className="h-5 w-9 rounded-full bg-surface-3 border border-line transition-colors
                     peer-checked:bg-brand-red peer-checked:border-brand-red
                     peer-focus-visible:ring-2 peer-focus-visible:ring-brand-red/40"
        />
        <span
          aria-hidden
          className="absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm
                     transition-transform peer-checked:translate-x-4"
        />
      </span>
      <span className="text-sm">{label}</span>
    </label>
  );
}

function LeaveConfirm({
  onCancel,
  onLeave,
}: {
  onCancel: () => void;
  onLeave: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="card max-w-sm w-full">
        <h3 className="font-display text-xl tracking-wide">Leave game?</h3>
        <p className="text-sm text-ink-muted mt-1">
          The game is in progress. You'll lose your spot.
        </p>
        <div className="mt-4 flex gap-2 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-line px-4 py-2 text-sm hover:bg-surface-2"
          >
            Stay
          </button>
          <button
            type="button"
            onClick={onLeave}
            className="rounded-xl bg-brand-red text-white px-4 py-2 text-sm font-semibold hover:bg-brand-red-dim"
          >
            Leave
          </button>
        </div>
      </div>
    </div>
  );
}
