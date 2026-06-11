import { motion } from "framer-motion";
import type { Entity, FeedbackState, GuessFeedback } from "@bmt/shared";

interface Props {
  guess: Entity;
  feedback: GuessFeedback;
  rowIndex: number;
  labelMap?: Record<string, string>;
}

const DEM_HEADERS = [
  "Field",
  "Role",
  "Affiliations",
  "Gender",
  "Status",
  "Reach",
  "Details",
  "Origin",
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
    <div className={`grid gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 px-1 ${mode === "ting" ? "grid-cols-[4rem_repeat(7,minmax(0,1fr))]" : "grid-cols-[4rem_repeat(8,minmax(0,1fr))]"}`}>
      <div />
      {headers.map((h) => (
        <div key={h} className="min-w-0 text-center uppercase tracking-wider">
          {h}
        </div>
      ))}
    </div>
  );
}

export function AttributeRow({ guess, feedback, rowIndex, labelMap = {} }: Props) {
  const arrow = (s: FeedbackState) =>
    s === "higher" ? "↑" : s === "lower" ? "↓" : null;

  const isTing = "kind" in feedback;

  const cells: { state: FeedbackState; labels: string[]; arrow?: string | null }[] =
    isTing
      ? [
          { state: feedback.kind, labels: prettyArr(guess.kind, labelMap) },
          { state: feedback.heritage, labels: prettyArr(guess.heritage, labelMap) },
          { state: feedback.era, labels: [formatEra(guess.era_start, guess.era_end)], arrow: arrow(feedback.era) },
          { state: feedback.material, labels: prettyArr(guess.material, labelMap) },
          { state: feedback.occasion, labels: prettyArr(guess.occasion, labelMap) },
          { state: feedback.sense, labels: prettyArr(guess.sense, labelMap) },
          { state: feedback.reach, labels: prettyArr(guess.reach, labelMap), arrow: arrow(feedback.reach) },
        ]
      : [
          { state: feedback.field, labels: prettyArr(guess.field, labelMap) },
          { state: feedback.role, labels: prettyArr(guess.role, labelMap) },
          { state: feedback.associations, labels: prettyArr(guess.affiliations, labelMap) },
          { state: feedback.gender, labels: prettyArr(guess.gender, labelMap) },
          { state: feedback.status, labels: prettyArr(guess.status, labelMap) },
          { state: feedback.reach, labels: prettyArr(guess.reach, labelMap), arrow: arrow(feedback.reach) },
          { state: feedback.details, labels: prettyArr(guess.details, labelMap) },
          { state: feedback.origin, labels: prettyArr(guess.origin, labelMap) },
        ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <div className="text-sm text-slate-700 dark:text-slate-300 mb-1 px-1">
        <span className="font-semibold">#{rowIndex + 1}</span> &nbsp; {guess.name}
      </div>
      <div className={`grid gap-1.5 ${isTing ? "grid-cols-[4rem_repeat(7,minmax(0,1fr))]" : "grid-cols-[4rem_repeat(8,minmax(0,1fr))]"}`}>
        {/* Entity image — matches cell height */}
        <div className="flex items-start justify-center">
          <div className="w-full aspect-square rounded-lg overflow-hidden bg-surface-3 shrink-0">
          {guess.image_url ? (
            <img src={guess.image_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="text-ink-muted text-lg">?</div>
          )}
          </div>
        </div>
        {cells.map((c, i) => (
          <motion.div
            key={i}
            initial={{ rotateY: 90, opacity: 0, scale: 0.8 }}
            animate={{ rotateY: 0, opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 + i * 0.1, duration: 0.4, ease: "easeOut" }}
            style={{ perspective: 600, transformStyle: "preserve-3d" }}
            className={`rounded-lg p-1.5 text-center text-[10px] font-semibold
                        min-w-0 flex flex-col items-center justify-center min-h-[2.75rem]
                        relative overflow-hidden ${stateClass(c.state)}`}
          >
            <div className="absolute inset-0 bg-black/10" />
            {c.labels.length === 1 ? (
              <span
                className="relative z-10 leading-tight break-words font-bold drop-shadow-[0_1px_1px_rgba(0,0,0,0.45)]"
                style={{ textShadow: "0 1px 2px rgba(0, 0, 0, 0.45)" }}
              >
                {c.labels[0]}
              </span>
            ) : (
              <ul
                className="relative z-10 list-disc pl-3 text-left leading-tight space-y-0.5 break-words w-full font-bold drop-shadow-[0_1px_1px_rgba(0,0,0,0.45)]"
                style={{ textShadow: "0 1px 2px rgba(0, 0, 0, 0.45)" }}
              >
                {c.labels.map((label) => (
                  <li key={label}>{label}</li>
                ))}
              </ul>
            )}
            {c.arrow && (
              <span
                className="relative z-10 text-sm font-bold drop-shadow-[0_1px_1px_rgba(0,0,0,0.45)]"
                style={{ textShadow: "0 1px 2px rgba(0, 0, 0, 0.45)" }}
              >
                {c.arrow}
              </span>
            )}
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
function prettyArr(val: string[] | null | undefined, labelMap: Record<string, string>): string[] {
  if (!val || val.length === 0) return ["—"];
  return val
    .map((v) => prettify(v, labelMap))
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}

/** Format era range as human-readable. null end = ongoing (shows age). */
function formatEra(start: number | null | undefined, end: number | null | undefined): string {
  if (start == null) return "—";
  if (end == null) {
    const cur = new Date().getUTCFullYear();
    return `${start}+ (${cur - start}y)`;
  }
  if (start === end) return String(start);
  // Compact formatting: 1980–99, 2000–09
  const startStr = String(start);
  const endStr = start >= 2000 || end >= 2000 || Math.floor(start / 100) !== Math.floor(end / 100)
    ? String(end)
    : String(end).slice(-2);
  return `${startStr}–${endStr}`;
}

function prettify(value: string, labelMap: Record<string, string>): string {
  const mapped = labelMap[value];
  if (mapped) return mapped;

  switch (value) {
    // Details
    case "stadium_sport":        return "Stadium Sport";
    case "studio_music":         return "Studio Music";
    case "live_performance":     return "Live Perf.";
    case "digital_content":      return "Digital";
    case "political_office":     return "Political";
    case "radio_media":          return "Radio/Media";
    case "stage_comedy":         return "Stage Comedy";
    // Origin
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
