import type { GuessNahMode } from "./entities.js";

/**
 * Word categories for Draw Nah — these mirror entity `field` (dem) and
 * `kind` (ting) values 1:1 so filtering uses the entity's primary attribute.
 */
export const DRAW_NAH_CATEGORIES = [
  // dem fields
  "sports",
  "music",
  "politics",
  "comedy",
  "media",
  "business",
  "activism",
  "entertainment",
  "social_media",
  // ting kinds
  "food",
  "drink",
  "instrument",
  "wearable",
  "tool_object",
] as const;
export type DrawNahCategory = (typeof DRAW_NAH_CATEGORIES)[number];

export const DRAW_NAH_CATEGORY_LABELS: Record<DrawNahCategory, string> = {
  sports:        "Sports",
  music:         "Music",
  politics:      "Politics",
  comedy:        "Comedy",
  media:         "Media",
  business:      "Business",
  activism:      "Activism",
  entertainment: "Entertainment",
  social_media:  "Social Media",
  food:          "Food",
  drink:         "Drink",
  instrument:    "Instruments",
  wearable:      "Wearables",
  tool_object:   "Objects & Tools",
};

/**
 * Draw Nah game state machine.
 */
export const DRAW_GAME_STATES = [
  "lobby",
  "picking_word",
  "drawing",
  "round_end",
  "game_over",
] as const;
export type DrawGameState = (typeof DRAW_GAME_STATES)[number];

export interface DrawPlayer {
  socket_id: string;
  user_id: string | null;
  nickname: string;
  is_host: boolean;
  score: number;
  connected: boolean;
}

export interface DrawRoomSettings {
  rounds: number; // 1..10
  draw_time_seconds: number; // 30..180
  categories: DrawNahCategory[]; // empty = all
  max_players: number; // default 12
  show_hints: boolean; // reveal letters as time elapses
  use_aliases: boolean; // accept alternate spellings/aliases
}

export interface DrawWordOption {
  entity_id: string;
  display: string;
  difficulty: "easy" | "medium" | "hard";
  category: DrawNahCategory;
  mode: GuessNahMode;
  image_url: string | null;
}

export type DrawEvent =
  | { kind: "stroke"; color: string; size: number; points: { x: number; y: number }[] }
  | { kind: "fill"; color: string; x: number; y: number }
  | { kind: "clear" }
  | { kind: "undo" };

export interface ChatMessage {
  id: string;
  player_id: string;
  nickname: string;
  text: string;
  kind: "chat" | "guess" | "correct" | "close" | "system";
  ts: number;
}

/** Client → Server */
export interface ClientToServerEvents {
  "room:create": (
    payload: { nickname: string; settings?: Partial<DrawRoomSettings> },
    cb: (res: { ok: true; room_code: string } | { ok: false; error: string }) => void,
  ) => void;
  "room:join": (
    payload: { room_code: string; nickname: string },
    cb: (res: { ok: true } | { ok: false; error: string }) => void,
  ) => void;
  "room:leave": () => void;
  "room:settings": (settings: Partial<DrawRoomSettings>) => void;
  "game:start": () => void;
  "word:pick": (entity_id: string) => void;
  draw: (event: DrawEvent) => void;
  "chat:send": (text: string) => void;
  /** Drawer's client uploads a thumbnail PNG dataURL when round ends. */
  "snapshot:upload": (data_url: string) => void;
}

export interface RoundSummary {
  word: string;
  category: DrawNahCategory;
  drawer_id: string;
  drawer_nickname: string;
  guessers: { player_id: string; nickname: string; points: number }[];
  scores: Record<string, number>;
  /** Reference image of the entity, for the round summary. */
  image_url?: string | null;
  /** dataURL contributed by the drawer client when round ends, optional */
  snapshot_data_url?: string | null;
}

/** Server → Client */
export interface ServerToClientEvents {
  "room:state": (state: RoomStateSnapshot) => void;
  "game:state": (state: DrawGameState) => void;
  "word:options": (options: DrawWordOption[]) => void;
  "word:current": (payload: { length: number; mask: string }) => void; // guessers
  "word:current:drawer": (payload: { word: string; image_url: string | null }) => void; // drawer only
  "hint:reveal": (payload: { mask: string }) => void; // updated mask for guessers
  draw: (event: DrawEvent) => void;
  "draw:replay": (events: DrawEvent[]) => void;
  "chat:message": (message: ChatMessage) => void;
  "close:guess": () => void; // tell only the guesser their guess was close
  "timer:update": (payload: { ends_at: number }) => void;
  "round:end": (summary: RoundSummary) => void;
  "game:end": (payload: { final_scores: { player_id: string; nickname: string; score: number }[]; rounds: RoundSummary[] }) => void;
  error: (message: string) => void;
}

export interface RoomStateSnapshot {
  room_code: string;
  state: DrawGameState;
  settings: DrawRoomSettings;
  players: DrawPlayer[];
  current_round: number;
  current_drawer_id: string | null;
  round_ends_at: number | null; // epoch ms
}

export const DEFAULT_DRAW_ROOM_SETTINGS: DrawRoomSettings = {
  rounds: 3,
  draw_time_seconds: 90,
  categories: [],
  max_players: 12,
  show_hints: true,
  use_aliases: true,
};
