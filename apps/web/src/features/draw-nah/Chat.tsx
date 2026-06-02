import { useEffect, useRef, useState } from "react";
import { getSocket } from "./socket";
import { useDrawStore } from "./store";

export function Chat() {
  const [text, setText] = useState("");
  const [closeFlash, setCloseFlash] = useState(false);
  const messages = useDrawStore((s) => s.messages);
  const myId = useDrawStore((s) => s.myId);
  const room = useDrawStore((s) => s.room);
  const haveGuessed = useDrawStore((s) => s.haveGuessed);
  const closeAt = useDrawStore((s) => s.closeFlashAt);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (!closeAt) return;
    setCloseFlash(true);
    const id = setTimeout(() => setCloseFlash(false), 1500);
    return () => clearTimeout(id);
  }, [closeAt]);

  const isDrawer = room?.current_drawer_id === myId;
  const drawing = room?.state === "drawing";
  const lockChat = drawing && (isDrawer || haveGuessed);

  function send(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    getSocket().emit("chat:send", trimmed);
    setText("");
  }

  return (
    <div className="flex flex-col h-full bg-surface-2 rounded-lg border border-line">
      <div ref={listRef} className="flex-1 overflow-y-auto p-3 space-y-1 text-sm">
        {messages.map((m) => (
          <div
            key={m.id}
            className={
              m.kind === "correct"
                ? "text-feedback-exact font-semibold"
                : m.kind === "system"
                  ? "text-ink-muted italic"
                  : "text-ink"
            }
          >
            {m.kind === "chat" ? (
              <>
                <span className="font-semibold">{m.nickname}:</span> {m.text}
              </>
            ) : (
              m.text
            )}
          </div>
        ))}
        {closeFlash && (
          <div className="text-yellow-500 italic text-xs">So close!</div>
        )}
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
          className={`flex-1 rounded border bg-surface px-3 py-2 text-sm focus:outline-none transition-colors ${
            closeFlash
              ? "border-yellow-400 ring-2 ring-yellow-400/50"
              : "border-line focus:border-brand-red"
          }`}
          maxLength={200}
        />
        <button
          type="submit"
          className="rounded bg-brand-red text-white px-3 py-2 text-sm font-semibold hover:bg-red-dim disabled:opacity-50"
          disabled={lockChat}
        >
          Send
        </button>
      </form>
    </div>
  );
}
