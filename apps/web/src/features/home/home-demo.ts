import items from "../../../../../packages/db/content/home-items.json";
import type { HomeItem, HomeState } from "@bmt/shared";

export function makeHomeDemo(): HomeState {
  const catalog = items.map((i) => ({
    width: 1,
    height: 1,
    layer: 1,
    ...i,
  })) as HomeItem[];
  const odds = (family: "wardrobe" | "room") =>
    catalog
      .filter((i) => i.family === family)
      .map((i) => ({
        item_id: i.id,
        rarity: i.rarity,
        percent:
          [60, 28, 10, 2][i.rarity]! /
          catalog.filter((a) => a.family === family && a.rarity === i.rarity)
            .length,
      }));
  return {
    business_date: "Preview",
    server_now: new Date().toISOString(),
    tickets: 6,
    coins: 220,
    streak: 0,
    pan_unlocked: false,
    design_revision: 1,
    design: {
      skin: 3,
      floor: 0,
      wall: 0,
      outfit: {
        hair: "hair-short",
        top: "tee-red",
        bottom: "pants-dark",
        shoes: "shoes-basic",
      },
      layout: [
        {
          instance_id: "chair-1",
          item_id: "chair-basic",
          x: 2,
          y: 3,
          rotation: 0,
        },
        {
          instance_id: "chair-2",
          item_id: "chair-basic",
          x: 4,
          y: 3,
          rotation: 0,
        },
        {
          instance_id: "table-1",
          item_id: "table-basic",
          x: 2,
          y: 2,
          rotation: 0,
        },
        {
          instance_id: "plant-1",
          item_id: "plant-basic",
          x: 6,
          y: 0,
          rotation: 0,
        },
        { instance_id: "rug-1", item_id: "rug-basic", x: 0, y: 0, rotation: 0 },
      ],
    },
    catalog,
    inventory: catalog
      .filter((i) => i.starter)
      .map((i) => ({
        item_id: i.id,
        quantity: i.id === "chair-basic" ? 2 : 1,
      })),
    pity: [
      { family: "wardrobe", epic_misses: 0, legendary_misses: 0 },
      { family: "room", epic_misses: 0, legendary_misses: 0 },
    ],
    odds: { wardrobe: odds("wardrobe"), room: odds("room") },
    recent_rolls: [],
    claimable_guess: [],
    pan: null,
  };
}

/** Offline preview only. Never used to calculate an authenticated player's rewards. */
export function demoRoll(
  state: HomeState,
  family: "wardrobe" | "room",
  request: string,
) {
  const next = structuredClone(state),
    pity = next.pity.find((p) => p.family === family)!;
  if (next.tickets < 1)
    throw new Error("The preview's sample rolls are used up. Reload to reset.");
  let u = Math.random() * 100;
  const candidates = state.odds[family];
  const pick =
    candidates.find((i) => {
      u -= i.percent;
      return u < 0;
    }) ?? candidates.at(-1)!;
  const item = next.catalog.find((i) => i.id === pick.item_id)!,
    owned = next.inventory.some((i) => i.item_id === item.id);
  const returned = owned ? [5, 15, 40, 100][item.rarity]! : 0;
  if (!owned) next.inventory.push({ item_id: item.id, quantity: 1 });
  next.tickets--;
  next.coins += returned;
  pity.epic_misses = item.rarity >= 2 ? 0 : pity.epic_misses + 1;
  pity.legendary_misses = item.rarity === 3 ? 0 : pity.legendary_misses + 1;
  next.odds[family] = next.catalog
    .filter((i) => i.family === family)
    .map((i) => ({
      item_id: i.id,
      rarity: i.rarity,
      percent:
        (pity.legendary_misses >= 39
          ? i.rarity === 3
            ? 100
            : 0
          : pity.epic_misses >= 9
            ? i.rarity === 2
              ? (100 * 10) / 12
              : i.rarity === 3
                ? (100 * 2) / 12
                : 0
            : [60, 28, 10, 2][i.rarity]!) /
        next.catalog.filter((a) => a.family === family && a.rarity === i.rarity)
          .length,
    }));
  const roll = {
    request_id: request,
    family,
    item_id: item.id,
    duplicate: owned,
    coins_returned: returned,
    odds: candidates,
    created_at: new Date().toISOString(),
  };
  next.recent_rolls = [roll, ...next.recent_rolls].slice(0, 10);
  return { state: next, roll };
}
