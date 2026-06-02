import { io, type Socket } from "socket.io-client";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "@bmt/shared";

export type BmtSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: BmtSocket | null = null;

export function getSocket(): BmtSocket {
  if (!socket) {
    const url =
      import.meta.env.VITE_GAME_SERVER_URL ?? "http://localhost:8787";
    socket = io(url, {
      autoConnect: true,
      transports: ["websocket"],
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
