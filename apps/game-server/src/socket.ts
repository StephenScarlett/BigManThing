import type { Server } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "@bmt/shared";
import { GameManager } from "./gameManager.js";
import { loadWordBank } from "./wordBank.js";

type IO = Server<ClientToServerEvents, ServerToClientEvents>;

export function registerSocketHandlers(io: IO) {
  // Pre-warm the word bank.
  void loadWordBank();

  const manager = new GameManager(io);

  io.on("connection", (socket) => {
    console.log(`[socket] connected ${socket.id}`);

    socket.on("room:create", (payload, cb) => {
      const nickname = sanitizeNickname(payload?.nickname);
      if (!nickname) return cb({ ok: false, error: "invalid_nickname" });
      const room = manager.createRoom(socket, nickname);
      if (!room) return cb({ ok: false, error: "server_full" });
      if (payload?.settings) room.updateSettings(socket.id, payload.settings);
      cb({ ok: true, room_code: room.code });
    });

    socket.on("room:join", (payload, cb) => {
      const nickname = sanitizeNickname(payload?.nickname);
      if (!nickname) return cb({ ok: false, error: "invalid_nickname" });
      if (!payload?.room_code) return cb({ ok: false, error: "invalid_code" });
      const res = manager.joinRoom(socket, payload.room_code, nickname);
      if (!res.ok) return cb({ ok: false, error: res.error });
      cb({ ok: true });
    });

    socket.on("room:leave", () => {
      manager.leave(socket.id);
    });

    socket.on("room:settings", (settings) => {
      manager.roomFor(socket.id)?.updateSettings(socket.id, settings);
    });

    socket.on("game:start", () => {
      void manager.roomFor(socket.id)?.start(socket.id);
    });

    socket.on("word:pick", (entity_id) => {
      void manager.roomFor(socket.id)?.pickWord(socket.id, entity_id);
    });

    socket.on("draw", (event) => {
      manager.roomFor(socket.id)?.forwardDraw(socket.id, event);
    });

    socket.on("chat:send", (text) => {
      manager.roomFor(socket.id)?.handleChat(socket.id, text);
    });

    socket.on("snapshot:upload", (data_url) => {
      manager.roomFor(socket.id)?.receiveSnapshot(socket.id, data_url);
    });

    socket.on("disconnect", (reason) => {
      console.log(`[socket] disconnected ${socket.id} (${reason})`);
      manager.leave(socket.id);
    });
  });
}

function sanitizeNickname(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const cleaned = raw.trim().replace(/\s+/g, " ").slice(0, 20);
  if (cleaned.length < 2) return null;
  return cleaned;
}
