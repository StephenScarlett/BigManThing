# BigManThing project context

Last updated: 2026-10-02. Main audit baseline: 9adedd237df403fe6893289c46b338c6043ac3f5.
Working plan: [PROJECT_ROADMAP.md](PROJECT_ROADMAP.md).

## Product intent

A Trinidad and Tobago browser-game platform with a short cultural daily challenge, result sharing, and a drawing game for friends. Trustworthy local content and reliable mobile gameplay are the priority. The user particularly wants strong guidance on Where Nah, accurate guessing attributes, distinctive UI, and later accounts, leaderboards, streaks and cosmetic rewards.

The existing monorepo is a suitable base. Do not infer that the old README or BIGMANTHING_PLAN.md describes current behavior: those documents predate Where Nah, unlimited guesses, and the final entity schema.

## What actually exists

- React/Vite/TypeScript/Tailwind web app with Guess Nah, Draw Nah, Where Nah and administrator tools.
- Guess Nah has Dem and Ting interfaces, unlimited attempts, autocomplete, feedback and sharing. Submit-guess runs as a Supabase Edge Function.
- Draw Nah has an authoritative Express/Socket.IO game server with rooms, canvas, chat and scoring. Rooms/results currently live in memory.
- Where Nah is five-round Google Street View plus Google Maps practice, with browser scoring. Its curated provider is a TODO that currently selects random locations.
- Anonymous guests, Google OAuth, magic links and usernames exist. Reliable upgrades, history, streaks and competition need work.
- A progressive picture challenge, currency, inventory and leaderboard UI are not implemented.

## Healthy Supabase snapshot

Project BigManThing / lnawatbxshjtrsglmcjk; us-west-1; PostgreSQL 17.6.
The project initially reported inactive/coming up, then ACTIVE_HEALTHY during read-only inspection. Do not interpret the startup's empty catalogue or metadata zero estimates as data loss.

Direct counts on 2026-10-02: 12 entities (all Dem), 69 attribute options, 1 profile, 2 daily puzzles, 8 attempts, 1 daily result, 0 Draw games. Puzzles are dated 2026-06-04 and 2026-06-10. All 13 repository migrations appear applied. All entities have image URLs, no descriptions, and valid current vocabulary tags.

People: Ato Boldon, Brian Lara, Daren Ganga, Denesh Ramdin, Dwayne Bravo, Dwight Yorke, Hasely Crawford, Kieron Pollard, Machel Montano, Nicholas Pooran, Richard Thompson, Sunil Narine.

Current vocabulary: field 3; role 7; gender 1; status 2; reach 2; origin 12; affiliations 16; details 26. There are no Ting-specific options or live Ting entities.

## Existing constraints and open definitions

- Every imported tag must exist under the correct attribute in attribute_options. Vocabulary changes precede entity imports; no ad-hoc strings.
- Avoid different answers producing all-green feedback through redundant/synonymous tags. Refine truthful attributes instead of inventing unique identity tags.
- Dem is people-only. Folklore can be drawing content or a separately designed pack.
- Birth/death dates should express lifespan, not fame era. Birth-year scoring remains a proposal.
- Live origin currently means schools. Relabel as Education or explicitly split the contract; never silently reinterpret it as birthplace.
- Affiliations mixes teams/leagues/tournaments/events; define historical versus current meaning.
- Retired versus active needs scope for international/franchise sport and later careers.
- regional is a valid live reach value but unsupported by hardcoded feedback ordering.
- cricket_allrounder and cricket_allrounded overlap; olympic_medalist has an inappropriate Sports Commentator parent group.
- Current attempts are unlimited. Finite picture/competitive rules remain undecided.
- Use server business dates in America/Port_of_Spain for intended Trinidad midnight.
- Draw Nah stays server-authoritative Socket.IO.

## Evidence from the audit

Typecheck and build pass locally. No meaningful tests; ESLint is missing; no CI workflows.
Built production server fails on Node 24.19.0 resolving shared source TypeScript imports.
Focused source reproductions confirm duplicate map reveal scoring and the missing second Draw hint.
Different synthetic people can yield all-green feedback; no exact collision among the current 12 people (66 pairs).
Live regular-user UPDATE privilege on profiles.is_admin, owner-only RLS and no protection trigger confirm a privilege-escalation path. No exploit was attempted.

The audit made no production writes. Deployment URL, real map coverage/costs and visual/device validation still need verification. Seed.sql is obsolete against the final schema, and several historical migrations truncate data. Preserve the healthy environment before changes.

## Design and platform recommendations

Map choice is provisional: Google Street View + Google Maps for a curated beta after a 30-location coverage audit. Google standard terms prohibit Street View next to a non-Google map on the same screen. MapLibre needs alternate imagery; test Mapillary or owned/licensed photos/360s. MapLibre alone is not a replacement imagery source.

Keep BMT's bold red/black brand, with distinct real game previews and deliberate local copy. Store accepted decisions and their rationale, then test flows with target users. Improve touch/keyboard map controls, compact mobile guessing, focus handling and feedback beyond color.

Start accounts with guest-preserving identity linking and server history. Recommend one completion-streak increment per business date, friend/weekly per-mode boards, and later a server-owned idempotent currency ledger for cosmetics. Economy rates are experiments, not commitments.

## Research anchors

- Google terms: https://cloud.google.com/maps-platform/terms
- Pricing/events: https://developers.google.com/maps/billing-and-pricing/pricing and https://developers.google.com/maps/billing-and-pricing/sku-details
- Mapillary licensing/viewer: https://help.mapillary.com/hc/en-us/articles/115001770409-CC-BY-SA-license-for-open-data and https://mapillary.github.io/mapillary-js/
- Own imagery viewer: https://photo-sphere-viewer.js.org/
- Supabase identity conversion: https://supabase.com/docs/guides/auth/auth-anonymous
- NNGroup, 2026-08-28: https://www.nngroup.com/articles/ai-ux-debt/
- Vercel, 2026-06-25: https://vercel.com/blog/teaching-agents-product-design-at-vercel
- Interaction guidelines: https://vercel.com/design/guidelines
- Outage-safe streaks: https://blog.duolingo.com/protecting-streaks-from-site-issues/

Recheck current provider terms/pricing and changing facts before implementing or publishing. The user's detailed project research report contains the complete source list and staged factual work.
