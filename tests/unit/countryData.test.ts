import { describe, expect, it } from "vitest";
import type { Station } from "~/types/radio";
import {
  countryCacheKey,
  mergeStationLists,
} from "~/components/radio-passport/countryData";

function makeStation(uuid: string, country = "Belgium"): Station {
  return {
    uuid,
    name: `Station ${uuid}`,
    url: `https://radio.example/${uuid}`,
    country,
  } as Station;
}

describe("country drilldown cache", () => {
  it("keys countries case- and space-insensitively", () => {
    expect(countryCacheKey("Belgium")).toBe("belgium");
    expect(countryCacheKey("  BELGIUM ")).toBe("belgium");
  });

  it("merges instant rows ahead of catalog rows without duplicates", () => {
    // The home board deals drilldown stations instantly while the catalog
    // fetch flies: instant rows first (they stay parked), catalog fills in
    // behind, and no station appears twice.
    const instant = [makeStation("a"), makeStation("b")];
    const catalog = [makeStation("b"), makeStation("c")];
    const merged = mergeStationLists(instant, catalog);
    expect(merged.map((station) => station.uuid)).toEqual(["a", "b", "c"]);
    expect(mergeStationLists([], [])).toEqual([]);
  });
});
