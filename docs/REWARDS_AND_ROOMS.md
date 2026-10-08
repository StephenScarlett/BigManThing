# My lime: rewards, character, room and little arcade

**Implemented historical pilot, with a newer direction.** The owner pivoted on 6 October 2026 to an outdoor Stardew-adjacent farm, fishing and enterable house. Read [FARM_AND_HOME_DESIGN.md](FARM_AND_HOME_DESIGN.md) for the active proposal and [FARM_ASSET_GUIDE.md](FARM_ASSET_GUIDE.md) for new art. This document preserves the existing room/arcade implementation, rates and research; the farm and its proposed multipliers are not implemented yet.

Researched and implemented in development: **6 October 2026**. Owner direction: reward play with **rolls**, collect character/room items through gacha, unlock small browser games with earned currency, and explore powers in those games. Rates, names, roster and final art remain adjustable. This is the current progression reference, alongside [PROJECT_ROADMAP.md](PROJECT_ROADMAP.md).

## The product to build

**BMT's dailies give you something to bring home.** Finish Guess Nah, earn a roll, open a wardrobe or furniture collection, then use the item on your character or in your room. Lime Coins give reliable progress toward a chosen item or a permanent arcade unlock. Short side games use the same character and bring another reason to return.

The room is an actual place to arrange and inhabit, rather than a reward list. Start with an attractive, usable room and several free appearance options. A new hat should have an immediate use: equip it, see it in the room, then take that character into an activity. A furnishing should have a purpose beyond rarity: complete a reading corner, decorate a pan practice area, or express a style. Rarity alone will not make the loop enjoyable.

This is a small persistent browser hangout. Household simulation, open-world traversal and Sims/inZOI-scale AI are unnecessary for the first version. One 8×8 room, a character, accessible placement controls and two short activities establish the loop with manageable art and engineering work.

## What the research supports

These are references for specific mechanics, not evidence that their success transfers to BMT. Popularity statistics and unverified revenue claims are deliberately excluded. Sources were checked on 6 October 2026.

| Reference | Observed mechanic | BMT adaptation | Keep out of the first release |
| --- | --- | --- | --- |
| [Habbo play guide](https://www.habbo.com/playing-habbo/how-to-play), [looks](https://help.habbo.com/hc/en-us/articles/360011512560-How-do-I-control-my-Habbo), [shop](https://help.habbo.com/hc/en-us/articles/360011619799-All-about-the-Habbo-Shop) | An avatar, homeroom, inventory and arcade destinations form a connected experience | A recognisable home screen and character that follows you into games; furniture comes from one inventory | Public hotel/chat moderation, trading and a complex marketplace |
| [Highrise rooms](https://support.highrise.game/en/articles/11852817-what-are-rooms-and-how-do-they-work), [room creation](https://support.highrise.game/en/articles/11852669-how-do-i-create-a-new-room) | Inventory furniture placed in persistent personal rooms, with visibility settings | Private by default; later share a room card or permit friend visits | Arbitrary user scripts and live public room browsing |
| [Highrise grab probabilities](https://support.highrise.game/en/articles/8043506-what-are-the-reward-probabilities-for-grabs-owned-by-highrise), updated **10 April 2026** | Item odds, per-collection guarantee counters, Epic+ and featured guarantees, duplicate protection and wish targeting | Show actual next-roll odds and persistent guarantees; allow a chosen collection; retain a reliable route to the desired item | Its 90-pull threshold, paid economy and layered wish/swap systems. BMT's shorter 40-pull cap is our pilot choice |
| [Animal Crossing: Pocket Camp Complete](https://www.nintendo.com/au/games/mobile/animal-crossing-pocket-camp-complete/) | Small gathering activities feed decoration; saved layouts, character presentation and a catalogue with specific-item tickets | A comfortable room plus short fishing/gardening-style activities; direct item purchase beside random rolls | A huge crafting ingredient tree, long mandatory timers or copying Nintendo assets |
| [Pony Town team](https://www.patreon.com/ponytownteam/about?redirect=true) | Character customisation and personal house/island building in a browser | Browser-native pixel presentation is a viable product format; a shared sprite contract connects all modes | Treating its existence as a performance benchmark or permission to reuse its assets/code |
| [Dress To Impress](https://www.roblox.com/games/15101393044/Dress-To-Impress) — original experience | Theme-led outfit creation, presentation and voting | Later **Fashion Lime**: a theme, a short dressing phase and a room/character card to show friends | Wealth-based ranked outfit advantages. Loan the same theme wardrobe to everyone in competitive events |
| [Grow a Garden](https://www.roblox.com/games/126884695634066/Grow-a-Garden) | Plant, wait, harvest, collect, show a garden; progress can happen offline | Later **Backyard Pots**: a few persistent plants, visible growth and decorative discoveries | An idle resource empire or a roll factory that competes with the main games |
| [Fisch](https://www.roblox.com/games/16732694052/Fisch) | Timing a catch feeds exploration and a collection | Later **Coast Catch**: one small fishing scene, short timing rounds, a catch journal and room keepsakes | A giant world or rarity-driven equipment that determines ranked daily results |
| [Adopt Me](https://www.playadopt.me/), [new Star Rewards](https://www.playadopt.me/news/new-star-rewards), **11 September 2026** | Character/home/pet identity; its refreshed daily system lets earned Stars buy selected rewards | Make participation useful and let players choose a goal. A future companion can be both room decoration and an unranked-game perk | Its ultra-low special drop rates or pay/trade structure |
| [Roblox onboarding](https://create.roblox.com/docs/production/game-design/onboarding), [retention](https://create.roblox.com/docs/production/analytics/retention) | Starter items, a quick path to play, visible goals and cohort-based iteration | Get a new player from daily → roll → equip/place quickly; measure actual return and collection use | Paying for idle session time or assuming more daily chores imply better retention |

The strongest combination is **Habbo's spatial identity + Highrise's collection clarity + Pocket Camp's short activity/decoration connection**. Fashion, gardening, fishing and companions extend it after the foundation works. The source mechanics are observations; this combination and BMT's numbers are design inferences.

## The player flow

| Moment | Player action | Guaranteed outcome | Choice or surprise |
| --- | --- | --- | --- |
| First visit | Choose a free appearance; enter a furnished room | Free basics, **3 rolls + 90 coins**, once per account | Which collection to try first |
| Main daily | Finish a published Guess daily, win or lose | **1 roll + 30 coins**, automatically committed with completion | The daily answer and later collection outcome |
| Collect | Spend one roll in Wardrobe or Room pieces | One item outcome, a receipt and updated guarantee progress | Random item from the disclosed pool |
| Duplicate | Roll an item already owned | **5 / 15 / 40 / 100 coins** by rarity | Save toward a chosen item; duplicates do not remove existing inventory |
| Express | Equip an owned item or place owned furniture | Room/outfit persists when saved | Layout, palette, style and character |
| Unlock | Spend **150 coins** on Pan Memory | Permanent access | Coins may instead buy an item |
| Side daily | Finish one Pan Memory round | **1 roll + 10 coins**, once that Trinidad day | Recall challenge; win/loss has the same participation reward |
| Return | Complete an eligible daily on consecutive days | Normal daily rewards plus milestone rolls | Spend now or save; collection guarantees persist when you leave |

Without duplicate income or other spending, the welcome coins plus two Guess daily completions pay for Pan Memory. Gating side games is appropriate; the main Guess/Where/Draw access should stay open. Show the locked game and its price, and offer a preview before purchase. Once unlocked, do not charge entry fees or require random equipment to participate.

The development database currently has **no reviewed people daily**. The authenticated loop therefore starts with welcome rewards until content is reviewed and published. Use `/room/demo` to test the whole sample flow immediately; its balances are isolated and reset on reload.

## Economy version one — implemented pilot values

Two spendable resources are enough:

- **Rolls:** earned tickets. One roll opens one chosen collection. No paid-roll, trading or cash-out feature exists.
- **Lime Coins:** earned from play and duplicates. Spend on a specific item, furniture copies or a permanent game unlock. Coins do not buy more rolls in this version.

Free skin tones and starter clothing remain available. Eight starter wardrobe options and four furnishing types are seeded; two chairs are granted. There are **16 collectible placeholder items**, eight per family, plus the twelve starter types. Furniture ownership allows up to eight copies; the room holds at most 24 placed items. Clothing is uniquely owned.

| Rarity | Base tier probability | Duplicate coins | Direct item price |
| --- | ---: | ---: | ---: |
| Common | 60% | 5 | 80 |
| Rare | 28% | 15 | 160 |
| Epic | 10% | 40 | 400 |
| Legendary | 2% | 100 | 900 |

Items within a tier have equal probability. A starter furniture copy costs 40 coins. All costs, draws, balances and ownership are calculated by the database.

**Guarantees:** after nine rolls without Epic+, the next roll is Epic or Legendary. Conditional chances are 83⅓% Epic and 16⅔% Legendary. After 39 without Legendary, the next is Legendary. If both guarantees apply, Legendary wins. Epic+ resets the Epic counter; Legendary resets both. Wardrobe and Room counters are separate and never expire in this prototype. Guaranteed Legendary prefers unowned Legendary items while any exist; once all are owned, duplicates still convert to coins. Normal rolls can duplicate.

Show a plain **Use 1 roll** button, the collection contents, current balances, exact item odds and “Epic+ in at most N / Legendary in at most N”. The receipt records the probabilities that applied to that draw. Numbers shown to four decimal places are rounded and may not display a total of exactly 100%; the server uses full precision. Avoid fake near-miss reels, concealed rates and a sequence of confirmation/pop-up screens. Final reveal animation should be brief and skippable.

[Roblox's paid-random-items documentation](https://create.roblox.com/docs/production/monetization/paid-random-items) is a useful design reference for individual and conditional probability disclosure. It is **Roblox policy**, not a statement of Trinidad law or a requirement that automatically governs this earned-only website. If paid rolls, paid convertible currency or trading are introduced, reassess the actual launch jurisdictions/platforms before enabling them. That is a future product change, not part of this implementation.

**Streaks:** completion, rather than victory, creates one activity stamp per Trinidad business date. Guess and Pan share it. Bonus rolls at streak days **3: +1, 7: +2, 14: +3, 28: +5**, repeating each 28 days. Finishing both games does not grant the same streak bonus twice. A missed day resets the consecutive counter; it does not remove items, coins, rolls or guarantee progress. The UI displays yesterday's still-continuable streak until today's completion. Outage grace and total-days milestones need a later version.

## What the numbers actually imply

[rewards-economy-model.py](research/rewards-economy-model.py) and [results](research/rewards-economy-results.json) reproduce an exact first-Legendary calculation and 25,000 seeded collection trials. These model a fixed pool, not people, fun or retention.

| Calculation | Result under stated assumptions | Implication |
| --- | --- | --- |
| First Legendary, one focused collection | Mean **24.944** rolls; median **26**; maximum **40** | The 2% base rate is not the full conditional experience |
| Still waiting after roll 39 | About **33.3%** | The hard guarantee matters for a substantial group |
| Eight-item family after 10 rolls | Mean **5.469** unique items | Most early rolls add visible variety |
| Eight-item family after 40 rolls | **90.848%** complete in simulation | Eight items is a useful prototype, too small for a long-term live collection |
| 28 days of Guess only | **42 rolls + 930 coins**, welcome included | A focused collection reaches the 40-roll budget on day 28 |
| 28 days of Guess + Pan, unlock on day 2 | **69 rolls + 1,050 coins**, after the unlock | A focused collection reaches 40 rolls on day 16; splitting slows both guarantees |

The calendar excludes purchases, duplicate coins, leaderboard grants and outages, and assumes a published Guess daily every day. With no other purchases or duplicate coins, 900 coins is reached on day 27 from Guess alone, or day 25 with Pan after its unlock. These are pacing hypotheses, not promises to current users.

**Content is the likely bottleneck.** Do not respond to quick collection completion only by making items rarer. After the prototype, plan about 24–32 items per family, with a visible permanent catalogue and several coherent room/outfit themes. Validate art capacity before committing to a release cadence. New seasons should preserve old ownership and guarantee progress; rotating pool definitions require an additive schema/rules change. Existing receipts retain their original odds.

Pilot questions: does an unwanted duplicate still feel useful? Do players spend their first coins on Pan, a Common item or furniture copies? Can a player make a satisfying room without a Legendary? Does splitting collections feel like a trap? Tune prices, duplicate value, welcome amount and guarantee threshold from these answers. Do not tune against average supply alone.

## Side games, access and powers

| Activity | State | Loop | Progression design |
| --- | --- | --- | --- |
| **Pan Memory** | Implemented daily; temporary visual notes | Watch six numbered notes, repeat them; one completion/day | 150-coin permanent unlock; fixed participation reward, no score advantage for rare clothes |
| **Coconut Catch** | Implemented free local practice | Three lanes, catch falling coconuts, three misses end the round | Uses the same outfit; no currency or leaderboard claims from its client-only score |
| **Coast Catch** | Next candidate | Short timing challenge → catch journal → room keepsake | Coins unlock the activity. Optional gacha companion supplies an unranked perk; basic equipment completes every required task |
| **Backyard Pots** | Later | Plant a small garden → bounded offline growth → harvest → decorate | A few pots, server timestamps, harvest caps. Companions may change what you grow or how the scene looks |
| **Fashion Lime** | Later social activity | Theme → dress → present → friends vote | Collection expression in casual mode. Shared loan wardrobe and no reward farming from self/alternate-account votes |
| **Lime Delivery** | Optional arcade reserve | A short tile route through a small neighbourhood | Character/companion routes and sidegrades; useful if fishing/gardening testing is weak |

The user's power/strength idea is viable in **unranked progression activities**. Add a third collection, **Companions**, after room/cosmetic use is established. Suggested original T&T wildlife-inspired companions: a motmot, scarlet ibis or small crab, subject to art direction. Example perks: a fishing timing window widened by at most 25%, one route preview, or an extra decorative harvest option. These are proposed mechanics, not biologically factual species abilities.

Rarity should add appearance and interesting choices; it need not strictly dominate every lower tier. Give everyone a basic companion and let earned coins/mission experience buy deterministic upgrades. A Legendary might have two selectable sidegrade perks, with only one active per round. Freeze equipment/perks in the server's round snapshot. Fixed daily roll caps should stay the same regardless of strength, preventing rare gear from becoming a compounding roll-income advantage.

Powers stay out of Guess/Where/Draw ranked results. If a powered side game gets a leaderboard, offer a separate fixed-equipment challenge. In a future version with several side games, use **one shared side-activity daily roll budget**, fulfilled by any eligible unlocked activity, rather than awarding a new unlimited income stream for every game. The current Pan-specific ledger needs a migration to that shared event model.

Do not gate one game behind a rare roll result. Buy its permanent access with coins; let gacha vary what you bring into it. More playable breadth should remain predictable.

## Competition, accounts and social value

Leaderboard rewards are **planned**, not enabled. The current implementation intentionally does not trust legacy cross-mode client result writes or local arcade scores to mint currency.

Start with friends and weekly per-mode boards. For Guess, rank the week's best five published dailies using points `9 − attempts` for wins, zero for losses; ties share rank. This gives two flexible days and avoids treating response speed as skill. Keep one authoritative result per account/edition. Map needs server-owned rounds before joining the reward system; Draw needs stable participants, host/reconnect handling and saved server outcomes first.

Proposed weekly roll grants: finish at least three verified main dailies for **2 rolls**; qualifying competitive placement adds **1 roll**, at most once across eligible boards that week. Use one award per account/week, not stacking awards for every friend group. This is a 3-roll weekly ceiling hypothesis, outside the economy model above. Titles, room plaques and profile frames can celebrate rank; the actual inventory rewards still come through rolls. Award receipts should record season, cut-off and ranking rules, with a correction/reversal path.

Guest welcome rewards are useful for onboarding. Before public progression, implement identity-preserving guest linking with a tested account-ID invariant; OAuth login and magic-link sign-in alone do not prove guest inventory merging. Keep rooms private by default. Later add a shareable image/card, then permissioned friend visits, then moderated social features. Trading and public chat would add substantially more support and abuse work than a personal room card.

## Implementation and verification

- `/room`: authenticated inventory, balances, character and room save; wardrobe/room rolls, odds, recent receipts, direct buys, furniture copies, permanent Pan access and daily Pan rewards.
- `/room/demo`: isolated offline sample state; no authenticated reward calculation, no account mutation, reset on reload.
- React/SVG procedural room and avatar: no new game-engine dependency. Room code is lazy loaded. The current build's room JavaScript is about 36 kB minified before gzip; this is a bundle observation, not a frame-rate guarantee.
- Supabase: read-only public item catalogue; private player state, inventory, pity, receipts, ledger, activity dates and Pan sessions; identity-checked RPCs. Wallet row locks serialize earn/spend. Request IDs replay the same roll/purchase; room saves use revisions. Game completion/reward are atomic.
- Browser storage helps retry the same request, but never determines balances or ownership. Furniture is checked for owned quantities, bounds, duplicate instance IDs and overlapping footprints. Rugs can occupy a separate layer under furniture.
- Hosted transactional checks passed and rolled back their fixture. Concurrent same-request hosted rolls stored one receipt and one debit. Existing Guess edition/session/attempt fingerprints and the account count were preserved.

The new private tables intentionally have RLS with no client policies/grants: only scoped entrypoints expose each player's data. Advisor INFO notices describe that default-deny choice; [Supabase's linter reference](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) explains the notice. Existing advisor warnings remain a separate cross-mode milestone.

Pan sends its pattern to the player's client because the player must see it. The eight-second readiness gate and one/day receipt limit are **not bot-proof validation**. The current mode is unranked, with a small fixed participation allowance. Stronger challenge verification is necessary before valuable competitive or monetised rewards. The ledger currently supports safe earning/spending, not a finished support reversal/admin console.

The cloud browser cannot reach this local preview, and local Chromium installation failed. Real touch/keyboard/device layout, game feel and performance checks remain open. Backend tests are not a substitute for those checks. No frontend hosting release is part of this work.

For future animated scenes, [PixiJS performance guidance](https://pixijs.com/8.x/guides/concepts/performance-tips) supports sprite sheets, sensible scene complexity and measurement on older mobile devices. Use PixiJS if sprite batching/movement becomes the main need; evaluate [Phaser's game-object model](https://docs.phaser.io/phaser/concepts/gameobjects/container) if arcade timing, audio and physics justify a full game framework. Benchmark before changing the current renderer.

## The order from here

1. **Try and review:** five-column draft Guess, My lime and the isolated demo. Complete device checks; resolve confusing feedback and placement. Review a recognisable, varied people daily with sourced clues so the real earn loop can run.
2. **Asset pilot:** one master character rig, all free identity basics, one complete starter room and a small coherent collectible set. Follow [AVATAR_ROOM_ASSET_GUIDE.md](AVATAR_ROOM_ASSET_GUIDE.md). Replace placeholders without changing ownership IDs.
3. **Account durability:** link a guest while preserving the same account, room, ledger and history; test reload, another device, expired session, midnight and interrupted requests.
4. **Closed economy pilot:** record onboarding → daily completion → roll → equip/place → later return. Test duplicate satisfaction, coin choices and guarantees. Complete correction tools and outage handling before public progression.
5. **More activities:** choose Coast Catch or Backyard Pots from playtesting. Add server round/equipment snapshots, shared side-reward caps and a free/basic path. Then prototype companion sidegrades.
6. **Competition/social:** friend/weekly boards and bounded weekly roll awards after each main mode's results are authoritative. Add room cards and permissioned visits before public chat/trading.

Suggested pilot events: `room_opened`, `daily_completed`, `roll_opened`, `item_equipped`, `room_saved`, `game_unlocked`, `side_round_completed`. Currency telemetry comes from server receipts. Collect event counts and pseudonymous account IDs rather than emails, exact birthdays or message contents. Compare new-user cohorts at D1/D7, successful decoration, voluntary return and replay interest; measure error/retry rates alongside retention. There is no claim that this loop has achieved those outcomes yet.
