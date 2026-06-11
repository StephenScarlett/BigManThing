import { useEffect, useRef, useState } from "react";
import { getSocket } from "./socket";
import { useDrawStore } from "./store";

export function Chat({ onClose }: { onClose?: () => void }) {
  const [text, setText] = useState("");
  const [closeNotices, setCloseNotices] = useState<
    { id: string; text: string; ts: number }[]
  >([]);
  const messages = useDrawStore((s) => s.messages);
  const myId = useDrawStore((s) => s.myId);
  const room = useDrawStore((s) => s.room);
  const haveGuessed = useDrawStore((s) => s.haveGuessed);
  const closeAt = useDrawStore((s) => s.closeFlashAt);
  const listRef = useRef<HTMLDivElement | null>(null);
  const lastSentGuessRef = useRef<string | null>(null);
  const lastHandledCloseAtRef = useRef<number>(closeAt);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (room?.state !== "drawing") return;
    if (!closeAt) return;
    if (closeAt <= lastHandledCloseAtRef.current) return;
    lastHandledCloseAtRef.current = closeAt;
    const guess = lastSentGuessRef.current;
    const label = guess ? `Close guess: "${guess}"` : "So close!";
    setCloseNotices((prev) => {
      const last = prev[prev.length - 1];
      // Collapse duplicate close notices that arrive almost together.
      if (last && last.text === label && closeAt - last.ts < 2000) {
        return prev;
      }
      return [...prev, { id: `close-${closeAt}`, text: label, ts: closeAt }].slice(-30);
    });
  }, [closeAt, room?.state]);

  // Keep close-guess notices scoped to the active drawing phase only.
  useEffect(() => {
    if (room?.state === "drawing") return;
    setCloseNotices([]);
    lastSentGuessRef.current = null;
    // Consume any stale close timestamp so it does not replay on next draw phase.
    lastHandledCloseAtRef.current = closeAt;
  }, [room?.state, room?.current_round, closeAt]);

  const isDrawer = room?.current_drawer_id === myId;
  const drawing = room?.state === "drawing";
  const lockChat = !!drawing && (isDrawer || haveGuessed);

  function send(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    lastSentGuessRef.current = trimmed;
    getSocket().emit("chat:send", trimmed);
    setText("");
  }

  return (
    <div className="flex flex-col h-full bg-surface-2 rounded-2xl border border-line overflow-hidden">
      <div className="px-4 py-2.5 border-b border-line bg-surface flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
          Chat & guesses
        </span>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-surface-2 text-ink-muted"
            aria-label="Close chat"
          >
            ✕
          </button>
        )}
      </div>
      <div ref={listRef} className="flex-1 overflow-y-auto p-3 space-y-1.5 text-sm">
        {messages.map((m) => {
          if (m.kind === "correct") {
            return (
              <div
                key={m.id}
                className="rounded-lg bg-feedback-exact/15 text-feedback-exact px-2.5 py-1.5 text-sm font-semibold"
              >
                ✓ {m.text}
              </div>
            );
          }
          if (m.kind === "system") {
            return (
              <div
                key={m.id}
                className="text-center text-ink-muted italic text-xs py-0.5"
              >
                {m.text}
              </div>
            );
          }
          return (
            <div key={m.id} className="leading-snug">
              <span className="font-semibold">{m.nickname}</span>
              <span className="text-ink-muted">: </span>
              <span>{m.text}</span>
            </div>
          );
        })}
        {closeNotices.map((n) => (
          <div key={n.id} className="rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 px-2.5 py-1.5 text-xs italic font-semibold">
            {n.text}
          </div>
        ))}
      </div>
      <form onSubmit={send} className="flex gap-2 border-t border-line p-2 bg-surface">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={lockChat}
          placeholder={
            isDrawer && drawing
              ? "Yuh drawing — no chatting!"
              : haveGuessed && drawing
                ? "Yuh got it — wait for others"
                : drawing
                  ? "Type yuh guess…"
                  : "Chat…"
          }
          className="min-w-0 flex-1 rounded-xl border border-line bg-surface-2 px-3 py-2 text-sm focus:outline-none transition-colors focus:border-brand-red"
          maxLength={200}
        />
        <button
          type="submit"
          className="shrink-0 rounded-xl bg-brand-red text-white px-4 py-2 text-sm font-semibold hover:bg-brand-red-dim disabled:opacity-50 transition-colors"
          disabled={lockChat}
        >
          Send
        </button>
      </form>
    </div>
  );
}
