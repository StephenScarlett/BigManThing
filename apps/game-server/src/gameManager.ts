import type { Server, Socket } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "@bmt/shared";
import { GameRoom } from "./gameRoom.js";

type IO = Server<ClientToServerEvents, ServerToClientEvents>;
type Sock = Socket<ClientToServerEvents, ServerToClientEvents>;

const ROOM_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const MAX_ROOMS = 1000;
const CLEANUP_INTERVAL_MS = 60_000;
const EMPTY_TTL_MS = 5 * 60_000;
const REJOIN_TTL_MS = 10 * 60_000;

export class GameManager {
  private rooms = new Map<string, GameRoom>();
  private socketToRoom = new Map<string, string>();
  private emptySince = new Map<string, number>();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private io: IO) {
    this.cleanupTimer = setInterval(() => this.cleanupRooms(), CLEANUP_INTERVAL_MS);
  }

  createRoom(socket: Sock, nickname: string): GameRoom | null {
    if (this.rooms.size >= MAX_ROOMS) return null;
    const code = this.generateCode();
    const room = new GameRoom(this.io, code, socket, nickname);
    this.rooms.set(code, room);
    this.socketToRoom.set(socket.id, code);
    return room;
  }

  joinRoom(
    socket: Sock,
    code: string,
    nickname: string,
  ): { ok: true; room: GameRoom } | { ok: false; error: string } {
    const room = this.rooms.get(code.toUpperCase());
    if (!room) return { ok: false, error: "room_not_found" };
    if (room.state === "game_over") {
      // Allow joining ended games (so rematch from same URL works)
    }

    const existingCode = this.socketToRoom.get(socket.id);
    if (existingCode === room.code) {
      // Same socket re-joining — resync.
      socket.join(room.code);
      room.broadcastState();
      room.sendReplay(socket);
      return { ok: true, room };
    }
    if (existingCode) return { ok: false, error: "already_in_other_room" };

    // Game in progress: only allow rejoin by previous nickname.
    if (room.state !== "lobby" && room.state !== "game_over") {
      if (room.canRejoin(nickname)) {
        const player = room.rejoinPlayer(socket, nickname);
        if (!player) return { ok: false, error: "rejoin_failed" };
        this.socketToRoom.set(socket.id, room.code);
        room.sendReplay(socket);
        this.emptySince.delete(room.code);
        return { ok: true, room };
      }
      return { ok: false, error: "game_in_progress" };
    }

    if (room.players.size >= room.settings.max_players)
      return { ok: false, error: "room_full" };
    room.addPlayer(socket, nickname);
    this.socketToRoom.set(socket.id, room.code);
    room.sendReplay(socket);
    this.emptySince.delete(room.code);
    return { ok: true, room };
  }

  leave(socketId: string): void {
    const code = this.socketToRoom.get(socketId);
    if (!code) return;
    const room = this.rooms.get(code);
    this.socketToRoom.delete(socketId);
    if (!room) return;
    room.removePlayer(socketId);
    if (room.isEmpty()) this.emptySince.set(code, Date.now());
  }

  roomFor(socketId: string): GameRoom | null {
    const code = this.socketToRoom.get(socketId);
    if (!code) return null;
    return this.rooms.get(code) ?? null;
  }

  private cleanupRooms(): void {
    const now = Date.now();
    for (const [code, room] of this.rooms) {
      if (!room.isEmpty()) {
        this.emptySince.delete(code);
        continue;
      }
      const since = this.emptySince.get(code) ?? now;
      if (!this.emptySince.has(code)) this.emptySince.set(code, now);
      const ttl = room.hasDisconnectedPlayers() ? REJOIN_TTL_MS : EMPTY_TTL_MS;
      if (now - since >= ttl) {
        this.rooms.delete(code);
        this.emptySince.delete(code);
        console.log(`[GameManager] cleaned up room ${code}`);
      }
    }
  }

  private generateCode(): string {
    for (let attempt = 0; attempt < 50; attempt++) {
      let code = "";
      for (let i = 0; i < 6; i++) {
        code += ROOM_CODE_ALPHABET[
          Math.floor(Math.random() * ROOM_CODE_ALPHABET.length)
        ];
      }
      if (!this.rooms.has(code)) return code;
    }
    throw new Error("could_not_generate_unique_room_code");
  }
}
