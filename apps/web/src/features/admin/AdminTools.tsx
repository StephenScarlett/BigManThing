/**
 * AdminTools — quick-access DB tools for admins.
 * - View & set today's puzzle (per mode)
 * - Clear your own guesses for today (to re-test)
 * - Quick puzzle stats for today
 * - Schedule future puzzles
 */
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { getAnonSessionId } from "@/lib/anon";
import type { Entity, GuessNahMode } from "@bmt/shared";

type Mode = GuessNahMode;

interface DailyPuzzle {
  id: string;
  puzzle_date: string;
  mode: Mode;
  entity_id: string;
  entity_name?: string;
  entity_image?: string;
}

interface PuzzleStats {
  total_guesses: number;
  unique_players: number;
  solved: number;
  avg_attempts: number | null;
}

export default function AdminTools() {
  const [activeSection, setActiveSection] = useState<"puzzle" | "guesses" | "schedule">("puzzle");

  return (
    <div className="space-y-5">
      {/* Section tabs */}
      <div className="flex gap-2 border-b border-line pb-3">
        {(["puzzle", "guesses", "schedule"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setActiveSection(s)}
            className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-colors ${
              activeSection === s
                ? "bg-brand-red text-brand-white"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            {s === "puzzle" ? "Today's Puzzle" : s === "guesses" ? "Clear Guesses" : "Schedule"}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeSection}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
        >
          {activeSection === "puzzle" && <TodaysPuzzleSection />}
          {activeSection === "guesses" && <ClearGuessesSection />}
          {activeSection === "schedule" && <ScheduleSection />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ── Today's Puzzle ────────────────────────────────────────────────────────────

function TodaysPuzzleSection() {
  const today = new Date().toISOString().slice(0, 10);
  const [puzzles, setPuzzles] = useState<DailyPuzzle[]>([]);
  const [stats, setStats] = useState<Record<string, PuzzleStats>>({});
  const [loading, setLoading] = useState(true);
  const [setting, setSetting] = useState<Mode | null>(null);

  const load = useCallback(async () => {
    setLoading(true);

    // Load today's puzzles with entity info
    const { data: puzzleData } = await supabase
      .from("daily_puzzles")
      .select("id, puzzle_date, mode, entity_id, entities(name, image_url)")
      .eq("puzzle_date", today);

    const loaded: DailyPuzzle[] = (puzzleData ?? []).map((p: Record<string, unknown>) => ({
      id: p.id as string,
      puzzle_date: p.puzzle_date as string,
      mode: p.mode as Mode,
      entity_id: p.entity_id as string,
      entity_name: (p.entities as { name: string } | null)?.name,
      entity_image: (p.entities as { image_url: string } | null)?.image_url,
    }));
    setPuzzles(loaded);

    // Load stats for each puzzle
    const statsMap: Record<string, PuzzleStats> = {};
    for (const puz of loaded) {
      const { data: attempts } = await supabase
        .from("guess_attempts")
        .select("user_id, anon_session_id, attempt_number")
        .eq("puzzle_id", puz.id);

      const { data: results } = await supabase
        .from("daily_results")
        .select("attempts, solved")
        .eq("puzzle_id", puz.id);

      const players = new Set(
        (attempts ?? []).map((a: { user_id: string | null; anon_session_id: string | null }) =>
          a.user_id ?? a.anon_session_id
        ),
      );
      const solved = (results ?? []).filter((r: { solved: boolean }) => r.solved).length;
      const totalAttempts = (results ?? []).map((r: { attempts: number }) => r.attempts);
      const avgAttempts =
        totalAttempts.length > 0
          ? totalAttempts.reduce((a: number, b: number) => a + b, 0) / totalAttempts.length
          : null;

      statsMap[puz.id] = {
        total_guesses: (attempts ?? []).length,
        unique_players: players.size,
        solved,
        avg_attempts: avgAttempts ? Math.round(avgAttempts * 10) / 10 : null,
      };
    }
    setStats(statsMap);
    setLoading(false);
  }, [today]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Today — {today}</h3>
        <button onClick={load} className="text-xs text-ink-muted hover:text-ink transition-colors">↺ Refresh</button>
      </div>

      {loading ? (
        <div className="text-sm text-ink-muted">Loading…</div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {(["dem", "ting"] as Mode[]).map((mode) => {
            const puz = puzzles.find((p) => p.mode === mode);
            const st = puz ? stats[puz.id] : null;
            return (
              <div key={mode} className="rounded-lg border border-line p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`text-xs px-2 py-0.5 rounded font-semibold ${
                    mode === "dem" ? "bg-blue-500/15 text-blue-500" : "bg-purple-500/15 text-purple-500"
                  }`}>
                    {mode === "dem" ? "Dem Nah" : "Ting Nah"}
                  </span>
                  <button
                    onClick={() => setSetting(mode)}
                    className="text-xs px-2 py-1 rounded border border-line hover:border-brand-red hover:text-brand-red transition-colors"
                  >
                    {puz ? "Change" : "Set puzzle"}
                  </button>
                </div>

                {puz ? (
                  <div className="flex items-center gap-3">
                    {puz.entity_image ? (
                      <img src={puz.entity_image} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-surface-3 shrink-0 flex items-center justify-center text-ink-muted text-lg">?</div>
                    )}
                    <div>
                      <div className="font-semibold text-sm">{puz.entity_name}</div>
                      <div className="text-xs text-ink-muted">entity set</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-ink-muted italic">No puzzle set for today</div>
                )}

                {st && (
                  <div className="grid grid-cols-4 gap-2 border-t border-line pt-3 text-center">
                    <StatBox label="Players" value={st.unique_players} />
                    <StatBox label="Guesses" value={st.total_guesses} />
                    <StatBox label="Solved" value={st.solved} />
                    <StatBox label="Avg tries" value={st.avg_attempts ?? "—"} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {setting && (
          <SetPuzzleModal
            mode={setting}
            date={today}
            onClose={() => setSetting(null)}
            onSet={() => { setSetting(null); load(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="space-y-0.5">
      <div className="text-lg font-bold text-ink">{value}</div>
      <div className="text-[10px] text-ink-muted uppercase tracking-wider">{label}</div>
    </div>
  );
}

// ── Set Puzzle Modal ──────────────────────────────────────────────────────────

function SetPuzzleModal({
  mode, date, onClose, onSet,
}: {
  mode: Mode; date: string; onClose: () => void; onSet: () => void;
}) {
  const [search, setSearch] = useState("");
  const [entities, setEntities] = useState<Entity[]>([]);
  const [selected, setSelected] = useState<Entity | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("entities")
      .select("id, name, image_url, field, kind, mode")
      .eq("mode", mode)
      .eq("guess_nah_enabled", true)
      .order("name")
      .then(({ data }) => setEntities((data ?? []) as Entity[]));
  }, [mode]);

  const filtered = search
    ? entities.filter((e) => e.name.toLowerCase().includes(search.toLowerCase()))
    : entities;

  async function save() {
    if (!selected) return;
    setSaving(true);
    setError(null);
    const { error: err } = await supabase
      .from("daily_puzzles")
      .upsert({ puzzle_date: date, mode, entity_id: selected.id }, { onConflict: "puzzle_date,mode" });
    setSaving(false);
    if (err) setError(err.message);
    else onSet();
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.95, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 16 }}
        transition={{ duration: 0.2 }}
        className="bg-surface rounded-xl border border-line p-5 w-full max-w-md space-y-4 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">
            Set {mode === "dem" ? "Dem Nah" : "Ting Nah"} puzzle for {date}
          </h3>
          <button onClick={onClose} className="text-ink-muted hover:text-ink">✕</button>
        </div>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search entity…"
          className="w-full rounded-md border border-line bg-surface-2 px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-brand-red"
          autoFocus
        />

        <div className="max-h-64 overflow-y-auto space-y-1 rounded-lg border border-line p-2">
          {filtered.slice(0, 50).map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => setSelected(e)}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-sm transition-colors ${
                selected?.id === e.id
                  ? "bg-brand-red/15 border border-brand-red text-ink"
                  : "hover:bg-surface-2 text-ink-muted"
              }`}
            >
              {e.image_url ? (
                <img src={e.image_url} alt="" className="w-6 h-6 rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-surface-3 shrink-0" />
              )}
              {e.name}
            </button>
          ))}
          {filtered.length > 50 && (
            <div className="text-xs text-ink-muted text-center py-1">Showing first 50 — refine search to narrow down</div>
          )}
          {filtered.length === 0 && <div className="text-xs text-ink-muted text-center py-4">No entities found</div>}
        </div>

        {selected && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-surface-2 text-sm">
            {selected.image_url && <img src={selected.image_url} alt="" className="w-8 h-8 rounded object-cover" />}
            <span className="font-medium">Selected: {selected.name}</span>
          </div>
        )}

        {error && <div className="text-xs text-brand-red">{error}</div>}

        <div className="flex gap-2 pt-1">
          <button
            onClick={save}
            disabled={!selected || saving}
            className="btn-primary flex-1 disabled:opacity-40"
          >
            {saving ? "Saving…" : "Set as today's puzzle"}
          </button>
          <button onClick={onClose} className="btn-secondary">Cancel</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Clear Guesses ─────────────────────────────────────────────────────────────

function ClearGuessesSection() {
  const today = new Date().toISOString().slice(0, 10);
  const [mode, setMode] = useState<Mode>("dem");
  const [target, setTarget] = useState<"me" | "all">("me");
  const [status, setStatus] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const [puzzleId, setPuzzleId] = useState<string | null>(null);

  // Load today's puzzle id for the chosen mode
  useEffect(() => {
    supabase
      .from("daily_puzzles")
      .select("id")
      .eq("puzzle_date", today)
      .eq("mode", mode)
      .maybeSingle()
      .then(({ data }) => setPuzzleId(data?.id ?? null));
  }, [mode, today]);

  async function clearGuesses() {
    if (!puzzleId) {
      setStatus("No puzzle set for today in this mode.");
      return;
    }
    setClearing(true);
    setStatus(null);

    const { data: sess } = await supabase.auth.getSession();
    const userId = sess.session?.user.id;
    const anonId = getAnonSessionId();

    try {
      if (target === "me") {
        // Delete this user's attempts
        if (userId) {
          await supabase.from("guess_attempts").delete()
            .eq("puzzle_id", puzzleId).eq("user_id", userId);
          await supabase.from("daily_results").delete()
            .eq("puzzle_id", puzzleId).eq("user_id", userId);
        } else {
          await supabase.from("guess_attempts").delete()
            .eq("puzzle_id", puzzleId).eq("anon_session_id", anonId);
          await supabase.from("daily_results").delete()
            .eq("puzzle_id", puzzleId).eq("anon_session_id", anonId);
        }
        setStatus(`✓ Your guesses cleared for today's ${mode === "dem" ? "Dem Nah" : "Ting Nah"}.`);
      } else {
        // Clear ALL players — admin nuclear option
        await supabase.from("guess_attempts").delete().eq("puzzle_id", puzzleId);
        await supabase.from("daily_results").delete().eq("puzzle_id", puzzleId);
        setStatus(`✓ ALL guesses cleared for today's ${mode === "dem" ? "Dem Nah" : "Ting Nah"}.`);
      }
    } catch (e) {
      setStatus(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setClearing(false);
    }
  }

  return (
    <div className="space-y-4 max-w-md">
      <p className="text-sm text-ink-muted">
        Clear guess history so you can re-play a puzzle to test it. Use "Mine only" during normal testing; "Everyone's" is the nuclear option.
      </p>

      <div className="space-y-3">
        <div>
          <label className="text-xs text-ink-muted block mb-1">Mode</label>
          <div className="flex gap-2">
            {(["dem", "ting"] as Mode[]).map((m) => (
              <button key={m} type="button" onClick={() => setMode(m)}
                className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-colors border ${
                  mode === m ? "bg-brand-red text-brand-white border-brand-red" : "border-line text-ink-muted hover:border-ink-muted"
                }`}>
                {m === "dem" ? "Dem Nah" : "Ting Nah"}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-ink-muted block mb-1">Whose guesses?</label>
          <div className="flex gap-2">
            <button type="button" onClick={() => setTarget("me")}
              className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-colors border ${
                target === "me" ? "bg-brand-red text-brand-white border-brand-red" : "border-line text-ink-muted hover:border-ink-muted"
              }`}>
              Mine only
            </button>
            <button type="button" onClick={() => setTarget("all")}
              className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-colors border ${
                target === "all" ? "bg-red-600 text-white border-red-600" : "border-line text-ink-muted hover:border-red-400 hover:text-red-400"
              }`}>
              ⚠ Everyone's
            </button>
          </div>
        </div>

        {!puzzleId && (
          <div className="text-xs text-amber-500 bg-amber-500/10 rounded px-3 py-2">
            No puzzle set for today's {mode === "dem" ? "Dem Nah" : "Ting Nah"} — nothing to clear.
          </div>
        )}

        <button
          onClick={clearGuesses}
          disabled={clearing || !puzzleId}
          className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors disabled:opacity-40 ${
            target === "all"
              ? "bg-red-600 hover:bg-red-700 text-white"
              : "btn-primary"
          }`}
        >
          {clearing ? "Clearing…" : target === "all" ? "Clear everyone's guesses" : "Clear my guesses"}
        </button>
      </div>

      <AnimatePresence>
        {status && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className={`text-sm rounded-lg px-3 py-2 ${
              status.startsWith("✓")
                ? "bg-green-500/10 text-green-600 dark:text-green-400"
                : "bg-brand-red/10 text-brand-red"
            }`}
          >
            {status}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Schedule ──────────────────────────────────────────────────────────────────

function ScheduleSection() {
  const [rows, setRows] = useState<DailyPuzzle[]>([]);
  const [loading, setLoading] = useState(true);
  const [setting, setSetting] = useState<{ date: string; mode: Mode } | null>(null);
  const [newDate, setNewDate] = useState(
    new Date(Date.now() + 86400000).toISOString().slice(0, 10),
  );
  const [newMode, setNewMode] = useState<Mode>("dem");

  const load = useCallback(async () => {
    setLoading(true);
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await supabase
      .from("daily_puzzles")
      .select("id, puzzle_date, mode, entity_id, entities(name, image_url)")
      .gte("puzzle_date", today)
      .order("puzzle_date");
    setRows(
      (data ?? []).map((p: Record<string, unknown>) => ({
        id: p.id as string,
        puzzle_date: p.puzzle_date as string,
        mode: p.mode as Mode,
        entity_id: p.entity_id as string,
        entity_name: (p.entities as { name: string } | null)?.name,
        entity_image: (p.entities as { image_url: string } | null)?.image_url,
      })),
    );
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function deletePuzzle(id: string) {
    if (!confirm("Remove this scheduled puzzle?")) return;
    await supabase.from("daily_puzzles").delete().eq("id", id);
    load();
  }

  return (
    <div className="space-y-4">
      {/* Add new */}
      <div className="rounded-lg border border-line p-4 space-y-3">
        <h3 className="text-sm font-semibold">Schedule a future puzzle</h3>
        <div className="flex gap-3 flex-wrap items-end">
          <div className="space-y-1">
            <label className="text-xs text-ink-muted">Date</label>
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              min={new Date().toISOString().slice(0, 10)}
              className="rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus:border-brand-red"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-ink-muted">Mode</label>
            <div className="flex gap-1">
              {(["dem", "ting"] as Mode[]).map((m) => (
                <button key={m} type="button" onClick={() => setNewMode(m)}
                  className={`px-3 py-2 rounded-md text-sm font-semibold transition-colors border ${
                    newMode === m ? "bg-brand-red text-brand-white border-brand-red" : "border-line text-ink-muted"
                  }`}>
                  {m === "dem" ? "Dem" : "Ting"}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={() => setSetting({ date: newDate, mode: newMode })}
            className="btn-primary text-sm"
          >
            Pick entity →
          </button>
        </div>
      </div>

      {/* Upcoming schedule */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-ink-muted uppercase tracking-wider">Upcoming puzzles</h3>
        {loading ? (
          <div className="text-sm text-ink-muted">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="text-sm text-ink-muted italic">No upcoming puzzles scheduled.</div>
        ) : (
          <div className="rounded-lg border border-line overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-2 text-xs text-ink-muted uppercase tracking-wider">
                  <th className="px-4 py-2.5 text-left">Date</th>
                  <th className="px-4 py-2.5 text-left">Mode</th>
                  <th className="px-4 py-2.5 text-left">Entity</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/40">
                {rows.map((r) => {
                  const isToday = r.puzzle_date === new Date().toISOString().slice(0, 10);
                  return (
                    <tr key={r.id} className={`${isToday ? "bg-brand-red/5" : ""} hover:bg-surface-2 transition-colors`}>
                      <td className="px-4 py-2.5">
                        {r.puzzle_date}
                        {isToday && <span className="ml-2 text-[10px] text-brand-red font-semibold">TODAY</span>}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${
                          r.mode === "dem" ? "bg-blue-500/15 text-blue-500" : "bg-purple-500/15 text-purple-500"
                        }`}>
                          {r.mode === "dem" ? "Dem" : "Ting"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 flex items-center gap-2">
                        {r.entity_image && <img src={r.entity_image} alt="" className="w-5 h-5 rounded-full object-cover shrink-0" />}
                        {r.entity_name ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex gap-1 justify-end">
                          <button
                            onClick={() => setSetting({ date: r.puzzle_date, mode: r.mode })}
                            className="text-xs px-2 py-0.5 rounded border border-line hover:border-brand-red hover:text-brand-red transition-colors"
                          >
                            Change
                          </button>
                          <button
                            onClick={() => deletePuzzle(r.id)}
                            className="text-xs px-2 py-0.5 rounded border border-line hover:border-red-500 text-red-500/70 hover:text-red-500 transition-colors"
                          >
                            ×
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AnimatePresence>
        {setting && (
          <SetPuzzleModal
            mode={setting.mode}
            date={setting.date}
            onClose={() => setSetting(null)}
            onSet={() => { setSetting(null); load(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
