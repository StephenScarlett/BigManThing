# F2 crop pack

Eight original prototype assets generated with built-in image generation using the approved starter plant as a style reference. Exact prompt and normalization notes are in `provenance.json`. The exact original transparent `crops.png` is stored as `source/crops.png.partNN` files, in the order declared in `source/parts.json`, with its byte count and SHA-256 checksum. This avoids the large-file API transport limit without changing any source pixels or bytes. The exporter reassembles and verifies it in memory; no manual download or reconstruction is needed.

Run `node scripts/farm/export-crops.mjs` from the repository with Sharp available. In Codex, the exporter can resolve Sharp via `CODEX_PRIMARY_RUNTIME_NODE_MODULES`; elsewhere install it in an isolated tooling environment. Do not change the application's frozen lockfile just to re-export art.

The recipe extracts declared source rectangles, removes alpha below 160, makes remaining alpha opaque, trims transparent gutters and fits each object with nearest sampling. It pads to the declared frame and pivot, then emits eight PNGs and `manifest.json` under `apps/web/public/farm-art/crops-v1/`. Four plant stages use 128×192 and pivot (64,160); packet, can and produce use 128×128 icons. Runtime art density stays two pixels per world unit.

Early stages are shared across the two hidden outcomes. Mature plants and produce reveal only from server-approved state. Terrain/geometry and starter avatar sources are unchanged. The runtime uses a rough rig lean and these tool/icons for acknowledgements; no native Aseprite/PSD source or authored four-facing action sheet is claimed.
