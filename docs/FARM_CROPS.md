# Mystery crops and market: F2

Implemented 8 October 2026 on `feat/guess-v2-room-rewards`, [PR #4](https://github.com/StephenScarlett/BigManThing/pull/4). The owner confirmed F1 works and authorized this next batch. The additive `20261008153258_farm_crops_v1.sql` migration is applied to development; the frontend PR remains open.

## Playtest

Pull the development branch, install with `pnpm install --frozen-lockfile`, configure the existing public Supabase variables and run `pnpm dev:web`.

1. Open `/farm` using your existing account. Your saved character, house and starter kit remain available. Open **Crops** or approach a plot and press **E**.
2. Plant one mystery seed in an empty plot. Water it once. Both species share concealed early sprites and the same **24-hour server timer**. Closing the browser does not stop growth; more watering is unnecessary.
3. Return when ready and choose **Refresh crops**. The server reveals the crop. Harvest puts one item in your bag and frees the plot; it does not automatically sell anything.
4. In **Bag**, keep it or move it to **House chest**. Chest items persist; return them to the bag before selling.
5. In **Sell**, choose a quantity, review the exact coin quote, then confirm or choose **Keep it**. Coins arrive only after the server confirms consumption.
6. In **Seeds**, buy packets or claim **two free seeds per Trinidad day**. The recovery grant is independent of Guess and the once-only starter kit.

Use `/farm/demo` for a **45-second** temporary crop loop without login or economic RPCs. Its demo coins/items reset when you leave. The saved farm always uses 24 hours.

## Active pilot rules

| Seed/crop | Probability | Cost or sale value |
| --- | ---: | ---: |
| Mystery seed | — | 10 Lime Coins |
| Tomato, common | 75% | 14 Lime Coins |
| Hot pepper, rare | 25% | 20 Lime Coins |

This deliberately small two-crop pool tests the first complete loop and its art. It is **not** the proposed eight-species 70/24/5/1 pool in the broader economy model. The version-one expected sale is 15.5 coins per purchased seed before any other costs. Prices/odds are pilot settings; future changes require additive rules versions. No crop pity, discovery milestone, weekly farm Rolls, orders, house bonus, upgrades or fishing are enabled by F2. Main scores, streak rules and existing collection rewards remain independent.

## Server and client contract

Five new private RLS tables store rules, a separate economic revision, crops, bag/chest stacks and permanent action receipts. The only public entry points are authenticated `bmt_farm_crops_context` and `bmt_farm_crop_action`. Restricted entry functions use an empty search path and compare `auth.uid()` with the expected owner. No client has direct crop/wallet/inventory-table writes.

Planting consumes one owned seed and draws one private frozen outcome. The outcome, rules version and value cannot be rerolled. Before maturity, context and action receipts omit its species/rarity; the public catalogue lists possible results without exposing the draw. Watering sets one server timestamp plus the frozen 86,400-second duration. Context/harvest determine maturity on demand; no per-crop cron or trusted device clock is required.

Actions lock the existing wallet then farm, validate the economic revision and conserve seeds/produce/coins in one transaction. Character/position revisions remain separate. Harvest consumes the crop once. Store/withdraw conserve goods; only bag goods can be sold. Whole quantities are bounded to 1–50, stack/wallet overflow fails atomically, and sales use server-frozen prices through the existing ledger.

Each UUID is bound to an immutable action/revision body. Permanent receipts settle retries before revision checks and return the **current** context plus the original acknowledgement. Cosmetic receipt pruning cannot replay a debit/credit. Unknown transport failures keep **Retry crop action** available with the same request and block new economic actions. A known stale revision requires **Refresh crops**. Account-keyed lifecycle guards drop old requests/responses. The UI warns before leaving with an unsettled request; pending requests are not durable across a full browser restart, so refresh to reconcile inventory after one.

The client estimates cosmetic progress from server time plus a monotonic timer. It never reveals a species or grants produce from that estimate. One shared refresh covers all plots every 30 seconds while visible, with foreground/online reconciliation. Accessible list controls provide the same actions as walking to a plot, stall, chest or counter. Position is cosmetic and is not economic proof.

## Art and verification

Eight original assets use [the active pixel-art standard](FARM_ART_STANDARD.md): mystery packet, shared sprout/growing stages, watering can, two mature plants and two produce icons. Crop sprites have the existing 128×192 frame/pivot and two art pixels per world unit. Dry/wet soil reuses the approved terrain. Retained source/prompt/export recipe: `art/farm/crops-v1/` and `scripts/farm/export-crops.mjs`; runtime manifest/PNGs: `apps/web/public/farm-art/crops-v1/`.

Plant/water/harvest acknowledgements use a rough shared-rig lean with held tool/produce and modest water droplets. This is a prototype effect, not a fully authored four-facing action sheet. Jumps/region changes cancel old effects. Renderer readiness waits for the first painted frame before menus can pause it.

Validation: **58 regression checks**, typecheck, production build and **44 desktop/mobile-sized Chromium cases** pass. Actual PostgreSQL-in-PGlite tests cover concealed outcomes, 24-hour authority, once-only harvest/sales, request binding, daily supplies, stale revisions, conservation, owner/role denial, overflow and upgrading an existing F1 account. Browser Auth/RPC transport uses fixtures; browser cases cover offline return, storage, cancel/confirm quotes, dropped watering/sale responses, conflicts, account changes, device-clock changes, load failure and a no-RPC quick demo, alongside all earlier farm cases.

Hosted authenticated-role smoke (`packages/db/test/hosted-crops-smoke.sql`) passed and rolled back all test writes. Aggregate fingerprints of existing identity, wallet, farm/kit/receipts and Guess history remained identical before/after. No new security warning/error was introduced; private default-deny INFO notices are intentional. Existing bundle warnings remain. Real simultaneous database sessions, a real-account browser path, physical Android/iPhone Safari, long-session performance and the owner's crop feel/art review remain separate acceptance work.

Next: owner crop playtest, then **F3 pond fishing** with its small rod/cast/reel/fish batch, authoritative catch sessions and conserved supplies. Keep applied F1/F2 migrations, world geometry, old balances/inventory/history and permanent economic receipts intact.
