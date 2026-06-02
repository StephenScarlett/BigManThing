// BigManThing — submit-guess Edge Function
// The ONLY code that knows the daily puzzle's answer. Receives a guess,
// computes feedback server-side, persists it, and returns the answer ONLY
// when the game is over (solved or out of attempts).
//
// Deploy: `supabase functions deploy submit-guess`
// Secrets needed: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto-injected on hosted Supabase)

// @ts-nocheck — Deno runtime, types not available in our tsconfig.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const ERAS = ["pre_1900", "y1900_1950", "y1950_2000", "y2000_plus", "timeless"];
const ERA_INDEX = Object.fromEntries(ERAS.map((e, i) => [e, i]));

const REACHES = ["local_legend", "trinidad_wide", "caribbean_wide", "global"];
const REACH_INDEX = Object.fromEntries(REACHES.map((r, i) => [r, i]));

function eq(g, a) {
  return g === a ? "exact" : "wrong";
}

function ordered(g, a) {
  if (g === undefined || a === undefined) return "wrong";
  if (g === a) return "exact";
  return g < a ? "higher" : "lower";
}

function computeFeedback(guess, answer) {
  if (answer.mode === "ting") {
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

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-bmt-anon-id, x-bmt-anon",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body, init = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { "content-type": "application/json", ...corsHeaders, ...(init.headers ?? {}) },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, { status: 405 });

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, { status: 400 });
  }
  const { puzzle_id, guess_entity_id } = body ?? {};
  if (typeof puzzle_id !== "string" || typeof guess_entity_id !== "string") {
    return json({ error: "missing_fields" }, { status: 400 });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return json({ error: "server_misconfigured" }, { status: 500 });
  }
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  // Identify the player: prefer JWT, else accept anon header.
  const authHeader = req.headers.get("authorization") ?? "";
  let userId = null;
  if (authHeader.toLowerCase().startsWith("bearer ")) {
    const token = authHeader.slice(7);
    const userRes = await admin.auth.getUser(token);
    userId = userRes.data.user?.id ?? null;
  }
  const anonId = req.headers.get("x-bmt-anon-id") ?? null;
  if (!userId && !anonId) {
    return json({ error: "unauthenticated" }, { status: 401 });
  }

  // Load puzzle + answer entity.
  const puzzleRes = await admin
    .from("daily_puzzles")
    .select("id, mode, entity_id")
    .eq("id", puzzle_id)
    .maybeSingle();
  if (puzzleRes.error || !puzzleRes.data) {
    return json({ error: "puzzle_not_found" }, { status: 404 });
  }
  const puzzle = puzzleRes.data;

  const [answerRes, guessRes] = await Promise.all([
    admin.from("entities").select("*").eq("id", puzzle.entity_id).maybeSingle(),
    admin.from("entities").select("*").eq("id", guess_entity_id).maybeSingle(),
  ]);
  if (answerRes.error || !answerRes.data) {
    return json({ error: "answer_missing" }, { status: 500 });
  }
  if (guessRes.error || !guessRes.data) {
    return json({ error: "guess_invalid" }, { status: 400 });
  }
  const answer = answerRes.data;
  const guess = guessRes.data;

  if (guess.mode !== answer.mode) {
    return json({ error: "guess_mode_mismatch" }, { status: 400 });
  }

  // Existing attempts for this player+puzzle.
  let q = admin
    .from("guess_attempts")
    .select("attempt_number, guess_entity_id")
    .eq("puzzle_id", puzzle_id)
    .order("attempt_number", { ascending: true });
  q = userId ? q.eq("user_id", userId) : q.eq("anon_session_id", anonId);
  const attemptsRes = await q;
  if (attemptsRes.error) {
    return json({ error: "attempts_read_failed" }, { status: 500 });
  }
  const attempts = attemptsRes.data ?? [];

  // Game-over guard: only solved-state ends the game now.
  const alreadySolved = attempts.some((a) => a.guess_entity_id === answer.id);
  if (alreadySolved) {
    return json(
      {
        attempt_number: attempts.length,
        feedback: null,
        solved: true,
        answer: { id: answer.id, name: answer.name, image_url: answer.image_url },
        already_finished: true,
      },
      { status: 200 },
    );
  }

  // Compute, persist, decide game state.
  const feedback = computeFeedback(guess, answer);
  const attempt_number = attempts.length + 1;
  const solved = guess.id === answer.id;

  const insertRes = await admin.from("guess_attempts").insert({
    user_id: userId,
    anon_session_id: userId ? null : anonId,
    puzzle_id,
    guess_entity_id,
    attempt_number,
    feedback,
  });
  if (insertRes.error) {
    return json({ error: "insert_failed", detail: insertRes.error.message }, { status: 500 });
  }

  const gameOver = solved;

  if (gameOver) {
    await admin.from("daily_results").upsert(
      {
        user_id: userId,
        anon_session_id: userId ? null : anonId,
        puzzle_id,
        attempts: attempt_number,
        solved,
      },
      { onConflict: "puzzle_id,owner_key", ignoreDuplicates: true },
    );

    if (userId) {
      // Streak / distribution update — best-effort, non-blocking on errors.
      const statsRes = await admin
        .from("user_stats")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      const stats = statsRes.data ?? {
        games_played: 0,
        games_won: 0,
        current_streak: 0,
        max_streak: 0,
        guess_distribution: [0, 0, 0, 0, 0, 0],
      };
      const dist = stats.guess_distribution.slice();
      if (solved) {
        const idx = Math.min(attempt_number - 1, dist.length - 1);
        dist[idx] = (dist[idx] ?? 0) + 1;
      }
      const newStreak = solved ? stats.current_streak + 1 : stats.current_streak;
      await admin.from("user_stats").upsert({
        user_id: userId,
        games_played: stats.games_played + 1,
        games_won: stats.games_won + (solved ? 1 : 0),
        current_streak: newStreak,
        max_streak: Math.max(stats.max_streak, newStreak),
        guess_distribution: dist,
      });
    }
  }

  return json({
    attempt_number,
    feedback,
    solved,
    answer: gameOver
      ? { id: answer.id, name: answer.name, image_url: answer.image_url }
      : undefined,
  });
});
