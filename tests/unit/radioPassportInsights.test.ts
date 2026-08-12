import { describe, expect, it } from "vitest";
import type { Station } from "~/types/radio";
import { aggregateCountryStationContext } from "~/components/radio-passport/countryData";
import { applyAiPreviewPool } from "~/components/radio-passport/aiPreview";
import {
  focusTrapTarget,
  isAiTrackOptedIn,
  isFocusablePresentation,
  safeExternalUrl,
  shouldRequestSelectedNowPlaying,
  shouldFocusAiResult,
  shouldResetAiTrackOptIn,
  shouldOverlayHandleEscape,
  prepareCatalogSearchStations,
  stationDetailRows,
  stationDetailsPresentation,
  stationPlace,
  stationTags,
  trackKey,
} from "~/components/radio-passport/stationInsights";
import { useStationInsightsStore } from "~/state/stationInsightsStore";
import { usePlayerStore } from "~/state/playerStore";
import { shouldCacheAiTriviaStatus } from "~/hooks/useTrackTrivia";

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
  tags: "Jazz, World",
  tagList: ["Jazz", "World"],
  bitrate: 128,
  codec: "mp3",
  ...overrides,
});

describe("station insights contracts", () => {
  it("allows only absolute http(s) external links and keeps place data honest", () => {
    expect(safeExternalUrl("https://station.example/about")).toBe(
      "https://station.example/about",
    );
    expect(safeExternalUrl("http://station.example")).toBe(
      "http://station.example/",
    );
    expect(safeExternalUrl("javascript:alert(1)")).toBeNull();
    expect(safeExternalUrl("/relative")).toBeNull();
    expect(safeExternalUrl("ftp://station.example")).toBeNull();
    expect(stationPlace(station({ city: "India", state: "India" }))).toBeNull();
    expect(stationPlace(station({ city: "Kochi", state: "Kochi" }))).toBe(
      "Kochi",
    );
    expect(stationPlace(station({ city: null, state: "Kerala" }))).toBe(
      "Kerala",
    );
    expect(stationPlace(station({ city: "Kochi", state: null }))).toBe(
      "Kochi",
    );
    expect(stationPlace(station({ city: null, state: null }))).toBeNull();
    expect(
      stationPlace(station({ country: "India", city: " india ", state: "KOCHI" })),
    ).toBe("KOCHI");
    expect(
      stationTags(station({ tagList: [" Jazz ", "jazz", "World"] })),
    ).toEqual(["Jazz", "World"]);
  });

  it("only presents static metadata supported by real station fields", () => {
    const missing = station({ country: "", city: null, state: null, language: null, tags: null, tagList: [], codec: null, bitrate: 0 });
    expect(stationDetailRows(missing)).toEqual([]);
    expect(stationDetailsPresentation(missing).homepage).toBeNull();
    const real = station({
      homepage: "https://station.example",
      probeStatus: "ok",
      probeLatencyMs: 48,
      lastCheckOk: true,
      lastCheckOkTime: new Date().toISOString(),
      clickCount: 1400,
      clickTrend: 11,
      votes: 8,
    });
    expect(stationDetailRows(real)).toEqual(expect.arrayContaining([
      ["Place", "Kochi, Kerala"], ["Country", "India"], ["Language", "Malayalam"],
      ["Codec", "MP3"], ["Bitrate", "128 kbps"], ["Availability", "Checked live"],
      ["Probe", "48 ms"], ["Clicks", "1,400"], ["Click trend", "+11"], ["Votes", "8"],
    ]));
    expect(stationDetailsPresentation(real).homepage).toBe("https://station.example/");
  });

  it("derives deterministic country context from loaded stations only", () => {
    const context = aggregateCountryStationContext([
      station({
        uuid: "a",
        language: " Malayalam ",
        tagList: ["Jazz", "World"],
      }),
      station({
        uuid: "b",
        language: "malayalam",
        tagList: ["jazz", "News"],
        streamUrl: null,
        url: "",
      }),
      station({ uuid: "c", language: "Hindi", tagList: ["News"] }),
    ]);
    expect(context.playableCount).toBe(2);
    expect(context.languages).toEqual(["Malayalam", "Hindi"]);
    expect(context.tags).toEqual(["Jazz", "News", "World"]);
  });

  it("keeps details selection and AI preview separate from the player, retaining descriptor rationale", () => {
    const selected = station();
    usePlayerStore.getState().clearQueue();
    usePlayerStore.getState().setNowPlaying(null);
    const before = usePlayerStore.getState();
    useStationInsightsStore.getState().open(selected);
    expect(useStationInsightsStore.getState().station).toBe(selected);
    expect(usePlayerStore.getState().nowPlaying).toBe(before.nowPlaying);
    expect(usePlayerStore.getState().queue).toEqual(before.queue);
    useStationInsightsStore.getState().close();
    expect(useStationInsightsStore.getState().station).toBeNull();
    const descriptor = {
      visual: "card_stack",
      mood: "Late Night",
      reason: "Coastal jazz",
      stations: [selected],
      play: { strategy: "queue_only" as const },
    };
    const resolved = applyAiPreviewPool(descriptor, () => undefined);
    expect(resolved).toBe(descriptor);
    expect(resolved.reason).toBe("Coastal jazz");
    expect(resolved.mood).toBe("Late Night");
    expect(trackKey({ artist: "A", title: "B" })).toBe('["A","B"]');
    expect(trackKey(null)).toBe("");
  });

  it("gates live metadata, AI opt-in, AI caching, and focus boundaries by current state", () => {
    const selected = station();
    expect(shouldRequestSelectedNowPlaying(selected, selected, true)).toBe(true);
    expect(shouldRequestSelectedNowPlaying(selected, station({ ...selected }), true)).toBe(true);
    expect(shouldRequestSelectedNowPlaying(selected, station({ streamUrl: "https://stream.example/other" }), true)).toBe(false);
    expect(shouldRequestSelectedNowPlaying(selected, selected, false)).toBe(false);
    expect(shouldRequestSelectedNowPlaying(selected, station({ uuid: "other" }), true)).toBe(false);
    expect(shouldRequestSelectedNowPlaying(selected, station({ uuid: "other", streamUrl: selected.streamUrl }), true)).toBe(false);
    expect(shouldRequestSelectedNowPlaying(selected, station({ streamUrl: null, url: "" }), true)).toBe(false);
    expect(shouldFocusAiResult(false, true)).toBe(true);
    expect(shouldFocusAiResult(true, true)).toBe(false);
    expect(shouldFocusAiResult(true, false)).toBe(false);
    const currentTrack = trackKey({ artist: "Artist", title: "Track" });
    const otherTrack = trackKey({ artist: "Other", title: "Track" });
    expect(isAiTrackOptedIn(currentTrack, currentTrack)).toBe(true);
    expect(isAiTrackOptedIn(currentTrack, otherTrack)).toBe(false);
    expect(isAiTrackOptedIn("", "")).toBe(false);
    const trackA = trackKey({ artist: "A", title: "B" });
    const trackC = trackKey({ artist: "A", title: "C" });
    expect(shouldResetAiTrackOptIn("station", "station", trackA, trackA)).toBe(false);
    expect(shouldResetAiTrackOptIn("station", "station", trackA, trackC)).toBe(true);
    expect(shouldResetAiTrackOptIn("station", "other", trackA, trackA)).toBe(true);
    const delimiterCollisionLeft = trackKey({ artist: "A|B", title: "C" });
    const delimiterCollisionRight = trackKey({ artist: "A", title: "B|C" });
    expect(delimiterCollisionLeft).not.toBe(delimiterCollisionRight);
    expect(isAiTrackOptedIn(delimiterCollisionLeft, delimiterCollisionRight)).toBe(false);
    expect(shouldOverlayHandleEscape(true)).toBe(false);
    expect(shouldOverlayHandleEscape(false)).toBe(true);
    expect(shouldCacheAiTriviaStatus("ready")).toBe(true);
    expect(shouldCacheAiTriviaStatus("empty")).toBe(true);
    expect(shouldCacheAiTriviaStatus("error")).toBe(false);
    expect(focusTrapTarget(0, -1, false)).toBe("dialog");
    expect(focusTrapTarget(2, -1, false)).toBe("first");
    expect(focusTrapTarget(2, -1, true)).toBe("last");
    expect(focusTrapTarget(2, 0, true)).toBe("last");
    expect(focusTrapTarget(2, 1, false)).toBe("first");
    expect(focusTrapTarget(2, 0, false)).toBeNull();
    expect(isFocusablePresentation({})).toBe(true);
    expect(isFocusablePresentation({ hidden: true })).toBe(false);
    expect(isFocusablePresentation({ ariaHidden: "true" })).toBe(false);
    expect(isFocusablePresentation({ inert: true })).toBe(false);
    expect(isFocusablePresentation({ disabled: true })).toBe(false);
  });

  it("keeps normalized search station metadata intact", () => {
    const normalized = station({
      lastCheckOk: true,
      lastCheckOkTime: "2026-08-11T12:00:00.000Z",
      lastCheckTime: "2026-08-11T12:01:00.000Z",
      lastLocalCheckTime: "2026-08-11T12:02:00.000Z",
      clickCount: 42,
      clickTrend: 3,
      votes: 9,
      latitude: 9.93,
      longitude: 76.26,
      homepage: "https://station.example",
      healthStatus: "good",
      isStreamHealthy: true,
    });
    const result = prepareCatalogSearchStations([normalized], "signal", (entry, query) => entry.name.toLowerCase().includes(query));
    expect(result[0]).toMatchObject({
      lastCheckOk: true,
      lastCheckOkTime: "2026-08-11T12:00:00.000Z",
      lastCheckTime: "2026-08-11T12:01:00.000Z",
      lastLocalCheckTime: "2026-08-11T12:02:00.000Z",
      clickCount: 42,
      clickTrend: 3,
      votes: 9,
      latitude: 9.93,
      longitude: 76.26,
      homepage: "https://station.example",
      healthStatus: "good",
      isStreamHealthy: true,
    });
  });
});
