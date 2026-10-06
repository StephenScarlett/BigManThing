# BigManThing execution roadmap

Updated: 2026-10-06. Owner: project maintainer, assisted by Codex.
Context: [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md).
Guess design proposal: [GUESS_NAH_DESIGN.md](GUESS_NAH_DESIGN.md).
Latest expansion research: [GUESS_NAH_EXPANSION.md](GUESS_NAH_EXPANSION.md).
Progression research/pilot: [REWARDS_AND_ROOMS.md](REWARDS_AND_ROOMS.md). Asset contract: [AVATAR_ROOM_ASSET_GUIDE.md](AVATAR_ROOM_ASSET_GUIDE.md).
Status: people-v2/64-draft expansion and earned-roll/room foundation implemented and applied to development; factual/clue review, final art, device playtests, account linking and competitive/social progression remain open.

The owner authorised the expanded Guess implementation and now wants play/streak/leaderboard rewards as rolls, a customisable character/isometric room, coin-based side-game unlocks and possible gacha powers. Development implements Letters with 64 draft nominees and a first earned-only collection/room/arcade loop. Source/recognition review remains necessary; no people daily is published. Existing v1 history is preserved. The new direction supersedes earlier one-currency/cosmetics-only recommendations; future powers can apply to unranked side activities while main-game ranked results remain independent. Where Nah provider/coverage guidance remains planned. Detailed live audit evidence belongs in the private reference.

## Work order and acceptance gates

| Step | Status | Work | Done when |
| --- | --- | --- | --- |
| G0a | Initial and expansion research complete | Compare guessing games, source T&T nominations, model fields and uncertain facts | Initial 32 plus 32 additions, nine core groups at five-plus, fifth-column alternatives and reproducible model recorded; not an approved seed |
| G0b | Five-column expanded prototype available; human review pending | Recognition review, stable larger roster and comparison usefulness | Target users recognise answers; finite/hinted gameplay works; public labels, unknowns, overlap, aliases, clues and rights reviewed |
| 0 | Content restore rehearsed; wider recovery runbook pending | Document environment ownership privately; export schema/content/assets and verify recovery | Disposable restore verified and configuration ownership recorded without publishing secrets |
| 1 | People role/history checks, exports, tests/CI implemented; legacy cleanup pending | Permission/identity/history safeguards; production package verification; reviewed seed; lint/tests/CI | Approved role and write boundaries verified; clean setup/build/reset/start passes; meaningful regression checks run |
| 2 | Pending | 30-start imagery/provider comparison across Trinidad and Tobago; movement/difficulty/format choice; attribution and cost | Provider selected from usable content; Tobago/fallback limitations and budget recorded |
| 3 | Pending | Curated Where Nah bank; consistent round states; bounded recovery; reused map objects; server daily/history | Shared published five-round editions; one result per round; device/failure matrix and measured beta goals pass |
| 4 | People v2 applied; 64 drafts; reviewed bank pending | Versioned profiles/vocabulary; finite/hinted immutable editions; source/asset pipeline; separate Ting/folklore/picture prototypes | Editor/server agree; sourced clue paths and assets cleared; no unexplained green collisions; staged migration/restore verified |
| 5 | Pending | BMT design decisions; distinct game previews; compact mobile and accessible flows | Target-user tests resolve major confusion; touch/keyboard/focus/reduced-motion/colour checks pass |
| 6 | Pending | Draw identity, reconnection, lifecycle, bounded input, timing/hints/summaries and persistence | Two/four/twelve-player and host-exit/rejoin flows pass; input/resource boundaries and saved results verified |
| 7 | Completion streak foundation implemented; account/boards pending | Guest upgrade/merge; server history; daily stats/streaks; friend/weekly per-mode boards | Same-day/missed-day/midnight/outage behavior verified; progress survives upgrades/devices; replay cannot improve rank |
| 8 | Earned-roll economy, inventory, room and two arcade prototypes implemented | Rates/guarantees, final art, correction tools, side-game verification, closed pilot and launch runbook | Atomic earn/spend/retry and reversal paths verified; retention/cost reviewed; support and rollback ready |

Integrate UI work into each iteration. A 25–50-location beta bank, the 64-person draft Guess pool and a 50-player platform pilot are planning targets. Do not pad rosters/maps to meet numbers. Smaller iconic specialities may stay below five. Rolls/prices/guarantees are hypotheses; paid rolls/trading are not implemented. Unranked companion powers, friend visits and further activities are staged work. Multi-server Draw scaling remains deferred.

## Verification register

These IDs preserve continuity with the detailed private audit. Entries remain open until their acceptance gate is demonstrated. They describe verification work without repeating live vulnerability details.

| IDs | Priority | Verification objective |
| --- | --- | --- |
| SEC-01/SEC-02 | P0 before public progression | Verify administrative authorization and approved history/result write boundaries |
| RUN-01 | P1 | Prove production package exports and clean server startup |
| ENV-01 | P1 | Verify current-schema seed, disposable reset and protected migration/restore path |
| QA-01 | P1 | Make meaningful lint/tests/CI checks usable |
| DAY-01 | P1 | Prove Trinidad business midnight, publication window, rollover and no-puzzle handling |
| GUESS-01 | P1 | Verify atomic submissions, duplicate handling and authoritative outcomes |
| GUESS-02 | P1 | Unify comparator and versioned rules across server, editor and client preview |
| GUESS-03 | P1 | Verify unknowns, dates, ordered values and collision semantics |
| GUESS-04 | P1 product | Validate recognisable variety and finite/hinted deduction against the cricket-heavy starting pool |
| CONT-01 | P1 before content publication | Review uncertain facts, aliases, clue discrimination, recognition and image rights |
| HIST-01/STREAK-01 | P1 | Verify account-scoped history and correct daily participation/streak behavior |
| MAP-01–04 | P1 | Verify curated coverage, bounded recovery, consistent transitions, readiness and resource lifecycle |
| DRAW-01–03 | P1 | Verify stable identities, event bounds, reconnection, timing/hints/summaries and persistence |
| UI-01 | P1/P2 | Verify mobile layout and accessible touch/keyboard/focus/feedback |
| REWARD-01 | P1; foundation tested | Verify automatic completion rewards, atomic earn/spend, retry/concurrency and correction tools |
| HOME-01 | P1; server checks implemented | Verify owned quantities, room geometry/revisions, avatar composition, actual devices and asset fallback |
| GACHA-01 | P1 pilot | Verify odds/guarantees/duplicates, coin choices and collection pacing using real play |
| SIDE-01 | P1 before more rewarded games | Verify daily caps, round/equipment snapshots and shared side-activity reward budget |

## Next product batch

1. Try the implemented five-column [expanded draft](GUESS_NAH_IMPLEMENTATION.md), My lime and `/room/demo`; complete real phone/keyboard testing. Evaluate recognition and whether Letters feels helpful.
2. Review retained/new claims, 19 unknown years, substantial career overlaps, KyleBoss's identity/work evidence and the two remaining profile collisions. Finish sourced biographies/clues and publish a varied development daily so the real earn loop can run.
3. Create one master character/starter-room asset batch from [the asset guide](AVATAR_ROOM_ASSET_GUIDE.md); validate geometry/composition before expanding the catalogue. Current eight-item collection families are too small for sustained progression.
4. Implement/test guest linking without changing account identity, outage grace and reward corrections. Then run a closed economy pilot; select the next side activity and prototype companion sidegrades from [the rewards plan](REWARDS_AND_ROOMS.md).
5. Add per-mode weekly/friend boards and bounded roll grants only after their results are server-owned. Map/Draw authority remains prerequisite work.

The separate map coverage/provider work and account progression plan remain on the roadmap.

## Decisions

| Topic | State |
| --- | --- |
| Restart Guess structure in development | Owner authorized the researched implementation before human playtests; legacy history retained |
| Initial 32-person shortlist, two cricketers, primary cap three | Implemented as development v1; earlier editorial recommendation revised by latest owner request |
| Expanded 64 nominees; five-plus in nine core specialities; primary cap seven/cricket five | Applied as people-v2 drafts; recognition/source review pending |
| Fifth column: Letters; career era as thematic alternative | Letters implemented for new editions; alternative still research, old editions unchanged |
| Broad Comedy; genuine careers across lanes; up to three major specialities | Implemented vocabulary/profile version two |
| Four fields; eight attempts; hints after 3/5/7 misses | Implemented as people-v1; human playtesting pending |
| Unknown neutral; genuine career overlap partial | Implemented/tested people-v1 contract |
| People, folklore and Ting use distinct profiles | Recommendation |
| New vocabulary precedes imports | Established implementation constraint |
| Preserve monorepo and Socket.IO authority | Recommendation |
| Curated provider selected from actual T&T coverage | Provisional |
| Freeze daily editions and use Trinidad business dates | Implemented/tested people-v1 contract |
| Guest-preserving history; completion streak; friend/weekly boards | History/streak foundations implemented; linking/boards still planned |
| Rolls plus Lime Coins; idempotent ledger; character/room collections | Owner direction implemented as a development pilot; amounts remain experiments |
| Permanent coin-based side-game unlock; unranked companion powers | Pan unlock implemented; companion/equipment system planned |
| Paid rolls, trading, broad global ranking | Outside the current implementation; revisit if owner requests |

## Update protocol and work log

After authorized work, record date, affected IDs, PR/commit, validation, remaining risks and next action. Preserve latest owner steering. Keep detailed environment/security evidence private and recheck live state/provider terms before rollout.

| Date | Work | Validation | Next action |
| --- | --- | --- | --- |
| 2026-10-02 | Initial project audit and roadmap | Read-only review; detailed checks retained in private project reference | Engineering safeguards and provider coverage work |
| 2026-10-02 | Guess roster/rule research and model | 32 nominations; two cricketers; primary speciality cap three; six withheld years; actual legacy comparator matched on 132 nonidentity pairs | G0b recognition review and unranked prototype before approving rewrite |

The draft model's optimal expected mean is 2.469 guesses and 3.500 without Born, assuming complete catalogue knowledge. These are not human test results. The original research changed documentation only. The later owner-authorized development implementation is recorded below.

### People v1 implementation — 2 October 2026

Development migrations `20261002203132_guess_people_v2` and `20261002203139_guess_people_draft_roster` are applied. The implementation branch is `feat/guess-nah-v2`. It adds typed facts/claim review, versioned vocabulary, a single SQL comparator, review editor, eight-attempt practice/dailies, free clues, canonical duplicate handling and frozen editions. Legacy identities and historical records remain intact. No people daily is published and all 32 imported nominees are drafts.

Passed: 14 regression checks; typecheck; build; disposable content restore; hosted authenticated-role/retry/reveal checks; concurrent same-guess submissions storing one attempt; compiled shared-package startup and fallback `/health`. Local and applied migration versions are aligned. CI is configured; this is not a claim that a remote workflow has completed. Legacy lint and Draw lifecycle coverage remain open; browser visual/device testing was unavailable. See the implementation guide for details.

GUESS-01/02/03 and DAY-01 now have implementation/test evidence for people-v1. RUN-01 exports/startup are corrected. GUESS-04/CONT-01/UI-01 await human/content/device review. Administrative role-edit checks pass; remaining cross-mode permission/history and account/streak checks remain open. Where, Draw and reward milestones are unchanged in scope.

Implementation PR [#2](https://github.com/StephenScarlett/BigManThing/pull/2) was merged at `c5af3151013448eee8df3f799c1d47e24f28b762`; [CI run 37065479911](https://github.com/StephenScarlett/BigManThing/actions/runs/37065479911) passed. This updates the earlier statement that remote CI had not yet been observed.

### Expanded roster research — 2 October 2026

Affected: G0a/G0b, GUESS-03/04, CONT-01 and UI-01. The owner requested a fifth column and about five popular people per speciality. Added the sourced 32-addition nomination file, 64-person group proposal, comparison alternatives and reproducible standard-library Python model. KyleBoss is conditional with no verified legal name/year/hometown; Levi has official UEFA nationality/year evidence. Nineteen model years are withheld. Broad Comedy and genuine multi-career profiles avoid forcing creators into false categories. No content was approved/imported and no database/gameplay changes were made.

Validation: 64 unique canonical nominations; primary memberships and HTTPS sources checked; sourced-year pointers present for every supplied new year; accent/punctuation/count examples and neutral/directional comparator invariants checked; model regenerated. On the same expanded pool, Letters changes fully informed optimal mean from 2.844 to 2.531 and average candidates after a wrong opening from 14.962 to 9.886 (about 34% fewer). Two identical stored profiles remain; human recognition/fun are not modelled. Existing source review and free clues remain necessary.

Next action: expanded unranked four/five-column comparison, followed by reviewed content and an additive people-v2 implementation. Do not equate solver statistics with human fun or silently replace v1 rules.

### People v2 and My lime — 6 October 2026

Affected: G0b, GUESS-02/03/04, CONT-01, HIST-01/STREAK-01, REWARD-01, HOME-01, GACHA-01 and SIDE-01. Branch: `feat/guess-v2-room-rewards`. Applied development migrations: `20261006144857_guess_people_expansion_v2` and `20261006144912_room_rewards_foundation`; local/history filenames align.

Implemented 64 draft people, five comparisons, frozen name counts, current taxonomy/caps, Kes/aliases and version dispatch. Existing four editions/four sessions/thirteen attempts retain exact before/after fingerprints, and the account count remains one. There are zero reviewed profiles, 19 unknown years and no people daily. Source/clue and human recognition review remain open.

My lime implements starter identity/room items, server-owned Rolls/Lime Coins, two collection pools, explicit odds, persistent 10/40 guarantees, duplicate coins, direct buys, ownership/geometry/revision-checked room saves, shared completion-streak bonuses and atomic published Guess rewards. Pan Memory is a permanently unlocked daily; Coconut Catch is local free practice without currency claims. Final visuals are procedural placeholders; `/room/demo` is isolated sample state.

Validation: 28 automated checks, typecheck/build, a disposable full migration reset, hosted authenticated-role/retry/room/guarantee/Pan assertions, and concurrent same-request rolls storing one receipt/debit. Hosted fixtures were rolled back or removed. Security/performance advisors show no new warning/error class from these additions; seven new private-table default-deny INFO notices are intentional, and new indexes are covered. The existing bundle warning/lint/cross-mode work remain. Browser access to local preview and Chromium installation failed, so no real device/visual playtest is claimed. Frontend code is delivered through the branch/PR; no hosting release occurred.

Research: official Habbo/Highrise/Pocket Camp/Pony Town references and original Roblox experiences, including 2026 Highrise guarantee documentation and September 2026 Adopt Me daily rewards. The exact/seeded economy model shows a first Legendary mean of 24.944 focused pulls and 90.848% completion of an eight-item family by 40 pulls. Numbers model supply, not retention. The [progression report](REWARDS_AND_ROOMS.md) stages fishing/gardening/fashion, companion sidegrades, account linking, weekly roll grants and room sharing. The [asset guide](AVATAR_ROOM_ASSET_GUIDE.md) defines sizes, layers, pivots, item IDs and a separate-chat brief.

Next: real device/draft playtest, sourced review/publish of the first varied people daily, and one master-rig/starter-room art batch. Then complete guest linking/corrections/outage behavior and a closed economy pilot before more rewarded games or boards.
