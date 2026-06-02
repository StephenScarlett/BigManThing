/**
 * Guess scoring + matching helpers for Draw Nah.
 * Adapted from Rivals-Sketch with Trini-friendly normalization.
 */

const MAX_GUESSER_POINTS = 500;
const MIN_GUESSER_POINTS = 100;
const DRAWER_POINTS_PER_GUESS = 50;

/** Linear decay: faster guesses earn more, floor at MIN. */
export function calculateGuesserPoints(elapsedMs: number, totalMs: number): number {
  const ratio = Math.max(0, Math.min(1, 1 - elapsedMs / totalMs));
  return Math.round(MIN_GUESSER_POINTS + (MAX_GUESSER_POINTS - MIN_GUESSER_POINTS) * ratio);
}

export function calculateDrawerPoints(_correctCount: number): number {
  return DRAWER_POINTS_PER_GUESS;
}

/** Smart normalize: case-fold, strip diacritics, common substitutions. */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // accents
    .replace(/&/g, "and")
    .replace(/\./g, "")
    .replace(/[-_]/g, " ")
    .replace(/['']/g, "")
    .replace(/\bdoctor\b/g, "dr")
    .replace(/\bmister\b/g, "mr")
    .replace(/\bthe\s+/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Levenshtein edit distance. */
export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[] = new Array(n + 1);
  for (let j = 0; j <= n; j++) dp[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = dp[0]!;
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j]!;
      dp[j] = a[i - 1] === b[j - 1]
        ? prev
        : 1 + Math.min(dp[j - 1]!, dp[j]!, prev);
      prev = tmp;
    }
  }
  return dp[n]!;
}

export function isCorrectGuess(guess: string, answer: string): boolean {
  const a = normalize(guess);
  const b = normalize(answer);
  if (!a || !b) return false;
  return a === b;
}

/** Within Levenshtein 1–2, but not exact. Threshold scales with answer length. */
export function isCloseGuess(guess: string, answer: string): boolean {
  const a = normalize(guess);
  const b = normalize(answer);
  if (!a || !b || a === b) return false;
  if (Math.abs(a.length - b.length) > 3) return false;
  const threshold = b.length <= 4 ? 1 : 2;
  return levenshtein(a, b) <= threshold;
}
