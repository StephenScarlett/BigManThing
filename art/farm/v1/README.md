# Batch 01 — detailed pixel art

The supplied style references establish the shared standard in [FARM_ART_STANDARD.md](../../../docs/FARM_ART_STANDARD.md). This folder retains original generated source PNGs and exact prompts. Browser assets are in `apps/web/public/farm-art/v1/`; the browser does not load these large source sheets.

Re-export with `node scripts/farm/export-art.mjs` from the repository root. Install `sharp` for a standalone run, or set `CODEX_PRIMARY_RUNTIME_NODE_MODULES` to the runtime that supplies it. Extraction rectangles record measured generated layout; do not assume the source props use perfect grid alignment.

`manifest.json` records frames, directions, pivots, density and footprints. `farm-avatar.ts` composes the starter identity/wardrobe options on that rig. Add new masks/layers to the same frame contract, rather than making an unrelated whole-character sprite for each outfit. Current body build changes preserve head size and the foot baseline; bespoke body anatomy belongs to a later compatible rig batch.

The demo is still temporary. Art/customization do not create saved ownership, crop/fish inventory or economic rewards. The animations are workable first-pass loops with shared neutral passing poses; inspect them in `/farm/demo` and the Character menu before commissioning additional clothing/action sets.

Editable delivery: source PNGs, JSON, exporter and compositor. No Aseprite/PSD file is claimed. Generation used the built-in tool, with no downloaded third-party game artwork.
