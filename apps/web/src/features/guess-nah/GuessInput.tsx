import { useEffect, useMemo, useRef, useState } from "react";
import type { Entity } from "@bmt/shared";

interface Props {
  catalog: Entity[];
  excludeIds: Set<string>;
  disabled?: boolean;
  onPick: (entity: Entity) => void;
}

export function GuessInput({ catalog, excludeIds, disabled, onPick }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return catalog
      .filter((e) => !excludeIds.has(e.id))
      .filter((e) => {
        if (e.name.toLowerCase().startsWith(q)) return true;
        return e.aliases.some((a) => a.toLowerCase().startsWith(q));
      })
      .slice(0, 8);
  }, [query, catalog, excludeIds]);

  useEffect(() => {
    setHighlight(0);
  }, [matches.length]);

  function pick(entity: Entity) {
    onPick(entity);
    setQuery("");
    setOpen(false);
    inputRef.current?.focus();
  }

  function tagFor(e: Entity): string {
    if (e.mode === "ting" && e.kind) return e.kind.replace("_", " ");
    if (e.mode === "dem" && e.type) return e.type;
    return e.mode;
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={query}
        disabled={disabled}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (!matches.length) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlight((h) => Math.min(h + 1, matches.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlight((h) => Math.max(h - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            const m = matches[highlight];
            if (m) pick(m);
          }
        }}
        placeholder="Guess nah..."
        className="w-full rounded-xl bg-surface-2 border border-line text-ink px-4 py-3
                   focus:outline-none focus:border-brand-red focus:shadow-glow
                   placeholder:text-ink-muted disabled:opacity-50"
      />
      {open && matches.length > 0 && (
        <ul className="absolute z-20 mt-2 w-full rounded-xl border border-line bg-surface-2 overflow-hidden shadow-xl">
          {matches.map((m, i) => (
            <li
              key={m.id}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(m);
              }}
              onMouseEnter={() => setHighlight(i)}
              className={`px-4 py-2 cursor-pointer flex items-center gap-3 ${
                i === highlight ? "bg-surface-3" : ""
              }`}
            >
              <span className="text-xs uppercase text-brand-red w-32 shrink-0">
                {tagFor(m)}
              </span>
              <span>{m.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
