import { useId, useMemo, useState } from "react";
import { normalizePeopleSearch, type PeopleCandidate } from "@bmt/shared";

export function PeopleGuessInput({ catalog, used, disabled, labels, onPick }: {
  catalog: PeopleCandidate[]; used: Set<string>; disabled: boolean; labels: Record<string, string>;
  onPick: (person: PeopleCandidate) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const listId = useId();
  const matches = useMemo(() => {
    const term = normalizePeopleSearch(query);
    return catalog.filter(p => !used.has(p.id) && (!term || [p.name, ...p.aliases].some(n => normalizePeopleSearch(n).includes(term)))).slice(0, 8);
  }, [catalog, query, used]);
  const pick = (p: PeopleCandidate) => { onPick(p); setQuery(""); setOpen(false); setHighlight(0); };
  return <div className="relative">
    <label htmlFor={`${listId}-input`} className="block text-sm font-semibold mb-2">Who yuh thinking of?</label>
    <input id={`${listId}-input`} role="combobox" aria-autocomplete="list" aria-expanded={open && matches.length > 0}
      aria-controls={listId} aria-activedescendant={open && matches[highlight] ? `${listId}-${highlight}` : undefined}
      autoComplete="off" placeholder="Search a name or nickname" value={query} disabled={disabled}
      onChange={e => { setQuery(e.target.value); setOpen(true); setHighlight(0); }}
      onFocus={() => setOpen(true)} onBlur={() => setOpen(false)}
      onKeyDown={e => {
        if (e.key === "Escape") { setOpen(false); return; }
        if (!open || !matches.length) return;
        if (e.key === "ArrowDown") { e.preventDefault(); setHighlight(n => Math.min(n + 1, matches.length - 1)); }
        if (e.key === "ArrowUp") { e.preventDefault(); setHighlight(n => Math.max(0, n - 1)); }
        if (e.key === "Enter") { e.preventDefault(); const p = matches[highlight]; if (p) pick(p); }
      }} className="w-full rounded-md border border-line bg-surface px-3 py-3 focus:outline-none focus:ring-2 focus:ring-brand-red disabled:opacity-50" />
    {open && !disabled && <ul id={listId} role="listbox" aria-label="People" className="absolute z-20 mt-1 w-full rounded-md border border-line bg-surface shadow-xl max-h-80 overflow-y-auto">
      {matches.map((p, i) => <li id={`${listId}-${i}`} key={p.id} role="option" aria-selected={highlight === i}
        onMouseDown={e => { e.preventDefault(); pick(p); }} onMouseEnter={() => setHighlight(i)}
        className={`cursor-pointer px-3 py-2.5 ${highlight === i ? "bg-surface-2" : ""}`}>
        <div className="font-semibold text-sm">{p.name}{p.letters != null && <span className="font-normal text-ink-muted ml-2">{p.letters} letters</span>}</div>
        <div className="text-xs text-ink-muted mt-0.5">{p.specialities.map(v => labels[v] ?? v).join(" + ")} · Born {p.birth_year ?? "unconfirmed"}</div>
      </li>)}
      {!matches.length && <li className="px-3 py-3 text-sm text-ink-muted">No unused person matches. Try another name.</li>}
    </ul>}
  </div>;
}
