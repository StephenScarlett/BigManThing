/**
 * Web Audio synthesized SFX. No assets, no preloading, mobile-friendly.
 * Mute toggle persisted to localStorage. Audio context auto-unlocks
 * on first user gesture (required by iOS).
 */
import { useCallback, useEffect, useRef, useState } from "react";

const MUTE_KEY = "bmt:draw:muted";

type Voice = "correct" | "myCorrect" | "tick" | "tickUrgent" | "roundStart" | "gameOver" | "close";

let _ctx: AudioContext | null = null;
function getCtx(): AudioContext {
  if (_ctx) return _ctx;
  const Ctor =
    (window as unknown as { AudioContext?: typeof AudioContext }).AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  _ctx = new Ctor!();
  return _ctx;
}

function tone(
  ctx: AudioContext,
  freq: number,
  duration: number,
  type: OscillatorType = "sine",
  gain = 0.15,
  attack = 0.01,
  release = 0.05,
): void {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  g.gain.setValueAtTime(0, ctx.currentTime);
  g.gain.linearRampToValueAtTime(gain, ctx.currentTime + attack);
  g.gain.linearRampToValueAtTime(0, ctx.currentTime + duration + release);
  osc.connect(g).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration + release + 0.05);
}

function play(voice: Voice): void {
  try {
    const ctx = getCtx();
    if (ctx.state === "suspended") void ctx.resume();
    switch (voice) {
      case "correct": {
        tone(ctx, 660, 0.08, "triangle", 0.18);
        setTimeout(() => tone(ctx, 880, 0.12, "triangle", 0.18), 80);
        return;
      }
      case "myCorrect": {
        tone(ctx, 660, 0.08, "triangle", 0.22);
        setTimeout(() => tone(ctx, 880, 0.08, "triangle", 0.22), 80);
        setTimeout(() => tone(ctx, 1320, 0.18, "triangle", 0.22), 160);
        return;
      }
      case "close": {
        tone(ctx, 520, 0.07, "sine", 0.14);
        return;
      }
      case "tick": {
        tone(ctx, 720, 0.04, "square", 0.06);
        return;
      }
      case "tickUrgent": {
        tone(ctx, 980, 0.05, "square", 0.1);
        return;
      }
      case "roundStart": {
        tone(ctx, 440, 0.08, "sine", 0.18);
        setTimeout(() => tone(ctx, 660, 0.12, "sine", 0.18), 90);
        return;
      }
      case "gameOver": {
        tone(ctx, 880, 0.1, "triangle", 0.2);
        setTimeout(() => tone(ctx, 660, 0.1, "triangle", 0.2), 110);
        setTimeout(() => tone(ctx, 440, 0.2, "triangle", 0.2), 220);
        return;
      }
    }
  } catch {
    /* ignore */
  }
}

let muted = (() => {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
})();
const subscribers = new Set<(m: boolean) => void>();

export function isMuted(): boolean {
  return muted;
}
export function setMuted(value: boolean): void {
  muted = value;
  try {
    localStorage.setItem(MUTE_KEY, value ? "1" : "0");
  } catch {
    /* ignore */
  }
  subscribers.forEach((fn) => fn(muted));
}
export function playSfx(voice: Voice): void {
  if (muted) return;
  play(voice);
}

/** React hook for mute state + a one-time global gesture-unlock. */
export function useMuted(): [boolean, (m: boolean) => void] {
  const [m, setM] = useState(muted);
  useEffect(() => {
    const sub = (v: boolean) => setM(v);
    subscribers.add(sub);
    return () => {
      subscribers.delete(sub);
    };
  }, []);
  return [m, setMuted];
}

/** Attach once at app root: unlocks AudioContext on first user gesture. */
export function useAudioUnlock(): void {
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    const unlock = () => {
      try {
        const ctx = getCtx();
        if (ctx.state === "suspended") void ctx.resume();
      } catch {
        /* ignore */
      }
      done.current = true;
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("touchstart", unlock);
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    window.addEventListener("touchstart", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("touchstart", unlock);
    };
  }, []);
}

/** Convenience callback hook. */
export function usePlay(): (v: Voice) => void {
  return useCallback(playSfx, []);
}
