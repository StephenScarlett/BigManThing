# Guess Nah people v1 — development implementation

Updated 2 October 2026. The owner authorized implementing the researched design in the development application before human playtesting. Supabase migrations `20261002203132_guess_people_v2` and `20261002203139_guess_people_draft_roster` are applied. The frontend change is delivered through the implementation branch and PR.

## Try the prototype

1. Check out `feat/guess-nah-v2`, install with `pnpm install --frozen-lockfile`, and provide the web client's Supabase URL and public key through its normal local configuration.
2. Run `pnpm dev:web`. Sign in with the project's editor account.
3. Open Guess Nah → People. Check **Use draft roster in new practice**, then choose **New practice**.
4. Test the names, aliases, four comparisons and eight-attempt limit. Draft practice is unranked and clearly labelled. Some fifth-miss clues and biographies are unfinished.
5. Open Admin → **People editor** to source and review profiles. Public practice uses reviewed people; dailies require a reviewed, balanced roster.

Guest play uses Supabase authenticated anonymous accounts. Anonymous sign-ins must be enabled in the development Auth configuration. A browser-generated identity header is not accepted by the people game. Guest conversion, leaderboards, streaks and currency remain later roadmap work.

## Content and publication

The new catalogue contains 32 draft nominations, 29 version-one vocabulary values, two cricketers, and five links to existing legacy entities. Six birth years remain null: Kees, Learie Joseph, Certified Sampson, Ro’dey, Ian Alleyne and Beryl McBurnie. Other years, gender labels and memberships remain proposed facts until their per-field reviews are complete. The draft JSON records source leads for 31 nominations; Learie Joseph still needs reliable biography/work sources. Four initial work/brand clues have research sources but await editorial review.

Canonical names and search aliases live in `guess_people`; typed facts and claim reviews in `guess_person_facts`; editorial memberships and clues in `guess_person_profiles`; permission records in `guess_person_assets`; controlled labels in `guess_people_vocabulary`. The asset register is empty. This implementation uses text clues and public-name initials, without importing uncleared portraits.

For admission, review identity, career memberships, specialities and the T&T connection against supporting HTTPS sources. Review each supplied birth year and gender, or explicitly document an unconfirmed/conflicting state. Add a sourced biography and fifth-miss clue. Review every person compatible with that clue: at most three, including the answer. Record the fair clue path for unknown years. Identical profiles also require distinct recognition clues and fairness notes.

Publishing checks 8–64 unique reviewed people, at least four primary lanes, no lane over half the roster, at most two cricket memberships and three people per primary speciality. These are development safeguards; the 32-person target and human recognition goals remain hypotheses. Editorial compatibility counts require human judgment; code cannot prove that a clue is culturally recognisable or its source supports the wording.

Choose a Trinidad date and an answer in the roster. Publication freezes all names, aliases, facts, memberships, clue text, source references, profile revisions, vocabulary labels and the `people-v1` rule version. There is one people daily per date, and no overwrite operation. Profile edits affect later editions. All 32 imported profiles are drafts, and no daily was published during rollout.

## Rules and authority

`private.guess_people_feedback_v1` is the single comparator used by editor preview, practice and daily submissions. The client displays server results; it does not recalculate or turn unknown cells green after a win.

- Known for / Speciality: same sets match, actual membership overlap is partial, disjoint values differ. Empty/unknown comparisons are neutral.
- Born: verified equal year matches; otherwise the direction points to the answer's earlier/later year. A difference of 1–5 years is near. Either unknown year is neutral.
- Gender: same documented value matches, different known values differ, either unknown is neutral.
- Win: canonical person ID, independent of whether all four comparisons are known.
- Attempts: eight. Retrying a canonical guess returns the existing server state and consumes no further attempt. Guessing outside the frozen roster is rejected.
- Clues: primary lane after three misses, reviewed work/achievement/brand after five, public-name initials after seven. Draft practice can contain unfinished clues.

Answers, editions, sessions and attempts live in the unexposed `private` schema. Public RPC wrappers invoke authenticated entrypoints with identity/role checks. Private tables have RLS, no client grants and intentional default-deny access. Session row locks serialize a player's submissions; attempts and completion are one transaction. Account presentation fields remain editable through the existing profile flow, with roles assigned by the server.

`America/Port_of_Spain` determines the business date and the end of a daily. Future editions cannot be played, expired editions cannot accept guesses, and history is restored from the authenticated player's server state. Browser storage only remembers a practice selection.

## Validation and operational limits

Passed: 14 automated tests (9 database integration, 4 web feedback/search/recovery, 1 compiled shared-export test), workspace typecheck and build, hosted authenticated-role/retry/answer checks, and two concurrent hosted submissions of the same guess resulting in one stored attempt. The concurrency fixture was removed and the transactional smoke fixture rolled back.

Rehearsed a disposable restore of all 12 existing entities and 69 options, then applied the additive migrations. Entity content fingerprints remained identical. Hosted verification confirms unchanged legacy entities, puzzle history, guesses, results and profile count. Existing Draw/Ting content and history are retained. The superseded reset seed was removed; current draft content is versioned in migrations and `packages/db/content/people-draft.json`.

`@bmt/shared` now builds JavaScript exports. The compiled game server starts and answers `/health` with the fallback word bank when credentials are absent. This is a package/startup check, not a hosted Draw-auth integration test. GitHub Actions checks typecheck, tests and build. Legacy lint configuration is still missing ESLint; Draw lifecycle tests remain separate roadmap work. The Vite bundle-size warning remains.

Headless-browser installation was unavailable in this environment, so touch/keyboard browser playtesting and visual device checks are still pending. Do not describe the prototype as bug-free or its fun/recognition targets as achieved. No frontend hosting release was performed. No separate Edge Function deployment is needed for people v1 because its authority is in the database; the legacy Ting endpoint is retained.

## Continue from here

Playtest the 32-person draft and the unknown-year clue paths. Replace weak nominees without padding quotas. Complete per-field and recognition-clue reviews, publish a varied development daily, then validate across devices and Trinidad midnight. Follow with the separate picture/folklore packs, map coverage work and account progression milestones.

Sources for implementation: [Supabase functions](https://supabase.com/docs/guides/database/functions), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [anonymous accounts](https://supabase.com/docs/guides/auth/auth-anonymous), [PGlite](https://pglite.dev/docs/). Research nominations and limitations: [GUESS_NAH_DESIGN.md](GUESS_NAH_DESIGN.md).
