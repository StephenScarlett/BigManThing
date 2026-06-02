import { motion } from "framer-motion";
import type { Entity, FeedbackState, GuessFeedback } from "@bmt/shared";

interface Props {
  guess: Entity;
  feedback: GuessFeedback;
  rowIndex: number;
}

const DEM_HEADERS = [
  "Field",
  "Role",
  "Peak Era",
  "Gender",
  "Status",
  "Domain",
  "Context",
  "Region",
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
  const cols = mode === "ting" ? "grid-cols-[2.75rem_repeat(7,1fr)]" : "grid-cols-[2.75rem_repeat(8,1fr)]";
  return (
    <div className={`grid ${cols} gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 px-1`}>
      <div />
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

  const isTing = "kind" in feedback;

  const cells: { state: FeedbackState; label: string; arrow?: string | null }[] =
    isTing
      ? [
          { state: feedback.kind, label: prettyArr(guess.kind) },
          { state: feedback.heritage, label: prettyArr(guess.heritage) },
          { state: feedback.era, label: formatEra(guess.era_start, guess.era_end), arrow: arrow(feedback.era) },
          { state: feedback.material, label: prettyArr(guess.material) },
          { state: feedback.occasion, label: prettyArr(guess.occasion) },
          { state: feedback.sense, label: prettyArr(guess.sense) },
          { state: feedback.reach, label: prettyArr(guess.reach), arrow: arrow(feedback.reach) },
        ]
      : [
          { state: feedback.field, label: prettyArr(guess.field) },
          { state: feedback.role, label: prettyArr(guess.role) },
          { state: feedback.era, label: formatEra(guess.era_start, guess.era_end), arrow: arrow(feedback.era) },
          { state: feedback.gender, label: prettyArr(guess.gender) },
          { state: feedback.status, label: prettyArr(guess.status) },
          { state: feedback.domain_type, label: prettyArr(guess.domain_type) },
          { state: feedback.output_context, label: prettyArr(guess.output_context) },
          { state: feedback.region, label: prettyArr(guess.region) },
        ];

  const cols = isTing ? "grid-cols-[2.75rem_repeat(7,1fr)]" : "grid-cols-[2.75rem_repeat(8,1fr)]";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <div className="text-sm text-slate-700 dark:text-slate-300 mb-1 px-1">
        <span className="font-semibold">#{rowIndex + 1}</span> &nbsp; {guess.name}
      </div>
      <div className={`grid ${cols} gap-1.5`}>
        {/* Entity image — matches cell height */}
        <div className="rounded-lg overflow-hidden min-h-[2.75rem] flex items-center justify-center bg-surface-3">
          {guess.image_url ? (
            <img src={guess.image_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="text-ink-muted text-lg">?</div>
          )}
        </div>
        {cells.map((c, i) => (
          <motion.div
            key={i}
            initial={{ rotateY: 90, opacity: 0, scale: 0.8 }}
            animate={{ rotateY: 0, opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 + i * 0.1, duration: 0.4, ease: "easeOut" }}
            style={{ perspective: 600, transformStyle: "preserve-3d" }}
            className={`rounded-lg p-1.5 text-center text-[10px] font-semibold
                        flex flex-col items-center justify-center min-h-[2.75rem]
                        ${stateClass(c.state)}`}
          >
            <span className="leading-tight break-words">{c.label}</span>
            {c.arrow && <span className="text-sm">{c.arrow}</span>}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

function stateClass(state: string): string {
  switch (state) {
    case "exact":
      return "bg-emerald-600 text-white";
    case "partial":
      return "bg-amber-500 text-white";
    case "higher":
    case "lower":
      return "bg-sky-600 text-white";
    case "wrong":
    default:
      return "bg-red-600 text-white/90";
  }
}

/** Format an array of values for display in a cell. */
function prettyArr(val: string[] | null | undefined): string {
  if (!val || val.length === 0) return "—";
  return val.map(prettify).join(", ");
}

/** Format era range as human-readable. */
function formatEra(start: number | null | undefined, end: number | null | undefined): string {
  if (start == null || end == null) return "—";
  if (start === end) return String(start);
  // Compact formatting: 1980–99, 2000–09
  const startStr = String(start);
  const endStr = start >= 2000 || end >= 2000 || Math.floor(start / 100) !== Math.floor(end / 100)
    ? String(end)
    : String(end).slice(-2);
  return `${startStr}–${endStr}`;
}

function prettify(value: string): string {
  switch (value) {
    // Domain type
    case "elite_global_performer":     return "Elite Global";
    case "international_professional": return "Int'l Pro";
    case "regional_icon":              return "Regional Icon";
    case "national_figure":            return "National Fig.";
    case "local_creator":              return "Local Creator";
    case "cultural_legend":            return "Cultural Legend";
    // Output context
    case "stadium_sport":        return "Stadium Sport";
    case "studio_music":         return "Studio Music";
    case "live_performance":     return "Live Perf.";
    case "digital_content":      return "Digital";
    case "political_office":     return "Political";
    case "radio_media":          return "Radio/Media";
    case "stage_comedy":         return "Stage Comedy";
    // Region
    case "trinidad_north":       return "North";
    case "trinidad_south":       return "South";
    case "trinidad_central":     return "Central";
    case "caribbean_wide":       return "Caribbean";
    // Reach / other
    case "trinidad_wide":        return "Trinidad";
    case "local_legend":         return "Local Legend";
    case "social_media":         return "Social Media";
    case "tool_object":          return "Tool/Object";
    default:
      return value
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
  }
}
