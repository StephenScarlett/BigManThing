import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Entity, GuessFeedback, GuessNahMode } from "@bmt/shared";
import {
  fetchEntityCatalog,
  fetchTodaysPuzzle,
  submitGuess,
} from "@/features/guess-nah/api";
import { GuessInput } from "@/features/guess-nah/GuessInput";
import {
  AttributeRow,
  AttributeRowHeader,
} from "@/features/guess-nah/AttributeRow";
import { ShareGrid } from "@/features/guess-nah/ShareGrid";

interface Row {
  guess: Entity;
  feedback: GuessFeedback;
}

const MODE_LABELS: Record<GuessNahMode, { label: string; sub: string }> = {
  dem: { label: "Guess Them Nah", sub: "People + Folklore" },
  ting: { label: "Guess Ting Nah", sub: "Food + Tings" },
};

export default function GuessNahPage() {
  const [mode, setMode] = useState<GuessNahMode>("dem");

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-4xl">Guess Nah</h1>
          <p className="text-ink-muted">
            Daily mystery — same answer for every Trini.
          </p>
        </div>
        <ModeTabs mode={mode} onChange={setMode} />
      </header>
      <ModePanel key={mode} mode={mode} />
    </div>
  );
}

function ModeTabs({
  mode,
  onChange,
}: {
  mode: GuessNahMode;
  onChange: (m: GuessNahMode) => void;
}) {
  const tabs: GuessNahMode[] = ["dem", "ting"];
  return (
    <div className="flex gap-2">
      {tabs.map((key) => {
        const t = MODE_LABELS[key];
        const active = mode === key;
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`px-4 py-2 rounded-xl border transition ${
              active
                ? "bg-brand-red border-brand-red text-brand-white"
                : "border-line text-ink-muted hover:text-ink"
            }`}
          >
            <div className="font-display tracking-wide">{t.label}</div>
            <div className="text-[10px] uppercase tracking-wider opacity-80">
              {t.sub}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function ModePanel({ mode }: { mode: GuessNahMode }) {
  const puzzleQuery = useQuery({
    queryKey: ["daily-puzzle", mode],
    queryFn: () => fetchTodaysPuzzle(mode),
  });
  const catalogQuery = useQuery({
    queryKey: ["entity-catalog", mode],
    queryFn: () => fetchEntityCatalog(mode),
  });

  const [rows, setRows] = useState<Row[]>([]);
  const [solved, setSolved] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const storageKey = puzzleQuery.data
    ? `bmt:guess:${puzzleQuery.data.puzzle_id}`
    : null;

  useEffect(() => {
    if (!storageKey || !catalogQuery.data) return;
    const raw = localStorage.getItem(storageKey);
    if (!raw) return;
    try {
      const saved = JSON.parse(raw) as {
        rows: { guess_id: string; feedback: GuessFeedback }[];
        solved: boolean;
      };
      const byId = new Map(catalogQuery.data.map((e) => [e.id, e]));
      const restored: Row[] = [];
      for (const r of saved.rows) {
        const g = byId.get(r.guess_id);
        if (g) restored.push({ guess: g, feedback: r.feedback });
      }
      setRows(restored);
      setSolved(saved.solved);
    } catch {
      /* ignore corrupt storage */
    }
  }, [storageKey, catalogQuery.data]);

  function persist(next: { rows: Row[]; solved: boolean }) {
    if (!storageKey) return;
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        rows: next.rows.map((r) => ({ guess_id: r.guess.id, feedback: r.feedback })),
        solved: next.solved,
      }),
    );
  }

  const excludeIds = useMemo(
    () => new Set(rows.map((r) => r.guess.id)),
    [rows],
  );

  async function handleGuess(entity: Entity) {
    if (!puzzleQuery.data || solved || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await submitGuess(puzzleQuery.data.puzzle_id, entity.id);
      if (!res.feedback) {
        // already_finished — sync state from server.
        setSolved(res.solved);
        persist({ rows, solved: res.solved });
        return;
      }
      // Defensive: if solved, override all feedback to "exact"
      // (handles stale edge function returning wrong feedback for correct answer)
      let fb = res.feedback;
      if (res.solved) {
        fb = Object.fromEntries(Object.keys(fb).map((k) => [k, "exact"])) as unknown as typeof fb;
      }
      const next = [...rows, { guess: entity, feedback: fb }];
      setRows(next);
      setSolved(res.solved);
      persist({ rows: next, solved: res.solved });
    } catch (e) {
      console.error("[BMT] handleGuess error", e);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  if (puzzleQuery.isLoading || catalogQuery.isLoading) {
    return <p className="text-ink-muted">Loading today's puzzle…</p>;
  }
  if (!puzzleQuery.data) {
    return (
      <div className="card">
        <h2 className="text-2xl mb-2">No puzzle today yet</h2>
        <p className="text-ink-muted">
          The daily picker hasn't run for this mode. Run{" "}
          <code>seed_today.sql</code> in Supabase to schedule one.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-sm text-ink-muted">
        {puzzleQuery.data.puzzle_date} ·{" "}
        <span className="text-brand-red font-semibold">{rows.length}</span>{" "}
        guess{rows.length === 1 ? "" : "es"}
      </div>

      <GuessInput
        catalog={catalogQuery.data ?? []}
        excludeIds={excludeIds}
        disabled={solved || submitting}
        onPick={handleGuess}
      />
      {error && <p className="text-brand-red text-sm">{error}</p>}

      {rows.length > 0 && <AttributeRowHeader mode={mode} />}
      <div className="space-y-3">
        {rows.map((r, i) => (
          <AttributeRow
            key={`${r.guess.id}-${i}`}
            guess={r.guess}
            feedback={r.feedback}
            rowIndex={i}
          />
        ))}
      </div>

      {solved && (
        <ShareGrid
          feedbacks={rows.map((r) => r.feedback)}
          attempts={rows.length}
          puzzleDate={puzzleQuery.data.puzzle_date}
          mode={mode}
        />
      )}
    </div>
  );
}
