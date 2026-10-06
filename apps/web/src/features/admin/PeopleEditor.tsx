import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ClaimStatus, PeopleEditorProfile, PeopleFeedback } from "@bmt/shared";
import { editorPeopleCatalog, peopleContext, previewPeopleFeedback, publishPeopleDaily, savePeopleProfile } from "@/features/guess-nah/people-api";
import { PeopleFeedbackRow } from "@/features/guess-nah/PeopleFeedbackRow";
import { useAuth } from "@/lib/auth";

const fieldTitles: Record<string, string> = { name: "Public name / identity", known_for: "Known for memberships", specialities: "Speciality memberships", birth_year: "Birth year", gender: "Public gender", tt_connection: "T&T connection" };
const input = "w-full rounded-md border border-line bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red";

function Lines({ label, values, onCommit }: { label: string; values: string[]; onCommit: (values: string[]) => void }) {
  const [text, setText] = useState(values.join("\n"));
  useEffect(() => { setText(values.join("\n")); }, [values]);
  return <label className="block text-xs space-y-1">{label}<textarea className={input} rows={2} value={text}
    onChange={e => setText(e.target.value)} onBlur={() => onCommit(text.split("\n").map(v => v.trim()).filter(Boolean))} /></label>;
}
function blankProfile(): PeopleEditorProfile {
  const id = crypto.randomUUID();
  return { id, name: "", slug: "", aliases: [], vocabulary_version: 2, review_status: "draft", primary_lane: "music", primary_speciality: "soca", known_for: ["music"], specialities: ["soca"],
    birth_year: null, gender: null, biography: "", tt_connection: null, fairness_note: "", revision: 0,
    claims: Object.fromEntries(Object.keys(fieldTitles).map(k => [k, { status: k === "birth_year" || k === "gender" ? "unconfirmed" : "draft", urls: [], note: "" }])),
    clue: { text: "", urls: [], reviewed: false, compatible_ids: [id] } };
}

export default function PeopleEditor() {
  const { user } = useAuth();
  const cache = useQueryClient();
  const catalog = useQuery({ queryKey: ["people-editor", user?.id], queryFn: editorPeopleCatalog, refetchOnWindowFocus: false });
  const context = useQuery({ queryKey: ["people-editor-context", user?.id], queryFn: () => peopleContext(), refetchOnWindowFocus: false });
  const [draft, setDraft] = useState<PeopleEditorProfile | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [dirty, setDirty] = useState(false);
  const [date, setDate] = useState("");
  const [answerId, setAnswerId] = useState("");
  const [guessId, setGuessId] = useState("");
  const [feedback, setFeedback] = useState<PeopleFeedback | null>(null);
  const [rosterIds, setRosterIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const profiles = catalog.data ?? [];
  const vocab = context.data?.vocabulary ?? [];
  const labels = Object.fromEntries(vocab.map(v => [v.value, v.label]));
  const reviewed = profiles.filter(p => p.review_status === "reviewed");
  useEffect(() => { if (!date && context.data) setDate(context.data.business_date); }, [context.data, date]);
  useEffect(() => { if (!draft && profiles[0]) setDraft(structuredClone(profiles[0])); }, [catalog.data]);

  function choose(p: PeopleEditorProfile) {
    if (dirty && !window.confirm("Discard the unsaved profile edits?")) return;
    setDraft(structuredClone(p)); setDirty(false); setMessage("");
  }
  function patch(changes: Partial<PeopleEditorProfile>) {
    setDraft(p => p ? { ...p, ...changes } : p); setDirty(true);
  }
  async function save(status: "draft" | "reviewed") {
    if (!draft || busy) return;
    setBusy(true); setMessage("");
    try {
      const next = await savePeopleProfile({ ...draft, review_status: status });
      setDraft(next); setDirty(false); setMessage(`Saved ${next.name} as ${next.review_status}.`);
      await cache.invalidateQueries({ queryKey: ["people-editor"] });
      await cache.invalidateQueries({ queryKey: ["people-game"] });
    } catch (e) { setMessage(e instanceof Error ? e.message : "Could not save."); }
    finally { setBusy(false); }
  }
  async function publish() {
    if (busy) return;
    setBusy(true); setMessage("");
    try {
      const id = await publishPeopleDaily(date, answerId, rosterIds);
      setMessage(`Published ${date}. Edition ${id} is frozen.`);
      await cache.invalidateQueries({ queryKey: ["people-game"] });
      await cache.invalidateQueries({ queryKey: ["people-editor-context"] });
    } catch (e) { setMessage(e instanceof Error ? e.message : "Could not publish."); }
    finally { setBusy(false); }
  }

  return <div className="space-y-6">
    <p className="text-sm text-ink-muted">People v2 · five comparisons, eight attempts, free clues at 3 / 5 / 7 misses. Review every claim before admission. Draft nominations are available for unranked editor practice.</p>
    {(catalog.error || context.error) && <p role="alert">{String(catalog.error ?? context.error)}</p>}
    {message && <p role="status" className="border border-line rounded-md p-3 text-sm">{message}</p>}
    <div className="grid md:grid-cols-[15rem_1fr] gap-5">
      <aside className="space-y-3">
        <div className="flex items-baseline justify-between"><p className="text-sm">{reviewed.length} reviewed / {profiles.length}</p><button className="underline text-xs" disabled={busy} onClick={() => choose(blankProfile())}>Add person</button></div>
        <label className="block text-xs">Find a profile<input className={input} value={search} onChange={e => setSearch(e.target.value)} /></label>
        <div className="max-h-[32rem] overflow-y-auto border border-line rounded-md divide-y divide-line">
          {profiles.filter(p => p.name.toLowerCase().includes(search.toLowerCase())).map(p => <button key={p.id} disabled={busy} onClick={() => choose(p)}
            className={`w-full text-left px-3 py-2.5 text-sm ${draft?.id === p.id ? "bg-surface-2" : ""}`}>
            {p.name}<span className="block text-[11px] text-ink-muted">{p.review_status} · {labels[p.primary_speciality] ?? p.primary_speciality}</span></button>)}
        </div>
      </aside>
      {draft && <div className="space-y-4">
        <h2 className="text-2xl">{draft.name || "New person"}{dirty && <span className="text-sm text-ink-muted"> · unsaved</span>}</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="text-xs">Display name<input className={input} value={draft.name} onChange={e => patch({ name: e.target.value })} /></label>
          <label className="text-xs">Stable slug<input className={input} value={draft.slug} onChange={e => patch({ slug: e.target.value })} /></label>
        </div>
        <Lines label="Search aliases (one per line; same canonical person)" values={draft.aliases} onCommit={aliases => patch({ aliases })} />
        {(["known_for", "specialities"] as const).map(key => <fieldset key={key} className="border border-line rounded-md p-3">
          <legend className="px-1 text-sm">{key === "known_for" ? "Known for" : "Speciality"} · choose 1–3 substantial careers</legend>
          <div className="grid sm:grid-cols-2 gap-2">
            {vocab.filter(v => v.attribute === (key === "known_for" ? key : "speciality")).map(v => <label key={v.value} className="text-xs flex items-center gap-2">
              <input type="checkbox" checked={draft[key].includes(v.value)} onChange={e => {
                const values = e.target.checked ? [...draft[key], v.value] : draft[key].filter(x => x !== v.value);
                patch({ [key]: values, ...(key === "known_for" ? { primary_lane: values.includes(draft.primary_lane) ? draft.primary_lane : values[0] ?? "" } : { primary_speciality: values.includes(draft.primary_speciality) ? draft.primary_speciality : values[0] ?? "" }) });
              }} />{v.label}</label>)}
          </div>
          <label className="block text-xs mt-3">Primary {key === "known_for" ? "lane" : "speciality"}<select className={input}
            value={key === "known_for" ? draft.primary_lane : draft.primary_speciality} onChange={e => patch(key === "known_for" ? { primary_lane: e.target.value } : { primary_speciality: e.target.value })}>
            {draft[key].map(v => <option key={v} value={v}>{labels[v] ?? v}</option>)}
          </select></label>
        </fieldset>)}
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="text-xs">Birth year (blank = unconfirmed)<input className={input} type="number" min={1800} max={2100} value={draft.birth_year ?? ""} onChange={e => patch({ birth_year: e.target.value ? Number(e.target.value) : null })} /></label>
          <label className="text-xs">Public gender<select className={input} value={draft.gender ?? ""} onChange={e => patch({ gender: e.target.value || null })}>
            <option value="">Unconfirmed</option>{vocab.filter(v => v.attribute === "gender").map(v => <option key={v.value} value={v.value}>{v.label}</option>)}</select></label>
        </div>
        <label className="block text-xs">Documented T&T connection<textarea className={input} value={draft.tt_connection ?? ""} onChange={e => patch({ tt_connection: e.target.value || null })} /></label>
        <label className="block text-xs">Answer biography<textarea className={input} rows={3} value={draft.biography} onChange={e => patch({ biography: e.target.value })} /></label>
        <details className="border border-line rounded-md p-3" open><summary className="cursor-pointer text-sm font-semibold">Evidence for each graded claim</summary>
          <div className="space-y-4 mt-3">{Object.entries(fieldTitles).map(([key, title]) => {
            const claim = draft.claims[key] ?? { status: "draft", urls: [], note: "" };
            const update = (changes: Partial<typeof claim>) => patch({ claims: { ...draft.claims, [key]: { ...claim, ...changes } } });
            return <div key={key} className="border-t border-line pt-3 space-y-2"><div className="flex items-center gap-3"><h3 className="text-sm font-semibold flex-1">{title}</h3>
              <select aria-label={`${title} review status`} className="border border-line bg-surface rounded-md text-xs p-1.5" value={claim.status} onChange={e => update({ status: e.target.value as ClaimStatus })}>
                {["draft", "reviewed", "unconfirmed", "conflicting"].map(s => <option key={s} value={s}>{s}</option>)}</select></div>
              <Lines label="Supporting HTTPS sources (one per line)" values={claim.urls} onCommit={urls => update({ urls })} />
              <label className="block text-xs">What the source supports / unresolved conflict<textarea className={input} rows={2} value={claim.note} onChange={e => update({ note: e.target.value })} /></label>
            </div>;
          })}</div>
        </details>
        <fieldset className="border border-line rounded-md p-3 space-y-3"><legend className="text-sm px-1">Fifth-miss recognition clue</legend>
          <label className="block text-xs">Work, achievement or brand clue<textarea className={input} value={draft.clue.text} onChange={e => patch({ clue: { ...draft.clue, text: e.target.value } })} /></label>
          <Lines label="Clue sources (one HTTPS URL per line)" values={draft.clue.urls} onCommit={urls => patch({ clue: { ...draft.clue, urls } })} />
          <p className="text-xs text-ink-muted">Select all people this clue could describe (maximum 3, including the answer). Review against the whole shortlist.</p>
          <div className="grid sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
            {[...profiles.filter(p => p.id !== draft.id), draft].map(p => <label key={p.id} className="text-xs flex gap-2 items-center"><input type="checkbox" checked={draft.clue.compatible_ids.includes(p.id)}
              onChange={e => patch({ clue: { ...draft.clue, compatible_ids: e.target.checked ? [...draft.clue.compatible_ids, p.id] : draft.clue.compatible_ids.filter(id => id !== p.id) } })} />{p.name || "This person"}</label>)}
          </div>
          <label className="flex gap-2 text-xs"><input type="checkbox" checked={draft.clue.reviewed} onChange={e => patch({ clue: { ...draft.clue, reviewed: e.target.checked } })} />I checked the clue, its sources, and compatible people.</label>
        </fieldset>
        <label className="block text-xs">Fairness review (required for unknown years and identical profiles)<textarea className={input} value={draft.fairness_note} onChange={e => patch({ fairness_note: e.target.value })} /></label>
        <p className="text-xs text-ink-muted">Clue 3 gives the sourced primary lane. Clue 7 gives public-name initials as an accessible text cue. Test the complete path before publishing.</p>
        <div className="flex gap-2"><button className="border border-line rounded-md px-3 py-2 text-sm" disabled={busy} onClick={() => save("draft")}>Save draft</button>
          <button className="btn-primary text-sm" disabled={busy} onClick={() => save("reviewed")}>Save as reviewed</button></div>
      </div>}
    </div>
    <section className="border-t border-line pt-5 space-y-3"><h2 className="text-xl">Compare two people</h2><p className="text-sm text-ink-muted">Uses the same database comparator as practice and dailies. Save edits before comparing.</p>
      <div className="flex flex-wrap gap-2">{(["guess", "answer"] as const).map(key => <label key={key} className="text-xs flex-1">{key === "guess" ? "Guess" : "Answer"}<select className={input} value={key === "guess" ? guessId : answerId} onChange={e => { (key === "guess" ? setGuessId : setAnswerId)(e.target.value); setFeedback(null); }}>
        <option value="">Choose a person</option>{profiles.map(p => <option value={p.id} key={p.id}>{p.name}</option>)}</select></label>)}
        <button className="border border-line rounded-md px-3 py-2 text-sm self-end" disabled={!guessId || !answerId || busy} onClick={async () => {
          setBusy(true); try { setFeedback(await previewPeopleFeedback(guessId, answerId)); } catch(e) { setMessage(String(e)); } finally { setBusy(false); }
        }}>Compare</button></div>
      {feedback && profiles.find(p => p.id === guessId) && <PeopleFeedbackRow person={profiles.find(p => p.id === guessId)!} feedback={feedback} number={1} labels={labels} />}
    </section>
    <section className="border-t border-line pt-5 space-y-3"><h2 className="text-xl">Publish a frozen people daily</h2>
      <p className="text-sm text-ink-muted">Pick 8–64 reviewed people across at least four lanes. Target five in core specialities; maximum seven per primary speciality and five cricket memberships, no lane over half the bank. Publishing freezes names, letter counts, facts, clues and rules. Smaller iconic groups can stay below five.</p>
      <label className="block text-xs">Trinidad date<input type="date" className={input} value={date} min={context.data?.business_date} onChange={e => setDate(e.target.value)} /></label>
      <p className="text-sm">Answer: {profiles.find(p => p.id === answerId)?.name ?? "Choose above"}</p>
      <button className="underline text-sm" onClick={() => setRosterIds(reviewed.map(p => p.id))}>Select all reviewed people</button>
      <div className="grid sm:grid-cols-2 gap-2">{reviewed.map(p => <label key={p.id} className="text-xs flex items-center gap-2"><input type="checkbox" checked={rosterIds.includes(p.id)}
        onChange={e => setRosterIds(ids => e.target.checked ? [...ids, p.id] : ids.filter(id => id !== p.id))} />{p.name}</label>)}</div>
      <button className="btn-primary text-sm" disabled={busy || !date || !rosterIds.includes(answerId)} onClick={publish}>Publish {date || "daily"} · {rosterIds.length} people</button>
    </section>
  </div>;
}
