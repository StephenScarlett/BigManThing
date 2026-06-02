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
    getSocket().emit(
      "room:create",
      { nickname },
      (res) => {
        setBusy(false);
        if (!res.ok) return setError(res.error);
        navigate(`/draw/${res.room_code}`);
      },
    );
  }

  function join() {
    setError(null);
    if (!nickname) return setError("Profile loading…");
    if (code.trim().length !== 6) return setError("Room codes are 6 characters.");
    setBusy(true);
    const upper = code.trim().toUpperCase();
    getSocket().emit(
      "room:join",
      { nickname, room_code: upper },
      (res) => {
        setBusy(false);
        if (!res.ok) return setError(res.error);
        navigate(`/draw/${upper}`);
      },
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <header className="text-center">
        <h1 className="text-3xl font-extrabold">
          <span className="text-brand-red">Draw</span> Nah
        </h1>
        <p className="text-ink-muted mt-1 text-sm">
          Trini-style sketch & guess. 2–12 players.
        </p>
      </header>

      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">Playing as</span>
          <span className="font-mono font-bold text-brand-red">{nickname || "…"}</span>
        </div>
        <p className="text-xs text-ink-muted -mt-1">
          Change your name via the user menu (top-right).
        </p>

        <button
          type="button"
          onClick={create}
          disabled={busy}
          className="w-full rounded bg-brand-red text-white py-2 font-semibold hover:bg-red-dim disabled:opacity-50"
        >
          Create new room
        </button>

        <div className="flex items-center gap-2 text-ink-muted text-xs uppercase">
          <div className="flex-1 h-px bg-line" />
          or join
          <div className="flex-1 h-px bg-line" />
        </div>

        <div className="flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
            placeholder="ROOM CODE"
            className="flex-1 rounded border border-line bg-surface px-3 py-2 font-mono uppercase tracking-widest focus:border-brand-red focus:outline-none"
            maxLength={6}
          />
          <button
            type="button"
            onClick={join}
            disabled={busy}
            className="rounded border-2 border-brand-red text-brand-red px-4 py-2 font-semibold hover:bg-brand-red hover:text-white disabled:opacity-50"
          >
            Join
          </button>
        </div>

        {error && <div className="text-sm text-feedback-wrong">{error}</div>}
      </div>
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
  const guessMask = useDrawStore((s) => s.guessMask);
  const currentSummary = useDrawStore((s) => s.currentSummary);
  const [joinAttempted, setJoinAttempted] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [muted, setMuted] = useMuted();
  const seconds = useRoundCountdown();

  const { profile } = useAuth();
  const nickname = profile?.username ?? "";

  // Always emit room:join on mount — the server resyncs same-socket joins,
  // which fixes the race where the host's room:state is broadcast before
  // RoomView's listeners are attached.
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
      <div className="mx-auto max-w-md card text-center">
        <p className="text-ink-muted">Connecting to room {roomCode}…</p>
      </div>
    );
  }

  const isDrawer = room.current_drawer_id === myId;
  const isHost = room.players.find((p) => p.socket_id === myId)?.is_host;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-xs text-ink-muted uppercase tracking-wide">Room</div>
          <div className="font-mono text-2xl font-bold tracking-widest">
            {room.room_code}
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-ink-muted uppercase">
            {room.state === "lobby"
              ? "Lobby"
              : room.state === "game_over"
                ? "Final"
                : `Round ${room.current_round}/${room.settings.rounds}`}
          </div>
          {room.state === "drawing" && (
            <div className="font-mono text-lg">
              {seconds !== null ? `${seconds}s` : "—"}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMuted(!muted)}
            className="rounded border border-line w-9 h-9 flex items-center justify-center hover:bg-surface-2"
            aria-label={muted ? "Unmute" : "Mute"}
            title={muted ? "Unmute" : "Mute"}
          >
            <span aria-hidden>{muted ? "\uD83D\uDD07" : "\uD83D\uDD0A"}</span>
          </button>
          <button
            type="button"
            onClick={tryLeave}
            className="rounded border border-line px-3 py-1.5 text-sm hover:bg-surface-2"
          >
            Leave
          </button>
        </div>
      </div>

      {/* Word display while drawing */}
      {room.state === "drawing" && (
        <div className="rounded-lg border border-line bg-surface-2 px-4 py-3 text-center">
          {isDrawer ? (
            <>
              <div className="text-xs text-ink-muted uppercase">Yuh drawing</div>
              <div className="text-2xl font-extrabold tracking-wide">
                {myWord ?? "?"}
              </div>
            </>
          ) : guessMask ? (
            <>
              <div className="text-xs text-ink-muted uppercase">Guess this</div>
              <div className="text-2xl font-mono tracking-[0.3em]">
                {guessMask.mask}
              </div>
              <div className="text-xs text-ink-muted">
                {guessMask.length} letters
              </div>
            </>
          ) : null}
        </div>
      )}

      {room.state === "lobby" && (
        <LobbySettings isHost={!!isHost} canStart={room.players.length >= 2} />
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          {(room.state === "drawing" || room.state === "round_end") && (
            <Canvas canDraw={isDrawer && room.state === "drawing"} />
          )}
          <WordPicker />
          <EndScreen />
        </div>
        <div className="flex flex-col gap-3">
          <PlayerList />
          <div className="h-72 lg:h-[480px]">
            <Chat />
          </div>
        </div>
      </div>

      {room.state === "round_end" && currentSummary && (
        <RoundSummaryModal summary={currentSummary} />
      )}

      {showLeaveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="card max-w-sm w-full">
            <h3 className="text-lg font-bold">Leave game?</h3>
            <p className="text-sm text-ink-muted mt-1">
              The game is in progress. You'll lose your spot.
            </p>
            <div className="mt-4 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowLeaveConfirm(false)}
                className="rounded border border-line px-3 py-1.5 text-sm hover:bg-surface-2"
              >
                Stay
              </button>
              <button
                type="button"
                onClick={leave}
                className="rounded bg-brand-red text-white px-3 py-1.5 text-sm font-semibold hover:bg-red-dim"
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Lobby settings (host) ───────────────────────────────────────────────────
function LobbySettings({
  isHost,
  canStart,
}: {
  isHost: boolean;
  canStart: boolean;
}) {
  const room = useDrawStore((s) => s.room)!;
  const settings = room.settings;

  function update(partial: Partial<DrawRoomSettings>) {
    getSocket().emit("room:settings", partial);
  }

  function start() {
    getSocket().emit("game:start");
  }

  function copyCode() {
    void navigator.clipboard.writeText(room.room_code);
  }

  return (
    <div className="card space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-sm text-ink-muted">Share this code:</div>
          <div className="font-mono text-2xl font-bold tracking-widest">
            {room.room_code}
          </div>
        </div>
        <button
          type="button"
          onClick={copyCode}
          className="rounded border border-line px-3 py-1.5 text-sm hover:bg-surface-2"
        >
          Copy
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-sm font-semibold">Rounds</span>
          <input
            type="number"
            min={1}
            max={10}
            disabled={!isHost}
            value={settings.rounds}
            onChange={(e) => update({ rounds: Number(e.target.value) })}
            className="mt-1 w-full rounded border border-line bg-surface px-3 py-2 disabled:opacity-60"
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold">Draw time (sec)</span>
          <input
            type="number"
            min={30}
            max={180}
            step={5}
            disabled={!isHost}
            value={settings.draw_time_seconds}
            onChange={(e) =>
              update({ draw_time_seconds: Number(e.target.value) })
            }
            className="mt-1 w-full rounded border border-line bg-surface px-3 py-2 disabled:opacity-60"
          />
        </label>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold">
          Word categories
          <span className="ml-2 font-normal text-ink-muted text-xs">
            {settings.categories.length === 0 ? "(all)" : `${settings.categories.length} selected`}
          </span>
        </legend>
        <div className="flex flex-wrap gap-2">
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
                className={`rounded border px-3 py-1.5 text-sm transition-colors ${
                  active
                    ? "border-brand-red bg-brand-red/10 text-brand-red"
                    : "border-line text-ink-muted hover:border-ink"
                } disabled:opacity-60`}
              >
                {DRAW_NAH_CATEGORY_LABELS[cat]}
              </button>
            );
          })}
        </div>
        {settings.categories.length === 0 && (
          <p className="text-xs text-ink-muted">No selection = all categories in the pool.</p>
        )}
      </fieldset>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            disabled={!isHost}
            checked={settings.show_hints}
            onChange={(e) => update({ show_hints: e.target.checked })}
            className="h-4 w-4 accent-brand-red"
          />
          <span>Reveal hints over time</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            disabled={!isHost}
            checked={settings.use_aliases}
            onChange={(e) => update({ use_aliases: e.target.checked })}
            className="h-4 w-4 accent-brand-red"
          />
          <span>Accept alternate names</span>
        </label>
      </div>

      {isHost ? (
        <button
          type="button"
          onClick={start}
          disabled={!canStart}
          className="w-full rounded bg-brand-red text-white py-2 font-semibold hover:bg-red-dim disabled:opacity-50"
        >
          {canStart ? "Start game" : "Need 2+ players"}
        </button>
      ) : (
        <div className="text-center text-sm text-ink-muted">
          Waiting for host to start…
        </div>
      )}
    </div>
  );
}
