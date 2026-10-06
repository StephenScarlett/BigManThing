# Saved farm, house and character: F1

Development checkpoint: **6 October 2026**. `/farm` adds account-owned state to the [F0 renderer](FARM_PROTOTYPE.md) and [art batch 01](FARM_ART_STANDARD.md). The additive `20261006221529_farm_persistence_v1.sql` migration is applied to the owner's development database. Delivery remains [PR #4](https://github.com/StephenScarlett/BigManThing/pull/4), branch `feat/guess-v2-room-rewards`; this checkpoint does not merge or publish the frontend.

## Test this batch

Use the current development branch, install the frozen lockfile, configure the existing public Supabase environment variables and run `pnpm dev:web`. Open **`/farm`**, or choose **My lime**. `/farm/demo` still works without login and keeps temporary state only.

1. Sign in with your existing account. Press **Create my farm** once. Opening the page alone does not grant a farm or starter items.
2. Open **Character**, change the name, body build, hair, eyes, clothing and colours, and press **Save character**. Wait for **Character saved** and close the menu.
3. Walk with WASD/arrows or touch controls. Press E/the action button at the house door, then walk inside. Press **Save now** and wait for **Saved** before refreshing.
4. Refresh: your character, house scene and feet position should return. Check **Bag** for six mystery seeds, one watering can and one fishing rod. Reopening or pressing Create again must not replenish items or welcome currency.
5. Open the same farm in a second tab. Save a move there, then move in the older tab. The older tab should pause with a conflict message; **Load saved farm** restores the latest checkpoint.
6. If the connection drops, look for the unsaved status/error. Restore the connection and retry the same action. Changing accounts must load that account's own farm and drop the previous account's draft.

Guest signup is currently disabled in the development Auth configuration. Its error now leaves Google/email and retry actions available; use an existing account for this playtest. Guest-to-permanent-account linking remains separate work. Physical Android/Safari testing and long-session performance are still open.

Please report character/layer or walk-animation problems, feet collisions/door issues, awkward touch controls, and any save/refresh discrepancy, including browser/device and the visible save status.

## Implemented contract

The owner receives a frozen **world version 1**: a 64×48 yard, 10×8 furnished house, six plots, pond/dock, stalls and noticeboard. Terrain tiles, dimensions, interaction points, props, blockers and safe spawns arrive from the server. Both rendering and position validation use that version. Original pixel art and rough four-facing movement stay unchanged in style; identity choices are free starter options, separate from the old room's gacha outfit inventory.

`packages/shared/src/farm.ts` owns the shared runtime geometry and appearance contract. `packages/db/content/farm-world-v1.json` and `farm-appearance-v1.json` retain the migration's frozen data; database tests compare them to shared terrain, props and collisions. Never rewrite an applied version. Publish a new world version and an explicit migration/restore path for later geometry or appearance changes.

| RPC | Behavior |
| --- | --- |
| `bmt_farm_context(p_owner)` | Returns only the authenticated owner's farm or null; does not create/grant. Repairs an invalid checkpoint to its scene's safe spawn once. |
| `bmt_farm_create` | Creates one owned world and one `farm-starter-v1` grant: six seeds and two tools. Locks the existing wallet before farm state; old welcome currency is never repeated. |
| `bmt_farm_save_character` | Validates the exact published appearance choices and a 1–20-character name. Saves with a character revision and UUID receipt. |
| `bmt_farm_save_position` | Validates scene, facing, numeric feet bounds/blockers and world version. Saves a cosmetic checkpoint with a separate position revision and UUID receipt. |

Every entry checks `auth.uid()` against the expected owner sent by the page. Clients cannot access private farm tables or internal helpers; public wrappers are authenticated-only. Anonymous *unauthenticated* requests cannot call them. Position, names and character choices cannot grant goods, coins, Rolls or scores.

Character and position saves have independent revision lanes, so walking cannot invalidate a character save. Conflicting tabs pause until explicit reload. Failed requests retain their UUID and original body; repeated saves return the original acknowledgment before checking the old revision. Reusing a UUID with a different body fails. The most recent 64 cosmetic receipts are retained; a very old evicted request fails its stale revision safely. The one-time starter grant is permanent and separate from that pruning.

Walking publishes a checkpoint after stopping (800 ms debounce) and periodically during continuous movement (five seconds). Failed automatic writes stop until manual retry or reconnection. There is no write per animation frame and no clock-based reward. Unsaved drafts/checkpoints warn before browser unload; closing a tab does not promise an asynchronous save. Wait for Saved. **Load saved farm** deliberately discards local drafts and outstanding retries. Responses arriving after reload/account change are ignored.

## Verification

Run `pnpm test`, `pnpm typecheck`, `pnpm build`, then `pnpm --filter @bmt/web test:farm` after installing Chromium. Do not rebuild shared output while the browser dev server is running. Optional `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` selects an existing local Chromium.

Local validation: **48 regression checks**, **28 desktop/mobile-sized Chromium cases**, typecheck and production build pass. The browser suite exercises the real React/Auth client with deterministic Auth/RPC transport fixtures; SQL tests separately exercise actual ownership, grants, validation and receipts. This is not a completed real-account end-to-end browser test.

A disposable pre-F1 state was restored and upgraded in database tests with identical prior wallet, inventory, ledger, pity and Guess-edition fingerprints. A real hosted authenticated/unauthenticated-role smoke transaction also passed and rolled back; existing development identity, balances, inventory, ledger and Guess-history fingerprints remained unchanged. `packages/db/test/hosted-farm-smoke.sql` is the repeatable transaction. No broad reset or Auth configuration change occurred.

## Next batch

**F2 is one crop loop:** buy/plant a mystery seed, water it, mature using server time across refresh/offline time, reveal/harvest once, keep or sell. Add only its seed/soil/growth/harvest and watering/action art. Fishing, furniture placement, quests, house bonuses, upgrades and the main-game bridge remain later batches. Current seeds/tools are owned inventory; their gameplay is not enabled yet.
