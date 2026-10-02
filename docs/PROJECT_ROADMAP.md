# BigManThing execution roadmap

Updated: 2026-10-02. Owner: project maintainer, assisted by Codex.
Context: [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md).
Guess design proposal: [GUESS_NAH_DESIGN.md](GUESS_NAH_DESIGN.md).
Status: people-v1 development implementation and database rollout complete; content/recognition and device playtests pending.

The owner permits restarting Guess Nah's content structure. The owner subsequently authorized implementation in the personal development environment. The unranked draft prototype is now available; recognition and source review remain the next product tasks. Engineering safeguards are independent; Where Nah coverage/provider/reliability guidance remains planned. Public documents describe goals and acceptance gates; detailed live security/environment audit evidence belongs in the private project reference.

## Work order and acceptance gates

| Step | Status | Work | Done when |
| --- | --- | --- | --- |
| G0a | Research complete | Compare public guessing-game rules; nominate balanced T&T people; model comparisons and identify uncertain facts | 32-person draft/source sheet, feature-removal model and explicit uncertainty recorded; not an approved seed |
| G0b | Prototype available; human validation pending | Recognition review and small unranked Guess prototype; agree roster, clues and rules before rewrite | Answers recognised by target users; finite/hinted gameplay meets agreed goals; sources/unknowns/aliases/rights reviewed; vocabulary and schema contract approved |
| 0 | Content restore rehearsed; wider recovery runbook pending | Document environment ownership privately; export schema/content/assets and verify recovery | Disposable restore verified and configuration ownership recorded without publishing secrets |
| 1 | People role/history checks, exports, tests/CI implemented; legacy cleanup pending | Permission/identity/history safeguards; production package verification; reviewed seed; lint/tests/CI | Approved role and write boundaries verified; clean setup/build/reset/start passes; meaningful regression checks run |
| 2 | Pending | 30-start imagery/provider comparison across Trinidad and Tobago; movement/difficulty/format choice; attribution and cost | Provider selected from usable content; Tobago/fallback limitations and budget recorded |
| 3 | Pending | Curated Where Nah bank; consistent round states; bounded recovery; reused map objects; server daily/history | Shared published five-round editions; one result per round; device/failure matrix and measured beta goals pass |
| 4 | People v1 implemented in development; reviewed bank pending | Approved Guess v2 profiles/vocabulary; one comparator; finite/hinted immutable editions; source/asset pipeline; separate Ting/folklore/picture prototypes | New vocabulary reviewed before import; editor/server agree; sourced clue paths and assets cleared; no unexplained green collisions; staged migration/restore verified |
| 5 | Pending | BMT design decisions; distinct game previews; compact mobile and accessible flows | Target-user tests resolve major confusion; touch/keyboard/focus/reduced-motion/colour checks pass |
| 6 | Pending | Draw identity, reconnection, lifecycle, bounded input, timing/hints/summaries and persistence | Two/four/twelve-player and host-exit/rejoin flows pass; input/resource boundaries and saved results verified |
| 7 | Pending | Guest upgrade/merge; server history; daily stats/streaks; friend/weekly per-mode boards | Same-day/missed-day/midnight/outage behavior verified; progress survives upgrades/devices; replay cannot improve rank |
| 8 | Pending | Currency ledger, inventory/cosmetics/caps, correction tools, closed pilot and launch runbook | Atomic earn/spend/retry and reversal paths verified; retention/cost reviewed; support and rollback ready |

Integrate UI work into each game iteration. A 25–50-location beta bank, a 32-person Guess shortlist and a 50-player platform pilot are planning targets. Do not pad the roster or map bank to meet a number. Ads, premium currency, paid competitive advantages and multi-server Draw scaling are deferred.

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

## Next product batch

1. Try the 32-person draft in Guess Nah → People → draft practice. Use the [implementation guide](GUESS_NAH_IMPLEMENTATION.md).
2. Review recognition with target users and refine the shortlist within the caps. Compare the no-Gender design during playtests.
3. Complete source, biography, T&T connection and fifth-miss clue reviews, including the six unknown years and Sampson/Ro’dey distinction.
4. Publish a varied reviewed development daily and verify mobile/keyboard, retries, account switches and Trinidad rollover with the running application.

The separate map coverage/provider work and account progression plan remain on the roadmap.

## Decisions

| Topic | State |
| --- | --- |
| Restart Guess structure in development | Owner authorized the researched implementation before human playtests; legacy history retained |
| 32-person shortlist, two cricketers, primary speciality cap three | Proposal; recognition decides admission |
| Four fields; eight attempts; hints after 3/5/7 misses | Implemented as people-v1; human playtesting pending |
| Unknown neutral; genuine career overlap partial | Implemented/tested people-v1 contract |
| People, folklore and Ting use distinct profiles | Recommendation |
| New vocabulary precedes imports | Established implementation constraint |
| Preserve monorepo and Socket.IO authority | Recommendation |
| Curated provider selected from actual T&T coverage | Provisional |
| Freeze daily editions and use Trinidad business dates | Implemented/tested people-v1 contract |
| Guest-preserving history; completion streak; friend/weekly boards | Recommendation |
| One currency, idempotent ledger and cosmetics | Recommendation; amounts/prices remain experiments |
| Ads, paid advantage, broad global ranking | Deferred |

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

Next action: playtest draft practice and complete content reviews, then publish the first varied development daily. Do not equate validated code with validated recognition or fun.
