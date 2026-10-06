const messages: Record<string, string> = {
  sign_in_required: "Please sign in again to continue.",
  editor_required: "This action is available to project editors.",
  practice_roster_not_ready: "Practice is waiting for reviewed people and clues.",
  practice_limit_reached: "You've started many practice rounds. Try again in a little while.",
  edition_not_found: "This round is no longer available. Choose Daily or start a new practice.",
  edition_not_available: "This daily has ended or hasn't opened yet. Choose Daily for the current edition.",
  guess_not_in_roster: "That person isn't in this edition. Pick a name from its roster.",
  round_finished: "This round is complete.",
  profile_changed_reload_before_saving: "This profile changed while you were editing. Reload it before saving.",
  only_reviewed_profiles_can_be_published: "Every selected person needs a reviewed profile before publication.",
  speciality_caps_exceeded: "Choose at most five cricket memberships and seven people per primary speciality.",
  publish_requires_current_profile_version: "Convert the selected profiles to vocabulary version two before publication.",
  name_needs_letters: "Use a public display name containing letters.",
  roster_needs_more_variety: "Use at least four primary lanes, with no lane over half the roster.",
  clue_must_identify_at_most_three_people: "Review the people the fifth clue could describe: 1–3, including the answer.",
};

export function peopleErrorMessage(error: { code?: string; message: string }): string {
  if (messages[error.message]) return messages[error.message]!;
  if (error.message.startsWith("review_and_source_")) return `Review and source the ${error.message.slice(18).replace(/_/g, " ")} claim before admission.`;
  if (error.code === "42501") return "Your current account cannot perform this action.";
  if (error.code === "23505") return "That date or identity is already in use. Published dailies cannot be overwritten.";
  if (error.code === "PGRST202") return "This development environment needs the people-game database update.";
  // Other editor validation messages are controlled field/rule names.
  return error.message.replace(/_/g, " ");
}
