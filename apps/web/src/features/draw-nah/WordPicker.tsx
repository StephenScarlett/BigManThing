import { DRAW_NAH_CATEGORY_LABELS } from "@bmt/shared";
import { getSocket } from "./socket";
import { useDrawStore } from "./store";
import { useRoundCountdown } from "./useRoundCountdown";

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
      <div className="rounded-lg border border-line bg-surface-2 p-6 text-center">
        <div className="text-ink-muted text-sm uppercase tracking-wide">
          Picking word…
        </div>
        <div className="text-xl font-bold mt-1">
          {drawer?.nickname ?? "Drawer"} is choosing
        </div>
        {seconds !== null && (
          <div className="mt-2 text-ink-muted text-sm">{seconds}s left</div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-line bg-surface-2 p-6 text-center">
      <div className="text-ink-muted text-sm uppercase tracking-wide">
        Pick yuh word
      </div>
      {seconds !== null && (
        <div className="mt-1 text-sm text-ink-muted">{seconds}s</div>
      )}
      <div className="mt-4 flex flex-wrap justify-center gap-3">
        {opts.map((o) => (
          <button
            key={o.entity_id}
            type="button"
            onClick={() => getSocket().emit("word:pick", o.entity_id)}
            className="rounded-lg border border-line bg-surface px-4 py-3 text-left hover:border-brand-red hover:bg-brand-red/5"
          >
            <div className="font-semibold">{o.display}</div>
            <div className="text-xs text-ink-muted">
              {DRAW_NAH_CATEGORY_LABELS[o.category]} · {o.difficulty}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
