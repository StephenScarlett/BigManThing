import type { Server, Socket } from "socket.io";
import {
  DEFAULT_DRAW_ROOM_SETTINGS,
  type ChatMessage,
  type ClientToServerEvents,
  type DrawEvent,
  type DrawGameState,
  type DrawNahCategory,
  type DrawPlayer,
  type DrawRoomSettings,
  type DrawWordOption,
  type RoomStateSnapshot,
  type RoundSummary,
  type ServerToClientEvents,
} from "@bmt/shared";
import { loadWordBank, pickWords, type WordEntry } from "./wordBank.js";
import {
  calculateDrawerPoints,
  calculateGuesserPoints,
  isCloseGuess,
  isCorrectGuess,
} from "./scoring.js";

type IO = Server<ClientToServerEvents, ServerToClientEvents>;
type Sock = Socket<ClientToServerEvents, ServerToClientEvents>;

const PICK_TIME_SECONDS = 15;
const ROUND_END_PAUSE_SECONDS = 4;
const HINT_REVEAL_FRACTIONS = [0.4, 0.7]; // reveal letters at these fractions of elapsed time

interface DisconnectedSlot {
  nickname: string;
  score: number;
  was_host: boolean;
  drawer_index: number; // index in drawer_queue, -1 if not queued
}

export class GameRoom {
  readonly code: string;
  state: DrawGameState = "lobby";
  settings: DrawRoomSettings = { ...DEFAULT_DRAW_ROOM_SETTINGS };
  players = new Map<string, DrawPlayer>();
  current_round = 0;
  current_drawer_id: string | null = null;
  round_ends_at: number | null = null;
  current_word: WordEntry | null = null;
  current_options: DrawWordOption[] = [];
  drawn_events: DrawEvent[] = [];
  guessed_this_round = new Set<string>();
  drawer_queue: string[] = [];
  drawer_pointer = 0;
  used_word_ids = new Set<string>();
  chat_history: ChatMessage[] = []; // for rejoiners
  round_summaries: RoundSummary[] = [];
  current_mask: string | null = null;
  hints_revealed = 0;
  pending_summary: RoundSummary | null = null;

  // nickname (lowercased) → saved data, eligible to rejoin while game in progress
  private disconnected = new Map<string, DisconnectedSlot>();

  private timer: ReturnType<typeof setTimeout> | null = null;
  private hint_interval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private io: IO,
    code: string,
    hostSocket: Sock,
    hostNickname: string,
  ) {
    this.code = code;
    this.addPlayer(hostSocket, hostNickname, true);
  }

  // ── Players ───────────────────────────────────────────────────────────────
  addPlayer(socket: Sock, nickname: string, isHost = false): DrawPlayer {
    const player: DrawPlayer = {
      socket_id: socket.id,
      user_id: null,
      nickname,
      is_host: isHost,
      score: 0,
      connected: true,
    };
    this.players.set(socket.id, player);
    socket.join(this.code);
    this.systemMessage(`${nickname} joined.`);
    this.broadcastState();
    return player;
  }

  /** Returns true if a disconnected player slot exists for this nickname. */
  canRejoin(nickname: string): boolean {
    return this.disconnected.has(nickname.trim().toLowerCase());
  }

  rejoinPlayer(socket: Sock, nickname: string): DrawPlayer | null {
    const key = nickname.trim().toLowerCase();
    const slot = this.disconnected.get(key);
    if (!slot) return null;
    this.disconnected.delete(key);

    const hasHost = [...this.players.values()].some((p) => p.is_host);
    const player: DrawPlayer = {
      socket_id: socket.id,
      user_id: null,
      nickname: slot.nickname,
      is_host: !hasHost && slot.was_host,
      score: slot.score,
      connected: true,
    };
    this.players.set(socket.id, player);
    socket.join(this.code);

    // Restore drawer-queue slot
    if (slot.drawer_index >= 0 && slot.drawer_index < this.drawer_queue.length) {
      this.drawer_queue[slot.drawer_index] = socket.id;
    }
    this.systemMessage(`${slot.nickname} reconnected.`);
    this.broadcastState();
    return player;
  }

  removePlayer(socketId: string): void {
    const player = this.players.get(socketId);
    if (!player) return;
    const wasHost = player.is_host;
    const wasDrawer = this.current_drawer_id === socketId;

    // Save slot if mid-game
    if (this.state !== "lobby" && this.state !== "game_over") {
      const drawer_index = this.drawer_queue.indexOf(socketId);
      this.disconnected.set(player.nickname.toLowerCase(), {
        nickname: player.nickname,
        score: player.score,
        was_host: wasHost,
        drawer_index,
      });
    }

    this.players.delete(socketId);
    if (this.state === "lobby") {
      this.drawer_queue = this.drawer_queue.filter((id) => id !== socketId);
    }

    if (wasHost) {
      const next = this.players.values().next().value;
      if (next) next.is_host = true;
    }

    this.systemMessage(`${player.nickname} left.`);

    // If a game is already in progress and only one player remains,
    // end immediately and show the game-over screen to that player.
    if (this.players.size <= 1 && this.state !== "lobby" && this.state !== "game_over") {
      this.systemMessage("Game ended: not enough players remaining.");
      this.endGame();
      return;
    }

    if (wasDrawer && (this.state === "drawing" || this.state === "picking_word")) {
      this.systemMessage(`Drawer left — round skipped.`);
      void this.endRoundEarly("drawer_left");
    }
    this.broadcastState();
  }

  isEmpty(): boolean {
    return this.players.size === 0;
  }

  hasDisconnectedPlayers(): boolean {
    return this.disconnected.size > 0;
  }

  // ── Settings ──────────────────────────────────────────────────────────────
  updateSettings(socketId: string, partial: Partial<DrawRoomSettings>): void {
    if (!this.isHost(socketId)) return;
    if (this.state !== "lobby") return;
    this.settings = {
      ...this.settings,
      ...partial,
      rounds: clamp(partial.rounds ?? this.settings.rounds, 1, 10),
      draw_time_seconds: clamp(
        partial.draw_time_seconds ?? this.settings.draw_time_seconds,
        30,
        180,
      ),
      max_players: clamp(partial.max_players ?? this.settings.max_players, 2, 12),
    };
    this.broadcastState();
  }

  // ── Game flow ─────────────────────────────────────────────────────────────
  async start(socketId: string): Promise<void> {
    if (!this.isHost(socketId)) return;
    if (this.state !== "lobby" && this.state !== "game_over") return;
    if (this.players.size < 2) {
      this.io.to(socketId).emit("error", "Need at least 2 players to start.");
      return;
    }
    for (const p of this.players.values()) p.score = 0;
    this.current_round = 0;
    this.used_word_ids.clear();
    this.round_summaries = [];
    this.drawer_queue = Array.from(this.players.keys());
    shuffle(this.drawer_queue);
    this.drawer_pointer = 0;
    this.systemMessage("Game started!");
    await this.startNextTurn();
  }

  /** Used after game_over so host can return to lobby. */
  resetToLobby(socketId: string): void {
    if (!this.isHost(socketId)) return;
    this.clearAllTimers();
    this.state = "lobby";
    this.current_round = 0;
    this.current_drawer_id = null;
    this.round_ends_at = null;
    this.current_word = null;
    this.current_options = [];
    this.drawn_events = [];
    this.round_summaries = [];
    this.guessed_this_round.clear();
    this.used_word_ids.clear();
    for (const p of this.players.values()) p.score = 0;
    this.broadcastState();
  }

  private async startNextTurn(): Promise<void> {
    this.clearAllTimers();
    this.drawn_events = [];
    this.guessed_this_round.clear();
    this.current_word = null;
    this.current_mask = null;
    this.hints_revealed = 0;
    this.pending_summary = null;

    // Advance round if we've cycled through all drawers.
    if (this.drawer_pointer >= this.drawer_queue.length) {
      this.current_round += 1;
      if (this.current_round > this.settings.rounds) {
        this.endGame();
        return;
      }
      this.drawer_pointer = 0;
      this.drawer_queue = Array.from(this.players.keys());
      shuffle(this.drawer_queue);
    }
    if (this.current_round === 0) this.current_round = 1;

    // Skip past disconnected drawers
    while (this.drawer_pointer < this.drawer_queue.length) {
      const did = this.drawer_queue[this.drawer_pointer]!;
      if (this.players.has(did)) break;
      this.drawer_pointer += 1;
    }
    if (this.drawer_pointer >= this.drawer_queue.length) {
      void this.startNextTurn();
      return;
    }

    const drawerId = this.drawer_queue[this.drawer_pointer]!;
    this.current_drawer_id = drawerId;

    const bank = await loadWordBank();
    const filter = this.settings.categories.length
      ? (w: WordEntry) => this.settings.categories.includes(w.category)
      : undefined;
    const opts = pickWords(bank, 3, filter, this.used_word_ids);
    if (opts.length === 0) {
      this.io.to(this.code).emit("error", "Word bank empty.");
      this.endGame();
      return;
    }
    this.current_options = opts.map((w) => ({
      entity_id: w.entity_id,
      display: w.name,
      difficulty: w.difficulty,
      category: w.category,
      mode: w.mode,
      image_url: w.image_url,
    }));
    this.state = "picking_word";
    this.round_ends_at = Date.now() + PICK_TIME_SECONDS * 1000;
    this.io.to(drawerId).emit("word:options", this.current_options);
    this.broadcastState();

    this.timer = setTimeout(() => {
      if (this.state === "picking_word" && this.current_options[0]) {
        void this.pickWord(drawerId, this.current_options[0].entity_id);
      }
    }, PICK_TIME_SECONDS * 1000);
  }

  async pickWord(socketId: string, entity_id: string): Promise<void> {
    if (this.state !== "picking_word") return;
    if (socketId !== this.current_drawer_id) return;
    const opt = this.current_options.find((o) => o.entity_id === entity_id);
    if (!opt) return;
    const bank = await loadWordBank();
    const word = bank.find((w) => w.entity_id === entity_id);
    if (!word) return;

    this.current_word = word;
    this.used_word_ids.add(word.entity_id);
    this.state = "drawing";
    this.current_mask = maskWord(word.name);
    this.hints_revealed = 0;
    this.round_ends_at = Date.now() + this.settings.draw_time_seconds * 1000;
    this.clearAllTimers();

    this.io.to(socketId).emit("word:current:drawer", {
      word: word.name,
      image_url: word.image_url,
    });
    this.io
      .to(this.code)
      .except(socketId)
      .emit("word:current", {
        length: word.name.length,
        mask: this.current_mask,
      });

    // Round divider
    const drawerName = this.players.get(socketId)?.nickname ?? "Drawer";
    this.systemMessage(
      `── Round ${this.current_round}/${this.settings.rounds} · ${drawerName} drawing ──`,
    );

    this.broadcastState();

    this.timer = setTimeout(() => this.endRound(), this.settings.draw_time_seconds * 1000);

    // Progressive hints
    if (this.settings.show_hints) {
      this.hint_interval = setInterval(() => this.maybeRevealHint(), 1000);
    }
  }

  private maybeRevealHint(): void {
    if (this.state !== "drawing" || !this.current_word || !this.current_mask) return;
    const total = this.settings.draw_time_seconds * 1000;
    const elapsed = total - Math.max(0, (this.round_ends_at ?? 0) - Date.now());
    const ratio = elapsed / total;
    const target = HINT_REVEAL_FRACTIONS.findIndex((f) => ratio >= f) + 1;
    const want = Math.min(target, HINT_REVEAL_FRACTIONS.length);
    if (want <= this.hints_revealed) return;

    const word = this.current_word.name;
    const maskArr = this.current_mask.split("");
    const hiddenIndices: number[] = [];
    for (let i = 0; i < word.length; i++) {
      if (maskArr[i] === "_") hiddenIndices.push(i);
    }
    if (hiddenIndices.length <= 1) return; // never reveal entire word
    const idx = hiddenIndices[Math.floor(Math.random() * hiddenIndices.length)]!;
    maskArr[idx] = word[idx]!;
    this.current_mask = maskArr.join("");
    this.hints_revealed = want;

    // Send to non-drawers only
    if (this.current_drawer_id) {
      this.io
        .to(this.code)
        .except(this.current_drawer_id)
        .emit("hint:reveal", { mask: this.current_mask });
    }
  }

  forwardDraw(socketId: string, event: DrawEvent): void {
    if (this.state !== "drawing") return;
    if (socketId !== this.current_drawer_id) return;
    if (event.kind === "clear") this.drawn_events = [];
    else if (event.kind === "undo") this.drawn_events.pop();
    else this.drawn_events.push(event);
    this.io.to(this.code).except(socketId).emit("draw", event);
  }

  receiveSnapshot(socketId: string, dataUrl: string): void {
    if (socketId !== this.current_drawer_id) return;
    if (!this.pending_summary) return;
    if (typeof dataUrl !== "string") return;
    if (!dataUrl.startsWith("data:image/") || dataUrl.length > 250_000) return;
    this.pending_summary.snapshot_data_url = dataUrl;
  }

  sendReplay(socket: Sock): void {
    if (this.drawn_events.length) socket.emit("draw:replay", this.drawn_events);
    if (this.current_word && this.state === "drawing") {
      if (socket.id === this.current_drawer_id) {
        socket.emit("word:current:drawer", {
          word: this.current_word.name,
          image_url: this.current_word.image_url,
        });
      } else if (this.current_mask) {
        socket.emit("word:current", {
          length: this.current_word.name.length,
          mask: this.current_mask,
        });
      }
    }
    // Send chat history backlog
    for (const m of this.chat_history.slice(-50)) socket.emit("chat:message", m);
  }

  handleChat(socketId: string, text: string): void {
    const trimmed = text.trim().slice(0, 200);
    if (!trimmed) return;
    const player = this.players.get(socketId);
    if (!player) return;

    const isDrawer = socketId === this.current_drawer_id;

    if (this.state === "drawing" && isDrawer) return; // anti-spoiler

    // Already-guessed players: their messages still broadcast (think of it as winners' chat)
    if (this.guessed_this_round.has(socketId)) {
      this.broadcast({
        id: rid(),
        player_id: socketId,
        nickname: player.nickname,
        text: trimmed,
        kind: "chat",
        ts: Date.now(),
      });
      return;
    }

    if (this.state === "drawing" && this.current_word && !isDrawer) {
      const answers = [this.current_word.name];
      if (this.settings.use_aliases) answers.push(...this.current_word.aliases);

      if (answers.some((a) => isCorrectGuess(trimmed, a))) {
        this.scoreGuess(socketId);
        return;
      }
      // Close-guess: only the guesser sees a hint, message is suppressed
      if (answers.some((a) => isCloseGuess(trimmed, a))) {
        this.io.to(socketId).emit("close:guess");
        return;
      }
    }

    this.broadcast({
      id: rid(),
      player_id: socketId,
      nickname: player.nickname,
      text: trimmed,
      kind: "chat",
      ts: Date.now(),
    });
  }

  private scoreGuess(socketId: string): void {
    if (!this.round_ends_at || !this.current_word) return;
    const totalMs = this.settings.draw_time_seconds * 1000;
    const elapsedMs = totalMs - (this.round_ends_at - Date.now());
    const guesserPoints = calculateGuesserPoints(elapsedMs, totalMs);
    const drawerPoints = calculateDrawerPoints(this.guessed_this_round.size + 1);

    const guesser = this.players.get(socketId);
    if (guesser) guesser.score += guesserPoints;
    const drawer = this.current_drawer_id ? this.players.get(this.current_drawer_id) : null;
    if (drawer) drawer.score += drawerPoints;

    this.guessed_this_round.add(socketId);
    this.broadcast({
      id: rid(),
      player_id: socketId,
      nickname: guesser?.nickname ?? "?",
      text: `${guesser?.nickname ?? "?"} guessed it! +${guesserPoints}`,
      kind: "correct",
      ts: Date.now(),
    });

    // Halve remaining time once first guess lands; if everyone's guessed, end immediately.
    const guessers = [...this.players.keys()].filter((id) => id !== this.current_drawer_id);
    const allGuessed = guessers.every((id) => this.guessed_this_round.has(id));
    if (allGuessed) {
      this.endRound();
      return;
    }

    // Halve only on the first correct (otherwise time keeps shrinking unfairly)
    if (this.guessed_this_round.size === 1 && this.round_ends_at) {
      const remaining = Math.max(2000, this.round_ends_at - Date.now());
      this.round_ends_at = Date.now() + Math.floor(remaining / 2);
      this.clearTimer("main");
      this.timer = setTimeout(
        () => this.endRound(),
        this.round_ends_at - Date.now(),
      );
      this.io.to(this.code).emit("timer:update", { ends_at: this.round_ends_at });
    }
    this.broadcastState();
  }

  private endRoundEarly(_reason: string): void {
    this.endRound();
  }

  private endRound(): void {
    this.clearAllTimers();
    if (this.state === "round_end") return;
    this.state = "round_end";

    const word = this.current_word?.name ?? "?";
    const category: DrawNahCategory = this.current_word?.category ?? "tool_object";
    const image_url = this.current_word?.image_url ?? null;
    const drawer_id = this.current_drawer_id ?? "";
    const drawer_nickname = drawer_id ? this.players.get(drawer_id)?.nickname ?? "?" : "?";
    const guessers = [...this.guessed_this_round].map((id) => {
      const p = this.players.get(id);
      return {
        player_id: id,
        nickname: p?.nickname ?? "?",
        points: 0,
      };
    });
    const scores: Record<string, number> = {};
    for (const p of this.players.values()) scores[p.socket_id] = p.score;

    const summary: RoundSummary = {
      word,
      category,
      drawer_id,
      drawer_nickname,
      guessers,
      scores,
      image_url,
      snapshot_data_url: null,
    };
    this.pending_summary = summary;
    this.round_summaries.push(summary);

    this.io.to(this.code).emit("round:end", summary);
    if (guessers.length === 0) {
      this.systemMessage(`Nobody guessed! The word was "${word}".`);
    } else {
      this.systemMessage(`The word was "${word}" — ${guessers.length} guessed.`);
    }
    this.round_ends_at = Date.now() + ROUND_END_PAUSE_SECONDS * 1000;
    this.broadcastState();

    this.drawer_pointer += 1;
    this.timer = setTimeout(
      () => void this.startNextTurn(),
      ROUND_END_PAUSE_SECONDS * 1000,
    );
  }

  private endGame(): void {
    this.clearAllTimers();
    this.state = "game_over";
    const finalScores = [...this.players.values()]
      .map((p) => ({ player_id: p.socket_id, nickname: p.nickname, score: p.score }))
      .sort((a, b) => b.score - a.score);
    this.io.to(this.code).emit("game:end", {
      final_scores: finalScores,
      rounds: this.round_summaries,
    });
    this.current_drawer_id = null;
    this.round_ends_at = null;
    this.broadcastState();
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  private isHost(socketId: string): boolean {
    return this.players.get(socketId)?.is_host === true;
  }

  private clearTimer(which: "main" | "hint"): void {
    if (which === "main" && this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (which === "hint" && this.hint_interval) {
      clearInterval(this.hint_interval);
      this.hint_interval = null;
    }
  }

  private clearAllTimers(): void {
    this.clearTimer("main");
    this.clearTimer("hint");
  }

  private systemMessage(text: string): void {
    this.broadcast({
      id: rid(),
      player_id: "system",
      nickname: "system",
      text,
      kind: "system",
      ts: Date.now(),
    });
  }

  private broadcast(msg: ChatMessage): void {
    this.chat_history.push(msg);
    if (this.chat_history.length > 200) this.chat_history.splice(0, this.chat_history.length - 200);
    this.io.to(this.code).emit("chat:message", msg);
  }

  broadcastState(): void {
    const snap: RoomStateSnapshot = {
      room_code: this.code,
      state: this.state,
      settings: this.settings,
      players: [...this.players.values()],
      current_round: this.current_round,
      current_drawer_id: this.current_drawer_id,
      round_ends_at: this.round_ends_at,
    };
    this.io.to(this.code).emit("room:state", snap);
  }
}

// ── module-level helpers ────────────────────────────────────────────────────
function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, Math.floor(n)));
}

function shuffle<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
}

function maskWord(word: string): string {
  return word
    .split("")
    .map((c) => (/\s/.test(c) ? " " : /[a-z0-9]/i.test(c) ? "_" : c))
    .join("");
}

function rid(): string {
  return Math.random().toString(36).slice(2, 10);
}
