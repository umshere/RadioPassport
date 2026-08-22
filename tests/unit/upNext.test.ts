import { describe, expect, it } from "vitest";
import {
  sharedSignals,
  upNextFresh,
  useUpNextStore,
} from "~/state/upNextStore";
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

  it("expires prefetch entries after their window", () => {
    useUpNextStore.getState().put("b", {
      dispatch: null,
      shared: [],
      fetchedAt: 1_000,
    });
    expect(upNextFresh(useUpNextStore.getState().entries.b, 2_000)).toBe(true);
    expect(
      upNextFresh(useUpNextStore.getState().entries.b, 1_000 * 60 * 30)
    ).toBe(false);
  });

  it("keeps one entry per queued station id", () => {
    useUpNextStore.getState().put("b", { dispatch: null, shared: [], fetchedAt: 1 });
    useUpNextStore.getState().put("c", { dispatch: null, shared: [], fetchedAt: 2 });
    const entries = useUpNextStore.getState().entries;
    expect(Object.keys(entries).sort()).toEqual(["b", "c"]);
  });
});
