import { supabase } from "@/lib/supabase";
import { getAnonSessionId } from "@/lib/anon";
import type { Entity, GuessNahMode, SubmitGuessResponse } from "@bmt/shared";

interface AttributeOptionRow {
  value: string;
  display_label: string;
}

const ENTITY_COLUMNS =
  "id, mode, name, aliases, era_start, era_end, first_letter, image_url, description, difficulty, guess_nah_enabled, draw_nah_enabled, field, role, affiliations, gender, status, details, origin, kind, heritage, material, occasion, sense, reach";

/** Today's puzzle id from the public view (no answer leak). */
export async function fetchTodaysPuzzle(
  mode: GuessNahMode,
): Promise<{ puzzle_id: string; puzzle_date: string } | null> {
  const today = new Date().toISOString().slice(0, 10);
  console.log("[BMT] fetchTodaysPuzzle", { mode, today });
  const { data, error } = await supabase
    .from("daily_puzzles_public")
    .select("id, puzzle_date, mode")
    .eq("puzzle_date", today)
    .eq("mode", mode)
    .maybeSingle();
  if (error) {
    console.error("[BMT] fetchTodaysPuzzle error", error);
    throw error;
  }
  console.log("[BMT] fetchTodaysPuzzle result", data);
  if (!data) return null;
  return { puzzle_id: data.id, puzzle_date: data.puzzle_date };
}

/** Lightweight entity rows needed for autocomplete + rendering guesses. */
export async function fetchEntityCatalog(mode: GuessNahMode): Promise<Entity[]> {
  console.log("[BMT] fetchEntityCatalog", { mode });
  const { data, error } = await supabase
    .from("entities")
    .select(ENTITY_COLUMNS)
    .eq("guess_nah_enabled", true)
    .eq("mode", mode)
    .order("name");
  if (error) {
    console.error("[BMT] fetchEntityCatalog error", error);
    throw error;
  }
  console.log("[BMT] fetchEntityCatalog count:", data?.length ?? 0);
  return (data ?? []) as Entity[];
}

/** Map raw option value -> user-facing display label. */
export async function fetchAttributeLabelMap(): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from("attribute_options")
    .select("value, display_label");
  if (error) throw error;

  const map: Record<string, string> = {};
  for (const row of (data ?? []) as AttributeOptionRow[]) {
    if (row.value && row.display_label) {
      map[row.value] = row.display_label;
    }
  }
  return map;
}

export async function submitGuess(
  puzzle_id: string,
  guess_entity_id: string,
): Promise<SubmitGuessResponse & { already_finished?: boolean }> {
  const { data: sess } = await supabase.auth.getSession();
  const anonId = getAnonSessionId();
  const headers: Record<string, string> = { "x-bmt-anon-id": anonId };
  const body = { puzzle_id, guess_entity_id };
  console.log("[BMT] submitGuess →", body, "authed:", !!sess.session);
  const { data, error } = await supabase.functions.invoke<
    SubmitGuessResponse & { already_finished?: boolean; error?: string }
  >("submit-guess", { body, headers });
  if (error) {
    console.error("[BMT] submitGuess invoke error", {
      message: error.message,
      context: (error as { context?: unknown }).context,
    });
    throw error;
  }
  console.log("[BMT] submitGuess response", data);
  if (!data) throw new Error("empty_response");
  if ("error" in data && data.error) throw new Error(data.error);
  return data;
}
