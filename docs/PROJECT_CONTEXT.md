# BigManThing project context

Updated: 2026-10-02.
Working plan: [PROJECT_ROADMAP.md](PROJECT_ROADMAP.md).
Guess design gate: [GUESS_NAH_DESIGN.md](GUESS_NAH_DESIGN.md).

## Product intent and current direction

BMT is a Trinidad and Tobago browser-game platform: a short cultural daily challenge, result sharing, and a drawing game for friends. Trustworthy local content and reliable mobile gameplay are the priority. Where Nah needs careful imagery/provider guidance; accounts, leaderboards, streaks and cosmetic rewards follow validated gameplay.

The owner is comfortable restarting Guess Nah's data structure. A cricket-heavy pool does not provide sufficiently enjoyable deduction. Settle recognisable people, comparisons and finite/hinted rules before rewriting Guess schema/admin/scoring/UI. The immediate product task is recognition review plus a small unranked prototype. The 32-person proposal is not an approved seed or final ruleset.

The existing monorepo remains a usable base; openness to a new Guess contract does not by itself require replacing the platform framework. Preserve the latest user steering. README.md and BIGMANTHING_PLAN.md contain historical rules.

## What the repository contains

- React/Vite/TypeScript/Tailwind web app with Guess Nah, Draw Nah, Where Nah and administrator tools.
- Guess Nah has Dem and Ting interfaces, autocomplete, array feedback and sharing; scoring uses a Supabase Edge Function. The current UI allows unlimited attempts.
- Draw Nah uses an Express/Socket.IO game server with rooms, canvas, chat, word choices and scores.
- Where Nah uses Google Street View plus Google Maps for a five-round practice experience.
- Supabase manages content, identity and daily history. Guests, OAuth/magic links and usernames have foundations.
- A dedicated progressive picture challenge, currency/inventory and leaderboard UI still need design and implementation.

Detailed environment information and security audit evidence belong in the private project research reference. Public documents record product intent and verification milestones.

## Guess content starting point and proposals

The reviewed content snapshot contains 12 people and 69 allowed attribute values. Seven people are cricketers, 11 carry a sport field, and all use the male option. Current people: Ato Boldon, Brian Lara, Daren Ganga, Denesh Ramdin, Dwayne Bravo, Dwight Yorke, Hasely Crawford, Kieron Pollard, Machel Montano, Nicholas Pooran, Richard Thompson and Sunil Narine.

Proposed v2: 32 recognition-tested people, only two cricketers, and at most three sharing a primary speciality. Test Known for, Speciality, confirmed Born year and public Gender, eight daily attempts and free hints after 3/5/7 misses. Real major-career overlap is partial; unconfirmed comparisons are neutral.

Six draft years remain withheld, and Sampson/Ro’dey share a current categorical profile. Resolve factual/source/alias and discriminating clue paths before publication. The shortlist is not an automated import. Human recognition and gameplay need validation; the mathematical model assumes complete candidate knowledge.

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

Start accounts with guest-preserving upgrades and reliable history. Test completion streaks, friend/weekly per-mode boards and later a server-owned idempotent currency ledger for cosmetics. Hint access must not be a purchased advantage in a ranked daily. Economy rates and prices remain pilot hypotheses.

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
