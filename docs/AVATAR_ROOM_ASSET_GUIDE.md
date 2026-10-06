# Avatar and room asset brief

Version 1, **6 October 2026**. This is a production brief for the owner's separate asset-creation chat. The development app currently uses procedural SVG placeholders. The brief describes the **next sprite renderer**, not an already-completed asset pipeline. Keep the database item IDs in [home-items.json](../packages/db/content/home-items.json) stable when art replaces placeholders.

## Art direction

An original, warm Trinidad and Tobago room: wood, tile, breeze, plants, a steelpan corner, comfortable clothes and a few colourful statement pieces. The view is **2:1 isometric pixel art**. Start at small scale with readable silhouettes and restrained details. A room should feel lived in without filling every tile. Rarity can add craftsmanship, animation or a special silhouette; Common pieces should still be attractive.

Use a shared palette, one consistent light direction from upper left, crisp pixels, simple dark outlines and restrained ground shadows. No baked UI text, gradients, glossy cards, perspective drift, photographed faces or logos. Skin tones, basic hair and everyday outfits are free identity options, not rarity rewards. Body shape and clothing should not imply a mandatory gender selection.

Generate concepts first, then choose **one master rig**. Image generators may help explore style, but an apparently neat sheet is not proof of equal frame geometry, aligned pivots or seamless animation. Finalise frames and transparent exports in a pixel editor such as [Aseprite](https://www.aseprite.org/). Have the renderer compose one outfit from separate layers; do not create a full character image for every clothing combination.

## Exact starting contract

| Asset | Logical pixels | Views / frames | Anchor |
| --- | --- | --- | --- |
| Floor tile | **64×32** | One diamond; repeatable edges | Ground origin at top corner; centre (32,16) |
| Character layer | **32×48 per frame** | Four diagonal facings; idle + four walk frames each | Feet at **(16,44)** in every frame |
| Character sheet | **160×192** | Five columns × four rows; 20 frames | Preserve each frame's anchor; transparent padding is part of the contract |
| Furniture view | **224×192 per frame** | Two authored orientations, A and B | Footprint's rear ground corner at **(112,112)** |
| Item icon | **64×64** | One representative view | Centred, transparent, readable small |
| UI tile preview | Derived | Reuse the approved item art | Never bake prices, odds or rarity labels into pixels |

Character sheet row order: **SE, SW, NW, NE**. Column order: **idle, walk-1, walk-2, walk-3, walk-4**. On the grid, +x faces SE, +y faces SW, −x faces NW and −y faces NE. Use a small four-frame walk cycle; preserve limb/body geometry across wearable layers. Rendering can scale by integer multiples using nearest-neighbour filtering. A higher-resolution concept image is not the delivered sprite sheet.

Furniture coordinates use the same tile projection: `screenX = (x − y) × 32`, `screenY = (x + y) × 16`. The footprint's rear corner is the asset pivot. A 2×1 footprint occupies two x tiles; orientation B occupies 1×2. The engine positions the pivot at the projected placement origin. These constants differ from the current procedural placeholder's centre-based drawing; replace the renderer's positioning when importing sprites rather than silently shifting the assets.

Use the fixed furniture frame for initial exports. Atlas packing may trim transparent padding **only if original size, trim offsets and pivot are retained in metadata**. Two orientations are required even when they can be safely mirrored: lettering, lighting, cushions and asymmetric furnishings often make a simple flip wrong. Four views can follow later; the database currently permits only rotations 0 and 1.

## Character layering

Back to front: shadow → rear hair → base skin/body → shoes → bottoms → top → front hair → hat. Rear/front hair may be separate sheets for one owned hair item. Each layer uses the same 32×48 frame, facing, animation index and anchor. Empty regions must remain transparent. Do not resize the body to fit a jacket or flatten hair to fit a hat; use an explicit compatible overlay/mask if needed.

Start with one rig and eight free skin palettes. Either export all eight base-body sheets or export a documented skin mask/palette system that can reproduce them consistently. Decide that before producing clothing. Provide three basic hair shapes, two tops, two bottoms and shoes. Test curls/locs with both hats, light/dark clothing against every skin tone, and front/back facing combinations.

The current five equipment slots are **hair, hat, top, bottom, shoes**. A named full outfit needs an explicit bundle of slot items or a later multi-slot item contract. `suit-sunset` currently occupies the **top slot only** as a placeholder; do not assume pants/shoes are already included by the database. If it becomes a full outfit, add bundle/equip rules through a migration instead of overwriting ownership meaning.

## Room layers and item geometry

The room is 8×8 tiles; the current limit is 24 placed items. Each furnishing declares a footprint, A/B orientation and layer. Rugs are floor layer 0; solid furniture is layer 1. Two solid footprints cannot overlap, and two rugs cannot overlap in this prototype. A rug may sit beneath a chair. The server verifies the whole footprint stays within the room and that placed copies do not exceed inventory.

For the sprite renderer, derive depth from grid coordinates and footprint, not sprite-image height. Keep large transparent regions out of hit testing. Test a character in front of, beside and behind a chair, table, plant and sofa. Tall/wide props may eventually need foreground/background pieces or an occlusion mask. They should not become an invisible wall to clicks.

Paint ground shadows separately from the main furnishing where practical. For active props, add a short optional overlay animation rather than redrawing a whole room. The first art pass needs still furniture, idle characters and one walk cycle; seating, interaction poses, particles and animated Legendary effects can follow. Maintain a static/reduced-motion option.

## The 28 current item IDs

The names are working labels. Appearance and labels can change; use these IDs to preserve inventory.

| Set | IDs | Art requirement |
| --- | --- | --- |
| Free hair | `hair-short`, `hair-curls`, `hair-locs` | Three distinct, compatible hair silhouettes |
| Free clothes | `tee-red`, `tee-blue`, `pants-dark`, `pants-denim`, `shoes-basic` | Master-rig layers; five slots do not require five independent bodies |
| Starter room | `chair-basic`, `table-basic`, `plant-basic`, `rug-basic` | Chair 1×1, table 2×1, plant 1×1, rug 2×2/layer 0 |
| Common wardrobe | `hat-mint`, `tee-mustard`, `pants-indigo` | Attractive everyday collection pieces |
| Rare wardrobe | `hair-volume`, `hat-straw` | A larger curl silhouette; a straw hat that remains compatible with hair |
| Epic wardrobe | `jacket-fete`, `hat-pan` | Distinct jacket and cap; no copyrighted band/team insignia |
| Legendary wardrobe | `suit-sunset` | One statement top initially; full-set expansion requires explicit bundle handling |
| Common room | `stool-red`, `plant-fern`, `lamp-warm` | All 1×1; visibly different from starter props |
| Rare room | `sofa-teal`, `fan-standing` | Sofa 2×1; fan 1×1; two consistent orientations |
| Epic room | `steelpan`, `arcade-cabinet` | Both 1×1; original steelpan/arcade design, readable silhouette |
| Legendary room | `sofa-carnival` | 3×1 lounge; clear footprint, authored A/B views |

A complete starter room also needs three floor finishes, three wall finishes and a simple window. Make finish variants compatible rather than separate themed rooms that lock out common furnishings. Later thematic sets might cover a veranda, pan yard, reading nook, beach retreat or Carnival dressing corner. Research any recognisable cultural objects and use original depictions; rarity is an editorial game value, not a cultural ranking.

## File delivery and manifest

Suggested repo paths after the art pass:

```text
apps/web/public/art/v1/character/base/skin-0.png
apps/web/public/art/v1/character/hair-short/front.png
apps/web/public/art/v1/character/hair-short/back.png
apps/web/public/art/v1/character/tee-red.png
apps/web/public/art/v1/furniture/chair-basic-a.png
apps/web/public/art/v1/furniture/chair-basic-b.png
apps/web/public/art/v1/icons/chair-basic.png
apps/web/public/art/v1/room/floor-0.png
apps/web/public/art/v1/manifest.json
```

Each manifest item should identify its stable database ID, asset version, licence/creator, icon, source dimensions, frame layout, pivot, footprint/layer where relevant, and paths for each orientation/layer. Supply source project files as well as PNGs. Prefer RGBA PNG and transparent backgrounds; no white rectangle, cropped feet, watermarks or accidental coloured edge pixels. Keep an attribution/source register even for owner-created or generated assets.

The manifest is not wired into the current renderer. The next implementation must load/validate it, use fallback art if an item fails, map owned IDs to assets, and preserve RPC authority. A missing sprite must never make an owned item disappear from the inventory or prevent a room save.

## Performance and acceptance

Initial **targets to measure**, not proven benchmarks: room art lazy-loaded after entering My lime, a small initial atlas (aim below 2 MB compressed), 1024×1024 atlases where practical, no uncapped particles, no constant offscreen scene updates, and acceptable interaction on a typical older Android browser. If these budgets fail, reduce decoded textures/animation before adding an engine. [PixiJS guidance](https://pixijs.com/8.x/guides/concepts/performance-tips) supports using sprite sheets and testing texture/scene complexity rather than treating culling as an automatic improvement.

Accept a batch only after:

1. Pixel sizes, sheet row/column order, alpha and pivots match the contract.
2. All layers compose without moving feet, leaking background or changing the master body's shape.
3. Both furniture orientations match their actual 1×1/2×1/3×1 footprints and lighting.
4. A character moves around wide/tall furniture with correct depth and readable occlusion.
5. Small icons and all free identity options remain legible on light/dark backgrounds.
6. Real phone touch, keyboard controls, loading failure and reduced-motion behavior are checked.

## Prompt for the separate asset chat

> I am creating original art for BigManThing, a Trinidad and Tobago browser-game platform. Design a warm, lived-in personal room and a modular human avatar in crisp 2:1 isometric pixel art. Use a shared limited palette, upper-left light, simple outlines and transparent backgrounds. Begin with a concept showing one master avatar, short hair/curls/locs, two everyday tees, two trousers, shoes, and a room containing wooden chairs, a small table, a plant, a woven rug and a window. Keep the silhouettes readable at small size. Do not copy Habbo, Highrise, Nintendo characters, furniture, logos or textures. After the style is approved, we will create production assets to the attached BMT contract: 64×32 tiles, 32×48 avatar frames, 160×192 layered character sheets with four diagonal facings and five animation columns, and 224×192 furniture views with the documented pivot. First deliver a style concept; precise production sheets will be checked and aligned separately.

After approval, request **one starter batch**, not dozens of Legendary items at once. Build the master rig and composition test first; expand the same style only after the room/character reads well in the browser.
