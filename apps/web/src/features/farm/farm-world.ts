/** F0-only geometry. No account, inventory, rewards or clocks are stored here. */
export const TILE = 32;
export const WALK_SPEED = 128;
export type Facing = "down" | "left" | "right" | "up";
export type SceneId = "farm" | "house";
export type Point = { x: number; y: number };
export type Actor = Point & { facing: Facing };
export type Rect = Point & { width: number; height: number };
export type PropKind = "house" | "tree" | "rock" | "plot" | "stall" | "counter" | "board" | "dock" | "bed" | "table" | "chair" | "chest" | "plant" | "rug" | "lamp";
export type Prop = { id: string; kind: PropKind; x: number; y: number; w: number; h: number; solid: boolean };
export type Interaction = { id: string; label: string; position: Point; approach: Actor; transition?: SceneId; description: string };
export type World = { id: SceneId; columns: number; rows: number; spawn: Actor; blockers: Rect[]; props: Prop[]; interactions: Interaction[] };
export type Appearance = {
  skin: string; hair: string; shirt: string; eyes: string; pants: string; shoes: string; hat: string;
  bodyType: "slim" | "regular" | "broad";
  hairStyle: "bald" | "crop" | "curls" | "bob" | "ponytail";
  eyeStyle: "round" | "soft" | "sharp";
  topStyle: "tee" | "work-shirt" | "overshirt";
  bottomStyle: "jeans" | "shorts";
  hatStyle: "none" | "cap";
};
export const DEFAULT_APPEARANCE: Appearance = { skin: "#b8774e", hair: "#704532", shirt: "#d5a33d", eyes: "#437c68", pants: "#4773a2", shoes: "#73463e", hat: "#546e79", bodyType: "regular", hairStyle: "ponytail", eyeStyle: "soft", topStyle: "tee", bottomStyle: "jeans", hatStyle: "none" };
export const APPEARANCE_CHOICES = {
  skin: ["#f0c5a0", "#d99c69", "#b8774e", "#8b553a", "#603c2d", "#3d2925"],
  hair: ["#302724", "#704532", "#be8346", "#d7cec0"],
  shirt: ["#b74437", "#3a7770", "#e0b655", "#686992", "#eee0c0"],
  eyes: ["#437c68", "#5176aa", "#794b31", "#392925", "#a07b3b"],
  pants: ["#4773a2", "#405444", "#5a455d", "#836442", "#34363b"],
  shoes: ["#73463e", "#483c34", "#94764a", "#ded3b7"],
  hat: ["#546e79", "#ae543d", "#ccad67", "#49455c"],
} as const;
export const APPEARANCE_STYLES = {
  bodyType: [{ id: "slim", label: "Slim" }, { id: "regular", label: "Regular" }, { id: "broad", label: "Broad" }],
  hairStyle: [{ id: "bald", label: "Bald" }, { id: "crop", label: "Short crop" }, { id: "curls", label: "Curls" }, { id: "bob", label: "Bob" }, { id: "ponytail", label: "Ponytail" }],
  eyeStyle: [{ id: "round", label: "Round" }, { id: "soft", label: "Soft" }, { id: "sharp", label: "Sharp" }],
  topStyle: [{ id: "tee", label: "Tee" }, { id: "work-shirt", label: "Work shirt" }, { id: "overshirt", label: "Overshirt" }],
  bottomStyle: [{ id: "jeans", label: "Jeans" }, { id: "shorts", label: "Shorts" }],
  hatStyle: [{ id: "none", label: "No hat" }, { id: "cap", label: "Cap" }],
} as const;
const at = (x: number, y: number): Point => ({ x: x * TILE, y: y * TILE });
const actor = (x: number, y: number, facing: Facing): Actor => ({ ...at(x, y), facing });
const rect = (x: number, y: number, width: number, height: number): Rect => ({ ...at(x, y), width: width * TILE, height: height * TILE });
const prop = (id: string, kind: PropKind, x: number, y: number, w = 1, h = 1, solid = true): Prop => ({ id, kind, x, y, w, h, solid });
const edges = (w: number, h: number) => [rect(0, 0, w, 1), rect(0, h - 1, w, 1), rect(0, 1, 1, h - 2), rect(w - 1, 1, 1, h - 2)];
const solids = (props: Prop[]) => props.filter(p => p.solid).map(p => rect(p.x, p.y, p.w, p.h));

const farmProps: Prop[] = [
  prop("starter-house", "house", 19, 15, 6, 4),
  prop("seed-stall", "stall", 17, 23, 2, 1),
  prop("sell-counter", "counter", 20, 25, 2, 1),
  prop("noticeboard", "board", 25, 19),
  prop("pond-dock", "dock", 32, 25, 7, 2, false),
  ...Array.from({ length: 6 }, (_, i) => prop(`plot-${i + 1}`, "plot", 26 + i % 3, 22 + Math.floor(i / 3) * 2, 1, 1, false)),
  ...[[15, 15], [28, 16], [30, 19], [14, 22], [16, 28], [29, 29], [33, 32], [49, 24], [45, 16], [10, 10], [38, 12], [51, 34], [12, 35], [24, 37], [52, 10], [8, 25], [40, 38]].map(([x, y], i) => prop(`tree-${i}`, "tree", x!, y!)),
  prop("rock-1", "rock", 31, 22), prop("rock-2", "rock", 15, 31),
];
const houseProps: Prop[] = [
  prop("starter-bed", "bed", 1, 1, 2, 3),
  prop("starter-table", "table", 5, 2, 2, 1),
  prop("starter-chair", "chair", 6, 4),
  prop("starter-chest", "chest", 7, 1, 2, 1),
  prop("starter-plant", "plant", 8, 5),
  prop("starter-lamp", "lamp", 4, 1),
  prop("starter-rug", "rug", 3, 4, 3, 2, false),
];
export const WORLDS: Record<SceneId, World> = {
  farm: {
    id: "farm", columns: 64, rows: 48, spawn: actor(22, 20, "down"), props: farmProps,
    // Water is solid except for the two-tile dock extending to column 39.
    blockers: [...edges(64, 48), ...solids(farmProps), rect(36, 20, 12, 5), rect(36, 27, 12, 3), rect(39, 25, 9, 2)],
    interactions: [
      { id: "home-door", label: "Enter house", position: at(22, 19.5), approach: actor(22, 20, "up"), transition: "house", description: "Your home." },
      { id: "seed-stall", label: "Seed stall", position: at(18, 24.3), approach: actor(18, 24.7, "up"), description: "Mystery seeds will be purchased here. Planting and the server-timed reveal arrive in F2; this preview cannot buy or award seeds." },
      { id: "market", label: "Selling counter", position: at(21, 26.3), approach: actor(21, 26.7, "up"), description: "Sell crops and fish, or keep them for an order, journal or display. Inventory and coin transactions arrive with the persistent farm." },
      { id: "orders", label: "Noticeboard", position: at(25.5, 20.3), approach: actor(25.5, 20.7, "up"), description: "Optional weekly crop and fish deliveries are planned here. Common discoveries will count; rare-only tasks will not block basic progression." },
      { id: "plots", label: "Six starter plots", position: at(27.5, 23.5), approach: actor(27.5, 23.5, "up"), description: "Six plots to begin with. Crops will grow offline after one watering, with their species concealed until maturity. These soil tiles do not contain saved crops yet." },
      { id: "pond", label: "Fishing dock", position: at(38.2, 26), approach: actor(38.2, 26, "right"), description: "Cast here in the fishing milestone. The pond is currently a movement/collision test: no fish, bait or rewards are consumed." },
    ],
  },
  house: {
    id: "house", columns: 10, rows: 8, spawn: actor(5, 6.3, "up"), props: houseProps,
    blockers: [...edges(10, 8), ...solids(houseProps)],
    interactions: [
      { id: "exit-door", label: "Return to farm", position: at(5, 7), approach: actor(5, 6.3, "down"), transition: "farm", description: "Back to the yard." },
      { id: "storage", label: "Storage chest", position: at(8, 2.5), approach: actor(8, 2.8, "up"), description: "Future persistent storage keeps crops, fish and favourites. Opening this preview does not read or alter your account inventory." },
      { id: "furniture", label: "Your furnishings", position: at(4.2, 3.3), approach: actor(4.2, 3.3, "up"), description: "The house uses ground-level furniture collisions and depth sorting. Placement, saved outfits and the transparent comfort rating come in later milestones." },
    ],
  },
};

export function footBox(point: Point): Rect {
  return { x: point.x - 6, y: point.y - 6, width: 12, height: 8 };
}
export function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}
export function isWalkable(world: World, position: Point): boolean {
  if (!Number.isFinite(position.x) || !Number.isFinite(position.y)) return false;
  const feet = footBox(position);
  return feet.x >= 0 && feet.y >= 0 && feet.x + feet.width <= world.columns * TILE && feet.y + feet.height <= world.rows * TILE && !world.blockers.some(b => overlaps(feet, b));
}
export function moveActor(world: World, current: Actor, input: Point, deltaMs: number): Actor {
  if (!isWalkable(world, current)) return { ...world.spawn };
  if (![input.x, input.y, deltaMs].every(Number.isFinite)) return { ...current };
  const x = Math.max(-1, Math.min(1, input.x)), y = Math.max(-1, Math.min(1, input.y));
  const length = Math.hypot(x, y);
  if (!length || deltaMs <= 0) return { ...current };
  const distance = WALK_SPEED * Math.min(deltaMs, 100) / 1000;
  const dx = x / length * distance, dy = y / length * distance;
  const next = { ...current, facing: (Math.abs(x) > Math.abs(y) ? (x > 0 ? "right" : "left") : (y > 0 ? "down" : "up")) as Facing };
  const steps = Math.max(1, Math.ceil(distance / 3));
  for (let i = 0; i < steps; i++) {
    const horizontal = { ...next, x: next.x + dx / steps };
    if (isWalkable(world, horizontal)) next.x = horizontal.x;
    const vertical = { ...next, y: next.y + dy / steps };
    if (isWalkable(world, vertical)) next.y = vertical.y;
  }
  return next;
}
export function nearestInteraction(world: World, position: Point): Interaction | null {
  return world.interactions.map(item => ({ item, distance: Math.hypot(item.position.x - position.x, item.position.y - position.y) }))
    .filter(({ distance }) => distance <= 42).sort((a, b) => a.distance - b.distance)[0]?.item ?? null;
}
export function transitionSpawn(destination: SceneId): Actor {
  return destination === "farm" ? { ...WORLDS.farm.spawn, facing: "down" } : { ...WORLDS.house.spawn };
}
export function propCanvas(p: Pick<Prop, "w" | "h">) {
  const width = p.w * TILE + 32, height = p.h * TILE + 64;
  return { width, height, pivot: { x: width / 2, y: height - 16 } };
}
export function cameraLayout(world: World, width: number, height: number) {
  const zoom = width < 600 ? 1 : 2;
  const viewW = width / zoom, viewH = height / zoom;
  const worldW = world.columns * TILE, worldH = world.rows * TILE;
  return { zoom, bounds: { x: Math.min(0, (worldW - viewW) / 2), y: Math.min(0, (worldH - viewH) / 2), width: Math.max(worldW, viewW), height: Math.max(worldH, viewH) } };
}
