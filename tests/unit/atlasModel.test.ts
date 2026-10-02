import { describe, expect, it } from "vitest";
import { ATLAS_PAGE, atlasSearch, atlasTabCountries, atlasTabs, POPULAR } from "~/components/radio-passport/atlasModel";
import type { Country } from "~/types/radio";

const c = (name: string, iso: string, stationcount: number) => ({ name, iso_3166_1: iso, stationcount }) as Country;
const LIST = [c("India", "IN", 900), c("Germany", "DE", 3000), c("France", "FR", 2000), c("Kenya", "KE", 40), c("Peru", "PE", 0)];

describe("atlas model", () => {
  it("opens on Popular, busiest first, then continents by size", () => {
    const tabs = atlasTabs(LIST);
    expect(tabs[0]?.id).toBe(POPULAR);
    expect(tabs[1]).toMatchObject({ id: "Europe", count: 2 });
    expect(atlasTabCountries(LIST, POPULAR).map((x) => x.name)).toEqual(["Germany", "France", "India", "Kenya", "Peru"]);
  });
  it("caps Popular and sorts each continent by stations", () => {
    const many = Array.from({ length: 40 }, (_, i) => c(`C${i}`, "DE", i));
    expect(atlasTabCountries(many, POPULAR)).toHaveLength(ATLAS_PAGE);
    expect(atlasTabCountries(LIST, "Europe").map((x) => x.name)).toEqual(["Germany", "France"]);
  });
  it("searches everywhere by name, code or language", () => {
    expect(atlasSearch(LIST, (x) => (x.name === "Kenya" ? "Swahili" : ""), "swahili").map((x) => x.name)).toEqual(["Kenya"]);
    expect(atlasSearch(LIST, () => "", "fr").map((x) => x.name)).toEqual(["France"]);
  });
});
