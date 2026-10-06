import { supabase } from "@/lib/supabase";
import type { HomeDesign, HomeFamily, HomeRoll, HomeState } from "@bmt/shared";

const messages: Record<string, string> = {
  not_enough_rolls: "You're out of rolls. Complete a daily to earn another.",
  not_enough_coins: "You need more Lime Coins for that.",
  design_changed_reload:
    "This room changed in another tab. Reload it before saving.",
  outfit_not_owned: "Choose clothes from your inventory.",
  furniture_not_owned: "You don't have enough copies of that furniture.",
  furniture_overlap: "Those furniture footprints overlap.",
  furniture_outside_room:
    "Keep the whole furniture footprint inside your room.",
  completed_daily_required:
    "Complete today's published Guess daily to claim this reward.",
  pan_game_locked: "Unlock Pan Memory first.",
  watch_pattern_first: "Watch the pattern before sending your answer.",
  item_limit_reached:
    "You already own this outfit, or have eight copies of this furniture.",
  pan_round_unavailable: "That daily has ended. Start today's round.",
};
async function rpc<T>(
  name: string,
  args: Record<string, unknown> = {},
): Promise<T> {
  const { data, error } = await supabase.rpc(name, args);
  if (error)
    throw new Error(
      messages[error.message] ??
        (error.code === "PGRST202"
          ? "This environment needs the room/rewards database update."
          : error.message.replace(/_/g, " ")),
    );
  if (data == null)
    throw new Error("No response arrived. Retry the same action.");
  return data as T;
}
export const homeContext = () => rpc<HomeState>("bmt_home_context");
export const rollHome = (family: HomeFamily, request: string) =>
  rpc<{ state: HomeState; roll: HomeRoll }>("bmt_home_roll", {
    p_family: family,
    p_request: request,
  });
export const buyHome = (item: string, request: string) =>
  rpc<HomeState>("bmt_home_buy", { p_item: item, p_request: request });
export const saveHome = (design: HomeDesign, revision: number) =>
  rpc<HomeState>("bmt_home_save", { p_design: design, p_revision: revision });
export const claimGuessReward = (edition: string) =>
  rpc<HomeState>("bmt_home_claim_guess", { p_edition: edition });
export const unlockPan = (request: string) =>
  rpc<HomeState>("bmt_home_unlock_pan", { p_request: request });
export const startPan = () => rpc<HomeState>("bmt_home_start_pan");
export const finishPan = (session: string, answer: number[]) =>
  rpc<HomeState>("bmt_home_finish_pan", {
    p_session: session,
    p_answer: answer,
  });
