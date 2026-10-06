# BigManThing project context

Updated: 2026-10-06.
Working plan: [PROJECT_ROADMAP.md](PROJECT_ROADMAP.md).
Guess research: [GUESS_NAH_DESIGN.md](GUESS_NAH_DESIGN.md).
Current implementation: [GUESS_NAH_IMPLEMENTATION.md](GUESS_NAH_IMPLEMENTATION.md).
Latest expansion proposal: [GUESS_NAH_EXPANSION.md](GUESS_NAH_EXPANSION.md).
Progression research/pilot: [REWARDS_AND_ROOMS.md](REWARDS_AND_ROOMS.md). Art production: [AVATAR_ROOM_ASSET_GUIDE.md](AVATAR_ROOM_ASSET_GUIDE.md).

Current delivery: [PR #4](https://github.com/StephenScarlett/BigManThing/pull/4), branch `feat/guess-v2-room-rewards`; the implementation commit `fb535f51572eda6ab71627f9ecc7e73c97f95cbf` passed [remote CI](https://github.com/StephenScarlett/BigManThing/actions/runs/37487290506). Development database migrations are applied; the frontend PR remains open.

## Product intent and current direction

BMT is a Trinidad and Tobago browser-game platform: a short cultural daily challenge, result sharing, and a drawing game for friends. Trustworthy local content and reliable mobile gameplay are the priority. Where Nah needs careful imagery/provider guidance; accounts, leaderboards, streaks and cosmetic rewards follow validated gameplay.

The owner authorised restarting Guess Nah's data structure and the expanded implementation. People-v2 now supports five comparisons, eight attempts, free clues and 64 draft nominees, including KyleBoss and Levi García. Broad Comedy/Food vocabulary and revised membership/caps are applied in development. Frozen people-v1 editions retain their old four-column contract. There are 19 unconfirmed years and zero reviewed profiles/no people daily. Next is recognition/device testing and sourced clue/claim review; roster/fields remain adjustable.

Latest direction: main games/streaks/leaderboards reward **rolls**, which grant character/room collection outcomes. An isometric browser room, free identity basics, two collection families, visible guarantees, duplicate coins, direct buys and a permanently unlocked daily side game are implemented as a pilot. **Rolls + Lime Coins** replaces the earlier one-currency proposal. Future gacha companion powers can apply to unranked side activities; main ranked results stay independent. Full assets, linking, boards, social visits and broader side-game powers remain planned.

The existing monorepo remains a usable base; openness to a new Guess contract does not by itself require replacing the platform framework. Preserve the latest user steering. README.md and BIGMANTHING_PLAN.md contain historical rules.

## What the repository contains

- React/Vite/TypeScript/Tailwind web app with Guess Nah, Draw Nah, Where Nah and administrator tools.
- Guess Nah defaults to the new People interface, authenticated database RPCs, finite practice/dailies and a review editor. Ting retains its legacy interface and Edge Function. The original Dem catalogue and history are preserved.
- Draw Nah uses an Express/Socket.IO game server with rooms, canvas, chat, word choices and scores.
- Where Nah uses Google Street View plus Google Maps for a five-round practice experience.
- Supabase manages content, identity and daily history. Guests, OAuth/magic links and usernames have foundations.
- My lime adds authenticated room/outfit/inventory state, earned rolls, Lime Coins, collections/guarantees and Pan Memory; Coconut Catch is free local practice. An isolated `/room/demo` allows review without account mutations. A dedicated progressive picture challenge and leaderboard UI remain to implement.

Detailed environment information and security audit evidence belong in the private project research reference. Public documents record product intent and verification milestones.

## Guess content starting point and proposals

The legacy content snapshot contains 12 people and 69 allowed attribute values. Seven people are cricketers, 11 carry a sport field, and all use the male option. Legacy people: Ato Boldon, Brian Lara, Daren Ganga, Denesh Ramdin, Dwayne Bravo, Dwight Yorke, Hasely Crawford, Kieron Pollard, Machel Montano, Nicholas Pooran, Richard Thompson and Sunil Narine.

Implemented people-v1: 32 drafts; publication caps two cricket memberships and three per primary speciality; Known for, Speciality, confirmed Born year and public Gender, eight attempts and free hints after 3/5/7 misses. Real major-career overlap is partial; unconfirmed comparisons are neutral. These development caps implement an earlier editorial proposal, not an immutable owner preference.

Current people-v2: 32 retained drafts plus 32 imported additions; target five in core groups, cap seven primary members/five cricket memberships; smaller iconic fields remain. Letters is the fifth comparison, the public display is Kes, stage/digital comedy merges into Comedy, Food/cooking is explicit and up to three major careers fit genuine overlap. Nineteen years remain withheld. Two identical model profile pairs still need discriminating clues. Imported nominations are not approved content.

Sampson/Ro’dey/KyleBoss now have different displayed-name counts while their uncertain years stay neutral. Ian Alleyne/Adonai Dieu and Patrice Roberts/Nailah Blackman remain identical model profiles. Resolve factual/source/alias and discriminating clue paths before publication. Human recognition and gameplay need validation; the mathematical model assumes complete candidate knowledge.

## Content and implementation constraints

- Every actual import must use values in its approved vocabulary version. The owner permits a new taxonomy/schema; the legacy 69 options do not limit the design of the next reviewed version.
- Do not invent identity-specific tags, biographies, years or milestones to separate candidates.
- Separate underlying facts from editorial game profiles. Preserve per-field evidence, conflicts, aliases and asset permissions.
- Current Origin is an education field in the old contract; changing its meaning requires an explicit contract change.
- Do not assume changing status/current affiliations are stable casual-game comparisons.
- People, folklore and Ting need distinct validated profiles. Folklore variants require source/tradition review.
- Freeze roster, profile, rules and clues per published edition; use America/Port_of_Spain business dates.
- Preserve identities/history and verify a disposable restore before replacing schemas or seeds.
- Draw Nah retains server authority. Validate identity, reconnection, input limits and persistence before competitive progression.
- Public planning is not authorization for a live reset or release. Stage implementation and verify acceptance gates.

## Map, UI and progression direction

Provider selection is provisional: compare actual Trinidad/Tobago imagery coverage before committing. Google Street View plus Google Maps is a possible curated beta; MapLibre needs a separately usable imagery source. Evaluate current terms, attribution and cost. The map game needs curated starts, bounded recovery, clear round states and consistent saved results.

Keep BMT's bold red/black direction with local copy and distinct game previews. Test compact mobile guessing, touch/keyboard map controls, dialog focus and feedback that does not rely on colour alone.

The pilot ledger grants welcome rewards once, published Guess completion rewards atomically, one daily Pan reward and shared completion-streak bonuses. Server locks, receipts and room revisions protect retries and concurrent edits. Guest-preserving linking, outage grace, correction tools and friend/weekly boards remain next work. Use coin-based predictable game unlocks; explore gacha sidegrades in unranked activities. Hint access stays free in ranked Guess. Rates/prices/guarantees remain pilot hypotheses.

## Research anchors

- Guess research and source examples: [GUESS_NAH_DESIGN.md](GUESS_NAH_DESIGN.md).
- Google terms: https://cloud.google.com/maps-platform/terms
- Pricing: https://developers.google.com/maps/billing-and-pricing/pricing
- Mapillary viewer: https://mapillary.github.io/mapillary-js/
- Own imagery viewer: https://photo-sphere-viewer.js.org/
- Guest conversion: https://supabase.com/docs/guides/auth/auth-anonymous
- NNGroup UX research: https://www.nngroup.com/articles/ai-ux-debt/
- Interaction guidelines: https://vercel.com/design/guidelines
- Outage-safe streaks: https://blog.duolingo.com/protecting-streaks-from-site-issues/

Recheck current provider terms, source claims and deployed behavior before implementation. Detailed audit evidence and the full Guess nomination/source matrix remain in the project research references.

## People v1 development checkpoint — 2 October 2026

Owner-authorized implementation is complete for the people prototype: four comparisons, eight attempts, canonical aliases, server history, free 3/5/7 clues, draft review and frozen Trinidad-date editions. New tables hold 32 drafts and 29 controlled vocabulary values. Six years stay unconfirmed, portrait rights remain uncleared, and no daily has been published. The owner confirms this is a personal development environment. Existing entities and historical records are preserved. See [GUESS_NAH_IMPLEMENTATION.md](GUESS_NAH_IMPLEMENTATION.md) for concrete usage/schema/checks. The implementation was merged in PR #2 with passing CI. The latest research is [GUESS_NAH_EXPANSION.md](GUESS_NAH_EXPANSION.md); next is its expanded comparison/recognition prototype, without redefining historical v1 rules.
