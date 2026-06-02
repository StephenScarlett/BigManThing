import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !anonKey) {
  // eslint-disable-next-line no-console
  console.warn(
    "[bmt] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY not set — Supabase calls will fail.",
  );
}

export const supabase = createClient(url ?? "http://localhost:54321", anonKey ?? "anon");
