import { motion } from "framer-motion";
import type { Entity, FeedbackState, GuessFeedback } from "@bmt/shared";

interface Props {
  guess: Entity;
  feedback: GuessFeedback;
  rowIndex: number;
}

const DEM_HEADERS = [
  "Type",
  "Domain",
  "Era",
  "Form",
  "Alignment",
  "Reach",
  "Status",
] as const;

const TING_HEADERS = [
  "Kind",
  "Heritage",
  "Era",
  "Material",
  "Occasion",
  "Sense",
  "Reach",
] as const;

export function AttributeRowHeader({ mode }: { mode: "dem" | "ting" }) {
  const headers = mode === "ting" ? TING_HEADERS : DEM_HEADERS;
  return (
    <div className="grid grid-cols-7 gap-2 text-xs text-slate-500 dark:text-slate-400 px-1">
      {headers.map((h) => (
        <div key={h} className="text-center uppercase tracking-wider">
          {h}
        </div>
      ))}
    </div>
  );
}

export function AttributeRow({ guess, feedback, rowIndex }: Props) {
  const arrow = (s: FeedbackState) =>
    s === "higher" ? "↑" : s === "lower" ? "↓" : null;

  const cells: { state: FeedbackState; label: string; arrow?: string | null }[] =
    "kind" in feedback
      ? [
          { state: feedback.kind, label: prettify(guess.kind ?? "") },
          { state: feedback.heritage, label: prettify(guess.heritage ?? "") },
          { state: feedback.era, label: prettify(guess.era), arrow: arrow(feedback.era) },
          { state: feedback.material, label: prettify(guess.material ?? "") },
          { state: feedback.occasion, label: prettify(guess.occasion ?? "") },
          { state: feedback.sense, label: prettify(guess.sense ?? "") },
          { state: feedback.reach, label: prettify(guess.reach), arrow: arrow(feedback.reach) },
        ]
      : [
          { state: feedback.type, label: prettify(guess.type ?? "") },
          { state: feedback.domain, label: prettify(guess.domain ?? "") },
          { state: feedback.era, label: prettify(guess.era), arrow: arrow(feedback.era) },
          { state: feedback.form, label: prettify(guess.form ?? "") },
          { state: feedback.alignment, label: prettify(guess.alignment ?? "") },
          { state: feedback.reach, label: prettify(guess.reach), arrow: arrow(feedback.reach) },
          { state: feedback.status, label: prettify(guess.status ?? "") },
        ];

  return (
    <div>
      <div className="text-sm text-slate-700 dark:text-slate-300 mb-1 px-1">
        <span className="font-semibold">#{rowIndex + 1}</span> &nbsp; {guess.name}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {cells.map((c, i) => (
          <motion.div
            key={i}
            initial={{ rotateX: 90, opacity: 0 }}
            animate={{ rotateX: 0, opacity: 1 }}
            transition={{ delay: i * 0.06, duration: 0.35, ease: "easeOut" }}
            className={`rounded-lg p-2 text-center text-xs font-semibold
                        flex flex-col items-center justify-center min-h-[3rem]
                        ${stateClass(c.state)}`}
          >
            <span className="leading-tight break-words">{c.label}</span>
            {c.arrow && <span className="text-base">{c.arrow}</span>}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function stateClass(state: string): string {
  switch (state) {
    case "exact":
      return "bg-feedback-exact/20 border border-feedback-exact text-feedback-exact dark:text-emerald-200";
    case "higher":
    case "lower":
      return "bg-feedback-ordered/15 border border-feedback-ordered text-feedback-ordered";
    default:
      return "bg-surface-3 border border-line text-ink-muted";
  }
}

function prettify(value: string): string {
  switch (value) {
    case "pre_1900":
      return "Pre-1900";
    case "y1900_1950":
      return "1900–1950";
    case "y1950_2000":
      return "1950–2000";
    case "y2000_plus":
      return "2000+";
    case "trinidad_wide":
      return "Trinidad-wide";
    case "caribbean_wide":
      return "Caribbean-wide";
    case "local_legend":
      return "Local Legend";
    case "active_legend":
      return "Active Legend";
    case "tool_object":
      return "Tool/Object";
    default:
      return value
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
  }
}
