import { supabase } from "@/lib/supabase";
import { FARM_WORLD_VERSION, type Appearance, type FarmState, type FarmPosition, type FarmCharacterAck, type FarmPositionAck } from "@bmt/shared";

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
};
async function rpc<T>(name:string,args:Record<string,unknown>={}):Promise<T> {
  const {data,error}=await supabase.rpc(name,args);
  if(error) throw new FarmApiError(error.message,messages[error.message] ?? (error.code==="PGRST202"?"This environment needs the saved-farm database update.":"Your farm could not be saved. Check your connection and retry."));
  if(data==null && name!=="bmt_farm_context")throw new FarmApiError("empty_response","No save response arrived. Retry the same action.");
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
