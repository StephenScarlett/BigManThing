import { ENTITY_ERAS, ENTITY_REACHES, type Entity } from "./entities.js";
import type {
  DemFeedback,
  FeedbackState,
  GuessFeedback,
  TingFeedback,
} from "./guess-nah.js";

const ERA_INDEX: Record<string, number> = Object.fromEntries(
  ENTITY_ERAS.map((e, i) => [e, i]),
);
const REACH_INDEX: Record<string, number> = Object.fromEntries(
  ENTITY_REACHES.map((r, i) => [r, i]),
);

function eq(g: unknown, a: unknown): FeedbackState {
  return g === a ? "exact" : "wrong";
}

function ordered(g: number | undefined, a: number | undefined): FeedbackState {
  if (g === undefined || a === undefined) return "wrong";
  if (g === a) return "exact";
  return g < a ? "higher" : "lower";
}

export function computeFeedback(guess: Entity, answer: Entity): GuessFeedback {
  if (answer.mode === "ting") return computeTingFeedback(guess, answer);
  return computeDemFeedback(guess, answer);
}

function computeDemFeedback(guess: Entity, answer: Entity): DemFeedback {
  return {
    type: eq(guess.type, answer.type),
    domain: eq(guess.domain, answer.domain),
    era: ordered(ERA_INDEX[guess.era], ERA_INDEX[answer.era]),
    form: eq(guess.form, answer.form),
    alignment: eq(guess.alignment, answer.alignment),
    reach: ordered(REACH_INDEX[guess.reach], REACH_INDEX[answer.reach]),
    status: eq(guess.status, answer.status),
  };
}

function computeTingFeedback(guess: Entity, answer: Entity): TingFeedback {
  return {
    kind: eq(guess.kind, answer.kind),
    heritage: eq(guess.heritage, answer.heritage),
    era: ordered(ERA_INDEX[guess.era], ERA_INDEX[answer.era]),
    material: eq(guess.material, answer.material),
    occasion: eq(guess.occasion, answer.occasion),
    sense: eq(guess.sense, answer.sense),
    reach: ordered(REACH_INDEX[guess.reach], REACH_INDEX[answer.reach]),
  };
}

export function feedbackToEmoji(fb: GuessFeedback): string {
  const sq = (s: FeedbackState) =>
    s === "exact" ? "🟩" : s === "higher" || s === "lower" ? "🟧" : "🟥";
  // Order matters per mode but for share text both produce 8 squares.
  const order =
    "type" in fb
      ? ["type", "domain", "era", "form", "alignment", "reach", "status"]
      : ["kind", "heritage", "era", "material", "occasion", "sense", "reach"];
  return order
    .map((k) => sq((fb as unknown as Record<string, FeedbackState>)[k] as FeedbackState))
    .join("");
}
