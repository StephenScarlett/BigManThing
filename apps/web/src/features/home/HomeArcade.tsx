import { useEffect, useRef, useState } from "react";
import type { HomeDesign, HomeItem, HomeState } from "@bmt/shared";
import { PixelAvatar } from "./RoomScene";

export function PanMemory({
  state,
  busy,
  onUnlock,
  onStart,
  onFinish,
}: {
  state: HomeState;
  busy: boolean;
  onUnlock: () => void;
  onStart: () => void;
  onFinish: (answer: number[]) => void;
}) {
  const round = state.pan,
    [answer, setAnswer] = useState<number[]>([]),
    [elapsed, setElapsed] = useState(0),
    [replay, setReplay] = useState(0);
  const clock = useRef(0);
  useEffect(() => {
    setAnswer([]);
    setElapsed(0);
    clock.current = performance.now();
    if (!round || round.status !== "playing") return;
    const timer = window.setInterval(
      () => setElapsed(performance.now() - clock.current),
      100,
    );
    return () => window.clearInterval(timer);
  }, [round?.id, replay, round?.status]);
  const watching = !!round && round.status === "playing" && elapsed < 8000;
  const noteIndex = Math.floor((elapsed - 1500) / 1000),
    lit =
      watching &&
      elapsed >= 1500 &&
      noteIndex < 6 &&
      (elapsed - 1500) % 1000 < 650
        ? round!.pattern[noteIndex]
        : null;
  return (
    <section className="home-panel home-pan">
      <div className="home-panel-heading">
        <span className="home-eyebrow">Daily arcade</span>
        <h2>Pan Memory</h2>
      </div>
      <p>
        Watch six notes light up, then play them back in order. A finished round
        earns 1 roll + 10 coins, once a day.
      </p>
      {!state.pan_unlocked ? (
        <>
          <p className="home-small">
            Unlock permanently with Lime Coins. Your character and outfits come
            with you.
          </p>
          <button
            className="home-button"
            disabled={busy || state.coins < 150}
            onClick={onUnlock}
          >
            Unlock · 150 coins
          </button>
        </>
      ) : !round ? (
        <button className="home-button" disabled={busy} onClick={onStart}>
          Start today's pattern
        </button>
      ) : (
        <>
          <p role="status" aria-live="polite" className="home-game-status">
            {round.status !== "playing"
              ? round.status === "won"
                ? "Perfect recall! Reward collected."
                : "Good try. Reward collected; come back tomorrow."
              : watching
                ? lit
                  ? `Note ${noteIndex + 1}: ${lit}`
                  : "Watch the pattern…"
                : "Your turn. Enter six notes."}
          </p>
          <div className="home-pan-keys">
            {[1, 2, 3, 4].map((n) => (
              <button
                key={n}
                className={`home-pan-key note-${n} ${lit === n ? "is-lit" : ""}`}
                aria-label={`Play note ${n}`}
                disabled={
                  watching ||
                  busy ||
                  round.status !== "playing" ||
                  answer.length >= 6
                }
                onClick={() => setAnswer((a) => [...a, n])}
              >
                {n}
              </button>
            ))}
          </div>
          {round.status === "playing" && (
            <>
              <div className="home-note-answer" aria-label="Your notes">
                {Array.from({ length: 6 }, (_, i) => (
                  <span key={i}>{answer[i] ?? "·"}</span>
                ))}
              </div>
              <div className="home-actions">
                <button
                  className="home-button"
                  disabled={busy || watching || answer.length !== 6}
                  onClick={() => onFinish(answer)}
                >
                  Play back
                </button>
                <button
                  className="home-button quiet"
                  disabled={busy || watching}
                  onClick={() => setAnswer((a) => a.slice(0, -1))}
                >
                  Undo note
                </button>
                <button
                  className="home-button quiet"
                  disabled={busy}
                  onClick={() => setReplay((r) => r + 1)}
                >
                  Replay pattern
                </button>
              </div>
            </>
          )}
        </>
      )}
      <p className="home-small">
        Visual notes in this prototype. All rewards are for completion; this is
        an unranked activity.
      </p>
    </section>
  );
}

interface Falling {
  id: number;
  lane: number;
  row: number;
}
/** Local arcade practice: these scores never submit currency or ranking claims. */
export function CoconutCatch({
  design,
  catalog,
}: {
  design: HomeDesign;
  catalog: HomeItem[];
}) {
  const [running, setRunning] = useState(false),
    [lane, setLane] = useState(1),
    [falling, setFalling] = useState<Falling[]>([]),
    [score, setScore] = useState(0),
    [misses, setMisses] = useState(0),
    [ticks, setTicks] = useState(0);
  const live = useRef({
    lane: 1,
    falling: [] as Falling[],
    score: 0,
    misses: 0,
    ticks: 0,
  });
  function move(dx: number) {
    setLane((l) => {
      const next = Math.max(0, Math.min(2, l + dx));
      live.current.lane = next;
      return next;
    });
  }
  function start() {
    live.current = { lane: 1, falling: [], score: 0, misses: 0, ticks: 0 };
    setLane(1);
    setFalling([]);
    setScore(0);
    setMisses(0);
    setTicks(0);
    setRunning(true);
  }
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      const a = live.current;
      a.ticks++;
      const next: Falling[] = [];
      for (const f of a.falling) {
        if (f.row >= 5) {
          if (f.lane === a.lane) a.score++;
          else a.misses++;
        } else next.push({ ...f, row: f.row + 1 });
      }
      if (a.ticks % 2 === 1 && a.ticks <= 31)
        next.push({ id: a.ticks, lane: Math.floor(Math.random() * 3), row: 0 });
      a.falling = next;
      setFalling(next);
      setScore(a.score);
      setMisses(a.misses);
      setTicks(a.ticks);
      if (a.misses >= 3 || a.ticks >= 38) setRunning(false);
    }, 500);
    return () => window.clearInterval(timer);
  }, [running]);
  return (
    <section
      className="home-panel home-catch"
      onKeyDown={(e) => {
        if (running && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
          e.preventDefault();
          move(e.key === "ArrowLeft" ? -1 : 1);
        }
      }}
    >
      <div className="home-panel-heading">
        <span className="home-eyebrow">Free play</span>
        <h2>Coconut Catch</h2>
      </div>
      <p>
        Move your character between three lanes. Catch the coconuts before three
        slip past.
      </p>
      <div className="home-catch-score" role="status">
        {score} caught · {misses}/3 missed
        {!running && ticks > 0 ? " · Round over" : ""}
      </div>
      <svg
        viewBox="0 0 300 220"
        role="img"
        aria-label={`${score} coconuts caught, ${misses} missed. Character in lane ${lane + 1}.`}
      >
        <rect width="300" height="220" fill="#e8e7c8" />
        {[0, 1, 2].map((i) => (
          <path
            key={i}
            d={`M${i * 100} 0v220`}
            stroke="#b4b597"
            strokeDasharray="4 8"
          />
        ))}
        {falling.map((f) => (
          <g
            key={f.id}
            transform={`translate(${f.lane * 100 + 50} ${20 + f.row * 25})`}
          >
            <circle r="9" fill="#94704a" stroke="#4d4934" strokeWidth="2" />
            <path d="M-3 -4l5 8" stroke="#c4a176" strokeWidth="2" />
          </g>
        ))}
        <PixelAvatar
          design={design}
          catalog={catalog}
          x={lane * 100 + 50}
          y={207}
          scale={1.1}
        />
      </svg>
      <div className="home-actions">
        <button
          className="home-button quiet"
          aria-label="Move left"
          disabled={!running}
          onClick={() => move(-1)}
        >
          ← Left
        </button>
        <button className="home-button" disabled={running} onClick={start}>
          {ticks ? "Play again" : "Start catching"}
        </button>
        <button
          className="home-button quiet"
          aria-label="Move right"
          disabled={!running}
          onClick={() => move(1)}
        >
          Right →
        </button>
      </div>
      <p className="home-small">
        Practice freely. Currency rewards for this game need a server-verified
        version before they can be enabled.
      </p>
    </section>
  );
}
