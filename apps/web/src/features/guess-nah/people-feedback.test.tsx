import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { normalizePeopleSearch, peopleFeedbackToEmoji, peopleNameLetters, type PeopleCandidate, type PeopleFeedback } from "@bmt/shared";
import { PeopleFeedbackRow } from "./PeopleFeedbackRow";
import { peopleErrorMessage } from "./people-errors";

describe("People feedback and search", () => {
  it("shows a fifth directional cell and share square while preserving historical four-cell rows", () => {
    const person: PeopleCandidate = { id:"kyle",name:"KyleBoss",aliases:["Kyle Boss"],known_for:["online_broadcast"],specialities:["comedy"],birth_year:null,gender:"man",letters:8 };
    const feedback: PeopleFeedback = {known_for:"exact",speciality:"exact",born:{state:"unknown",direction:null},gender:"exact",letters:{state:"wrong",direction:"longer"}};
    const html = renderToStaticMarkup(<PeopleFeedbackRow person={person} feedback={feedback} number={1} labels={{comedy:"Comedy"}} />);
    expect(html).toContain("Answer name is longer");
    expect(html).toContain("Letters");
    expect(peopleFeedbackToEmoji(feedback)).toBe("🟩🟩⬜🟩🟥");
    expect(peopleNameLetters("Levi García")).toBe(10);
    expect(peopleNameLetters("Ro’dey")).toBe(5);
    expect(peopleNameLetters("A1 🧑🏿")).toBe(1);
  });
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
