import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("~/utils/radioBrowser", () => ({ rbFetchJson: vi.fn() }));
vi.mock("~/services/radioBrowser/catalogSnapshot", () => ({
  fetchRadioBrowserCatalogSnapshot: vi.fn(),
}));

import type { Station } from "~/types/radio";
import {
  describeEmptyResults,
  nextQueryHref,
  parseInitialQuery,
  shouldClearBrowsingFilters,
  suggestVocabularyTerm,
  toggleSelection,
} from "~/components/radio-passport/searchState";
import {
  applyLiveCatalog,
  deriveStationAvailability,
  deriveStationHealth,
  isCatalogLikelyStreaming,
  isEvidenceFresh,
  isSecureStreamUrl,
  rankStations,
  scoreStation,
} from "~/utils/stationMeta";
import { rbFetchJson } from "~/utils/radioBrowser";
import { fetchRadioBrowserCatalogSnapshot } from "~/services/radioBrowser/catalogSnapshot";
import { loader as radioCatalogLoader } from "~/routes/api.radio-catalog";

const station = (overrides: Partial<Station> = {}): Station => ({
  uuid: "signal-1",
  name: "Signal One",
  url: "https://stream.example/one",
  streamUrl: "https://stream.example/one",
  favicon: "",
  country: "India",
  countryCode: "IN",
  state: "Kerala",
  city: "Kochi",
  language: "Malayalam",
  tags: "Jazz",
  tagList: ["Jazz"],
  bitrate: 128,
  codec: "mp3",
  ...overrides,
});

describe("discovery filter state transitions", () => {
  it("toggles a browsing selection and always clears on an explicit reset", () => {
    expect(toggleSelection(null, "Dance")).toBe("Dance");
    expect(toggleSelection("Dance", "Dance")).toBeNull();
    expect(toggleSelection("Dance", "Focus")).toBe("Focus");
    expect(toggleSelection("Dance", null)).toBeNull();
    expect(toggleSelection(null, null)).toBeNull();
  });

  it("treats any non-empty query as taking precedence over browsing filters", () => {
    expect(shouldClearBrowsingFilters("")).toBe(false);
    expect(shouldClearBrowsingFilters("   ")).toBe(false);
    expect(shouldClearBrowsingFilters("malayalam")).toBe(true);
  });

  it("names the active constraint behind an empty result set and offers one-click resets", () => {
    expect(
      describeEmptyResults({ query: "zzzznotreal", mode: "mood", mood: null, place: null })
    ).toEqual({
      message: 'No live stations match "zzzznotreal".',
      actions: ["clear-search"],
    });
    expect(
      describeEmptyResults({ query: "", mode: "mood", mood: "Dance", place: null })
    ).toEqual({
      message: "No live stations match the Dance mood right now.",
      actions: ["show-all-moods"],
    });
    expect(
      describeEmptyResults({ query: "", mode: "place", mood: null, place: "Tamil Nadu" })
    ).toEqual({
      message: "No live stations found for Tamil Nadu right now.",
      actions: ["show-all-places"],
    });
    expect(
      describeEmptyResults({ query: "", mode: "mood", mood: null, place: null })
    ).toEqual({
      message:
        "No live stations match that route. Try a country, language, tag, city, or mood.",
      actions: [],
    });
  });

  it("hydrates the initial query from the URL and keeps the URL sync lightweight", () => {
    expect(parseInitialQuery("https://radio.example/?q=malayalam")).toBe("malayalam");
    expect(parseInitialQuery("https://radio.example/?q=  jazz  ")).toBe("jazz");
    expect(parseInitialQuery("https://radio.example/")).toBe("");
    expect(
      nextQueryHref({ pathname: "/", search: "", hash: "" }, "malayalam")
    ).toBe("/?q=malayalam");
    expect(
      nextQueryHref({ pathname: "/", search: "?q=malayalam", hash: "" }, "")
    ).toBe("/");
    expect(
      nextQueryHref({ pathname: "/", search: "?other=1", hash: "#top" }, "jazz")
    ).toBe("/?other=1&q=jazz#top");
  });

  it("recovers from a modest prefix typo without broad fuzzy matching", () => {
    expect(suggestVocabularyTerm("trans")).toBe("trance");
    expect(suggestVocabularyTerm("jaz")).toBe("jazz");
    expect(suggestVocabularyTerm("malayalam")).toBeNull();
    expect(suggestVocabularyTerm("ja")).toBeNull();
    expect(suggestVocabularyTerm("zzqxnotaword")).toBeNull();
  });
});

describe("likely-streaming catalog filter", () => {
  it("keeps https streams and drops http, ssl errors, and confirmed-down probes", () => {
    expect(isSecureStreamUrl("https://stream.example/live")).toBe(true);
    expect(isSecureStreamUrl("http://stream.example/live")).toBe(false);

    const live = station({ streamUrl: "https://stream.example/live" });
    const plaintext = station({
      uuid: "http",
      streamUrl: "http://stream.example/live",
      url: "http://stream.example/live",
    });
    const down = station({ uuid: "down", probeStatus: "down" });
    const ssl = station({ uuid: "ssl", sslError: true });
    const freshFail = station({
      uuid: "fail",
      lastCheckOk: false,
      lastCheckOkTime: new Date().toISOString(),
    });
    const staleFail = station({
      uuid: "stale-fail",
      lastCheckOk: false,
      lastCheckOkTime: new Date(
        Date.now() - 200 * 24 * 60 * 60 * 1000
      ).toISOString(),
    });

    expect(isCatalogLikelyStreaming(live)).toBe(true);
    expect(isCatalogLikelyStreaming(plaintext)).toBe(false);
    expect(isCatalogLikelyStreaming(down)).toBe(false);
    expect(isCatalogLikelyStreaming(ssl)).toBe(false);
    expect(isCatalogLikelyStreaming(freshFail)).toBe(false);
    expect(isCatalogLikelyStreaming(staleFail)).toBe(true);

    const ranked = applyLiveCatalog([down, plaintext, live, ssl]);
    expect(ranked.map((entry) => entry.uuid)).toEqual(["signal-1"]);
  });
});

describe("station availability honesty", () => {
  it("does not call a station healthy from stale catalog metadata", () => {
    const now = Date.parse("2026-08-11T00:00:00.000Z");
    const sevenMonthsAgo = new Date(now - 210 * 24 * 60 * 60 * 1000).toISOString();
    const stale = station({ healthStatus: "good", isStreamHealthy: true, lastCheckOk: true, lastCheckOkTime: sevenMonthsAgo });
    const fresh = station({ healthStatus: "good", isStreamHealthy: true, lastCheckOk: true, lastCheckOkTime: new Date(now - 60_000).toISOString() });

    expect(isEvidenceFresh(sevenMonthsAgo, now)).toBe(false);
    expect(isEvidenceFresh(new Date(now - 60_000).toISOString(), now)).toBe(true);

    const staleAvailability = deriveStationAvailability(stale);
    expect(staleAvailability.detailLabel).toBe("Not recently verified");
    expect(staleAvailability.tone).not.toBe("available");

    const freshAvailability = deriveStationAvailability(fresh);
    expect(freshAvailability.detailLabel).toBe("Healthy stream");
    expect(freshAvailability.tone).toBe("available");

    const staleHealth = deriveStationHealth(stale);
    expect(staleHealth?.status).toBe("warning");
    expect(staleHealth?.label).toContain("Not recently verified");

    const freshHealth = deriveStationHealth(fresh);
    expect(freshHealth?.status).toBe("good");
  });

  it("still trusts a real live probe regardless of catalog staleness", () => {
    const probedOk = station({ probeStatus: "ok", lastCheckOkTime: null });
    expect(deriveStationAvailability(probedOk).detailLabel).toBe("Checked live");
  });

  it("prefers recently verified and probed-live stations in ranking", () => {
    const now = Date.parse("2026-08-11T00:00:00.000Z");
    const downButLoud = station({ uuid: "loud-but-down", clickCount: 50_000, probeStatus: "down" });
    const staleQuiet = station({ uuid: "stale-quiet", healthStatus: "good", lastCheckOkTime: new Date(now - 220 * 24 * 60 * 60 * 1000).toISOString() });
    const probedFresh = station({ uuid: "probed-fresh", probeStatus: "ok", lastCheckOkTime: new Date(now - 60_000).toISOString() });

    expect(scoreStation(probedFresh)).toBeGreaterThan(scoreStation(staleQuiet));
    expect(scoreStation(staleQuiet)).toBeGreaterThan(scoreStation(downButLoud));

    const ranked = rankStations([downButLoud, staleQuiet, probedFresh]);
    expect(ranked[0]?.uuid).toBe("probed-fresh");
    expect(ranked[ranked.length - 1]?.uuid).toBe("loud-but-down");
  });
});

describe("catalog search payload", () => {
  const mockedRbFetchJson = vi.mocked(rbFetchJson);
  const mockedSnapshot = vi.mocked(fetchRadioBrowserCatalogSnapshot);

  beforeEach(() => {
    mockedRbFetchJson.mockReset();
    mockedSnapshot.mockReset();
  });

  it("does not re-attach the full multi-thousand-station snapshot to a focused query response", async () => {
    const bigSnapshot = {
      fetchedAt: new Date().toISOString(),
      stations: Array.from({ length: 8000 }, (_, index) =>
        station({ uuid: `snapshot-${index}` })
      ),
      countries: [],
      languages: [],
      tags: [],
    };
    mockedSnapshot.mockResolvedValue(bigSnapshot as never);
    mockedRbFetchJson.mockResolvedValue([station({ uuid: "malayalam-hit" })] as never);

    const request = new Request(
      "https://radio.example/api/radio-catalog?stations=8000&q=malayalam"
    );
    const response = await radioCatalogLoader({ request } as never);
    const body = (await response.json()) as { stations: Station[] };

    expect(body.stations.length).toBeLessThan(200);
    expect(body.stations.some((entry) => entry.uuid === "malayalam-hit")).toBe(true);
    expect(body.stations.some((entry) => entry.uuid.startsWith("snapshot-"))).toBe(false);
  });
});
