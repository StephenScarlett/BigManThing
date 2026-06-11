/**
 * Content library types — Guess Nah has two sub-modes:
 *   • Dem Nah  — people only (8 columns: field/role/associations/gender/status/reach/details/origin)
 *   • Ting Nah — food/drink/objects (7 columns: kind/heritage/era/material/occasion/sense/reach)
 *
 * Partial (orange) matching: values in the same group show orange, exact = green, unrelated = red.
 */

export const GUESS_NAH_MODES = ["dem", "ting"] as const;
export type GuessNahMode = (typeof GUESS_NAH_MODES)[number];

// ── Shared (ordered) ────────────────────────────────────────────────────────
// Dem and Ting use the same `era` column but with different bracket values.
// All values live in one union for the DB; per-mode arrays below for ordered feedback.
export const DEM_ERAS = [
  "pre_1980",
  "y1980_1999",
  "y2000_2009",
  "y2010_2019",
  "y2020_plus",
] as const;
export type DemEra = (typeof DEM_ERAS)[number];

export const TING_ERAS = [
  "pre_1900",
  "y1900_1950",
  "y1950_2000",
  "y2000_plus",
  "timeless",
] as const;
export type TingEra = (typeof TING_ERAS)[number];

export type EntityEra = DemEra | TingEra;

// Reach scale is shared by Dem and Ting.
export const ENTITY_REACHES = [
  "local_legend",
  "trinidad_wide",
  "caribbean_wide",
  "global",
] as const;
export type EntityReach = (typeof ENTITY_REACHES)[number];

export const ENTITY_DIFFICULTIES = ["easy", "medium", "hard"] as const;
export type EntityDifficulty = (typeof ENTITY_DIFFICULTIES)[number];

// ── Dem Nah (people only) ───────────────────────────────────────────────────

// Field — broad area. Orange groups below.
export const ENTITY_FIELDS = [
  "sports",
  "music",
  "politics",
  "comedy",
  "media",
  "business",
  "activism",
  "entertainment",
  "social_media",
] as const;
export type EntityField = (typeof ENTITY_FIELDS)[number];

/** Fields in the same group → orange partial match. */
export const FIELD_GROUPS: Record<EntityField, string> = {
  music: "creative",
  comedy: "creative",
  entertainment: "creative",
  media: "digital",
  social_media: "digital",
  politics: "civic",
  activism: "civic",
  sports: "sports",
  business: "business",
};

// Role — free-text specific role (cricketer, soca_artist, prime_minister, etc.)
// Affiliations is the parent bucket for orange matching.
export const ENTITY_AFFILIATIONS = [
  "athlete",
  "musician",
  "politician",
  "entertainer",
  "media_personality",
  "creator",
  "public_figure",
] as const;
export type EntityAffiliation = (typeof ENTITY_AFFILIATIONS)[number];

export const ENTITY_GENDERS = ["male", "female"] as const;
export type EntityGender = (typeof ENTITY_GENDERS)[number];

export const ENTITY_STATUSES = [
  "active",
  "retired",
  "deceased",
] as const;
export type EntityStatus = (typeof ENTITY_STATUSES)[number];

// Details — separates how someone is primarily known.
export const ENTITY_DETAILS = [
  "stadium_sport",
  "studio_music",
  "live_performance",
  "digital_content",
  "political_office",
  "radio_media",
  "stage_comedy",
] as const;
export type EntityDetail = (typeof ENTITY_DETAILS)[number];

/** Details in the same group → orange partial match. */
export const DETAIL_GROUPS: Record<EntityDetail, string> = {
  studio_music: "performance",
  live_performance: "performance",
  stage_comedy: "performance",
  digital_content: "media",
  radio_media: "media",
  stadium_sport: "stadium_sport",
  political_office: "political_office",
};

// Origin — optional geographic column.
export const ENTITY_ORIGINS = [
  "tobago",
  "trinidad_north",
  "trinidad_south",
  "trinidad_central",
  "caribbean_wide",
] as const;
export type EntityOrigin = (typeof ENTITY_ORIGINS)[number];

// ── Ting Nah ────────────────────────────────────────────────────────────────
export const ENTITY_KINDS = [
  "food",
  "drink",
  "instrument",
  "wearable",
  "tool_object",
] as const;
export type EntityKind = (typeof ENTITY_KINDS)[number];

export const ENTITY_HERITAGES = [
  "african",
  "indian",
  "european",
  "indigenous",
  "creole",
] as const;
export type EntityHeritage = (typeof ENTITY_HERITAGES)[number];

export const ENTITY_MATERIALS = [
  "edible",
  "liquid",
  "metal",
  "wood",
  "fabric",
  "mixed",
] as const;
export type EntityMaterial = (typeof ENTITY_MATERIALS)[number];

export const ENTITY_OCCASIONS = [
  "everyday",
  "carnival",
  "religious",
  "holiday",
  "special",
] as const;
export type EntityOccasion = (typeof ENTITY_OCCASIONS)[number];

export const ENTITY_SENSES = [
  "taste",
  "sound",
  "sight",
  "smell",
  "touch",
] as const;
export type EntitySense = (typeof ENTITY_SENSES)[number];

// ── Entity row ──────────────────────────────────────────────────────────────
export interface Entity {
  id: string;
  mode: GuessNahMode;
  name: string;
  aliases: string[];
  era_start: number | null;
  era_end: number | null;
  first_letter: string;
  description: string | null;
  image_url: string | null;
  difficulty: EntityDifficulty;
  guess_nah_enabled: boolean;
  draw_nah_enabled: boolean;
  // Dem-only (people) — all arrays for multi-select
  field: string[] | null;
  role: string[] | null;
  affiliations: string[] | null;
  gender: string[] | null;
  status: string[] | null;
  details: string[] | null;
  origin: string[] | null;
  // Ting-only — all arrays for multi-select
  kind: string[] | null;
  heritage: string[] | null;
  material: string[] | null;
  occasion: string[] | null;
  sense: string[] | null;
  reach: string[] | null;
}

export type EntityPublic = Pick<Entity, "id" | "name" | "mode" | "image_url">;
