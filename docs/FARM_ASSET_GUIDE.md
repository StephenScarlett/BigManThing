# Farm and home asset guide

Updated 6 October 2026 for the owner's detailed pixel-art references. The active standard is [FARM_ART_STANDARD.md](FARM_ART_STANDARD.md). It replaces both the earlier isometric brief and the F0 low-detail 32×64 **art export** proposal. Logical world dimensions remain unchanged.

## Current contract

| Element | Artwork | World/display |
| --- | --- | --- |
| View | Top-down three-quarter, orthogonal squares | Following camera; separate enterable house |
| Tile | 64×64 pixels | 32×32 world units |
| Character frame | 64×128 pixels | 32×64 units |
| Feet anchor | (32,120) | (16,60) |
| Character sheet | 320×512; five columns, four rows | Idle + four walk poses; down/left/right/up |
| Action sheet | 256×512 per four-frame action | Same anchors and facings; crop/fishing batches later |
| 1×1 prop | 128×192; pivot (64,160) | 64×96 units; foot blocker separate |
| W×H prop | (64W+64)×(64H+128); pivot at (width/2,height−32) | 32W×32H ground footprint |
| Icons | 128×128 transparent | Normally 64×64 in UI |
| Sampling | Crisp deliberate clusters; nearest; no dithering | Integer zoom where practical; small screens may downsample |

Characters, clothes, props, house, crops, seeds, fish, tools and icons use the same pixel density, upper-left lighting, shaded material ramps and warm coloured outlines. Adult human proportions and readable materials follow the supplied references. No mass wardrobe/species production before the first batch is reviewed in motion.

## Implemented starter batch

Open `/farm/demo` and use **Character**. Its live four-facing preview shows starter body builds, hairstyles, eyes, tops, bottoms, cap and colour choices. All state is temporary. The shared-rig body builds change width while preserving head size and feet; they are not three independently authored anatomy sets. Garment cuts/eye/cap detail use editable aligned overlays. Rough generated contact poses combine with neutral passing legs for the first walk loop.

The existing demo now loads the house, tree, rock, stall, counter, board, dock, bed, table, chair, chest, plant, lamp, rug and threshold. The terrain sheet contains three grass variants, path, two waters, floor, perimeter, dry/wet soil, wall and decking. This is a visual batch, not persisted plants, fishing, furniture placement or new economy rules.

Runtime: `apps/web/public/farm-art/v1/` (18 PNG files plus manifest). Sources/prompts: `art/farm/v1/`. Export: `scripts/farm/export-art.mjs`. Composition: `apps/web/src/features/farm/farm-avatar.ts`. Source layouts have measured extraction rectangles; generated prop sheets are not perfectly uniform grids. Runtime PNGs use indexed palettes without dithering, with alpha and nearest conversion. The first pack totals about 350 KB of PNGs; retained source PNGs are excluded from browser downloads.

Editable delivery is PNG + JSON + exporter/compositor; no Aseprite/PSD source is claimed. Built-in image generation created original artwork using the references for style. No third-party game sprites are included.

## Compatibility rules

- Every body/garment/hair/action layer shares frame bounds, anchors and facing order. Future bespoke body shapes require compatible clothes/actions or authored masks.
- Stable appearance shape IDs are separate from palette colours. Identity options remain freely editable; later collection items add designs.
- Existing item IDs and room ownership semantics remain unchanged. A full-body outfit needs explicit equipment rules; art alone cannot silently fill several owned slots.
- Ground-Y sorts actors/props. Rugs/dock belong below actors. Texture padding and tall roofs/foliage do not define collision.
- Door/spawn/interaction cells remain safe. Placement and four furniture rotations require matching footprint/approach metadata plus ownership checks in later milestones.
- Generic packets/sprouts remain identical across hidden seed outcomes. Rarity belongs in UI/catalogue metadata, not a permanently baked outline.
- Fish names/habitats must be reviewed before species art; marine and pond collections stay distinct.

## Next controlled batches

1. Review the starter demo in motion, including all facings, clothes, foot baseline, door scale and home furniture. Physical Android/Safari remain open.
2. One crop loop: mystery packet, generic sprouts, two approved mature crops/produce icons, watering and interaction actions.
3. One pond: rod, casting/reeling, bobber/bite/land effects and a small reviewed fish set.
4. Additional body/wardrobe/furniture families and four rotations after compatibility is demonstrated.

Saved farm/avatar is still F1. Planting, server-timed growth, harvest/store/sell is F2. This art delivery does not imply either milestone is implemented.

## Copy-ready brief

> Create original detailed pixel art for BigManThing's My lime farm, matching our approved starter pack. Use crisp clusters, warm coloured outlines, about 4–6 shades per material, one upper-left light and readable adult human proportions. Terrain art is 64×64 per 32-unit square tile; no isometric diamonds. Character layers are 64×128, feet (32,120), five columns (idle then four walk poses), four rows (down/left/right/up), making 320×512 sheets. Keep the same head/hand/foot anchors for body, eyes, rear/front hair, shoes, pants, tops, hats and tools. Four-frame actions use 256×512 sheets. Props use 64 pixels per ground tile with declared padding/pivots; a 1×1 prop is 128×192 at pivot (64,160). Icons are 128×128. Require genuine alpha, no checkerboard, blur, smooth 3D shading or arbitrary extra detail. Retain source PNGs, frame/pivot metadata and editable layers. Show a small coherent batch in the actual walking game before expanding. Generic mystery seedlings cannot reveal the hidden crop; fish/species names and all economic rarities are separate reviewed catalogue data.
