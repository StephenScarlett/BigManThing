import { useEffect } from "react";
import type { ChatMessage, RoomStateSnapshot, RoundSummary } from "@bmt/shared";
import { getSocket } from "./socket";
import { useDrawStore } from "./store";
import { playSfx } from "./useSound";

/**
 * Wires the singleton socket to the zustand store. Mount once at the room page.
 */
export function useDrawSocket(): void {
  useEffect(() => {
    const s = getSocket();
    const store = useDrawStore;

    if (s.connected) store.getState().setMyId(s.id ?? null);

    let prevState: string | null = null;
    let prevDrawerId: string | null = null;

    const onConnect = () => store.getState().setMyId(s.id ?? null);

    const onState = (snap: RoomStateSnapshot) => {
      const prevRoom = store.getState().room;

      // Detect transitions for sounds
      const enteredDrawing =
        prevState !== "drawing" && snap.state === "drawing";
      const enteredRoundEnd =
        prevState === "drawing" && snap.state === "round_end";

      // Drawer just changed → reset our personal-guessed flag
      if (prevDrawerId !== snap.current_drawer_id) {
        store.getState().setHaveGuessed(false);
      }

      // If transitioned out of drawing/round_end, clear the live summary
      if (
        prevState === "round_end" &&
        snap.state !== "round_end" &&
        store.getState().currentSummary
      ) {
        store.getState().setCurrentSummary(null);
      }

      store.getState().setRoom(snap);

      if (enteredDrawing) playSfx("roundStart");
      if (enteredRoundEnd) {
        // If I'm the drawer, capture the canvas snapshot and upload.
        const myId = store.getState().myId;
        if (myId && prevRoom?.current_drawer_id === myId) {
          uploadSnapshot();
        }
      }

      prevState = snap.state;
      prevDrawerId = snap.current_drawer_id;
    };

    const onChat = (m: ChatMessage) => {
      store.getState().appendMessage(m);
      const myId = store.getState().myId;
      if (m.kind === "correct") {
        if (m.player_id === myId) {
          store.getState().setHaveGuessed(true);
          playSfx("myCorrect");
        } else {
          playSfx("correct");
        }
      }
    };

    const onDraw: Parameters<typeof s.on<"draw">>[1] = (e) =>
      store.getState().appendEvent(e);
    const onReplay: Parameters<typeof s.on<"draw:replay">>[1] = (events) =>
      store.getState().replayEvents(events);

    const onWordOptions: Parameters<typeof s.on<"word:options">>[1] = (opts) => {
      store.getState().resetRound();
      store.getState().setWordOptions(opts);
    };
    const onWordCurrent: Parameters<typeof s.on<"word:current">>[1] = (
      payload,
    ) => {
      store.getState().setGuessMask(payload);
      store.getState().setMyWord(null);
    };
    const onWordCurrentDrawer: Parameters<
      typeof s.on<"word:current:drawer">
    >[1] = ({ word, image_url }) => {
      store.getState().setMyWord(word);
      store.getState().setMyImageUrl(image_url ?? null);
      store.getState().setGuessMask(null);
    };
    const onHint: Parameters<typeof s.on<"hint:reveal">>[1] = ({ mask }) => {
      store.getState().setMaskString(mask);
    };
    const onClose: Parameters<typeof s.on<"close:guess">>[1] = () => {
      store.getState().flashClose();
      playSfx("close");
    };
    const onTimer: Parameters<typeof s.on<"timer:update">>[1] = ({ ends_at }) => {
      const room = store.getState().room;
      if (room) store.getState().setRoom({ ...room, round_ends_at: ends_at });
    };
    const onRoundEnd = (summary: RoundSummary) => {
      store.getState().setMyWord(null);
      store.getState().setMyImageUrl(null);
      store.getState().setGuessMask(null);
      store.getState().setCurrentSummary(summary);
    };
    const onGameEnd: Parameters<typeof s.on<"game:end">>[1] = ({
      final_scores,
      rounds,
    }) => {
      store.getState().setFinalScores(final_scores);
      store.getState().setFinalRounds(rounds ?? []);
      const myId = store.getState().myId;
      const winner = final_scores[0];
      if (winner && winner.player_id === myId) {
        // Confetti is mounted at the page; gameOver sound here.
        playSfx("gameOver");
      } else {
        playSfx("gameOver");
      }
    };
    const onError: Parameters<typeof s.on<"error">>[1] = (msg) =>
      console.warn("[draw] error:", msg);

    s.on("connect", onConnect);
    s.on("room:state", onState);
    s.on("chat:message", onChat);
    s.on("draw", onDraw);
    s.on("draw:replay", onReplay);
    s.on("word:options", onWordOptions);
    s.on("word:current", onWordCurrent);
    s.on("word:current:drawer", onWordCurrentDrawer);
    s.on("hint:reveal", onHint);
    s.on("close:guess", onClose);
    s.on("timer:update", onTimer);
    s.on("round:end", onRoundEnd);
    s.on("game:end", onGameEnd);
    s.on("error", onError);

    return () => {
      s.off("connect", onConnect);
      s.off("room:state", onState);
      s.off("chat:message", onChat);
      s.off("draw", onDraw);
      s.off("draw:replay", onReplay);
      s.off("word:options", onWordOptions);
      s.off("word:current", onWordCurrent);
      s.off("word:current:drawer", onWordCurrentDrawer);
      s.off("hint:reveal", onHint);
      s.off("close:guess", onClose);
      s.off("timer:update", onTimer);
      s.off("round:end", onRoundEnd);
      s.off("game:end", onGameEnd);
      s.off("error", onError);
    };
  }, []);
}

function uploadSnapshot(): void {
  // Find the canvas mounted in DOM and upload a downscaled JPEG.
  const canvas = document.querySelector<HTMLCanvasElement>(
    "canvas[data-draw-canvas='1']",
  );
  if (!canvas) return;
  try {
    const w = 320;
    const h = Math.round((canvas.height / canvas.width) * w);
    const off = document.createElement("canvas");
    off.width = w;
    off.height = h;
    const ctx = off.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(canvas, 0, 0, w, h);
    const dataUrl = off.toDataURL("image/jpeg", 0.6);
    if (dataUrl.length > 240_000) return;
    getSocket().emit("snapshot:upload", dataUrl);
  } catch {
    /* ignore */
  }
}
