import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  formatDistance,
  WHERE_NAH_MAX_GAME_SCORE,
  WHERE_NAH_ROUNDS,
  type LatLng,
} from "@bmt/shared";
import { useWhereNahGame } from "@/features/where-nah/useWhereNahGame";
import { StreetViewPanel } from "@/features/where-nah/StreetViewPanel";
import { GuessMap } from "@/features/where-nah/GuessMap";

export default function WhereNahPage() {
  const { state, placeGuess, submitGuess, nextRound, restart, retryLoad } =
    useWhereNahGame("random");

  return (
    <div className="space-y-4">
      <header className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-4xl">Where Nah</h1>
          <p className="text-ink-muted">
            Dropped somewhere in Trinidad. Look around, then guess where.
          </p>
        </div>
        <ScoreBar
          round={Math.min(state.roundIndex + 1, WHERE_NAH_ROUNDS)}
          total={state.totalScore}
        />
      </header>

      {state.phase === "finished" ? (
        <EndScreen
          results={state.results}
          total={state.totalScore}
          onRestart={restart}
        />
      ) : (
        <PlayArea
          state={state}
          onPlaceGuess={placeGuess}
          onSubmit={submitGuess}
          onNext={nextRound}
          onRetry={retryLoad}
        />
      )}
    </div>
  );
}

function ScoreBar({ round, total }: { round: number; total: number }) {
  return (
    <div className="flex gap-2 text-center">
      <Stat label="Round" value={`${round} / ${WHERE_NAH_ROUNDS}`} />
      <Stat label="Score" value={total.toLocaleString()} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface-2 px-4 py-2">
      <div className="text-[10px] uppercase tracking-wider text-ink-muted">
        {label}
      </div>
      <div className="font-display tracking-wide text-lg">{value}</div>
    </div>
  );
}

interface PlayAreaProps {
  state: ReturnType<typeof useWhereNahGame>["state"];
  onPlaceGuess: (p: LatLng) => void;
  onSubmit: () => void;
  onNext: () => void;
  onRetry: () => void;
}

function PlayArea({ state, onPlaceGuess, onSubmit, onNext, onRetry }: PlayAreaProps) {
  const [mapExpanded, setMapExpanded] = useState(false);
  const [desktopHoverExpand, setDesktopHoverExpand] = useState(false);
  const revealed = state.phase === "revealed";

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;

    const media = window.matchMedia("(hover: hover) and (pointer: fine)");
    const sync = () => setDesktopHoverExpand(media.matches);
    sync();

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", sync);
      return () => media.removeEventListener("change", sync);
    }

    media.addListener(sync);
    return () => media.removeListener(sync);
  }, []);

  useEffect(() => {
    // When switching to desktop-hover mode, always reset to collapsed.
    if (desktopHoverExpand) setMapExpanded(false);
  }, [desktopHoverExpand]);

  if (state.phase === "error") {
    return (
      <div className="card text-center py-16">
        <p className="text-xl mb-1">Steups. Something went wrong.</p>
        <p className="text-ink-muted mb-4">{state.error}</p>
        <button onClick={onRetry} className="btn-primary">
          Try again
        </button>
      </div>
    );
  }

  // On reveal, the map takes over full-size to show guess vs. actual.
  if (revealed) {
    return (
      <div className="space-y-4">
        <div className="relative h-[58vh] md:h-[68vh] overflow-hidden rounded-2xl border border-line">
          <GuessMap
            guess={state.guess}
            actual={state.lastResult?.target ?? null}
            locked
            onGuess={onPlaceGuess}
          />
        </div>
        {state.lastResult && (
          <RoundResult
            distanceMeters={state.lastResult.distanceMeters}
            score={state.lastResult.score}
            isLastRound={state.roundIndex + 1 >= WHERE_NAH_ROUNDS}
            onNext={onNext}
          />
        )}
      </div>
    );
  }

  return (
    <div className="relative h-[58vh] md:h-[68vh] overflow-hidden rounded-2xl border border-line bg-surface-3">
      {state.phase === "loading" && <LoadingOverlay />}

      {state.phase === "guessing" && state.location && (
        <>
          <StreetViewPanel
            location={state.location}
            resetSignal={state.resetSignal}
            onPanoramaExhausted={onRetry}
          />

          {/* Expandable guess map (bottom-right). */}
          <div
            onMouseEnter={desktopHoverExpand ? () => setMapExpanded(true) : undefined}
            onMouseLeave={desktopHoverExpand ? () => setMapExpanded(false) : undefined}
            className={`absolute bottom-3 right-3 z-10 overflow-hidden rounded-xl border border-line bg-surface shadow-glow transition-all duration-200 ${
              mapExpanded
                ? "h-[min(58vh,22rem)] w-[min(90vw,28rem)]"
                : "h-32 w-44 sm:h-40 sm:w-56"
            }`}
          >
            <div className="absolute inset-0">
              <GuessMap
                guess={state.guess}
                actual={null}
                locked={false}
                onGuess={onPlaceGuess}
              />
            </div>
            {!desktopHoverExpand && (
              <button
                type="button"
                onClick={() => setMapExpanded((v) => !v)}
                className="absolute right-1 top-1 z-10 rounded-md bg-surface/90 px-2 py-1 text-xs font-semibold text-ink shadow-sm backdrop-blur"
              >
                {mapExpanded ? "Minimize map" : "Expand map"}
              </button>
            )}
          </div>

          {/* Guess button. */}
          <div className="absolute bottom-3 left-3 z-10">
            <button
              onClick={onSubmit}
              disabled={!state.guess}
              className="btn-primary shadow-glow"
            >
              {state.guess ? "Make guess" : "Tap map to guess"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function LoadingOverlay() {
  return (
    <div className="absolute inset-0 grid place-items-center bg-surface/70">
      <div className="text-center">
        <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-line border-t-brand-red" />
        <p className="text-ink-muted">Finding a spot in Trinidad…</p>
      </div>
    </div>
  );
}

function RoundResult({
  distanceMeters,
  score,
  isLastRound,
  onNext,
}: {
  distanceMeters: number;
  score: number;
  isLastRound: boolean;
  onNext: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="card flex flex-wrap items-center justify-between gap-4"
    >
      <div className="flex gap-6">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-ink-muted">
            You were
          </div>
          <div className="font-display text-2xl">
            {formatDistance(distanceMeters)} off
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-ink-muted">
            Points
          </div>
          <div className="font-display text-2xl text-brand-red">
            +{score.toLocaleString()}
          </div>
        </div>
      </div>
      <button onClick={onNext} className="btn-primary">
        {isLastRound ? "See results" : "Next round"}
      </button>
    </motion.div>
  );
}

function EndScreen({
  results,
  total,
  onRestart,
}: {
  results: { distanceMeters: number; score: number }[];
  total: number;
  onRestart: () => void;
}) {
  const pct = Math.round((total / WHERE_NAH_MAX_GAME_SCORE) * 100);
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="card text-center"
    >
      <h2 className="text-3xl mb-1">Game done!</h2>
      <p className="text-ink-muted mb-4">
        You scored {pct}% of a perfect game.
      </p>
      <div className="font-display text-6xl text-brand-red mb-6">
        {total.toLocaleString()}
        <span className="text-ink-muted text-2xl">
          {" "}
          / {WHERE_NAH_MAX_GAME_SCORE.toLocaleString()}
        </span>
      </div>

      <ol className="mx-auto mb-6 max-w-md space-y-2 text-left">
        {results.map((r, i) => (
          <li
            key={i}
            className="flex items-center justify-between rounded-xl border border-line bg-surface px-4 py-2"
          >
            <span className="text-ink-muted">Round {i + 1}</span>
            <span className="text-sm text-ink-muted">
              {formatDistance(r.distanceMeters)}
            </span>
            <span className="font-display text-lg">
              {r.score.toLocaleString()}
            </span>
          </li>
        ))}
      </ol>

      <div className="flex justify-center gap-3">
        <button onClick={onRestart} className="btn-primary">
          Play again
        </button>
        <Link to="/" className="btn-secondary">
          Home
        </Link>
      </div>
    </motion.div>
  );
}
