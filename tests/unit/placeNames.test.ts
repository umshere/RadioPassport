import { describe, expect, it } from "vitest";
import { titleCasePlaceName } from "~/utils/stations";

describe("titleCasePlaceName", () => {
  it("preserves already-uppercase two-letter abbreviations only", () => {
    expect(titleCasePlaceName("New York NY")).toBe("New York NY");
  });

  it("title-cases ordinary two-letter words instead of uppercasing them", () => {
    expect(titleCasePlaceName("la paz")).toBe("La Paz");
    expect(titleCasePlaceName("rio de janeiro")).toBe("Rio De Janeiro");
  });

  it("title-cases all-caps multi-letter place names", () => {
    expect(titleCasePlaceName("KERALA")).toBe("Kerala");
  });

  it("does not mangle common city prefixes", () => {
    expect(titleCasePlaceName("el paso")).toBe("El Paso");
    expect(titleCasePlaceName("le mans")).toBe("Le Mans");
    expect(titleCasePlaceName("da nang")).toBe("Da Nang");
    expect(titleCasePlaceName("ho chi minh city")).toBe("Ho Chi Minh City");
  });
});
