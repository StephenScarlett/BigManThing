import { useState } from "react";
import { PeopleGame } from "@/features/guess-nah/PeopleGame";
import LegacyGuessPanel from "@/features/guess-nah/LegacyGuessPanel";

export default function GuessNahPage() {
  const [mode, setMode] = useState<"people" | "ting">("people");
  return <div className="space-y-6 max-w-3xl mx-auto">
    <header className="flex items-end justify-between gap-3 flex-wrap border-b border-line pb-5">
      <div><h1 className="text-4xl">Guess Nah</h1><p className="text-ink-muted text-sm mt-1">A familiar face. A few good clues.</p></div>
      <div className="flex gap-1" aria-label="Guess mode">
        {(["people", "ting"] as const).map(m => <button key={m} aria-pressed={mode === m} onClick={() => setMode(m)}
          className={`px-3 py-2 rounded-md text-sm border ${mode === m ? "bg-brand-red text-brand-white border-brand-red" : "border-line"}`}>
          {m === "people" ? "People" : "Ting"}</button>)}
      </div>
    </header>
    {mode === "people" ? <PeopleGame /> : <LegacyGuessPanel mode="ting" />}
  </div>;
}
