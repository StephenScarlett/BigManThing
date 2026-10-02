# BigManThing execution roadmap

Updated 2026-10-02. Owner: project maintainer, assisted by Codex.
Context and constraints: [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md).
Status: repository/Supabase audit and research completed; implementation pending.
This is the current working plan. BIGMANTHING_PLAN.md is historical product intent.

## Work order and acceptance gates

| Step | Status | Work | Done when |
| --- | --- | --- | --- |
| 0 | Pending | Protect healthy Supabase state; export schema/content/vocabulary/assets; identify live frontend/game-server and environment ownership | Disposable restore verified; actual deployment and configuration documented without secrets |
| 1 | Pending | Privileged-profile/result protections, verified guest identity, shared package production build, current-schema seed, lint/tests/CI | Ordinary user cannot promote or erase ranked history; clean setup/build/server start pass; critical regressions covered |
| 2 | Pending | 30-start provider audit across Trinidad and Tobago; movement/difficulty/format decision; attribution and cost model | Provider selected from usable imagery; Tobago/fallback limitations and budget recorded |
| 3 | Pending | Curated Where Nah locations, guarded states, bounded recovery, reused map objects, server daily and results | Same published five-round edition for all; no duplicate results or infinite retries; failure/device matrix and measured beta goals pass |
| 4 | Pending | Review current 12 people; clarify taxonomy; one comparator; source/rights pipeline; Dem/Ting expansion; picture prototype | Valid existing tags, sourced facts and permissions; no unexplained green collisions; server and admin rules agree |
| 5 | Pending | BMT design decisions, distinct previews, mobile Guess/Where/Draw flows, accessible interaction | Five target-user tests resolve major confusion; touch/keyboard/focus/reduced-motion/color checks pass |
| 6 | Pending | Draw stable identity, room cleanup, reconnect, validated/bounded input, hints/timing/summary correction, persistence | Two/four/twelve-player, host exit, rejoin and malformed-input flows pass; room limits and result integrity proven |
| 7 | Pending | Guest upgrade/merge, server history, daily stats/streaks, friend/weekly per-mode boards | Same-day/missed-day/midnight/outage cases pass; progress preserved across upgrade/devices; replay cannot improve rank |
| 8 | Pending | Idempotent currency ledger, inventory/cosmetics/caps, purchase and reversal tools, closed pilot and launch runbook | Atomic earn/spend and retries verified; costs/retention reviewed; correction, support and rollback paths ready |

Work on UI within each game iteration; step 5 is the cross-product verification gate.
A 25–50-location beta bank, 20-entry Dem/Ting expansion packs and a 50-player pilot are planning targets, dependent on coverage and editorial review.
Ads, premium currency, paid competitive advantages and multi-server Draw scaling are deferred.

## Defect register

All entries below are open. “Live” means policy/data inspection in the healthy project; “reproduced” means local source-level exercise; others are source review.

| ID | Priority | Issue | Evidence / first verification |
| --- | --- | --- | --- |
| SEC-01 | P0 | Owner can update profiles.is_admin | Live UPDATE privilege, owner RLS, no blocking trigger. Verify a regular user cannot promote themselves after fix |
| SEC-02 | P0 before rewards | Own attempts/results deletable; legacy header identity trusted | Live policies + Edge source. Client result deletion must be denied; resets privileged and audited |
| RUN-01 | P1 | Built server cannot resolve @bmt/shared source imports | Local production startup fails. Build/export shared JS or bundle server and smoke-test fresh start |
| ENV-01 | P1 | Seed/schema drift and destructive historical migrations | Old scalar seed against final array schema. Prove disposable reset; never replay truncations on live data |
| QA-01 | P1 | Missing lint/tests/CI | Advertised commands fail/no tests. Add only meaningful rule, security and state regressions |
| DAY-01 | P1 | UTC date instead of Trinidad midnight; no daily job or midnight refresh | Date/query source and missing job. Test 23:59/00:00 AST, no-puzzle state and small-pool exhaustion |
| GUESS-01 | P1 | Non-atomic attempts/stats; future publication window unenforced | Edge source. Concurrent duplicate requests create one valid outcome |
| GUESS-02 | P1 | Shared/Edge rule duplication; hardcoded ordering/groups | Admin metadata differs from scoring. Use one versioned contract and frozen edition rules |
| GUESS-03 | P1 | Unknowns green, Dem lifespan ignored, regional reach unsupported | Synthetic all-green + real reach reproduction. Current 12 have no exact pair collision |
| HIST-01 | P1 | Puzzle-only local cache and no primary server rehydration | Client source. Shared device/account switch and second device show correct history |
| STREAK-01 | P1 | Per-win increment without consecutive-date checks; played count only on wins | Edge source. Define participation/outcome/streak independently |
| MAP-01 | P1 | Curated provider is random; geographic acceptance too broad | Provider source. Verified bank and quarantine replace live random daily discovery |
| MAP-02 | P1 | Retry limit resets on loading; SDK lacks auth-failure/timeout | Panel/loader source. Persistent failures end within a fixed budget |
| MAP-03 | P1 | Repeated reveal/advance and clue-readiness gaps | Duplicate reducer reveal reproduced. One result per round, ready clue before submit |
| MAP-04 | P1 | Repeated SDK object creation; missing map-ID validation | Component/config source. Reuse objects, clean resources and measure billed events |
| DRAW-01 | P1 | Player user_id null, nickname rejoin and incomplete socket room leave | Server source. Stable auth identity, one room and controlled reconnect |
| DRAW-02 | P1 | Unvalidated/unbounded events and no result persistence | Server source. Input/resource limits and authoritative persisted results |
| DRAW-03 | P1 | Missing second hint, deadline-based elapsed distortion, zero summary points | Hint reproduced; scoring/summary source. Fixed start time and correct output |
| UI-01 | P1/P2 | Wide mobile grid, hover map control, dialog focus and color-only meaning | Source review; visual/device testing pending |

Additional live advisor findings: definer puzzle view, mutable function search_path, citext in public, handle_new_user execution grants, leaked-password protection disabled. Evaluate actual behavior, not only lint titles. Preserve intended public puzzle metadata while separating private answers; do not blindly make the current view security_invoker.

## First implementation pull requests

1. SEC-01/SEC-02 protections and database regression checks; backup/environment note.
2. RUN-01/QA-01 shared production package, start smoke check and functional CI.
3. MAP-02/MAP-03 bounded recovery and guarded reducers; DRAW-03 second-hint correction.
4. ENV-01 reviewed current-schema development seed and documentation.

These are proposals prepared from confirmed defects. Validate migrations in a disposable environment before a production rollout.

## Content first batch

- Audit the 12 current people and rights for their images; fill all blank descriptions with concise sourced copy.
- Sunil Narine: CWI confirms 2012 T20 World Cup participation. Existing t20_world_cup option can be used if affiliations means historical participation.
- Nicholas Pooran: ICC confirms 2019 Cricket World Cup, 2022 captaincy and 2025 international retirement. Existing captain/cricket_world_cup values support additions; resolve status scope before editing.
- Brian Lara: ICC Hall of Fame supports his unbeaten Test 400 in 2004 for a factual description.
- Quarantine obsolete seed errors: Rudolph Charles is a steelpan innovator, not a 2006 footballer; Voice's Far From Finished won Soca Monarch, not Road March; Heather Headley and Wendy Fitzwilliam are not Tobago birthplace entries; Keith Rowley is not the current PM.
- Source links and exact staging constraints are in the detailed research reference. No seed errors above were found as people in the live 12-row catalogue.
- No automated bulk content insertion until facts, allowed values, aliases, collision analysis and image permissions pass review.

## Decisions

| Topic | Status |
| --- | --- |
| Preserve existing architecture / Socket.IO authority | Recommended |
| All imported tags must already exist in approved attribute_options | Established constraint |
| Origin means education today; geography needs separate definition/migration | Open decision |
| Status and affiliations need explicit historical/current scope | Open decision |
| Dem dates mean lifespan; numeric birth-year feedback may help | Existing intent / proposed rule |
| Google + Google curated beta | Provisional, pending local coverage and cost audit |
| MapLibre requires alternate imagery, not same-screen Google Street View | Current provider constraint |
| Picture game as separate daily versus variant | Open decision |
| Completion streak once per business date | Recommendation |
| Friend/weekly per-mode boards before global ranking | Recommendation |
| One currency; server ledger; cosmetic rewards | Recommendation |
| 10 coins first daily, 5 additional, cap 30; prices 100/300/800 | Pilot hypotheses only |

## Update protocol

After each authorized change, record the date, PR/commit, affected IDs, tests or observed acceptance evidence, remaining risks and next action. Update decisions when the product owner changes scope. Keep an issue open until its gate is met; a passing build alone does not establish gameplay correctness. Recheck live state, changing facts and provider terms before relying on this snapshot.

## Work log

| Date | Change | Evidence | Next action |
| --- | --- | --- | --- |
| 2026-10-02 | Initial read-only audit and research | Main 9adedd2; healthy schema/content/policies inspected; build/typecheck pass; production start/lint/test failures; map/hint/feedback reproductions | Protect environment and implement first security/build batches |

No live permissions, records, functions, production code or settings were modified by this audit.
