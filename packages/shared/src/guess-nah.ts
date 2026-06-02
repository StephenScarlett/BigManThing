import type { GuessNahMode } from "./entities.js";

export type FeedbackState = "exact" | "wrong" | "higher" | "lower";

/** Dem Nah feedback (people + folklore). */
export interface DemFeedback {
  type: FeedbackState;
  domain: FeedbackState;
  era: FeedbackState;
  form: FeedbackState;
  alignment: FeedbackState;
  reach: FeedbackState;
  status: FeedbackState;
}

/** Ting Nah feedback (food + drink + objects). */
export interface TingFeedback {
  kind: FeedbackState;
  heritage: FeedbackState;
  era: FeedbackState;
  material: FeedbackState;
  occasion: FeedbackState;
  sense: FeedbackState;
  reach: FeedbackState;
}

export type GuessFeedback = DemFeedback | TingFeedback;

export const MAX_DAILY_ATTEMPTS = 6;

export interface DailyPuzzleSummary {
  puzzle_id: string;
  puzzle_date: string;
  mode: GuessNahMode;
  answer?: { id: string; name: string; image_url: string | null };
}

export interface SubmitGuessRequest {
  puzzle_id: string;
  guess_entity_id: string;
}

export interface SubmitGuessResponse {
  attempt_number: number;
  feedback: GuessFeedback;
  solved: boolean;
  answer?: { id: string; name: string; image_url: string | null };
}

export { GUESS_NAH_MODES } from "./entities.js";
export type { GuessNahMode } from "./entities.js";
