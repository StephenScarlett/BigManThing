import type { PeopleCandidate, PeopleFeedback, PeopleMatch } from "@bmt/shared";

const style: Record<PeopleMatch, string> = {
  exact: "border-green-600/60 bg-green-500/10",
  partial: "border-amber-600/60 bg-amber-500/10",
  wrong: "border-line bg-surface-2",
  unknown: "border-dashed border-line bg-surface",
};
const stateText: Record<PeopleMatch, string> = { exact: "✓ Match", partial: "≈ Overlap", wrong: "× Different", unknown: "? Unconfirmed" };

export function PeopleFeedbackRow({ person, feedback, number, labels }: {
  person: PeopleCandidate; feedback: PeopleFeedback; number: number; labels: Record<string, string>;
}) {
  const bornText = feedback.born.direction
    ? `${feedback.born.direction === "earlier" ? "↓" : "↑"} Answer born ${feedback.born.direction}${feedback.born.state === "partial" ? " · within 5 years" : ""}`
    : stateText[feedback.born.state];
  const cells = [
    { title: "Known for", value: person.known_for.map(v => labels[v] ?? v).join(" + "), state: feedback.known_for, text: stateText[feedback.known_for] },
    { title: "Speciality", value: person.specialities.map(v => labels[v] ?? v).join(" + "), state: feedback.speciality, text: stateText[feedback.speciality] },
    { title: "Born", value: person.birth_year?.toString() ?? "Unconfirmed", state: feedback.born.state, text: bornText },
    { title: "Gender", value: person.gender ? labels[person.gender] ?? person.gender : "Unconfirmed", state: feedback.gender, text: stateText[feedback.gender] },
  ];
  return <article className="space-y-2" aria-label={`Guess ${number}: ${person.name}`}>
    <div className="flex items-baseline gap-2"><span className="text-ink-muted text-xs tabular-nums">{number.toString().padStart(2, "0")}</span><h3 className="font-semibold">{person.name}</h3></div>
    <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {cells.map(cell => <div key={cell.title} className={`rounded-md border p-2.5 min-w-0 ${style[cell.state]}`}>
        <dt className="text-[11px] text-ink-muted">{cell.title}</dt>
        <dd className="text-sm font-medium break-words mt-1">{cell.value}</dd>
        <dd className="text-[11px] leading-snug mt-1.5">{cell.text}</dd>
      </div>)}
    </dl>
  </article>;
}
