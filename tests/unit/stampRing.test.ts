import { describe, expect, it } from "vitest";
import {
  freshlyInkedStampIds,
  stampMatchesCity,
} from "~/components/radio-passport/productFlow";

describe("The dock ring celebrates only a stamp that just landed", () => {
  it("reports only stamp ids added since the previous read", () => {
    expect(
      freshlyInkedStampIds(["in:mumbai"], [
        { id: "in:mumbai" },
        { id: "hu:budapest" },
      ])
    ).toEqual(["hu:budapest"]);
    expect(freshlyInkedStampIds([], [{ id: "in:mumbai" }])).toEqual([
      "in:mumbai",
    ]);
  });

  it("stays quiet when the dial moves onto an already-stamped city", () => {
    // The regression this guards: switching stations flips `stamped`
    // false→true, but no stamp id is added — so nothing may celebrate.
    expect(
      freshlyInkedStampIds(["in:mumbai", "hu:budapest"], [
        { id: "in:mumbai" },
        { id: "hu:budapest" },
      ])
    ).toEqual([]);
  });

  it("matches a stamp to the city on the dial", () => {
    const stamp = { city: "Kochi", country: "India" };
    expect(stampMatchesCity(stamp, "Kochi", "India")).toBe(true);
    expect(stampMatchesCity(stamp, "kochi", "india")).toBe(true);
    expect(stampMatchesCity(stamp, "Mumbai", "India")).toBe(false);
    expect(stampMatchesCity(stamp, "Kochi", "")).toBe(false);
  });
});
