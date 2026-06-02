import { io, type Socket } from "socket.io-client";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "@bmt/shared";
import { supabase } from "@/lib/supabase";

export type BmtSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: BmtSocket | null = null;

export function getSocket(): BmtSocket {
  if (!socket) {
    const url =
      import.meta.env.VITE_GAME_SERVER_URL ?? "http://localhost:8787";
    socket = io(url, {
      autoConnect: true,
      transports: ["websocket"],
      // Pass the Supabase JWT on every (re)connection — server verifies it
      // and derives the canonical username from the profiles table.
      auth: async (cb: (data: Record<string, unknown>) => void) => {
        const { data } = await supabase.auth.getSession();
        cb({
          token: data.session?.access_token ?? null,
          // Fallback used only when server has no Supabase env vars (local dev)
          nickname: null,
        });
      },
    });
    socket.on("connect", () => console.log("[socket] connected", socket?.id));
    socket.on("disconnect", (r) => console.log("[socket] disconnected", r));
    socket.on("connect_error", (e) =>
      console.error("[socket] connect_error", e.message),
    );
  }
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
