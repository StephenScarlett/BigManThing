/** F2 is a small, frozen pilot packet; future species/pacing use new rules. */
export type CropRarity = "common" | "rare";
export type CropDefinition = { item_id: string; label: string; rarity: CropRarity; sale_value: number; percent: number; art: "tomato" | "pepper" };
export const CROP_PILOT_CATALOG: CropDefinition[] = [
  { item_id: "crop-tomato-v1", label: "Tomato", rarity: "common", sale_value: 14, percent: 75, art: "tomato" },
  { item_id: "crop-hot-pepper-v1", label: "Hot pepper", rarity: "rare", sale_value: 20, percent: 25, art: "pepper" },
];
export type FarmCrop = { id: string; stage: "planted" | "growing" | "ready"; planted_at: string; watered_at: string | null; ready_at: string | null; reveal: CropDefinition | null };
export type FarmPlot = { plot_id: string; crop: FarmCrop | null };
export type CropStack = Omit<CropDefinition,"percent"> & { location: "bag" | "chest"; quantity: number };
export type FarmCropState = {
  owner_id: string; rules_version: number; revision: number; server_now: string; business_date: string;
  coins: number; seed_quantity: number; watering_can: boolean; restock_claimed: boolean;
  seed_price: number; growth_seconds: number; catalog: CropDefinition[]; plots: FarmPlot[]; goods: CropStack[];
};
export type FarmCropAction =
  | { kind: "plant"; plot_id: string }
  | { kind: "water"; crop_id: string }
  | { kind: "harvest"; crop_id: string }
  | { kind: "buy"; quantity: number }
  | { kind: "restock" }
  | { kind: "store" | "withdraw" | "sell"; item_id: string; quantity: number };
export type FarmCropReceipt = { request_id: string; action: FarmCropAction["kind"]; revision: number; message: string; item_id?: string; quantity?: number; coins?: number; crop_id?: string; plot_id?: string; ready_at?: string };
export type FarmCropAck = { state: FarmCropState; receipt: FarmCropReceipt };

/** Only estimates text/animation. A server response must confirm maturity. */
export function cropProgress(crop: FarmCrop, estimatedServerMs: number): number {
  if(crop.stage === "ready") return 1;
  if(!crop.watered_at || !crop.ready_at) return 0;
  const start=Date.parse(crop.watered_at),end=Date.parse(crop.ready_at);
  return Number.isFinite(start+end+estimatedServerMs) && end>start ? Math.max(0,Math.min(1,(estimatedServerMs-start)/(end-start))) : 0;
}
