import { describe, expect, it } from "vitest";
import { sharedSignals } from "~/components/desk/deskModel";
import type { Station } from "~/types/radio";

function station(overrides: Partial<Station> = {}): Station {
  return {
    uuid: "s1",
    name: "Station One",
    url: "https://example.com/stream",
    country: "India",
    language: "Malayalam",
    tagList: ["classics", "film"],
    ...overrides,
  } as Station;
}

describe("Up next", () => {
  it("shares a language and at most two overlapping tags, deduped", () => {
    const current = station({ uuid: "a", tagList: ["Classics", "film", "instrumental"] });
    const next = station({ uuid: "b", tagList: ["classics", "Film", "talk"] });
    expect(sharedSignals(current, next)).toEqual(["Malayalam", "classics"]);
  });

  it("returns nothing when the two stations share no signal", () => {
    const current = station({ uuid: "a", language: "Tamil", tagList: ["news"] });
    expect(sharedSignals(current, station({ uuid: "b" }))).toEqual([]);
  });
});
