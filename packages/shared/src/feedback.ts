import {
  type Entity,
} from "./entities.js";
import type {
  DemFeedback,
  FeedbackState,
  GuessFeedback,
  TingFeedback,
} from "./guess-nah.js";

// ── Array-based comparison helpers ──────────────────────────────────────────

/** Compare two text[] columns. exact = identical sets, partial = any overlap, wrong = no overlap. */
function arrEq(
  g: string[] | null | undefined,
  a: string[] | null | undefined,
): FeedbackState {
  const gs = new Set(g ?? []);
  const as_ = new Set(a ?? []);
  if (gs.size === 0 && as_.size === 0) return "exact";
  if (gs.size === 0 || as_.size === 0) return "wrong";
  // Check exact set equality
  if (gs.size === as_.size && [...gs].every((v) => as_.has(v))) return "exact";
  // Check any overlap
  for (const v of gs) {
    if (as_.has(v)) return "partial";
  }
  return "wrong";
}

/**
 * Compare two text[] columns with group-based partial matching.
 * exact = identical sets, partial = any overlap OR same group, wrong = nothing.
 * groupLookup maps each value to its parent group (loaded from attribute_options).
 */
function arrGrouped(
  g: string[] | null | undefined,
  a: string[] | null | undefined,
  groupLookup: Record<string, string>,
): FeedbackState {
  const gs = new Set(g ?? []);
  const as_ = new Set(a ?? []);
  if (gs.size === 0 && as_.size === 0) return "exact";
  if (gs.size === 0 || as_.size === 0) return "wrong";
  // Exact set equality
  if (gs.size === as_.size && [...gs].every((v) => as_.has(v))) return "exact";
  // Direct value overlap
  for (const v of gs) {
    if (as_.has(v)) return "partial";
  }
  // Group overlap
  const gGroups = new Set([...gs].map((v) => groupLookup[v]).filter(Boolean));
  const aGroups = new Set([...as_].map((v) => groupLookup[v]).filter(Boolean));
  for (const grp of gGroups) {
    if (aGroups.has(grp)) return "partial";
  }
  return "wrong";
}

/**
 * Compare era ranges. exact = identical, higher/lower based on midpoint.
 * `null` era_end is treated as "ongoing/current year" — useful for living
 * people or active entities where age = current_year - era_start.
 */
function eraOrdered(
  gStart: number | null | undefined,
  gEnd: number | null | undefined,
  aStart: number | null | undefined,
  aEnd: number | null | undefined,
): FeedbackState {
  if (gStart == null || aStart == null) return "wrong";
  const cur = new Date().getUTCFullYear();
  const ge = gEnd ?? cur;
  const ae = aEnd ?? cur;
  if (gStart === aStart && ge === ae) return "exact";
  const gMid = (gStart + ge) / 2;
  const aMid = (aStart + ae) / 2;
  if (gStart <= ae && ge >= aStart) return "partial";
  return gMid < aMid ? "higher" : "lower";
}

/** Compare reach arrays using ordered index for ↑/↓. */
function reachOrdered(
  g: string[] | null | undefined,
  a: string[] | null | undefined,
  reachOrder: readonly string[],
): FeedbackState {
  const gs = g ?? [];
  const as_ = a ?? [];
  if (gs.length === 0 && as_.length === 0) return "exact";
  if (gs.length === 0 || as_.length === 0) return "wrong";
  const gSet = new Set(gs);
  const aSet = new Set(as_);
  if (gSet.size === aSet.size && [...gSet].every((v) => aSet.has(v))) return "exact";
  // Use max reach index for comparison
  const gMax = Math.max(...gs.map((v) => reachOrder.indexOf(v)).filter((i) => i >= 0));
  const aMax = Math.max(...as_.map((v) => reachOrder.indexOf(v)).filter((i) => i >= 0));
  if (gMax < 0 || aMax < 0) return "wrong";
  if (gMax === aMax) return "partial";
  return gMax < aMax ? "higher" : "lower";
}

// ── Default group lookups (used when attribute_options aren't passed) ────────
const DEFAULT_FIELD_GROUPS: Record<string, string> = {
  music: "creative", comedy: "creative", entertainment: "creative",
  media: "digital", social_media: "digital",
  politics: "civic", activism: "civic",
  sports: "sports", business: "business",
};
const DEFAULT_DETAIL_GROUPS: Record<string, string> = {
  studio_music: "performance", live_performance: "performance", stage_comedy: "performance",
  digital_content: "media", radio_media: "media",
  stadium_sport: "stadium_sport", political_office: "political_office",
};

const DEFAULT_REACH_ORDER = ["local_legend", "trinidad_wide", "caribbean_wide", "global"] as const;

// ── Main feedback computation ───────────────────────────────────────────────

export interface FeedbackGroupLookups {
  field?: Record<string, string>;
  details?: Record<string, string>;
}

export function computeFeedback(
  guess: Entity,
  answer: Entity,
  groups?: FeedbackGroupLookups,
): GuessFeedback {
  if (answer.mode === "ting") return computeTingFeedback(guess, answer);
  return computeDemFeedback(guess, answer, groups);
}

function computeDemFeedback(
  guess: Entity,
  answer: Entity,
  groups?: FeedbackGroupLookups,
): DemFeedback {
  const fieldGroups = groups?.field ?? DEFAULT_FIELD_GROUPS;
  const detailGroups = groups?.details ?? DEFAULT_DETAIL_GROUPS;

  return {
    field: arrGrouped(guess.field, answer.field, fieldGroups),
    role: arrEq(guess.role, answer.role),
    associations: arrEq(guess.affiliations, answer.affiliations),
    gender: arrEq(guess.gender, answer.gender),
    status: arrEq(guess.status, answer.status),
    reach: reachOrdered(guess.reach, answer.reach, DEFAULT_REACH_ORDER),
    details: arrGrouped(guess.details, answer.details, detailGroups),
    origin: arrEq(guess.origin, answer.origin),
  };
}

function computeTingFeedback(guess: Entity, answer: Entity): TingFeedback {
  return {
    kind: arrEq(guess.kind, answer.kind),
    heritage: arrEq(guess.heritage, answer.heritage),
    era: eraOrdered(guess.era_start, guess.era_end, answer.era_start, answer.era_end),
    material: arrEq(guess.material, answer.material),
    occasion: arrEq(guess.occasion, answer.occasion),
    sense: arrEq(guess.sense, answer.sense),
    reach: reachOrdered(guess.reach, answer.reach, DEFAULT_REACH_ORDER),
  };
}

export function feedbackToEmoji(fb: GuessFeedback): string {
  const sq = (s: FeedbackState) =>
    s === "exact" ? "🟩" : s === "partial" ? "🟧" : s === "higher" || s === "lower" ? "🟧" : "🟥";
  const order =
    "field" in fb
      ? ["field", "role", "associations", "gender", "status", "reach", "details", "origin"]
      : ["kind", "heritage", "era", "material", "occasion", "sense", "reach"];
  return order
    .map((k) => sq((fb as unknown as Record<string, FeedbackState>)[k] as FeedbackState))
    .join("");
}
