import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DRAW_NAH_CATEGORY_LABELS } from "@bmt/shared";
import { getSocket } from "./socket";
import { useDrawStore } from "./store";
import { Confetti } from "./Confetti";

const PLACES = ["bg-amber-500", "bg-zinc-400", "bg-amber-700"];

export function EndScreen() {
  const navigate = useNavigate();
  const finalScores = useDrawStore((s) => s.finalScores);
  const finalRounds = useDrawStore((s) => s.finalRounds);
  const room = useDrawStore((s) => s.room);
  const myId = useDrawStore((s) => s.myId);
  const [zoomIdx, setZoomIdx] = useState<number | null>(null);

  if (!finalScores || room?.state !== "game_over") return null;
  const isHost = room.players.find((p) => p.socket_id === myId)?.is_host;
  const iWon = finalScores[0]?.player_id === myId;
  const isAlone = room.players.length < 2;
  const canPlayAgain = !!isHost && !isAlone;

  function leaveRoom() {
    getSocket().emit("room:leave");
    useDrawStore.getState().resetAll();
    navigate("/draw");
  }

  return (
    <div className="rounded-2xl border border-line bg-gradient-to-b from-surface-2 to-surface p-6 md:p-8">
      <Confetti active={iWon} />
      <div className="text-center">
        <div className="text-xs uppercase tracking-widest text-ink-muted">
          Final
        </div>
        <h2 className="mt-1 font-display text-5xl tracking-wide">
          <span className="text-brand-red">Game</span> Over
        </h2>
        {iWon && (
          <div className="mt-1 text-sm font-semibold text-brand-red">
            Yuh win! 🏆
          </div>
        )}
      </div>

      <ol className="mt-6 space-y-2 max-w-md mx-auto">
        {finalScores.map((p, i) => (
          <li
            key={p.player_id}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${
              i === 0
                ? "bg-brand-red text-white shadow-glow"
                : "bg-surface border border-line"
            }`}
          >
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                i < 3 ? PLACES[i] + " text-white" : "bg-surface-3 text-ink-muted"
              }`}
            >
              {i + 1}
            </span>
            <span className="flex-1 font-semibold truncate">{p.nickname}</span>
            <span className="font-mono font-bold tabular-nums">{p.score}</span>
          </li>
        ))}
      </ol>

      {finalRounds.length > 0 && (
        <div className="mt-8">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-ink-muted mb-3 text-center">
            Round gallery
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {finalRounds.map((r, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setZoomIdx(i)}
                className="group rounded-xl border border-line bg-surface text-left overflow-hidden hover:border-brand-red transition-colors"
              >
                <div className="grid grid-cols-2 aspect-[2/1]">
                  <div className="bg-surface-3 overflow-hidden">
                    {r.image_url ? (
                      <img
                        src={r.image_url}
                        alt={`reference ${r.word}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-ink-muted text-xs">ref</div>
                    )}
                  </div>
                  <div className="bg-white overflow-hidden">
                    {r.snapshot_data_url ? (
                      <img
                        src={r.snapshot_data_url}
                        alt={r.word}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-ink-muted text-xs">no draw</div>
                    )}
                  </div>
                </div>
                <div className="px-2.5 py-1.5">
                  <div className="font-display text-base leading-none truncate">
                    {r.word}
                  </div>
                  <div className="text-[11px] text-ink-muted truncate mt-0.5">
                    {DRAW_NAH_CATEGORY_LABELS[r.category]} · {r.drawer_nickname}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {zoomIdx !== null && finalRounds[zoomIdx] && (
        <button
          type="button"
          onClick={() => setZoomIdx(null)}
          className="fixed inset-0 z-40 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
          aria-label="Close"
        >
          <div className="max-w-3xl w-full">
            <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.333fr)] gap-3">
              <figure className="space-y-1.5">
                <div className="rounded-xl overflow-hidden bg-surface aspect-square flex items-center justify-center">
                  {finalRounds[zoomIdx]!.image_url ? (
                    <img
                      src={finalRounds[zoomIdx]!.image_url!}
                      alt="reference"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-zinc-400 text-sm">no reference</span>
                  )}
                </div>
                <figcaption className="text-[10px] uppercase tracking-wider text-zinc-300 text-center">Reference</figcaption>
              </figure>
              <figure className="space-y-1.5">
                <div className="rounded-xl overflow-hidden bg-white aspect-[4/3] flex items-center justify-center">
                  {finalRounds[zoomIdx]!.snapshot_data_url && (
                    <img
                      src={finalRounds[zoomIdx]!.snapshot_data_url!}
                      alt={finalRounds[zoomIdx]!.word}
                      className="w-full h-full object-contain"
                    />
                  )}
                </div>
                <figcaption className="text-[10px] uppercase tracking-wider text-zinc-300 text-center">Drawing</figcaption>
              </figure>
            </div>
            <div className="mt-3 text-center text-white">
              <div className="font-display text-2xl tracking-wide">{finalRounds[zoomIdx]!.word}</div>
              <div className="text-sm text-zinc-300">
                drawn by {finalRounds[zoomIdx]!.drawer_nickname}
              </div>
            </div>
          </div>
        </button>
      )}

      <div className="mt-6 space-y-2">
        {canPlayAgain && (
          <button
            type="button"
            onClick={() => {
              useDrawStore.getState().setFinalScores(null);
              useDrawStore.getState().setFinalRounds([]);
              getSocket().emit("game:start");
            }}
            className="w-full rounded-xl bg-brand-red text-white py-3 font-semibold hover:bg-brand-red-dim transition-colors"
          >
            Play again
          </button>
        )}

        {isHost && isAlone && (
          <p className="text-center text-xs text-ink-muted">
            Need at least 2 players to play again.
          </p>
        )}

        <button
          type="button"
          onClick={leaveRoom}
          className="w-full rounded-xl border border-line py-2.5 text-sm font-semibold hover:bg-surface transition-colors"
        >
          Leave room
        </button>
      </div>
    </div>
  );
}
