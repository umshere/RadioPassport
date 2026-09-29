import { describe, expect, it } from "vitest";
import { correctCountryFromState, normalizeStation } from "~/utils/stations";

describe("country guard", () => {
  it("lets the state name the real country when the record disagrees", () => {
    expect(correctCountryFromState("Veracruz, México", "AX")).toEqual({
      code: "MX",
      name: "Mexico",
    });
  });
  it("leaves agreeing or plain states alone", () => {
    expect(correctCountryFromState("Veracruz, México", "MX")).toBeNull();
    expect(correctCountryFromState("Bavaria", "DE")).toBeNull();
    expect(correctCountryFromState("Paris, Nowhereland", "FR")).toBeNull();
    expect(correctCountryFromState(null, "FR")).toBeNull();
  });
  it("corrects a normalized station", () => {
    const station = normalizeStation({
      stationuuid: "u1",
      name: "EXA FM",
      url_resolved: "https://example.com/s",
      country: "Åland Islands",
      countrycode: "AX",
      state: "Veracruz, México",
    } as never);
    expect(station?.countryCode).toBe("MX");
    expect(station?.country).toBe("Mexico");
  });
});
