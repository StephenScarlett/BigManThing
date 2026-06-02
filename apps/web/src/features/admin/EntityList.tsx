import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import type { Entity, GuessNahMode } from "@bmt/shared";
import EntityForm from "./EntityForm";

type ViewMode = "all" | "dem" | "ting" | "draw_only";

const VIEW_LABELS: Record<ViewMode, string> = {
  all: "All Entities",
  dem: "Dem Nah (People)",
  ting: "Ting Nah",
  draw_only: "Draw Only",
};

type SortKey = "name" | "mode" | "field" | "era" | "difficulty" | "created_at";
type SortDir = "asc" | "desc";

export default function EntityList() {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Entity | null>(null);
  const [creating, setCreating] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("entities").select("*").order("name");

    if (viewMode === "draw_only") {
      q = q.eq("draw_nah_enabled", true).eq("guess_nah_enabled", false);
    } else if (viewMode !== "all") {
      q = q.eq("mode", viewMode);
    }

    const { data, error } = await q;
    if (error) console.error("[admin] load error:", error.message);
    setEntities((data ?? []) as Entity[]);
    setLoading(false);
  }, [viewMode]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    let list = entities;
    if (term) {
      list = list.filter(
        (e) =>
          e.name.toLowerCase().includes(term) ||
          e.aliases?.some((a) => a.toLowerCase().includes(term)) ||
          e.role?.some((r) => r.toLowerCase().includes(term)) ||
          e.field?.some((f) => f.toLowerCase().includes(term)),
      );
    }
    // Sort
    list = [...list].sort((a, b) => {
      let av: string | number = "";
      let bv: string | number = "";
      switch (sortKey) {
        case "name":       av = a.name; bv = b.name; break;
        case "mode":       av = a.mode; bv = b.mode; break;
        case "field":      av = a.field?.[0] ?? a.kind?.[0] ?? ""; bv = b.field?.[0] ?? b.kind?.[0] ?? ""; break;
        case "era":        av = a.era_start ?? 0; bv = b.era_start ?? 0; break;
        case "difficulty":
          av = a.difficulty === "easy" ? 0 : a.difficulty === "medium" ? 1 : 2;
          bv = b.difficulty === "easy" ? 0 : b.difficulty === "medium" ? 1 : 2;
          break;
        default: av = a.name; bv = b.name;
      }
      if (typeof av === "string" && typeof bv === "string") {
        const cmp = av.localeCompare(bv);
        return sortDir === "asc" ? cmp : -cmp;
      }
      return sortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
    return list;
  }, [entities, search, sortKey, sortDir]);

  // Reset to first page when filters change
  useEffect(() => { setPage(0); }, [search, viewMode, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = useMemo(
    () => filtered.slice(page * pageSize, (page + 1) * pageSize),
    [filtered, page, pageSize],
  );

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    const { error } = await supabase.from("entities").delete().eq("id", id);
    if (error) {
      alert(`Delete failed: ${error.message}\n\nIf this entity was used in a puzzle, disable it instead.`);
    } else {
      load();
    }
  }

  async function handleToggle(id: string, col: "guess_nah_enabled" | "draw_nah_enabled", current: boolean) {
    await supabase.from("entities").update({ [col]: !current }).eq("id", id);
    load();
  }

  if (editing || creating) {
    return (
      <EntityForm
        entity={editing}
        defaultMode={viewMode === "draw_only" || viewMode === "all" ? "dem" : viewMode as GuessNahMode}
        onSave={() => { setEditing(null); setCreating(false); load(); }}
        onCancel={() => { setEditing(null); setCreating(false); }}
      />
    );
  }

  const sortArrow = (key: SortKey) =>
    sortKey === key ? (sortDir === "asc" ? " ▲" : " ▼") : "";

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Tabs */}
        <div className="flex gap-1.5">
          {(["all", "dem", "ting", "draw_only"] as ViewMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setViewMode(m)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                viewMode === m
                  ? "bg-brand-red text-brand-white"
                  : "bg-surface-2 text-ink-muted hover:text-ink border border-line"
              }`}
            >
              {VIEW_LABELS[m]}
            </button>
          ))}
        </div>

        <div className="flex gap-2 items-center">
          <input
            type="text"
            placeholder="Search name, alias, role, field…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64 rounded-md border border-line bg-surface px-3 py-1.5 text-xs text-ink
                       placeholder:text-ink-muted focus:outline-none focus:border-brand-red"
          />
          <button onClick={() => setCreating(true)} className="btn-primary text-xs !py-1.5 !px-3 whitespace-nowrap">
            + Add Entity
          </button>
        </div>
      </div>

      {/* Summary bar */}
      <div className="flex items-center gap-4 text-xs text-ink-muted border-b border-line pb-2">
        <span>
          <span className="font-semibold text-ink">{filtered.length}</span> entit{filtered.length === 1 ? "y" : "ies"}
          {search && <span className="ml-1">matching "{search}"</span>}
        </span>
        {viewMode === "all" && (
          <span className="flex gap-3 ml-auto">
            <span>Dem: <strong className="text-ink">{filtered.filter((e) => e.mode === "dem").length}</strong></span>
            <span>Ting: <strong className="text-ink">{filtered.filter((e) => e.mode === "ting").length}</strong></span>
          </span>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="text-center py-10 text-ink-muted">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10 text-ink-muted">
          {search ? "No matching entities." : "No entities in this category yet."}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-surface-2 text-left text-[10px] text-ink-muted uppercase tracking-wider">
                <Th onClick={() => handleSort("name")} className="min-w-[160px] sticky left-0 z-10 bg-surface-2">
                  Name{sortArrow("name")}
                </Th>
                <Th className="min-w-[80px] sticky left-[160px] z-10 bg-surface-2">Actions</Th>
                {(viewMode === "all" || viewMode === "dem" || viewMode === "draw_only") && (
                  <Th className="min-w-[80px]">Aliases</Th>
                )}
                {viewMode === "all" && (
                  <Th onClick={() => handleSort("mode")} className="min-w-[60px]">
                    Mode{sortArrow("mode")}
                  </Th>
                )}
                <Th onClick={() => handleSort("field")} className="min-w-[80px]">
                  {viewMode === "ting" ? "Kind" : "Field"}{sortArrow("field")}
                </Th>
                <Th className="min-w-[100px]">
                  {viewMode === "ting" ? "Heritage" : "Role"}
                </Th>
                {viewMode !== "ting" && (
                  <>
                    <Th className="min-w-[80px]">Gender</Th>
                    <Th className="min-w-[90px]">Domain</Th>
                    <Th className="min-w-[90px]">Context</Th>
                    <Th className="min-w-[80px]">Region</Th>
                  </>
                )}
                {viewMode === "ting" && (
                  <>
                    <Th className="min-w-[70px]">Material</Th>
                    <Th className="min-w-[70px]">Occasion</Th>
                    <Th className="min-w-[60px]">Sense</Th>
                    <Th className="min-w-[60px]">Reach</Th>
                  </>
                )}
                <Th onClick={() => handleSort("era")} className="min-w-[70px]">
                  Era{sortArrow("era")}
                </Th>
                <Th className="min-w-[50px]">Status</Th>
                <Th onClick={() => handleSort("difficulty")} className="min-w-[50px] text-center">
                  Diff{sortArrow("difficulty")}
                </Th>
                <Th className="min-w-[40px] text-center">Guess</Th>
                <Th className="min-w-[40px] text-center">Draw</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/40">
              {paged.map((e) => (
                <tr
                  key={e.id}
                  className="hover:bg-surface-2/60 transition-colors group"
                >
                  {/* Name */}
                  <td className="py-2 px-3 font-medium text-ink sticky left-0 z-10 bg-surface group-hover:bg-surface-2/60">
                    <div className="flex items-center gap-2">
                      {e.image_url ? (
                        <img src={e.image_url} alt="" className="w-6 h-6 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-surface-3 shrink-0" />
                      )}
                      <span className="truncate max-w-[130px]">{e.name}</span>
                    </div>
                  </td>
                  {/* Actions — pinned next to name */}
                  <td className="py-2 px-3 sticky left-[160px] z-10 bg-surface group-hover:bg-surface-2/60">
                    <div className="flex gap-1">
                      <button
                        onClick={() => setEditing(e)}
                        className="px-2 py-0.5 rounded border border-line hover:border-brand-red hover:text-brand-red transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(e.id, e.name)}
                        className="px-2 py-0.5 rounded border border-line hover:border-red-500 text-red-500/70 hover:text-red-500 transition-colors"
                      >
                        ×
                      </button>
                    </div>
                  </td>
                  {/* Aliases */}
                  {(viewMode === "all" || viewMode === "dem" || viewMode === "draw_only") && (
                    <td className="py-2 px-3 text-ink-muted truncate max-w-[120px]" title={e.aliases?.join(", ")}>
                      {e.aliases?.slice(0, 2).join(", ") || "—"}
                    </td>
                  )}
                  {/* Mode (all tab only) */}
                  {viewMode === "all" && (
                    <td className="py-2 px-3">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                        e.mode === "dem"
                          ? "bg-blue-500/15 text-blue-500 dark:text-blue-400"
                          : "bg-purple-500/15 text-purple-500 dark:text-purple-400"
                      }`}>
                        {e.mode === "dem" ? "Dem" : "Ting"}
                      </span>
                    </td>
                  )}
                  {/* Field / Kind */}
                  <td className="py-2 px-3 text-ink-muted">
                    {viewMode === "ting" ? pretty(e.kind) : pretty(e.field)}
                  </td>
                  {/* Role / Heritage */}
                  <td className="py-2 px-3 text-ink-muted truncate max-w-[100px]">
                    {viewMode === "ting" ? pretty(e.heritage) : pretty(e.role)}
                  </td>
                  {/* Dem-specific */}
                  {viewMode !== "ting" && (
                    <>
                      <td className="py-2 px-3 text-ink-muted">{pretty(e.gender)}</td>
                      <td className="py-2 px-3 text-ink-muted">{pretty(e.domain_type)}</td>
                      <td className="py-2 px-3 text-ink-muted">{pretty(e.output_context)}</td>
                      <td className="py-2 px-3 text-ink-muted">{pretty(e.region)}</td>
                    </>
                  )}
                  {/* Ting-specific */}
                  {viewMode === "ting" && (
                    <>
                      <td className="py-2 px-3 text-ink-muted">{pretty(e.material)}</td>
                      <td className="py-2 px-3 text-ink-muted">{pretty(e.occasion)}</td>
                      <td className="py-2 px-3 text-ink-muted">{pretty(e.sense)}</td>
                      <td className="py-2 px-3 text-ink-muted">{pretty(e.reach)}</td>
                    </>
                  )}
                  {/* Era */}
                  <td className="py-2 px-3 text-ink-muted">{formatEra(e.era_start, e.era_end)}</td>
                  {/* Status */}
                  <td className="py-2 px-3">
                    {e.status?.length ? (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        e.status.includes("active") ? "bg-green-500/15 text-green-600 dark:text-green-400" :
                        e.status.includes("deceased") ? "bg-red-500/15 text-red-400" :
                        e.status.includes("retired") ? "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400" :
                        "bg-surface-3 text-ink-muted"
                      }`}>
                        {pretty(e.status)}
                      </span>
                    ) : null}
                  </td>
                  {/* Difficulty */}
                  <td className="py-2 px-3 text-center">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                      e.difficulty === "easy" ? "bg-green-500/15 text-green-600 dark:text-green-400" :
                      e.difficulty === "hard" ? "bg-red-500/15 text-red-400" :
                      "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400"
                    }`}>
                      {e.difficulty[0]!.toUpperCase()}
                    </span>
                  </td>
                  {/* Guess toggle */}
                  <td className="py-2 px-3 text-center">
                    <button
                      onClick={() => handleToggle(e.id, "guess_nah_enabled", e.guess_nah_enabled)}
                      className={`w-5 h-5 rounded border text-[10px] inline-flex items-center justify-center ${
                        e.guess_nah_enabled
                          ? "bg-green-500/20 border-green-500 text-green-500"
                          : "bg-surface-3 border-line text-transparent hover:border-ink-muted"
                      }`}
                    >
                      ✓
                    </button>
                  </td>
                  {/* Draw toggle */}
                  <td className="py-2 px-3 text-center">
                    <button
                      onClick={() => handleToggle(e.id, "draw_nah_enabled", e.draw_nah_enabled)}
                      className={`w-5 h-5 rounded border text-[10px] inline-flex items-center justify-center ${
                        e.draw_nah_enabled
                          ? "bg-green-500/20 border-green-500 text-green-500"
                          : "bg-surface-3 border-line text-transparent hover:border-ink-muted"
                      }`}
                    >
                      ✓
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {filtered.length > 0 && (
        <div className="flex items-center justify-between text-xs text-ink-muted pt-1">
          <div className="flex items-center gap-2">
            <span>Show</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}
              className="rounded border border-line bg-surface px-1.5 py-0.5 text-xs text-ink"
            >
              {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <span>per page</span>
          </div>

          <div className="flex items-center gap-2">
            <span>
              {page * pageSize + 1}–{Math.min((page + 1) * pageSize, filtered.length)} of {filtered.length}
            </span>
            <div className="flex gap-1">
              <button disabled={page === 0} onClick={() => setPage(0)}
                className="px-1.5 py-0.5 rounded border border-line disabled:opacity-30 hover:border-ink-muted transition-colors">«</button>
              <button disabled={page === 0} onClick={() => setPage((p) => p - 1)}
                className="px-1.5 py-0.5 rounded border border-line disabled:opacity-30 hover:border-ink-muted transition-colors">‹</button>
              <button disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}
                className="px-1.5 py-0.5 rounded border border-line disabled:opacity-30 hover:border-ink-muted transition-colors">›</button>
              <button disabled={page >= totalPages - 1} onClick={() => setPage(totalPages - 1)}
                className="px-1.5 py-0.5 rounded border border-line disabled:opacity-30 hover:border-ink-muted transition-colors">»</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Th({
  children,
  onClick,
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <th
      onClick={onClick}
      className={`py-2.5 px-3 font-semibold whitespace-nowrap sticky top-0 bg-surface-2
                  ${onClick ? "cursor-pointer hover:text-ink select-none" : ""} ${className}`}
    >
      {children}
    </th>
  );
}

function pretty(val: string | string[] | null | undefined): string {
  if (!val) return "—";
  if (Array.isArray(val)) {
    if (val.length === 0) return "—";
    return val.map((v) => v.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())).join(", ");
  }
  return val.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatEra(start: number | null | undefined, end: number | null | undefined): string {
  if (start == null || end == null) return "—";
  if (start === end) return String(start);
  return `${start}–${end}`;
}
