import http from "node:http";
import express from "express";
import cors from "cors";
import { Server as SocketIOServer } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "@bmt/shared";
import { registerSocketHandlers } from "./socket.js";

const PORT = Number(process.env.PORT ?? 8787);
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? "http://localhost:5173")
  .split(",")
  .map((s) => s.trim());

const app = express();
app.use(cors({ origin: ALLOWED_ORIGINS }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "bmt-game-server", ts: Date.now() });
});

const httpServer = http.createServer(app);

export const io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents>(
  httpServer,
  {
    cors: { origin: ALLOWED_ORIGINS, credentials: true },
  },
);

registerSocketHandlers(io);

httpServer.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[bmt-game-server] listening on :${PORT}`);
});
