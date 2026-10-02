import { supabase } from "@/lib/supabase";
import type { PeopleEditorProfile, PeopleFeedback, PeopleGameState } from "@bmt/shared";
import { peopleErrorMessage } from "./people-errors";

async function rpc<T>(name: string, args: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw new Error(peopleErrorMessage(error));
  if (data == null) throw new Error("The game returned an empty response. Please retry.");
  return data as T;
}

/** Authenticated anonymous accounts are guests with a server-verifiable identity. */
let guestSignIn: Promise<void> | null = null;
export async function ensurePeopleSession(): Promise<void> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (data.session) return;
  guestSignIn ??= (async () => {
    const { error: signInError } = await supabase.auth.signInAnonymously();
    if (signInError) throw signInError;
  })().finally(() => { guestSignIn = null; });
  await guestSignIn;
}

export const peopleContext = (edition: string | null = null, preview = false) =>
  rpc<PeopleGameState>("guess_people_context", { p_edition: edition, p_preview: preview });
export const startPeoplePractice = (preview: boolean) =>
  rpc<PeopleGameState>("guess_people_start_practice", { p_preview: preview });
export const submitPeopleGuess = (edition: string, guess: string) =>
  rpc<PeopleGameState>("guess_people_submit", { p_edition: edition, p_guess: guess });
export const editorPeopleCatalog = () => rpc<PeopleEditorProfile[]>("guess_people_editor_catalog");
export const savePeopleProfile = (profile: PeopleEditorProfile) =>
  rpc<PeopleEditorProfile>("guess_people_save_profile", { p_profile: profile });
export const previewPeopleFeedback = (guess: string, answer: string) =>
  rpc<PeopleFeedback>("guess_people_preview_feedback", { p_guess: guess, p_answer: answer });
export const publishPeopleDaily = (date: string, answer: string, roster: string[]) =>
  rpc<string>("guess_people_publish_daily", { p_date: date, p_answer: answer, p_roster: roster });
