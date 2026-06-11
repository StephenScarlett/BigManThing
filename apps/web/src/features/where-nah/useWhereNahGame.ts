/**
 * Where Nah game-state machine: drives the 5-round flow, scoring, and reveal.
 * Owns the {@link WhereNahLocationProvider} so the page stays declarative.
 */
import { useCallback, useEffect, useReducer, useRef } from "react";
import {
  haversineMeters,
  scoreForDistance,
  WHERE_NAH_ROUNDS,
  type LatLng,
  type WhereNahLocation,
  type WhereNahLocationProvider,
  type WhereNahRoundResult,
} from "@bmt/shared";
import {
  createLocationProvider,
  type LocationProviderKind,
} from "./locationProvider";

export type WhereNahPhase =
  | "loading"
  | "guessing"
  | "revealed"
  | "finished"
  | "error";

export interface WhereNahState {
  phase: WhereNahPhase;
  roundIndex: number;
  location: WhereNahLocation | null;
  guess: LatLng | null;
  lastResult: WhereNahRoundResult | null;
  results: WhereNahRoundResult[];
  totalScore: number;
  error: string | null;
  resetSignal: number;
}

type Action =
  | { type: "load" }
  | { type: "loaded"; location: WhereNahLocation }
  | { type: "loadError"; message: string }
  | { type: "placeGuess"; point: LatLng }
  | { type: "reveal"; result: WhereNahRoundResult }
  | { type: "advance" }
  | { type: "restart" };

const initialState: WhereNahState = {
  phase: "loading",
  roundIndex: 0,
  location: null,
  guess: null,
  lastResult: null,
  results: [],
  totalScore: 0,
  error: null,
  resetSignal: 0,
};

function reducer(state: WhereNahState, action: Action): WhereNahState {
  switch (action.type) {
    case "load":
      return { ...state, phase: "loading", location: null, guess: null, error: null };
    case "loaded":
      return {
        ...state,
        phase: "guessing",
        location: action.location,
        guess: null,
        resetSignal: state.resetSignal + 1,
      };
    case "loadError":
      return { ...state, phase: "error", error: action.message };
    case "placeGuess":
      if (state.phase !== "guessing") return state;
      return { ...state, guess: action.point };
    case "reveal": {
      const results = [...state.results, action.result];
      return {
        ...state,
        phase: "revealed",
        lastResult: action.result,
        results,
        totalScore: state.totalScore + action.result.score,
      };
    }
    case "advance": {
      const nextIndex = state.roundIndex + 1;
      if (nextIndex >= WHERE_NAH_ROUNDS) {
        return { ...state, phase: "finished" };
      }
      return { ...state, roundIndex: nextIndex, phase: "loading", location: null, guess: null };
    }
    case "restart":
      return { ...initialState, resetSignal: state.resetSignal + 1 };
    default:
      return state;
  }
}

export function useWhereNahGame(kind: LocationProviderKind = "random") {
  const [state, dispatch] = useReducer(reducer, initialState);
  const providerRef = useRef<WhereNahLocationProvider>();
  if (!providerRef.current) providerRef.current = createLocationProvider(kind);
  const abortRef = useRef<AbortController | null>(null);

  const loadLocation = useCallback(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    dispatch({ type: "load" });

    providerRef.current!.next(controller.signal)
      .then((location) => {
        if (!controller.signal.aborted) dispatch({ type: "loaded", location });
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        const message =
          err instanceof Error ? err.message : "Failed to load a location.";
        dispatch({ type: "loadError", message });
      });
  }, []);

  // Load whenever we're in loading. The request abort controller ensures only
  // the latest attempt remains active.
  useEffect(() => {
    if (state.phase === "loading") loadLocation();
  }, [state.phase, loadLocation]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const placeGuess = useCallback((point: LatLng) => {
    dispatch({ type: "placeGuess", point });
  }, []);

  const submitGuess = useCallback(() => {
    if (state.phase !== "guessing" || !state.guess || !state.location) return;
    const target = state.location.position;
    const distanceMeters = haversineMeters(state.guess, target);
    const result: WhereNahRoundResult = {
      target,
      guess: state.guess,
      distanceMeters,
      score: scoreForDistance(distanceMeters),
    };
    dispatch({ type: "reveal", result });
  }, [state.phase, state.guess, state.location]);

  const nextRound = useCallback(() => dispatch({ type: "advance" }), []);
  const restart = useCallback(() => dispatch({ type: "restart" }), []);
  const retryLoad = useCallback(() => loadLocation(), [loadLocation]);

  return { state, placeGuess, submitGuess, nextRound, restart, retryLoad };
}
