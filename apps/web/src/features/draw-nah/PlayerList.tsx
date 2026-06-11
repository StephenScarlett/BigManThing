import { useDrawStore } from "./store";

interface Props {
  /** When true, the panel fills its parent height and scrolls internally. */
  fill?: boolean;
  onClose?: () => void;
}

const PODIUM = ["bg-amber-500", "bg-zinc-400", "bg-amber-700"];

export function PlayerList({ fill = false, onClose }: Props) {
  const room = useDrawStore((s) => s.room);
  const myId = useDrawStore((s) => s.myId);
  if (!room) return null;
  const sorted = [...room.players].sort((a, b) => b.score - a.score);
  const inLobby = room.state === "lobby";

  return (
    <div
      className={`flex flex-col rounded-2xl border border-line bg-surface-2 overflow-hidden ${
        fill ? "h-full min-h-0" : ""
      }`}
    >
      <div className="px-3.5 py-2 border-b border-line bg-surface flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-ink-muted">
            Players
          </span>
          <span className="text-[11px] font-mono text-ink-muted">
            {room.players.length}/{room.settings.max_players}
          </span>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-surface-2 text-ink-muted"
            aria-label="Close players"
          >
            ✕
          </button>
        )}
      </div>
      <ul
        className={`divide-y divide-line/60 ${
          fill ? "flex-1 min-h-0 overflow-y-auto" : "max-h-72 overflow-y-auto"
        }`}
      >
        {sorted.map((p, i) => {
          const isDrawer = room.current_drawer_id === p.socket_id;
          const isMe = myId === p.socket_id;
          const initial = p.nickname[0]?.toUpperCase() ?? "?";
          const isPodium = !inLobby && i < 3;
          const avatarBg = isDrawer
            ? "bg-brand-red text-white"
            : isPodium
              ? `${PODIUM[i]} text-white`
              : "bg-surface-3 text-ink-muted";
          return (
            <li
              key={p.socket_id}
              className={`flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                isDrawer
                  ? "bg-brand-red/10"
                  : !inLobby && i === 0
                    ? "bg-amber-500/5"
                    : ""
              } ${!p.connected ? "opacity-50" : ""}`}
            >
              <span className="font-mono text-[10px] text-ink-muted w-3 text-right shrink-0">
                {i + 1}
              </span>
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${avatarBg}`}
              >
                {initial}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="truncate font-semibold">{p.nickname}</span>
                  {isMe && (
                    <span className="text-ink-muted text-[10px] shrink-0">
                      (you)
                    </span>
                  )}
                  {p.is_host && (
                    <span className="text-[9px] rounded bg-brand-red/15 text-brand-red px-1.5 py-0.5 font-bold tracking-wider shrink-0">
                      HOST
                    </span>
                  )}
                </div>
                {isDrawer && !inLobby && (
                  <div className="text-[10px] text-brand-red font-semibold tracking-wide uppercase">
                    Drawing
                  </div>
                )}
              </div>
              <span className="font-mono font-bold tabular-nums text-brand-red shrink-0">
                {p.score}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
