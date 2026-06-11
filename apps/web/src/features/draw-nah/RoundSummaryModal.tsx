import type { RoundSummary } from "@bmt/shared";
import { DRAW_NAH_CATEGORY_LABELS } from "@bmt/shared";

export function RoundSummaryModal({ summary }: { summary: RoundSummary }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="card max-w-xl w-full text-center">
        <div className="text-xs uppercase tracking-widest text-ink-muted">
          The word was
        </div>
        <h2 className="mt-1 font-display text-4xl text-brand-red tracking-wide">
          {summary.word}
        </h2>
        <div className="text-xs text-ink-muted mt-1">
          {DRAW_NAH_CATEGORY_LABELS[summary.category]} · drawn by{" "}
          <span className="font-semibold text-ink">{summary.drawer_nickname}</span>
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.333fr)] gap-3 mt-4">
          <figure className="space-y-1.5">
            <div className="overflow-hidden rounded-xl border border-line bg-surface aspect-square flex items-center justify-center">
              {summary.image_url ? (
                <img
                  src={summary.image_url}
                  alt={`reference ${summary.word}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-ink-muted text-sm">no reference</span>
              )}
            </div>
            <figcaption className="text-[10px] uppercase tracking-wider text-ink-muted">
              Reference
            </figcaption>
          </figure>
          <figure className="space-y-1.5">
            <div className="overflow-hidden rounded-xl border border-line bg-white aspect-[4/3] flex items-center justify-center">
              {summary.snapshot_data_url ? (
                <img
                  src={summary.snapshot_data_url}
                  alt={`drawing of ${summary.word}`}
                  className="h-full w-full object-contain"
                />
              ) : (
                <span className="text-ink-muted text-sm">no drawing</span>
              )}
            </div>
            <figcaption className="text-[10px] uppercase tracking-wider text-ink-muted">
              Drawing
            </figcaption>
          </figure>
        </div>

        <div className="mt-4">
          {summary.guessers.length === 0 ? (
            <div className="text-ink-muted italic text-sm">Nobody guessed.</div>
          ) : (
            <>
              <div className="text-xs uppercase tracking-widest text-ink-muted mb-1.5">
                Guessed it
              </div>
              <div className="flex flex-wrap justify-center gap-1.5">
                {summary.guessers.map((g) => (
                  <span
                    key={g.player_id}
                    className="rounded-full bg-feedback-exact/15 text-feedback-exact text-xs font-semibold px-2.5 py-1"
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
