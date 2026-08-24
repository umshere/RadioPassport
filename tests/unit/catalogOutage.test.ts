import { beforeEach, describe, expect, it, vi } from "vitest";

// The Radio Browser client is the only network seam in this file; everything
// below runs without touching a mirror.
vi.mock("~/utils/radioBrowser", () => ({ rbFetchJson: vi.fn() }));

import {
  coverWhileSeeking,
  describeCoverEmpty,
  seekingBoardLabel,
  seekingStatus,
} from "~/components/radio-passport/productFlow";
import { rbFetchJson } from "~/utils/radioBrowser";

const mockedRbFetchJson = vi.mocked(rbFetchJson);

function stubCatalogMirrors(options: { failHeavy?: boolean } = {}) {
  mockedRbFetchJson.mockImplementation(
    (async (path: string) => {
      const route = String(path);
      if (route.includes("/json/stations/search")) {
        if (options.failHeavy) {
          throw new Error("RadioBrowser fetch failed for stations search");
        }
        return [{ uuid: "in-1", name: "Big FM Tamil", url: "https://stream.example/tamil" }];
      }
      if (route.includes("/json/countries")) return [];
      if (route.includes("/json/languages")) return [];
      if (route.includes("/json/tags")) return [];
      return [];
    }) as never
  );
}

describe("seek status tells an outage apart from an empty catalog", () => {
  it("marks an unreachable catalog as Signal lost, never as No signal", () => {
    expect(
      seekingStatus({
        query: "malayalam",
        loading: false,
        count: 0,
        unreachable: true,
      })
    ).toEqual({
      tone: "unreachable",
      label: "Signal lost",
      spoken: "Signal lost for malayalam",
    });
    // The quiet-catalog reading only arrives once the catalog answered.
    expect(
      seekingStatus({ query: "malayalam", loading: false, count: 0 })
    ).toMatchObject({ tone: "empty", label: "No signal" });
  });

  it("lets Searching lead while a retry is already in flight", () => {
    expect(
      seekingStatus({
        query: "malayalam",
        loading: true,
        count: 0,
        unreachable: true,
      })
    ).toMatchObject({ tone: "searching", label: "Searching" });
    expect(seekingStatus({ query: "", loading: false, count: 0 })).toEqual({
      tone: "idle",
      label: "",
      spoken: "",
    });
  });

  it("puts SIGNAL LOST on the seek board", () => {
    expect(seekingBoardLabel("malayalam", false, 0, true)).toBe(
      "SIGNAL LOST · MALAYALAM"
    );
    // A retry in flight goes back to SEARCHING; a healthy read stays put.
    expect(seekingBoardLabel("malayalam", true, 0, true)).toBe(
      "SEARCHING · MALAYALAM"
    );
    expect(seekingBoardLabel("malayalam", false, 88)).toBe("88 LIVE · MALAYALAM");
    expect(seekingBoardLabel("malayalam", false, 0)).toBe(
      "NO SIGNAL · MALAYALAM"
    );
    expect(seekingBoardLabel("", false, 0, true)).toBeNull();
  });

  it("carries the same truth onto the cover headline and empty state", () => {
    expect(
      coverWhileSeeking({
        query: "malayalam",
        count: 0,
        loading: false,
        unreachable: true,
      }).headline
    ).toBe("Signal lost for malayalam.");
    const empty = describeCoverEmpty({
      query: "malayalam",
      hour: null,
      place: null,
      unreachable: true,
    });
    expect(empty.message).toBe("Signal lost for “malayalam”.");
    expect(empty.actions.map((action) => action.id)).toEqual([
      "retry-catalog",
      "atlas",
    ]);
    expect(empty.actions[0]?.label).not.toMatch(/discover|seamless|explore/i);
    // A catalog that answered keeps its honest no-signal copy.
    expect(
      describeCoverEmpty({ query: "zzzz", hour: null, place: null }).message
    ).toBe("No live signal for “zzzz”.");
  });
});

describe("catalog snapshot resilience", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("gives the heavy search a long leash and clears the poisoned slot after a rejection", async () => {
    let failHeavy = true;
    mockedRbFetchJson.mockImplementation(
      (async (path: string) => {
        const route = String(path);
        if (route.includes("/json/stations/search")) {
          if (failHeavy) throw new Error("RadioBrowser fetch failed");
          return [
            { uuid: "in-1", name: "Big FM Tamil", url: "https://stream.example/tamil" },
          ];
        }
        if (route.includes("/json/countries")) return [];
        if (route.includes("/json/languages")) return [];
        if (route.includes("/json/tags")) return [];
        return [];
      }) as never
    );

    const { fetchRadioBrowserCatalogSnapshot } = await import(
      "~/services/radioBrowser/catalogSnapshot"
    );

    await expect(fetchRadioBrowserCatalogSnapshot()).rejects.toThrow(
      /RadioBrowser fetch failed/
    );

    // A rejected build must not be negative-cached: the next caller retries.
    failHeavy = false;
    const snapshot = await fetchRadioBrowserCatalogSnapshot();
    expect(snapshot.stations.map((station) => station.uuid)).toContain("in-1");

    const heavyCalls = mockedRbFetchJson.mock.calls.filter(([path]) =>
      String(path).includes("/json/stations/search")
    );
    expect(heavyCalls.length).toBe(2);
    const heavyOptions = heavyCalls[0]?.[2] as
      | { timeoutMs?: number }
      | undefined;
    expect(heavyOptions?.timeoutMs).toBeGreaterThanOrEqual(30000);
    for (const [path, , options] of mockedRbFetchJson.mock.calls) {
      if (!String(path).includes("/json/stations/search")) {
        expect(
          (options as { timeoutMs?: number } | undefined)?.timeoutMs
        ).toBeUndefined();
      }
    }
  });

  it("treats a fully soft-failed heavy fetch as an outage, not an empty catalog", async () => {
    mockedRbFetchJson.mockImplementation(
      (async (path: string) => {
        const route = String(path);
        if (route.includes("/json/stations/search")) return null;
        return [];
      }) as never
    );

    const { fetchRadioBrowserCatalogSnapshot } = await import(
      "~/services/radioBrowser/catalogSnapshot"
    );

    await expect(fetchRadioBrowserCatalogSnapshot()).rejects.toThrow(
      /unavailable/
    );
    expect(mockedRbFetchJson.mock.calls.length).toBeGreaterThan(0);
  });
});

describe("radio catalog route during an outage", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("answers 503 snapshot-unavailable instead of an unhandled 500", async () => {
    stubCatalogMirrors({ failHeavy: true });

    const { loader } = await import("~/routes/api.radio-catalog");
    const request = new Request(
      "https://radio.example/api/radio-catalog?stations=8000"
    );
    const response = await loader({ request } as never);

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: "snapshot-unavailable",
      stations: [],
      fetchedAt: null,
      countries: [],
      languages: [],
      tags: [],
    });
  });

  it("keeps the success shape identical once the snapshot lands", async () => {
    stubCatalogMirrors();

    const { loader } = await import("~/routes/api.radio-catalog");
    const request = new Request(
      "https://radio.example/api/radio-catalog?stations=8000"
    );
    const response = await loader({ request } as never);

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      error?: string;
      fetchedAt: string | null;
      stations: Array<{ uuid: string }>;
    };
    expect(body.error).toBeUndefined();
    expect(body.fetchedAt).toBeTruthy();
    expect(body.stations.map((station) => station.uuid)).toContain("in-1");
  });
});
