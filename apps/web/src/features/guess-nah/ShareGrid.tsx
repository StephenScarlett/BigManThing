import { useState } from "react";
import { feedbackToEmoji, type GuessFeedback, type GuessNahMode } from "@bmt/shared";

interface Props {
  feedbacks: GuessFeedback[];
  attempts: number;
  puzzleDate: string;
  mode: GuessNahMode;
}

export function ShareGrid({ feedbacks, attempts, puzzleDate, mode }: Props) {
  const [copied, setCopied] = useState(false);
  const grid = feedbacks.map(feedbackToEmoji).join("\n");
  const modeLabel = mode === "ting" ? "Guess Ting Nah" : "Guess Them Nah";
  const text = `BigManThing — ${modeLabel} ${puzzleDate}\n${attempts} guess${attempts === 1 ? "" : "es"}\n\n${grid}\n\nbigmanthing.app`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      console.error("[BMT] clipboard error", e);
    }
  }

  return (
    <div className="card text-center space-y-3">
      <div className="text-2xl">Yuh get it!</div>
      <div className="text-ink-muted text-sm">
        {modeLabel} · {attempts} guess{attempts === 1 ? "" : "es"}
      </div>
      <pre className="font-mono whitespace-pre text-lg leading-tight">{grid}</pre>
      <button onClick={copy} className="btn btn-primary">
        {copied ? "Copied!" : "Share"}
      </button>
    </div>
  );
}
