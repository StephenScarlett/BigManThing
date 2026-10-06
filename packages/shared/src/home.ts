export const HOME_RARITIES = ["Common", "Rare", "Epic", "Legendary"] as const;
export const HOME_SKINS = [
  "#f6d6b7",
  "#e8b18c",
  "#cf916e",
  "#ae7352",
  "#875537",
  "#633e2c",
  "#452c24",
  "#332321",
] as const;
export type HomeFamily = "wardrobe" | "room";
export type HomeSlot = "hair" | "hat" | "top" | "bottom" | "shoes";
export interface HomeItem {
  id: string;
  label: string;
  kind: "wearable" | "furniture";
  slot: HomeSlot | null;
  rarity: 0 | 1 | 2 | 3;
  starter: boolean;
  family: HomeFamily | null;
  color: string;
  variant: string;
  width: number;
  height: number;
  layer: 0 | 1;
}
export interface HomePlacement {
  instance_id: string;
  item_id: string;
  x: number;
  y: number;
  rotation: 0 | 1;
}
export interface HomeDesign {
  skin: number;
  floor: number;
  wall: number;
  outfit: Partial<Record<HomeSlot, string>>;
  layout: HomePlacement[];
}
export interface HomeOdds {
  item_id: string;
  rarity: number;
  percent: number;
}
export interface HomeRoll {
  request_id: string;
  family: HomeFamily;
  item_id: string;
  duplicate: boolean;
  coins_returned: number;
  odds: HomeOdds[];
  created_at: string;
}
export interface HomeState {
  business_date: string;
  server_now: string;
  tickets: number;
  coins: number;
  design: HomeDesign;
  design_revision: number;
  pan_unlocked: boolean;
  streak: number;
  catalog: HomeItem[];
  inventory: { item_id: string; quantity: number }[];
  pity: { family: HomeFamily; epic_misses: number; legendary_misses: number }[];
  odds: Record<HomeFamily, HomeOdds[]>;
  recent_rolls: HomeRoll[];
  claimable_guess: string[];
  pan: null | {
    id: string;
    pattern: number[];
    status: "playing" | "won" | "lost";
    activity_date: string;
    ready_at: string;
    answer: number[] | null;
  };
}
export function homePrice(item: HomeItem): number {
  return item.starter ? 40 : [80, 160, 400, 900][item.rarity]!;
}
export function homeFootprint(
  item: HomeItem,
  p: Pick<HomePlacement, "rotation">,
): { w: number; h: number } {
  return p.rotation === 0
    ? { w: item.width, h: item.height }
    : { w: item.height, h: item.width };
}
/** Preview validation only. Ownership, quantities and bounds are rechecked server-side. */
export function homePlacementError(
  p: HomePlacement,
  layout: HomePlacement[],
  catalog: HomeItem[],
): string | null {
  const item = catalog.find((i) => i.id === p.item_id);
  if (!item || item.kind !== "furniture")
    return "Choose furniture from your inventory.";
  const { w, h } = homeFootprint(item, p);
  if (
    !Number.isInteger(p.x) ||
    !Number.isInteger(p.y) ||
    p.x < 0 ||
    p.y < 0 ||
    p.x + w > 8 ||
    p.y + h > 8
  )
    return "That footprint goes outside the room.";
  for (const other of layout) {
    if (other.instance_id === p.instance_id) continue;
    const i = catalog.find((i) => i.id === other.item_id);
    if (!i || i.layer !== item.layer) continue;
    const b = homeFootprint(i, other);
    if (
      p.x < other.x + b.w &&
      other.x < p.x + w &&
      p.y < other.y + b.h &&
      other.y < p.y + h
    )
      return "There's already something in those tiles.";
  }
  return null;
}
