import test from "node:test";
import assert from "node:assert/strict";
import { PEOPLE_MAX_ATTEMPTS, PEOPLE_HINT_MISSES, peopleFeedbackToEmoji, computeFeedback, normalizePeopleSearch } from "../dist/index.js";

test("production shared package exports load as JavaScript for web and game server", () => {
  assert.equal(PEOPLE_MAX_ATTEMPTS, 8);
  assert.deepEqual(PEOPLE_HINT_MISSES, [3, 5, 7]);
  assert.equal(typeof computeFeedback, "function");
  assert.equal(typeof normalizePeopleSearch, "function");
  assert.equal(peopleFeedbackToEmoji({ known_for: "exact", speciality: "partial", born: { state: "unknown", direction: null }, gender: "wrong" }), "🟩🟧⬜🟥");
});
