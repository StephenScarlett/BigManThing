import { admin } from "./supabase.js";
import type { DrawNahCategory, GuessNahMode } from "@bmt/shared";

export interface WordEntry {
  entity_id: string;
  name: string;
  aliases: string[];
  difficulty: "easy" | "medium" | "hard";
  mode: GuessNahMode;
  category: DrawNahCategory;
  image_url: string | null;
}

let cache: WordEntry[] = [];
let loadedAt = 0;
const TTL_MS = 5 * 60 * 1000;

export async function loadWordBank(force = false): Promise<WordEntry[]> {
  if (!admin) {
    console.warn(
      "[wordBank] Supabase env vars missing, returning fallback list",
    );
    return FALLBACK;
  }
  if (!force && cache.length > 0 && Date.now() - loadedAt < TTL_MS) {
    return cache;
  }
  const { data, error } = await admin
    .from("entities")
    .select("id, name, aliases, difficulty, mode, field, kind, image_url")
    .eq("draw_nah_enabled", true);
  if (error) {
    console.error("[wordBank] load error:", error.message);
    return cache.length ? cache : FALLBACK;
  }
  cache = (data ?? []).map((r) => ({
    entity_id: r.id,
    name: r.name,
    aliases: r.aliases ?? [],
    difficulty: r.difficulty,
    mode: r.mode,
    category: deriveCategory(r),
    image_url: r.image_url ?? null,
  }));
  loadedAt = Date.now();
  console.log(`[wordBank] loaded ${cache.length} words`);
  return cache;
}

/** Picks N distinct random words. */
export function pickWords(
  bank: WordEntry[],
  n: number,
  filter?: (w: WordEntry) => boolean,
  exclude: Set<string> = new Set(),
): WordEntry[] {
  const pool = bank.filter(
    (w) => !exclude.has(w.entity_id) && (filter ? filter(w) : true),
  );
  const out: WordEntry[] = [];
  const used = new Set<string>();
  while (out.length < n && pool.length > used.size) {
    const w = pool[Math.floor(Math.random() * pool.length)];
    if (!w || used.has(w.entity_id)) continue;
    used.add(w.entity_id);
    out.push(w);
  }
  return out;
}

const DEM_FIELDS: ReadonlySet<DrawNahCategory> = new Set([
  "sports", "music", "politics", "comedy", "media",
  "business", "activism", "entertainment", "social_media",
]);
const TING_KINDS: ReadonlySet<DrawNahCategory> = new Set([
  "food", "drink", "instrument", "wearable", "tool_object",
]);

/** Maps entity DB fields to a DrawNahCategory using exact value alignment. */
function deriveCategory(r: {
  mode: string;
  field?: string[] | string | null;
  kind?: string[] | string | null;
}): DrawNahCategory {
  const firstOf = (v: string[] | string | null | undefined): string | null => {
    if (Array.isArray(v)) return v[0] ?? null;
    return typeof v === "string" ? v : null;
  };
  if (r.mode === "ting") {
    const k = firstOf(r.kind);
    if (k && TING_KINDS.has(k as DrawNahCategory)) return k as DrawNahCategory;
    return "tool_object";
  }
  const f = firstOf(r.field);
  if (f && DEM_FIELDS.has(f as DrawNahCategory)) return f as DrawNahCategory;
  return "entertainment";
}

const FALLBACK: WordEntry[] = [
  { entity_id: "fb1", name: "Doubles",    aliases: [],        difficulty: "easy", mode: "ting", category: "food",        image_url: null },
  { entity_id: "fb2", name: "Steelpan",   aliases: ["Pan"],   difficulty: "easy", mode: "ting", category: "instrument",  image_url: null },
  { entity_id: "fb3", name: "Soucouyant", aliases: [],        difficulty: "easy", mode: "dem",  category: "entertainment", image_url: null },
  { entity_id: "fb4", name: "Brian Lara", aliases: [],        difficulty: "easy", mode: "dem",  category: "sports",      image_url: null },
  { entity_id: "fb5", name: "Mauby",      aliases: [],        difficulty: "easy", mode: "ting", category: "drink",       image_url: null },
  { entity_id: "fb6", name: "Papa Bois",  aliases: [],        difficulty: "easy", mode: "dem",  category: "entertainment", image_url: null },
  { entity_id: "fb7", name: "Soca music", aliases: ["Soca"],  difficulty: "easy", mode: "dem",  category: "music",       image_url: null },
  { entity_id: "fb8", name: "Carnival",   aliases: [],        difficulty: "easy", mode: "dem",  category: "entertainment", image_url: null },
];
