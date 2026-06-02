import { useDrawStore } from "./store";

export function PlayerList() {
  const room = useDrawStore((s) => s.room);
  const myId = useDrawStore((s) => s.myId);
  if (!room) return null;
  const sorted = [...room.players].sort((a, b) => b.score - a.score);

  return (
    <div className="rounded-lg border border-line bg-surface-2 overflow-hidden">
      <div className="px-3 py-2 border-b border-line bg-surface text-sm font-semibold">
        Players ({room.players.length}/{room.settings.max_players})
      </div>
      <ul className="divide-y divide-line">
        {sorted.map((p) => {
          const isDrawer = room.current_drawer_id === p.socket_id;
          const isMe = myId === p.socket_id;
          return (
            <li
              key={p.socket_id}
              className={`flex items-center justify-between px-3 py-2 text-sm ${
                isDrawer ? "bg-brand-red/10" : ""
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="truncate font-medium">
                  {p.nickname}
                  {isMe && (
                    <span className="ml-1 text-ink-muted text-xs">(you)</span>
                  )}
                </span>
                {p.is_host && (
                  <span className="text-xs rounded bg-brand-red/20 text-brand-red px-1.5 py-0.5">
                    HOST
                  </span>
                )}
                {isDrawer && (
                  <span className="text-xs rounded bg-ink text-surface px-1.5 py-0.5">
                    DRAWING
                  </span>
                )}
              </div>
              <span className="font-mono text-ink-muted">{p.score}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
