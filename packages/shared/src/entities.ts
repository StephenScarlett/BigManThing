/**
 * Content library types — Guess Nah has two sub-modes:
 *   • Dem Nah  — people + folklore (8 columns: type/domain/era/form/alignment/reach/status/letter)
 *   • Ting Nah — food/drink/objects (8 columns: kind/heritage/era/material/occasion/sense/reach/letter)
 *
 * Both share `era`, `reach`, `first_letter`, plus general metadata.
 */

export const GUESS_NAH_MODES = ["dem", "ting"] as const;
export type GuessNahMode = (typeof GUESS_NAH_MODES)[number];

// ── Shared (ordered) ────────────────────────────────────────────────────────
export const ENTITY_ERAS = [
  "pre_1900",
  "y1900_1950",
  "y1950_2000",
  "y2000_plus",
  "timeless",
] as const;
export type EntityEra = (typeof ENTITY_ERAS)[number];

export const ENTITY_REACHES = [
  "local_legend",
  "trinidad_wide",
  "caribbean_wide",
  "global",
] as const;
export type EntityReach = (typeof ENTITY_REACHES)[number];

export const ENTITY_DIFFICULTIES = ["easy", "medium", "hard"] as const;
export type EntityDifficulty = (typeof ENTITY_DIFFICULTIES)[number];

// ── Dem Nah ─────────────────────────────────────────────────────────────────
export const ENTITY_TYPES = ["person", "folklore"] as const;
export type EntityType = (typeof ENTITY_TYPES)[number];

export const ENTITY_DOMAINS = [
  "sports",
  "music",
  "politics",
  "culture",
  "media",
  "folklore",
  "nature",
  "religion",
] as const;
export type EntityDomain = (typeof ENTITY_DOMAINS)[number];

export const ENTITY_FORMS = [
  "human",
  "humanoid",
  "spirit",
  "creature",
  "shapeshifter",
] as const;
export type EntityForm = (typeof ENTITY_FORMS)[number];

export const ENTITY_ALIGNMENTS = [
  "heroic",
  "neutral",
  "mischievous",
  "sinister",
  "protector",
] as const;
export type EntityAlignment = (typeof ENTITY_ALIGNMENTS)[number];

export const ENTITY_STATUSES = [
  "alive",
  "deceased",
  "active_legend",
  "mythical",
] as const;
export type EntityStatus = (typeof ENTITY_STATUSES)[number];

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
  era: EntityEra;
  reach: EntityReach;
  first_letter: string;
  description: string | null;
  image_url: string | null;
  audio_url: string | null;
  difficulty: EntityDifficulty;
  guess_nah_enabled: boolean;
  draw_nah_enabled: boolean;
  // Dem-only
  type: EntityType | null;
  domain: EntityDomain | null;
  form: EntityForm | null;
  alignment: EntityAlignment | null;
  status: EntityStatus | null;
  // Ting-only
  kind: EntityKind | null;
  heritage: EntityHeritage | null;
  material: EntityMaterial | null;
  occasion: EntityOccasion | null;
  sense: EntitySense | null;
}

export type EntityPublic = Pick<Entity, "id" | "name" | "mode" | "image_url">;
