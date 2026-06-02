import { useState } from "react";
import { DRAW_NAH_CATEGORY_LABELS } from "@bmt/shared";
import { getSocket } from "./socket";
import { useDrawStore } from "./store";
import { Confetti } from "./Confetti";

export function EndScreen() {
  const finalScores = useDrawStore((s) => s.finalScores);
  const finalRounds = useDrawStore((s) => s.finalRounds);
  const room = useDrawStore((s) => s.room);
  const myId = useDrawStore((s) => s.myId);
  const [zoomIdx, setZoomIdx] = useState<number | null>(null);

  if (!finalScores || room?.state !== "game_over") return null;
  const isHost = room.players.find((p) => p.socket_id === myId)?.is_host;
  const iWon = finalScores[0]?.player_id === myId;

  return (
    <div className="rounded-lg border border-line bg-surface-2 p-6">
      <Confetti active={iWon} />
      <h2 className="text-2xl font-extrabold text-center">
        <span className="text-brand-red">Game</span> Over
      </h2>
      <ol className="mt-4 space-y-2">
        {finalScores.map((p, i) => (
          <li
            key={p.player_id}
            className={`flex items-center justify-between rounded px-3 py-2 ${
              i === 0
                ? "bg-brand-red text-white font-semibold"
                : "bg-surface border border-line"
            }`}
          >
            <span>
              #{i + 1} {p.nickname}
            </span>
            <span className="font-mono">{p.score}</span>
          </li>
        ))}
      </ol>

      {finalRounds.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-muted mb-2">
            Drawings
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {finalRounds.map((r, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setZoomIdx(i)}
                className="rounded border border-line bg-white text-left overflow-hidden hover:border-brand-red"
              >
                {r.snapshot_data_url ? (
                  <img
                    src={r.snapshot_data_url}
                    alt={r.word}
                    className="w-full aspect-[8/5] object-cover bg-white"
                  />
                ) : (
                  <div className="aspect-[8/5] flex items-center justify-center text-ink-muted text-xs bg-surface">
                    no snapshot
                  </div>
                )}
                <div className="px-2 py-1 text-xs">
                  <div className="font-semibold">{r.word}</div>
                  <div className="text-ink-muted truncate">
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
          className="fixed inset-0 z-40 bg-black/80 flex items-center justify-center p-4"
          aria-label="Close"
        >
          <div className="max-w-2xl w-full">
            {finalRounds[zoomIdx]!.snapshot_data_url && (
              <img
                src={finalRounds[zoomIdx]!.snapshot_data_url!}
                alt={finalRounds[zoomIdx]!.word}
                className="w-full rounded bg-white"
              />
            )}
            <div className="mt-2 text-center text-white">
              <div className="text-xl font-bold">{finalRounds[zoomIdx]!.word}</div>
              <div className="text-sm text-zinc-300">
                drawn by {finalRounds[zoomIdx]!.drawer_nickname}
              </div>
            </div>
          </div>
        </button>
      )}

      {isHost && (
        <button
          type="button"
          onClick={() => {
            useDrawStore.getState().setFinalScores(null);
            useDrawStore.getState().setFinalRounds([]);
            getSocket().emit("game:start");
          }}
          className="mt-4 w-full rounded bg-brand-red text-white py-2 font-semibold hover:bg-red-dim"
        >
          Play again
        </button>
      )}
    </div>
  );
}
