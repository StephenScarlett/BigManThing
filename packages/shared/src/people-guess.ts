/** Feedback is computed by the database's edition-versioned comparator.
 * The editor, practice and daily submission RPCs all use that implementation. */
export const PEOPLE_RULES_VERSION = "people-v2" as const;
export type PeopleRulesVersion = "people-v1" | "people-v2";
export const PEOPLE_MAX_ATTEMPTS = 8;
export const PEOPLE_HINT_MISSES = [3, 5, 7] as const;

export type PeopleMatch = "exact" | "partial" | "wrong" | "unknown";
export interface PeopleFeedback {
  known_for: PeopleMatch;
  speciality: PeopleMatch;
  born: { state: PeopleMatch; direction: "earlier" | "later" | null };
  gender: PeopleMatch;
  letters?: { state: PeopleMatch; direction: "longer" | "shorter" | null };
}
export interface PeopleCandidate {
  id: string;
  name: string;
  aliases: string[];
  known_for: string[];
  specialities: string[];
  birth_year: number | null;
  gender: string | null;
  /** Absent on historical v1 editions; derived by the server for v2. */
  letters?: number;
}
export interface PeopleVocabulary {
  version: number;
  attribute: "known_for" | "speciality" | "gender";
  value: string;
  label: string;
}
export interface PeopleEdition {
  id: string;
  kind: "daily" | "practice";
  date: string | null;
  rules_version: PeopleRulesVersion;
  expires_at: string | null;
  is_preview: boolean;
}
export interface PeopleGameState {
  business_date: string;
  edition: PeopleEdition | null;
  catalog: PeopleCandidate[];
  vocabulary: PeopleVocabulary[];
  attempts: { number: number; guess_id: string; feedback: PeopleFeedback }[];
  status: "playing" | "won" | "lost" | "unavailable";
  expired: boolean;
  hints: { unlock_after: number; text: string }[];
  answer: null | {
    id: string;
    name: string;
    biography: string;
    tt_connection: string | null;
    sources: string[];
  };
}
export type ClaimStatus = "draft" | "reviewed" | "unconfirmed" | "conflicting";
export interface PeopleClaim {
  status: ClaimStatus;
  urls: string[];
  note: string;
}
export interface PeopleEditorProfile extends PeopleCandidate {
  vocabulary_version?: 1 | 2;
  slug: string;
  review_status: "draft" | "reviewed";
  primary_lane: string;
  primary_speciality: string;
  biography: string;
  tt_connection: string | null;
  claims: Record<string, PeopleClaim>;
  clue: { text: string; urls: string[]; reviewed: boolean; compatible_ids: string[] };
  fairness_note: string;
  revision: number;
}

export function peopleFeedbackToEmoji(feedback: PeopleFeedback): string {
  const square = (state: PeopleMatch) => ({ exact: "🟩", partial: "🟧", wrong: "🟥", unknown: "⬜" })[state];
  const states = [feedback.known_for, feedback.speciality, feedback.born.state, feedback.gender];
  if (feedback.letters) states.push(feedback.letters.state);
  return states.map(square).join("");
}

/** Display-name contract, shared with PostgreSQL NFD/alpha counting. */
export function peopleNameLetters(name: string): number {
  return (name.normalize("NFD").match(/\p{L}/gu) ?? []).length;
}

/** Search spelling variants without merging two different canonical identities. */
export function normalizePeopleSearch(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
