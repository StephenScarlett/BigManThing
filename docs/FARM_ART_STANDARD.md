# My lime art standard — detailed pixel art, v1

Owner direction, 6 October 2026: use the supplied shaded bottle and taller human sprite references as the visual standard for **every** farm asset. This replaces the low-detail F0 production proposal. References guide pixel clusters, material shading and human proportions; they are not game assets to copy.

## One shared scale

| Asset | Export contract | Runtime contract |
| --- | --- | --- |
| Terrain | 64×64 PNG tile | 32×32 world units; art density 2 px/unit |
| Character layer | 64×128 frame; 320×512 sheet | 32×64 units; feet (32,120) in artwork, (16,60) in world |
| Directions | Down, left, right, up rows | Eight-direction movement, four-facing art |
| Movement | Idle + four walk frames per row | Four-frame loop; stop immediately on idle; no idle bob |
| 1×1 prop | 128×192 PNG; pivot (64,160) | 64×96 units; 1×1 ground footprint |
| W×H prop | (64W+64)×(64H+128) | Pivot at (image width/2, image height−32) |
| Icons | 128×128 transparent frame | Normally 64×64 UI display with nearest filtering |
| Crop | 128×192 frame; same 1×1 prop pivot | One plot; generic shared stages until reveal |
| Fish | 128×128 icon; separate display pose | Species identity and rarity are catalogue data |
| Action | 256×512 sheet per four-frame action | Same rig, anchor and four facing rows |

Pixels are deliberate hard-edged clusters. Use nearest sampling for export/runtime, transparent sprite padding, no baked checkerboard, soft gradients, vector-smooth edges or noisy full-image pixel filters. Terrain tiles are opaque. A future richer asset may use a declared larger canvas at the same density; do not independently upscale the art inside its footprint.

The F0 map still uses 32-unit tiles and unchanged foot collision. Visual resolution does not change land dimensions, door positions, walking speed or player ownership. Small screen camera zoom may sample the 2× artwork down; larger previews expose the detail. Keep logical footprint and visual height separate.

## Style

Use adult human proportions: approximately 100–112 px tall within the character frame, a 20–26 px high head, clearly articulated hands/legs, and a readable face. Avoid giant heads, tiny legs and undifferentiated rectangle bodies. Build identity choices without prescribing gender.

One light comes from upper left. Material ramps have about 4–6 deliberate shades: warm highlight, local colour, mid shadow, cool/dark shadow and outline. Outlines use deep brown/plum rather than solid black everywhere. Cloth has readable folds; wood has restrained grain; metal/glass have small hard highlights; foliage uses leaf clusters. Keep shadow contrast stronger on props/characters than on repetitive ground. Saturated accents are allowed; avoid a global gritty colour filter.

Palette families: warm peach/umber skin, deep chestnut hair, honey/cream wood and plaster, brick/terracotta roof, subdued olive foliage, teal water, denim/indigo cloth and ochre/rust/teal clothing accents. Skin, hair, eye and garment colours remain editable; shared ramp structure matters more than identical hex values on every object.

## Customization and animation contract

Stable appearance fields: `bodyType`, `skin`, `hairStyle`, `hair`, `eyeStyle`, `eyes`, `topStyle`, `shirt`, `bottomStyle`, `pants`, `shoes`, `hatStyle` and `hat`. Choices must combine on all facings. IDs identify shapes, colours identify palettes; do not bake a whole new person into every shirt.

Starter batch: three body builds, four hairstyles plus bald, three eye shapes, basic tee/work shirt/overshirt, jeans/shorts, boots, optional cap and six skin ramps. These are free temporary demo choices. True bespoke body shapes and additional garment cuts need separate authored compatible layers in later batches; the initial body builds use a shared rig width transform, preserving head size and foot baseline.

Compose shadow, rear hair, body, shoes/bottoms, top, eyes/front hair, hat and tools. Export identical untrimmed frame bounds; if an atlas trims, retain source size and offset. Head/feet/hand anchors belong in metadata. Mirroring is allowed only for explicitly symmetric parts; future logos, asymmetrical hair and tools need their own right-facing exports.

A walk cycle must alternate planted legs and passing poses; keep head drift within 1–2 art pixels and shared baseline. All skin/clothes/hair use the same frame index. Walking follows **actual displacement**, so pushing against a wall stops the legs. Idle is frame zero. Water/cast/reel/interact reuse the same anchors in the later playable crop/fishing batches, not a new rig.

Generated art is a starting source, not a promise of frame-perfect animation. Retain the image generation prompts and source PNGs, normalize/export the transparent sheets, and verify them in the actual renderer. This first batch permits rough transitions; record visible limits rather than claiming hand-authored production animation.

## World, house and furniture

Top-down three-quarter view on an orthogonal grid; horizontal facade edges, no isometric diamond camera. Roof/facade show height, while foot depth controls occlusion. Keep contact shadows small and hard; render the character shadow separately. A bed/chair/tree has a foot-level blocker and a separately declared visual canvas. Transparent padding must never become a collision rectangle.

The first batch covers the existing demo: three grass variants, path, two water variants, wood floor, perimeter, dry/wet soil, wall, decking; a house, tree, rock, seed stall, selling counter, board, dock; bed, table, chair, chest, lamp, plant and rug. Props fit the existing footprints. The pond edge and house walls need readable joins; a later terrain batch can expand shoreline and wall autotiles.

Directional furniture uses down/right/up/left exports and matching footprint/approach metadata when placement is implemented. This walking demo needs the placed front orientations only. Symmetric items may explicitly reuse art. Do not infer rotation support or ownership from an image.

## Crops, seeds, fish and future batches

Mystery packets and early sprouts share art across hidden outcomes. Do not reveal a species via leaf shape, colour or growth speed before the intentional reveal. Mature crop sprites and harvested produce icons use the same lighting, density and material ramps as the starter pack. UI draws rarity borders/badges; do not bake them into item pixels. Fish icons use clear silhouette, fins and restrained wet highlights; review names/habitats before authoring a species bank.

Batch 1: existing demo character + world/home. Batch 2: one mystery packet, common generic growth stages, watering/interact actions, two mature crops and produce icons for a complete crop loop. Batch 3: rod/cast/reel/bobber and a reviewed small pond fish set. Batch 4: approved additional body/wardrobe/furniture families and four orientations. Do not mass-produce a catalogue before the owner reviews this batch in motion.

## Delivery and acceptance

Version folder: `apps/web/public/farm-art/v1/`. Keep PNGs, animation/material/pivot manifest, generation provenance and editable layer definitions. Source PNGs and export recipe belong under `art/farm/v1/` and `scripts/farm/`; browser downloads only the optimized runtime sheets. PSD/Aseprite sources are not available from the generated sources; PNG plus JSON and the compositor are the editable delivery for this prototype.

Accept batch 1 when four facings walk/stop correctly, every starter choice is visible, feet stay fixed across body/hair/clothing choices, sprites have genuine alpha and consistent scale, house doors remain safe, props occlude correctly, terrain has no conspicuous tile gutters, and the existing keyboard/touch/pause/resize/route tests pass. Exercise both WebGL and Canvas plus desktop/mobile-sized Chromium. Physical phones/Safari and owner art approval remain separate checks.

For future generation: name the asset and footprint, reference the approved starter pack, repeat art density/frame/pivot and upper-left light, require transparent padding and crisp pixel clusters, and explicitly exclude new camera angles or enlarged heads. Export to the manifest rather than changing world dimensions to make a picture fit.
