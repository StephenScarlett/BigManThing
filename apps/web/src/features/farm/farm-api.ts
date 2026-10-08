import { supabase } from "@/lib/supabase";
import { FARM_WORLD_VERSION, type Appearance, type FarmState, type FarmPosition, type FarmCharacterAck, type FarmPositionAck, type FarmCropState, type FarmCropAck, type FarmCropAction } from "@bmt/shared";

export class FarmApiError extends Error {
  constructor(public code: string, message: string) { super(message); }
}
const messages: Record<string,string> = {
  character_changed_reload: "Your character changed in another tab. Load the saved farm before editing again.",
  position_changed_reload: "Your farm is open in another tab. Load the saved farm to continue here.",
  world_changed_reload: "Your farm layout changed. Load the saved farm to continue.",
  invalid_character: "Choose one of the available starter looks.",
  invalid_nickname: "Use a name from 1 to 20 characters, without line breaks.",
  invalid_position: "That position is blocked. Load the saved farm to return to a safe place.",
  sign_in_required: "Sign in again to save your farm.",
  owner_changed: "Your account changed. Open your farm again.",
  farm_required: "Create your farm first.",
  request_payload_changed: "This save request changed. Load the saved farm before retrying.",
  crops_changed_reload: "Your crops or bag changed in another tab. Refresh crops before continuing.",
  plot_occupied: "That plot already has a crop. Refresh crops to see it.",
  crop_gone: "That crop has already been harvested. Refresh crops to see your bag.",
  crop_not_ready: "This crop is still growing. Refresh crops when it is ready.",
  already_watered: "This crop is already watered. Its original timer is still running.",
  no_seeds: "Your seed bag is empty. Claim today’s two free seeds or buy a packet.",
  not_enough_coins: "You need more Lime Coins for that many seeds.",
  not_enough_produce: "That quantity is no longer in your bag. Refresh crops to check.",
  restock_already_claimed: "You already claimed today’s two free seeds.",
  watering_can_required: "You need your watering can to water this crop.",
  invalid_quantity: "Choose a whole quantity from 1 to 50.",
  invalid_plot: "That plot does not belong to this farm.",
  invalid_crop_action: "This crop action could not be understood. Refresh the page.",
  inventory_full: "That stack is full. Store or sell some produce first.",
  wallet_full: "Your coin wallet is full. Spend some coins before selling.",
};
async function rpc<T>(name:string,args:Record<string,unknown>={}):Promise<T> {
  const {data,error}=await supabase.rpc(name,args);
  if(error) throw new FarmApiError(error.message,messages[error.message] ?? (error.code==="PGRST202"?"This environment needs the saved-farm database update.":"Your farm could not be saved. Check your connection and retry."));
  if(data==null && !["bmt_farm_context","bmt_farm_crops_context"].includes(name))throw new FarmApiError("empty_response","No response arrived. Retry the same action.");
  return data as T;
}
function owned(state:FarmState|null,owner:string):FarmState|null {
  if(state && state.owner_id!==owner) throw new FarmApiError("owner_changed","Your account changed. Open your farm again.");
  if(state && state.world_version!==FARM_WORLD_VERSION) throw new FarmApiError("unsupported_world","This farm needs a newer game version. Reload the app.");
  return state;
}
export const farmContext=async(owner:string)=>owned(await rpc<FarmState|null>("bmt_farm_context",{p_owner:owner}),owner);
export const createFarm=async(owner:string,appearance:Appearance,nickname:string,request:string)=>{
  const state=owned(await rpc<FarmState>("bmt_farm_create",{p_owner:owner,p_appearance:appearance,p_nickname:nickname,p_request:request}),owner);
  if(!state) throw new Error("No farm arrived. Retry creating it.");
  return state;
};
export const saveFarmCharacter=(owner:string,appearance:Appearance,nickname:string,revision:number,request:string)=>
  rpc<FarmCharacterAck>("bmt_farm_save_character",{p_owner:owner,p_appearance:appearance,p_nickname:nickname,p_revision:revision,p_request:request});
export const saveFarmPosition=(owner:string,position:FarmPosition,revision:number,worldVersion:number,request:string)=>
  rpc<FarmPositionAck>("bmt_farm_save_position",{p_owner:owner,p_position:position,p_revision:revision,p_world_version:worldVersion,p_request:request});
function cropOwned(s:FarmCropState|null,owner:string){
  if(s && s.owner_id!==owner)throw new FarmApiError("owner_changed",messages.owner_changed!);
  if(s && s.rules_version!==1)throw new FarmApiError("unsupported_rules","These crops need a newer game version. Reload the app.");
  return s;
}
export const farmCropsContext=async(owner:string)=>cropOwned(await rpc<FarmCropState|null>("bmt_farm_crops_context",{p_owner:owner}),owner);
export const farmCropAction=async(owner:string,action:FarmCropAction,revision:number,request:string)=>{
  const ack=await rpc<FarmCropAck>("bmt_farm_crop_action",{p_owner:owner,p_action:action,p_revision:revision,p_request:request});
  cropOwned(ack.state,owner);return ack;
};
