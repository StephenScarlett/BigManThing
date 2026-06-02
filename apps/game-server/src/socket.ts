import type { Server, Socket } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "@bmt/shared";
import { GameManager } from "./gameManager.js";
import { loadWordBank } from "./wordBank.js";
import { admin } from "./supabase.js";

type IO = Server<ClientToServerEvents, ServerToClientEvents>;
type BmtSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

declare module "socket.io" {
  interface SocketData {
    /** Verified Supabase user ID */
    userId: string;
    /** Canonical username from profiles table */
    username: string;
  }
}

export function registerSocketHandlers(io: IO) {
  // Pre-warm the word bank.
  void loadWordBank();

  // ── JWT verification middleware ─────────────────────────────────────────
  // Every connecting socket must present a valid Supabase access token.
  // We resolve the canonical username from the profiles table and store it
  // on socket.data — no downstream handler trusts the client-supplied nickname.
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (typeof token !== "string" || !token) {
      return next(new Error("auth_required"));
    }
    if (!admin) {
      // Supabase env vars missing (local dev without service key) — fall back
      // to the client-supplied nickname so the game still works locally.
      const fallback = sanitizeNickname(socket.handshake.auth?.nickname);
      if (!fallback) return next(new Error("auth_required"));
      socket.data = { userId: "anon", username: fallback };
      return next();
    }
    try {
      const { data, error } = await admin.auth.getUser(token);
      if (error || !data.user) return next(new Error("invalid_token"));

      // Look up the canonical username in profiles.
      const { data: profile, error: profileErr } = await admin
        .from("profiles")
        .select("username")
        .eq("id", data.user.id)
        .single();

      if (profileErr || !profile?.username) return next(new Error("no_profile"));

      socket.data = { userId: data.user.id, username: profile.username };
      next();
    } catch (err) {
      console.error("[socket] auth middleware error:", err);
      next(new Error("auth_error"));
    }
  });

  const manager = new GameManager(io);

  io.on("connection", (socket: BmtSocket) => {
    const { username } = socket.data;
    console.log(`[socket] connected ${socket.id} (${username})`);

    socket.on("room:create", (payload, cb) => {
      const room = manager.createRoom(socket, username);
      if (!room) return cb({ ok: false, error: "server_full" });
      if (payload?.settings) room.updateSettings(socket.id, payload.settings);
      cb({ ok: true, room_code: room.code });
    });

    socket.on("room:join", (payload, cb) => {
      if (!payload?.room_code) return cb({ ok: false, error: "invalid_code" });
      const res = manager.joinRoom(socket, payload.room_code, username);
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
