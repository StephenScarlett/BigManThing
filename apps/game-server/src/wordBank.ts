import { admin } from "./supabase.js";
import type { DrawNahCategory, GuessNahMode } from "@bmt/shared";

export interface WordEntry {
  entity_id: string;
  name: string;
  aliases: string[];
  difficulty: "easy" | "medium" | "hard";
  mode: GuessNahMode;
  category: DrawNahCategory;
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
    .select("id, name, aliases, difficulty, mode, field, kind")
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

/** Maps entity DB fields to a DrawNahCategory. */
function deriveCategory(r: {
  mode: string;
  field?: string | null;
  kind?: string | null;
}): DrawNahCategory {
  if (r.mode === "ting") {
    switch (r.kind) {
      case "food":        return "food";
      case "drink":       return "drink";
      case "instrument":  return "instrument";
      case "wearable":    return "wearable";
      case "tool_object": return "object";
      default:            return "object";
    }
  }
  // dem mode
  switch (r.field) {
    case "sports":                          return "sports";
    case "music":                           return "music";
    case "politics":
    case "comedy":
    case "media":
    case "business":
    case "activism":
    case "entertainment":
    case "social_media":                    return "culture";
    default:                                return "culture";
  }
}

const FALLBACK: WordEntry[] = [
  { entity_id: "fb1", name: "Doubles",    aliases: [],        difficulty: "easy", mode: "ting", category: "food" },
  { entity_id: "fb2", name: "Steelpan",   aliases: ["Pan"],   difficulty: "easy", mode: "ting", category: "instrument" },
  { entity_id: "fb3", name: "Soucouyant", aliases: [],        difficulty: "easy", mode: "dem",  category: "culture" },
  { entity_id: "fb4", name: "Brian Lara", aliases: [],        difficulty: "easy", mode: "dem",  category: "sports" },
  { entity_id: "fb5", name: "Mauby",      aliases: [],        difficulty: "easy", mode: "ting", category: "drink" },
  { entity_id: "fb6", name: "Papa Bois",  aliases: [],        difficulty: "easy", mode: "dem",  category: "culture" },
  { entity_id: "fb7", name: "Soca music", aliases: ["Soca"],  difficulty: "easy", mode: "dem",  category: "music" },
  { entity_id: "fb8", name: "Carnival",   aliases: [],        difficulty: "easy", mode: "dem",  category: "culture" },
];
