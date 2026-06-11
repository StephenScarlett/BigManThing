import { create } from "zustand";
import type {
  ChatMessage,
  DrawEvent,
  DrawWordOption,
  RoomStateSnapshot,
  RoundSummary,
} from "@bmt/shared";

interface State {
  room: RoomStateSnapshot | null;
  myId: string | null;
  messages: ChatMessage[];
  events: DrawEvent[];
  wordOptions: DrawWordOption[];
  myWord: string | null;
  myImageUrl: string | null;
  guessMask: { length: number; mask: string } | null;
  closeFlashAt: number;
  haveGuessed: boolean;
  currentSummary: RoundSummary | null;
  finalScores:
    | { player_id: string; nickname: string; score: number }[]
    | null;
  finalRounds: RoundSummary[];

  setRoom: (r: RoomStateSnapshot | null) => void;
  setMyId: (id: string | null) => void;
  appendMessage: (m: ChatMessage) => void;
  appendEvent: (e: DrawEvent) => void;
  replayEvents: (events: DrawEvent[]) => void;
  clearEvents: () => void;
  setWordOptions: (opts: DrawWordOption[]) => void;
  setMyWord: (w: string | null) => void;
  setMyImageUrl: (u: string | null) => void;
  setGuessMask: (m: { length: number; mask: string } | null) => void;
  setMaskString: (mask: string) => void;
  flashClose: () => void;
  setHaveGuessed: (v: boolean) => void;
  setCurrentSummary: (s: RoundSummary | null) => void;
  setFinalScores: (
    s: { player_id: string; nickname: string; score: number }[] | null,
  ) => void;
  setFinalRounds: (r: RoundSummary[]) => void;
  resetRound: () => void;
  resetAll: () => void;
}

export const useDrawStore = create<State>((set) => ({
  room: null,
  myId: null,
  messages: [],
  events: [],
  wordOptions: [],
  myWord: null,
  myImageUrl: null,
  guessMask: null,
  closeFlashAt: 0,
  haveGuessed: false,
  currentSummary: null,
  finalScores: null,
  finalRounds: [],

  setRoom: (r) => set({ room: r }),
  setMyId: (id) => set({ myId: id }),
  appendMessage: (m) =>
    set((s) => ({ messages: [...s.messages, m].slice(-200) })),
  appendEvent: (e) =>
    set((s) => {
      if (e.kind === "clear") return { events: [] };
      if (e.kind === "undo") return { events: s.events.slice(0, -1) };
      return { events: [...s.events, e] };
    }),
  replayEvents: (events) => set({ events }),
  clearEvents: () => set({ events: [] }),
  setWordOptions: (opts) => set({ wordOptions: opts }),
  setMyWord: (w) => set({ myWord: w }),
  setMyImageUrl: (u) => set({ myImageUrl: u }),
  setGuessMask: (m) => set({ guessMask: m }),
  setMaskString: (mask) =>
    set((s) =>
      s.guessMask
        ? { guessMask: { ...s.guessMask, mask } }
        : { guessMask: s.guessMask },
    ),
  flashClose: () => set({ closeFlashAt: Date.now() }),
  setHaveGuessed: (v) => set({ haveGuessed: v }),
  setCurrentSummary: (s) => set({ currentSummary: s }),
  setFinalScores: (s) => set({ finalScores: s }),
  setFinalRounds: (r) => set({ finalRounds: r }),
  resetRound: () =>
    set({
      events: [],
      wordOptions: [],
      myWord: null,
      myImageUrl: null,
      guessMask: null,
      currentSummary: null,
      haveGuessed: false,
    }),
  resetAll: () =>
    set({
      room: null,
      messages: [],
      events: [],
      wordOptions: [],
      myWord: null,
      myImageUrl: null,
      guessMask: null,
      currentSummary: null,
      haveGuessed: false,
      finalScores: null,
      finalRounds: [],
    }),
}));
