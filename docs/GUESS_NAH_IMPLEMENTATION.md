# Guess Nah people v2 — development implementation

Updated **6 October 2026**. The owner authorised the expanded roster/fifth comparison and reward implementation in the personal development application. The new frontend is on `feat/guess-v2-room-rewards`. The additive Supabase migrations below are applied. No existing account or game history was reset.

Delivered in [PR #4](https://github.com/StephenScarlett/BigManThing/pull/4), currently open. [Remote CI run 37487290506](https://github.com/StephenScarlett/BigManThing/actions/runs/37487290506) passed for implementation commit `fb535f51572eda6ab71627f9ecc7e73c97f95cbf`.

## Try the current prototype

1. Check out `feat/guess-v2-room-rewards`, install with `pnpm install --frozen-lockfile`, and provide the web client's Supabase URL/public key in the normal local configuration.
2. Run `pnpm dev:web`. Open Guess Nah → People with the editor account.
3. Enable **Use draft roster in new practice**, then choose **New practice**. A new round uses the expanded 64-person roster and five comparisons. Already-created practice editions retain their old names and four comparisons.
4. Test aliases, displayed letter counts, genuine career overlaps and unknown-year clues. Draft practice remains unranked and earns no currency.
5. Open Admin → **People editor** to complete sourced per-field review, biographies and clues. Public practice/dailies require reviewed content.
6. Open **My lime** at `/room` for your own room, character, inventory, welcome rolls and collections. Use `/room/demo` for an isolated sample of the whole flow without an account; its state resets on reload.

Guest play uses authenticated Supabase anonymous accounts. Guest linking that preserves the same identity is still a separate milestone. My lime currently offers one server-backed daily side game and one local practice game; see [REWARDS_AND_ROOMS.md](REWARDS_AND_ROOMS.md) and [AVATAR_ROOM_ASSET_GUIDE.md](AVATAR_ROOM_ASSET_GUIDE.md).

## Applied versions and content

| Migration | Purpose |
| --- | --- |
| `20261002203132_guess_people_v2` | Historical filename; actually established the four-column **people-v1** contract |
| `20261002203139_guess_people_draft_roster` | Initial 32 drafts |
| `20261006144857_guess_people_expansion_v2` | Additive **people-v2** rules/vocabulary, Letters, broader taxonomy, 32 more draft nominations and version dispatch |
| `20261006144912_room_rewards_foundation` | Server-owned earned-roll economy, inventory, room/outfit state, Pan daily and automatic Guess completion rewards |

Local filenames match hosted migration history. Applied migration semantics must not be edited; further changes require another migration.

The live bank has **64 drafts, zero reviewed profiles, 19 unconfirmed birth years**, and no published people daily. Nine core primary specialities have five-plus nominees; Cricket has five memberships. The broader Comedy value replaces digital/stage comedy in new profiles, Food/cooking is explicit, and up to three substantial Known for/Speciality memberships are allowed. Smaller iconic groups remain valid.

The displayed name is **Kes**, with Kees Dieffenthaller retained as an alias; frozen v1 editions retain their old label. KyleBoss and Levi García are imported as sourced draft nominations, not assertions that all biography claims have been verified. Retained identity/fact edits were preserved; taxonomy changes reset profiles to draft for the new review.

Content lives in `guess_people` (identity/aliases), `guess_person_facts` (typed facts and claim evidence), `guess_person_profiles` (editorial sets/clues/revisions), `guess_people_vocabulary` (versioned values) and `guess_person_assets` (permission records). The expanded reference seed is [people-expanded-draft.json](../packages/db/content/people-expanded-draft.json); additive migrations are the actual import. The portrait asset register remains empty. No uncleared portraits were imported.

Before review, confirm identity, memberships and the T&T connection with supporting HTTPS sources. Confirm a year/gender or document an unconfirmed/conflicting state. Add a sourced biography, a specific fifth-miss clue, a fairness note where unknowns/collisions matter, and reviewed compatibility IDs (at most three including the answer). Imported source leads are not substitutes for checking each claim.

New publication requires 8–64 unique reviewed v2 people, at least four primary lanes, no lane over half the roster, at most seven people per primary speciality and at most five cricket memberships. A five-per-speciality target is editorial guidance; it does not force obscure or weakly sourced additions. Identical profiles need distinct reviewed clue paths. Current model collisions remain Ian Alleyne/Adonai Dieu and Patrice Roberts/Nailah Blackman.

## Rules and preservation

New editions freeze names, aliases, facts, career sets, derived letter counts, clues, sources, profile revisions, vocabulary and `people-v2`. Existing `people-v1` editions are not rewritten. The v1 comparator's semantics remain intact; v2 adds Letters and dispatches from the edition's frozen rules.

- **Known for / Speciality:** equal known sets match; real overlap is partial; disjoint sets differ. Unknown/empty comparisons are neutral.
- **Born:** confirmed equal year matches; arrows point to the answer's earlier/later year; a difference of 1–5 years is near. Unknown on either side stays neutral.
- **Gender:** equal documented values match; different known values differ; unknown stays neutral.
- **Letters:** count Unicode letters in the displayed frozen name after accent decomposition; ignore spaces, punctuation, digits and combining marks. Exact / longer / shorter. Kes = 3; Ro’dey = 5; KyleBoss = 8; Levi García = 10; Certified Sampson = 16. Aliases never change the count.
- **Win:** canonical identity, even when a fact is unknown. Matching cells alone do not win for another person.
- **Attempts:** eight. Repeating a canonical guess returns the existing state without spending another attempt.
- **Free clues:** primary lane after three misses, a reviewed achievement/work/brand after five, displayed-name initials after seven. Draft clues can be unfinished.
- **Daily:** one immutable edition per Trinidad business date, using `America/Port_of_Spain`. Future and expired submissions are blocked.

The server's returned feedback is displayed directly in the game and editor preview. Autocomplete/roster labels show derived counts so players need not manually count names. Share rows have four squares for historical v1 and five for v2.

Private editions/sessions/attempts remain inaccessible to clients; scoped RPCs check current identity and role. Session locks serialize guesses. New daily completion and its 1-roll/30-coin reward commit in the same transaction; duplicate completion/reward claims are idempotent. Practice and draft previews do not mint currency.

## Verification and limits

Passed in this update: **28 automated checks** (19 database integration, five web feedback/search, four shared/export/placement), workspace typecheck and build, an entire disposable migration reset, hosted authenticated-role/retry/room/guarantee/Pan checks, and simultaneous same-request rolls yielding one receipt/debit. Hosted test fixtures were rolled back or removed.

The four existing editions, four sessions and thirteen attempts retained exact pre-change content fingerprints. The account count remains one. These are checks of this development snapshot, not a claim about future live activity. Legacy Draw/Ting identities/content/history remain separate from the new people contract. No owner inventory was pre-created or spent during testing.

The updated mathematical Guess model uses the current Kes label: fully informed optimal mean **2.531**, average candidates after a uniform wrong opener **9.957**, two identical stored-profile groups. The model knows the whole roster, omits human recognition and free clues, and does not measure fun. See [model](research/guess-expansion-model.py) and [results](research/guess-expansion-results.json).

The cloud browser cannot access the local preview, and local Chromium installation failed. Visual/device, keyboard/touch interaction, performance, account-switch and real recovery playtests remain open. Build/test success does not establish bug-free gameplay. The existing bundle warning and missing legacy lint setup remain; no frontend hosting release or new Edge Function deployment was performed.

## Next content/gameplay work

Try the five-column draft, resolve public labels and weak nominations, finish accurate clue/claim review, then publish a varied development daily to enable the real reward loop. Test recognition, the two collision pairs, unknown-year paths, Trinidad rollover and interrupted requests. Keep folklore/Ting/picture profiles separate rather than forcing them into person facts.

Reference research: [GUESS_NAH_EXPANSION.md](GUESS_NAH_EXPANSION.md). Overall next steps: [PROJECT_ROADMAP.md](PROJECT_ROADMAP.md). Progression, powers and collection economics: [REWARDS_AND_ROOMS.md](REWARDS_AND_ROOMS.md).
