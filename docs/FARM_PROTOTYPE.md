# Walkable farm and house: F0

Development checkpoint: **6 October 2026**. This implements the isolated renderer spike from [the farm/home design](FARM_AND_HOME_DESIGN.md), not the persistent farming economy. The active art contract is [FARM_ASSET_GUIDE.md](FARM_ASSET_GUIDE.md).

## Try it

On the current development branch, install with the committed lockfile, run `pnpm dev:web`, and open **`/farm/demo`** on the local web server (normally `http://localhost:5173/farm/demo`). The room preview also links to it. No login is required. Nothing here buys seeds, grants fish, spends coins, saves a house or changes an account. Appearance and location are temporary and reset on leaving/reloading.

- Click/focus the world, then use **WASD or arrows**. Movement is eight-directional; the rig has down/left/right/up facings.
- Press **E** or the context action button near a door to enter/exit. Entering is an explicit action, not an automatic proximity trigger.
- Hold the direction buttons on touch devices. Two fingers can combine directions; cancellation/release clears the appropriate pointer.
- Use **Jump to test** for the house door, six plots, seed stall, selling counter, noticeboard or dock. Inside, jump to the door, chest or furniture. These are prototype navigation aids, not future teleport upgrades.
- Try **Character** for skin/hair/shirt colours. Changes appear in the world when the menu closes. Bag/help/object descriptions explain later systems without pretending to award inventory.
- Pause or open a menu to stop movement. Menus use a native modal dialog with focus containment, Escape dismissal and return focus. Leaving the page/tab or moving focus outside the farm clears held inputs.
- Open **Movement diagnostics** to inspect feet position, facing, scene and camera zoom.

## Implemented scope

The farm is 64×48 square tiles; the house is a separate 10×8 interior. It contains an original procedural 32×64, twenty-frame placeholder character, house, trees, rocks, six soil plots, market props, a pond and walkable dock. Inside are bed/table/chair/chest/lamp/plant/rug placeholders. Solid foot-level metadata is separate from texture size; trees/furniture and actors use ground-Y depth, and rugs/dock remain below them. The camera follows the actor and centres a small house within larger viewports. Integer zoom adapts between mobile and desktop; ResizeObserver updates the renderer on layout changes.

**Phaser 4.2.1** is pinned and dynamically imported only from the farm viewport. The production farm engine chunk measured about **1.69 MB minified / 385 KB gzip** in the initial build; it is not added to the main-game entry chunk. Tilemap rendering culls ground tiles. Audio is disabled in this slice. React owns accessible controls/dialogs; the renderer owns animation, camera and the frame loop. Position snapshots are throttled, with immediate final-stop/pause publication.

This spike uses a small pure TypeScript foot-collision/movement policy rather than enabling a separate Arcade physics world. That same function runs in the renderer and geometry tests. It normalises diagonals, slides along blockers, substeps movement to avoid thin-wall tunnelling, clamps long frame deltas and recovers unsafe positions to a safe spawn. Economic authority is entirely outside this policy. Renderer adoption remains provisional until physical device/play-feel checks; do not infer mobile performance from headless Chromium.

No Supabase migration, RPC, catalogue, balance, profile, inventory or history changed in this batch. Existing Guess people-v2 and room/reward APIs remain intact. The shared site auth provider is unchanged; the farm feature does not call it or create an anonymous account.

## Files and verification

Implementation: `apps/web/src/features/farm/` and `apps/web/src/pages/FarmDemoPage.tsx`. Tests: `farm-world.test.ts`, `apps/web/e2e/farm-demo.spec.ts` and `apps/web/playwright.config.ts`.

Run:

```sh
pnpm typecheck
pnpm test
pnpm build
pnpm --filter @bmt/web exec playwright install chromium
pnpm --filter @bmt/web test:farm
```

The browser web server uses dummy local Supabase configuration, not production credentials. Optional `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` supports an already-installed local Chromium. CI installs its test browser and runs both desktop and mobile-sized Chromium cases, retaining screenshots/traces for review. Vitest excludes the separate browser suite; TypeScript checks its configuration and tests too.

Geometry checks cover safe spawns/interaction approaches, reachable paths, normalised movement, collision/sliding, dock/water/furniture/rug boundaries, invalid inputs, explicit door round trips, art pivots and small-world camera bounds. Input checks cover keyboard/pointer ownership, multiple pointers, release/clear, opposite directions and held-E suppression.

Browser checks cover no-login startup, one canvas, repeated house round trips, movement/walls/blur/pause, modal typing/focus, two-finger touch cancellation, portrait/landscape resizing, repeated route teardown/recreation, no economic RPCs, and rendering/collision with WebGL disabled (Canvas fallback). A first pass exposed a stale final HUD position after blur. The fix publishes the final stop immediately and synchronises the snapshot when clearing input; the regression remains in the suite.

Checkpoint results: **40 regression checks, twelve Chromium browser cases, typecheck and production build passed**. Desktop and mobile-sized browser cases are automation, not physical device testing. The local environment's standard browser download failed; tests used an isolated Chromium 153 binary with normal web security retained. Lifecycle scripts were kept disabled, and the installed platform esbuild binary built successfully. CI includes the browser suite; its result is recorded with the published PR checkpoint rather than assumed here.

## Explicitly unfinished

No real crop instances, timers, fish/minigame, saved farm/avatar, furniture placement, house score, quests, rolls or daily supply bridge exist in this renderer. Bag entries and interactable descriptions are explanatory placeholders. No original production asset pack, real phone/Safari playtest, measured low-end frame-rate budget or frontend hosting release is claimed. Existing lint/package and broader platform issues remain separate.

Next is **F1**: additive saved farm/house/avatar state, starter ownership and migration/restore checks, preserving existing accounts/inventory/history. Then **F2**: private mystery outcomes, server-timed watering/maturity, atomic harvest/storage/selling; **F3**: the pond catch loop. In parallel, the first Guess daily still requires factual/clue review. Do not connect client-only preview positions or interactions to rewards.
