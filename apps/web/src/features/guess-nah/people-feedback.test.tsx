import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { normalizePeopleSearch, peopleFeedbackToEmoji, type PeopleCandidate, type PeopleFeedback } from "@bmt/shared";
import { PeopleFeedbackRow } from "./PeopleFeedbackRow";
import { peopleErrorMessage } from "./people-errors";

describe("People feedback and search", () => {
  it("explains recovery for a rolled-over daily or protected action", () => {
    expect(peopleErrorMessage({ message: "edition_not_available" })).toContain("Choose Daily");
    expect(peopleErrorMessage({ code: "42501", message: "permission denied for schema private" })).toBe("Your current account cannot perform this action.");
  });
  it("makes punctuation and accent variants searchable without inventing an identity", () => {
    expect(normalizePeopleSearch("Ro’dey")).toBe(normalizePeopleSearch("Ro'dey"));
    expect(normalizePeopleSearch("  V. S. Naipaul ")).toBe("v s naipaul");
    expect(normalizePeopleSearch("Fay-Ann Lyons")).toBe("fay ann lyons");
    expect(normalizePeopleSearch("Sampson")).not.toBe(normalizePeopleSearch("Samson")); // Accepted through canonical aliases instead.
  });
  it("retains neutral unknowns in the shared result instead of fabricating four green squares", () => {
    const feedback: PeopleFeedback = { known_for: "exact", speciality: "exact", born: { state: "unknown", direction: null }, gender: "unknown" };
    expect(peopleFeedbackToEmoji(feedback)).toBe("🟩🟩⬜⬜");
  });
  it("shows the guessed year, the answer direction and near boundary with readable text", () => {
    const person: PeopleCandidate = { id: "test", name: "Test person", aliases: [], known_for: ["sport"], specialities: ["cricket"], birth_year: 1969, gender: null };
    const feedback: PeopleFeedback = { known_for: "exact", speciality: "partial", born: { state: "partial", direction: "later" }, gender: "unknown" };
    const html = renderToStaticMarkup(<PeopleFeedbackRow person={person} feedback={feedback} number={2} labels={{ sport: "Sport", cricket: "Cricket" }} />);
    expect(html).toContain("1969");
    expect(html).toContain("Answer born later");
    expect(html).toContain("within 5 years");
    expect(html).toContain("? Unconfirmed");
    expect(html).toContain("≈ Overlap");
  });
});
