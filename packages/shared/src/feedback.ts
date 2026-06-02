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

/** Compare era ranges. exact = identical, higher/lower based on midpoint. */
function eraOrdered(
  gStart: number | null | undefined,
  gEnd: number | null | undefined,
  aStart: number | null | undefined,
  aEnd: number | null | undefined,
): FeedbackState {
  if (gStart == null || gEnd == null || aStart == null || aEnd == null)
    return "wrong";
  if (gStart === aStart && gEnd === aEnd) return "exact";
  const gMid = (gStart + gEnd) / 2;
  const aMid = (aStart + aEnd) / 2;
  // If ranges overlap, partial
  if (gStart <= aEnd && gEnd >= aStart) return "partial";
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
const DEFAULT_DOMAIN_TYPE_GROUPS: Record<string, string> = {
  elite_global_performer: "global_tier", international_professional: "global_tier",
  regional_icon: "national_tier", national_figure: "national_tier",
  local_creator: "local_tier", cultural_legend: "local_tier",
};
const DEFAULT_OUTPUT_CONTEXT_GROUPS: Record<string, string> = {
  studio_music: "performance", live_performance: "performance", stage_comedy: "performance",
  digital_content: "media", radio_media: "media",
  stadium_sport: "stadium_sport", political_office: "political_office",
};

const DEFAULT_REACH_ORDER = ["local_legend", "trinidad_wide", "caribbean_wide", "global"] as const;

// ── Main feedback computation ───────────────────────────────────────────────

export interface FeedbackGroupLookups {
  field?: Record<string, string>;
  domain_type?: Record<string, string>;
  output_context?: Record<string, string>;
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
  const domainGroups = groups?.domain_type ?? DEFAULT_DOMAIN_TYPE_GROUPS;
  const contextGroups = groups?.output_context ?? DEFAULT_OUTPUT_CONTEXT_GROUPS;

  return {
    field: arrGrouped(guess.field, answer.field, fieldGroups),
    role: arrEq(guess.role, answer.role),
    era: eraOrdered(guess.era_start, guess.era_end, answer.era_start, answer.era_end),
    gender: arrEq(guess.gender, answer.gender),
    status: arrEq(guess.status, answer.status),
    domain_type: arrGrouped(guess.domain_type, answer.domain_type, domainGroups),
    output_context: arrGrouped(guess.output_context, answer.output_context, contextGroups),
    region: arrEq(guess.region, answer.region),
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
      ? ["field", "role", "era", "gender", "status", "domain_type", "output_context", "region"]
      : ["kind", "heritage", "era", "material", "occasion", "sense", "reach"];
  return order
    .map((k) => sq((fb as unknown as Record<string, FeedbackState>)[k] as FeedbackState))
    .join("");
}
