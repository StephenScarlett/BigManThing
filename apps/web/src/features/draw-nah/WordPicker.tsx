import { DRAW_NAH_CATEGORY_LABELS } from "@bmt/shared";
import { getSocket } from "./socket";
import { useDrawStore } from "./store";
import { useRoundCountdown } from "./useRoundCountdown";

const DIFF_BADGE: Record<"easy" | "medium" | "hard", string> = {
  easy: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  medium: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  hard: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
};

export function WordPicker() {
  const opts = useDrawStore((s) => s.wordOptions);
  const room = useDrawStore((s) => s.room);
  const myId = useDrawStore((s) => s.myId);
  const seconds = useRoundCountdown();

  const isDrawer = room?.current_drawer_id === myId;
  if (room?.state !== "picking_word") return null;

  if (!isDrawer) {
    const drawer = room.players.find((p) => p.socket_id === room.current_drawer_id);
    return (
      <div className="rounded-2xl border border-line bg-surface-2 p-8 text-center">
        <div className="text-ink-muted text-xs uppercase tracking-widest">
          Picking word
        </div>
        <div className="text-2xl font-display tracking-wide mt-2">
          {drawer?.nickname ?? "Drawer"}{" "}
          <span className="text-ink-muted font-sans text-base">is choosing</span>
        </div>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-surface px-4 py-1.5 text-sm font-mono">
          <span className="h-2 w-2 rounded-full bg-brand-red animate-pulse" />
          {seconds !== null ? `${seconds}s` : "—"}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-line bg-gradient-to-b from-surface-2 to-surface p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-ink-muted text-xs uppercase tracking-widest">
            Yuh turn
          </div>
          <div className="font-display text-2xl tracking-wide">Pick yuh word</div>
        </div>
        {seconds !== null && (
          <div className="rounded-full bg-brand-red/10 text-brand-red px-3 py-1.5 text-sm font-mono font-semibold">
            {seconds}s
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {opts.map((o) => (
          <button
            key={o.entity_id}
            type="button"
            onClick={() => getSocket().emit("word:pick", o.entity_id)}
            className="group relative overflow-hidden rounded-xl border border-line bg-surface text-left transition-all
                       hover:border-brand-red hover:shadow-glow hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-brand-red/40"
          >
            <div className="relative aspect-square bg-surface-3 overflow-hidden">
              {o.image_url ? (
                <img
                  src={o.image_url}
                  alt={o.display}
                  className="absolute inset-0 h-full w-full object-cover transition-transform group-hover:scale-105"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-4xl text-ink-muted">
                  ?
                </div>
              )}
              <div
                className={`absolute top-2 right-2 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${DIFF_BADGE[o.difficulty]}`}
              >
                {o.difficulty}
              </div>
            </div>
            <div className="px-3 py-2.5">
              <div className="font-display text-lg leading-none tracking-wide truncate">
                {o.display}
              </div>
              <div className="text-xs text-ink-muted mt-1">
                {DRAW_NAH_CATEGORY_LABELS[o.category]}
              </div>
            </div>
          </button>
        ))}
      </div>

      <p className="mt-4 text-center text-xs text-ink-muted">
        Image is yuh reference — only you see it while drawing.
      </p>
    </div>
  );
}
