import { describe, expect, it } from "vitest";
import { normalizeLanguages } from "~/utils/languages";

describe("normalizeLanguages (allowlist)", () => {
  it("maps Spanish endonyms and española family to Spanish", () => {
    expect(normalizeLanguages("española")).toEqual(["Spanish"]);
    expect(normalizeLanguages("castellano")).toEqual(["Spanish"]);
    expect(normalizeLanguages("Castellano. Español")).toEqual(["Spanish"]);
  });

  it("collapses regional English variants to English", () => {
    expect(normalizeLanguages("english,american english")).toEqual(["English"]);
    expect(normalizeLanguages("british english")).toEqual(["English"]);
  });

  it("drops country names mistaken for languages", () => {
    expect(normalizeLanguages("italian,españa")).toEqual(["Italian"]);
  });

  it("maps Flemish typo and keeps Dutch", () => {
    expect(normalizeLanguages("dutch,flammish")).toEqual(["Dutch", "Flemish"]);
  });

  it("maps Russian endonyms and labeled forms", () => {
    expect(normalizeLanguages("язык: русский")).toEqual(["Russian"]);
  });

  it("maps known typos", () => {
    expect(normalizeLanguages("gernan")).toEqual(["German"]);
  });

  it("returns empty for empty or junk-only input", () => {
    expect(normalizeLanguages("")).toEqual([]);
    expect(normalizeLanguages("españa")).toEqual([]);
    expect(normalizeLanguages("unknown-lang-xyz")).toEqual([]);
  });

  it("maps francaise to French and drops unrecognized noise", () => {
    expect(normalizeLanguages("french,francaise")).toEqual(["French"]);
  });
});
