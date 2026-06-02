import type { RoundSummary } from "@bmt/shared";
import { DRAW_NAH_CATEGORY_LABELS } from "@bmt/shared";

export function RoundSummaryModal({ summary }: { summary: RoundSummary }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4">
      <div className="card max-w-md w-full text-center">
        <div className="text-xs uppercase tracking-wide text-ink-muted">
          The word was
        </div>
        <h2 className="mt-1 text-3xl font-extrabold text-brand-red">
          {summary.word}
        </h2>
        <div className="text-xs text-ink-muted">
          {DRAW_NAH_CATEGORY_LABELS[summary.category]} · drawn by{" "}
          {summary.drawer_nickname}
        </div>
        {summary.snapshot_data_url && (
          <img
            src={summary.snapshot_data_url}
            alt={`drawing of ${summary.word}`}
            className="mt-3 w-full rounded border border-line bg-white"
          />
        )}
        <div className="mt-3">
          {summary.guessers.length === 0 ? (
            <div className="text-ink-muted italic text-sm">Nobody guessed.</div>
          ) : (
            <>
              <div className="text-xs uppercase tracking-wide text-ink-muted mb-1">
                Guessed it
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {summary.guessers.map((g) => (
                  <span
                    key={g.player_id}
                    className="rounded-full bg-feedback-exact/20 text-feedback-exact text-xs px-2 py-1"
                  >
                    {g.nickname}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="mt-3 text-xs text-ink-muted">
          Next round starting…
        </div>
      </div>
    </div>
  );
}
