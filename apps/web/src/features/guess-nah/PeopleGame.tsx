import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PEOPLE_MAX_ATTEMPTS, peopleFeedbackToEmoji, type PeopleCandidate, type PeopleGameState } from "@bmt/shared";
import { useAuth } from "@/lib/auth";
import { ensurePeopleSession, peopleContext, startPeoplePractice, submitPeopleGuess } from "./people-api";
import { PeopleFeedbackRow } from "./PeopleFeedbackRow";
import { PeopleGuessInput } from "./PeopleGuessInput";
import { DailyReward } from "@/features/home/DailyReward";

export function PeopleGame() {
  const { user, profile, loading } = useAuth();
  const [selection, setSelection] = useState<{ user: string; edition: string | null } | null>(null);
  const editionId = selection?.user === user?.id ? selection?.edition ?? null : null;
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const pending = useRef(false);
  const activeUser = useRef(user?.id);
  activeUser.current = user?.id;
  const queryClient = useQueryClient();
  const queryKey = ["people-game", user?.id, editionId, preview];
  const query = useQuery({ queryKey, queryFn: () => peopleContext(editionId, preview), enabled: !!user, refetchInterval: 60000 });
  const game = query.data;
  const labels = useMemo(() => Object.fromEntries((game?.vocabulary ?? []).map(v => [v.value, v.label])), [game?.vocabulary]);
  const byId = useMemo(() => new Map((game?.catalog ?? []).map(p => [p.id, p])), [game?.catalog]);
  const used = useMemo(() => new Set((game?.attempts ?? []).map(a => a.guess_id)), [game?.attempts]);

  useEffect(() => {
    if (!user && !loading) ensurePeopleSession().catch(e => setError(e instanceof Error ? e.message : "Could not connect. Please retry."));
  }, [user, loading]);
  useEffect(() => {
    if (!user) return;
    let saved: string | null = null;
    try { saved = sessionStorage.getItem(`bmt:people-practice:${user.id}`); } catch { /* Optional convenience, never authoritative. */ }
    setSelection({ user: user.id, edition: saved }); setPreview(false); setError(null);
  }, [user?.id]);

  function selectEdition(id: string | null, uid: string) {
    setSelection({ user: uid, edition: id });
    try {
      const key = `bmt:people-practice:${uid}`;
      if (id) sessionStorage.setItem(key, id); else sessionStorage.removeItem(key);
    } catch { /* Gameplay and history do not depend on browser storage. */ }
  }
  async function practice() {
    if (pending.current || !user) return;
    const uid = user.id;
    pending.current = true; setBusy(true); setError(null); setCopied(false);
    try {
      const next = await startPeoplePractice(preview);
      if (activeUser.current !== uid) return;
      queryClient.setQueryData(["people-game", uid, next.edition?.id ?? null, preview], next);
      selectEdition(next.edition?.id ?? null, uid);
    } catch (e) { if (activeUser.current === uid) setError(e instanceof Error ? e.message : "Could not start practice."); }
    finally { pending.current = false; setBusy(false); }
  }
  async function guess(person: PeopleCandidate) {
    if (!game?.edition || !user || pending.current || game.status !== "playing" || game.expired || used.has(person.id)) return;
    const uid = user.id;
    pending.current = true; setBusy(true); setError(null);
    try {
      const next = await submitPeopleGuess(game.edition.id, person.id);
      if (activeUser.current === uid) {
        queryClient.setQueryData(queryKey, next);
        if (next.edition?.kind==="daily"&&next.status!=="playing") void queryClient.invalidateQueries({queryKey:["home",uid]});
      }
    } catch (e) {
      if (activeUser.current === uid) {
        setError(e instanceof Error ? e.message : "Could not send that guess. Please retry.");
        await query.refetch(); // Restore history if a committed response was lost.
      }
    } finally { pending.current = false; setBusy(false); }
  }
  async function share(state: PeopleGameState) {
    const title = state.edition?.kind === "daily" ? state.edition.date : "Practice";
    const text = `Guess Nah · ${title}${state.edition?.is_preview ? " · Draft preview" : ""}\n${state.status === "won" ? state.attempts.length : "X"}/${PEOPLE_MAX_ATTEMPTS}\n${state.attempts.map(a => peopleFeedbackToEmoji(a.feedback)).join("\n")}`;
    try { await navigator.clipboard.writeText(text); setCopied(true); }
    catch { setError("Copy wasn't available. You can select and copy the grid below."); }
  }

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <button className="border border-line rounded-md px-3 py-2" aria-pressed={!editionId} disabled={busy || !user}
        onClick={() => { if (user) selectEdition(null, user.id); setCopied(false); setError(null); }}>Daily</button>
      <button className="border border-line rounded-md px-3 py-2" onClick={practice} disabled={busy || !user || (!preview && (game?.catalog.length ?? 0) < 2)}>New practice</button>
      {profile?.is_admin && <label className="flex items-center gap-2 ml-auto text-xs"><input type="checkbox" checked={preview} disabled={busy}
        onChange={e => setPreview(e.target.checked)} />Use draft roster in new practice</label>}
    </div>
    {(error || query.error) && <div role="alert" className="border border-brand-red/40 rounded-md p-3 text-sm space-y-2">
      <p>{error ?? (query.error instanceof Error ? query.error.message : "Could not load the game.")}</p>
      <button className="underline" onClick={async () => { setError(null); try { await ensurePeopleSession(); await query.refetch(); } catch(e) { setError(e instanceof Error ? e.message : "Please retry."); } }}>Retry</button>
    </div>}
    {(loading || (!user && !error) || query.isLoading) && <p className="text-ink-muted text-sm">Connecting to the game…</p>}
    {game && <>
      {game.edition?.is_preview && <p className="border-l-2 border-amber-500 pl-3 text-sm">Draft preview · proposed facts and clues still need review. This round is unranked; some fifth-miss clues are unfinished.</p>}
      {!game.edition && <div className="border border-line rounded-md p-5 space-y-2">
        <h2 className="text-xl">No people daily published yet</h2>
        <p className="text-sm text-ink-muted">The answer bank is being reviewed. Practice will open as people and their clues are ready.</p>
        {profile?.is_admin && <p className="text-sm">Use draft practice to test the shortlist, then review profiles in the People editor.</p>}
      </div>}
      {game.edition && <>
        <div className="flex items-baseline justify-between text-sm gap-3">
          <p>{game.edition.kind === "daily" ? `${game.edition.date} · Trinidad daily` : "Practice · unranked"}</p>
          <p className="tabular-nums font-semibold">{game.attempts.length} / {PEOPLE_MAX_ATTEMPTS}</p>
        </div>
        {game.expired && <p role="status" className="text-sm text-ink-muted">This edition has ended. Choose Daily for the current puzzle.</p>}
        <PeopleGuessInput catalog={game.catalog} used={used} labels={labels} disabled={busy || game.status !== "playing" || game.expired} onPick={guess} />
        <details className="text-sm border-y border-line py-3">
          <summary className="cursor-pointer font-semibold">How the clues work</summary>
          <p className="text-ink-muted mt-2">Eight guesses. ✓ means the same known values; ≈ means a shared career or speciality. Birth arrows point to the answer's year, with a near marker within five years. ? means unconfirmed on either side. A win comes from naming the person.</p>
          {game.edition.rules_version === "people-v2" && <p className="text-ink-muted mt-2">Letters counts the name displayed here, ignoring spaces, punctuation and accents. ↑ means the answer's name is longer; ↓ means shorter. Aliases use the same displayed-name count.</p>}
          <p className="text-ink-muted mt-2">Free clues unlock after 3, 5, and 7 wrong guesses. Name variants count as the same person. You can browse the roster below.</p>
        </details>
        <div aria-live="polite" aria-atomic="false" className="space-y-3">
          {game.hints.map(h => <p key={h.unlock_after} className="border-l-2 border-brand-red pl-3 py-1 text-sm"><span className="text-ink-muted">Clue {h.unlock_after} · </span>{h.text}</p>)}
          {busy && <p className="text-ink-muted text-xs" role="status">Sending…</p>}
          {game.status !== "playing" && <p className="font-semibold">{game.status === "won" ? "Yuh get it!" : "Eight guesses used. Here's who it was."}</p>}
        </div>
        <div className="space-y-4">
          {game.attempts.map(a => { const person = byId.get(a.guess_id); return person ? <PeopleFeedbackRow key={a.number} person={person} feedback={a.feedback} number={a.number} labels={labels} /> : null; })}
        </div>
        {game.answer && <section className="border-t border-line pt-5 space-y-3">
          <h2 className="text-2xl">{game.answer.name}</h2>
          <p className="text-sm">{game.answer.biography || "This biography is still being reviewed."}</p>
          {game.answer.tt_connection && <p className="text-sm text-ink-muted">{game.answer.tt_connection}</p>}
          {game.answer.sources.length > 0 && <details className="text-sm"><summary className="cursor-pointer">Sources</summary><ul className="mt-2 space-y-1">
            {game.answer.sources.map(url => <li key={url}><a href={url} target="_blank" rel="noopener noreferrer" className="underline break-all">{url.replace(/^https:\/\//, "").split("/")[0]}</a></li>)}
          </ul></details>}
          <pre className="text-lg leading-tight w-fit select-all" aria-label="Share grid">{game.attempts.map(a => peopleFeedbackToEmoji(a.feedback)).join("\n")}</pre>
          <button className="btn-primary text-sm" onClick={() => share(game)}>{copied ? "Copied" : "Copy results"}</button>
          {game.edition?.kind==="daily"&&!game.edition.is_preview&&!game.expired&&game.edition.date===game.business_date&&<DailyReward edition={game.edition.id}/>}
        </section>}
        <details className="border-t border-line pt-3 text-sm">
          <summary className="cursor-pointer">Who's in this edition? ({game.catalog.length})</summary>
          <ul className="grid sm:grid-cols-2 gap-2 mt-3">
            {game.catalog.map(p => <li key={p.id} className="border border-line rounded-md p-2.5"><span className="font-semibold">{p.name}</span>{p.letters != null && <span className="ml-2 text-xs text-ink-muted">{p.letters} letters</span>}
              <p className="text-xs text-ink-muted mt-1">{p.specialities.map(v => labels[v] ?? v).join(" + ")} · Born {p.birth_year ?? "unconfirmed"}</p></li>)}
          </ul>
        </details>
      </>}
    </>}
  </div>;
}
