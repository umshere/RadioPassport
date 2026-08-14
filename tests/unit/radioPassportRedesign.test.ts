import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("~/utils/radioBrowser", () => ({ rbFetchJson: vi.fn() }));
import { createQueueSession } from "~/utils/playerQueue";
import { usePlayerStore } from "~/state/playerStore";
import {
  isStampReady,
  stationStampId,
  canMutateJourney,
  useJourneyStore,
} from "~/state/journeyStore";
import {
  FAVORITE_SNAPSHOT_CAP,
  dropFavoriteSnapshot,
  parseFavoriteSnapshots,
  resolveKeptSignals,
  toSlimStation,
  upsertFavoriteSnapshot,
} from "~/state/favoriteSnapshot";
import {
  nextGlobePlaceIndex,
  shouldAnimateGlobe,
  shouldSpinGlobe,
} from "~/components/radio-passport/ParticleGlobe";
import type { Station } from "~/types/radio";
import { rbFetchJson } from "~/utils/radioBrowser";
import {
  countryCacheKey,
  countryCacheWith,
  fetchCountryDrilldown,
} from "~/components/radio-passport/countryData";
import { stampForContinuousSession } from "~/components/radio-passport/JourneyBridge";
import { applyAiPreviewPool } from "~/components/radio-passport/aiPreview";
import { catalogRequestState } from "~/components/radio-passport/searchState";

const station = (id: string): Station => ({
  uuid: id,
  name: `Signal ${id}`,
  url: `https://example.com/${id}`,
  streamUrl: `https://example.com/${id}`,
  favicon: "",
  country: "India",
  countryCode: "IN",
  state: null,
  city: "Kochi",
  latitude: 9.93,
  longitude: 76.26,
  language: "Malayalam",
  languageCodes: [],
  tags: "jazz",
  tagList: ["jazz"],
  bitrate: 128,
  codec: "mp3",
});

describe("Signal & Stamp journey contracts", () => {
  beforeEach(() => {
    usePlayerStore.getState().clearQueue();
    usePlayerStore.getState().setNowPlaying(null);
    useJourneyStore.setState({
      stamps: [],
      playedStationIds: [],
      favoriteStationIds: [],
      favoriteStations: [],
    });
  });
  it("keeps a selected station in a wrapped filtered queue", () => {
    const pool = [station("a"), station("b"), station("c")];
    const session = createQueueSession({
      sourceType: "search",
      sourceLabel: "Search: jazz",
      stations: pool,
      seed: "jazz",
    });
    usePlayerStore.getState().startStation(pool[2]!, { queueSession: session });
    const state = usePlayerStore.getState();
    expect(state.queueId).toBe(session.queueId);
    expect(state.currentStationIndex).toBe(2);
    const wrapped =
      state.queue[(state.currentStationIndex + 1) % state.queue.length];
    expect(wrapped?.uuid).toBe("a");
    // A filter is presentation state; it does not call stop or replace the current player state.
    expect(state.nowPlaying?.uuid).toBe("c");
  });
  it("only considers a stamp ready after a continuous 60 seconds and persists a location identity", () => {
    expect(isStampReady(1_000, 60_999, true)).toBe(false);
    expect(isStampReady(1_000, 61_000, false)).toBe(false);
    expect(isStampReady(1_000, 61_000, true)).toBe(true);
    const id = stationStampId("a", "Kochi", "India");
    useJourneyStore.getState().addStamp({
      id,
      stationId: "a",
      stationName: "Signal a",
      city: "Kochi",
      country: "India",
      countryCode: "IN",
      language: "Malayalam",
      telemetry: "128K MP3",
      stampedAt: 61_000,
    });
    expect(useJourneyStore.getState().stamps).toHaveLength(1);
    expect(stationStampId("other", "Kochi", "India")).toBe(id);
  });
  it("hydrates the previous favorites and passport storage keys into the journey store", () => {
    const values = new Map<string, string>([
      ["radio-passport-favorites", JSON.stringify(["legacy-favorite"])],
      [
        "radio_passport",
        JSON.stringify([
          {
            id: "legacy-station",
            stationName: "Legacy signal",
            country: "India",
            countryCode: "IN",
            timestamp: 100,
          },
        ]),
      ],
    ]);
    const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        localStorage: {
          getItem: (key: string) => values.get(key) ?? null,
          setItem: (key: string, value: string) => values.set(key, value),
        },
      },
    });
    useJourneyStore.setState({
      hydrated: false,
      stamps: [],
      favoriteStationIds: [],
      favoriteStations: [],
    });
    useJourneyStore.getState().hydrate();
    expect(useJourneyStore.getState().favoriteStationIds).toEqual([
      "legacy-favorite",
    ]);
    expect(useJourneyStore.getState().stamps[0]?.country).toBe("India");
    expect(values.get("radio-passport-journey")).toContain("legacy-favorite");
    if (previous) Object.defineProperty(globalThis, "window", previous);
    else Reflect.deleteProperty(globalThis, "window");
  });
  it("pauses canvas animation for hidden documents and reduced motion", () => {
    expect(shouldAnimateGlobe(false, false)).toBe(true);
    expect(shouldAnimateGlobe(true, false)).toBe(false);
    expect(shouldAnimateGlobe(false, true)).toBe(false);
    expect(shouldSpinGlobe(false, false, true)).toBe(false);
    expect(nextGlobePlaceIndex(0, 3, -1)).toBe(2);
    expect(nextGlobePlaceIndex(2, 3, 1)).toBe(0);
  });
  it("loads and caches a bounded real country drill-down pool", async () => {
    vi.mocked(rbFetchJson).mockResolvedValueOnce([
      station("country-a"),
      station("country-b"),
    ] as never);
    const stations = await fetchCountryDrilldown("India");
    expect(stations.map((entry) => entry.uuid)).toEqual([
      "country-a",
      "country-b",
    ]);
    expect(vi.mocked(rbFetchJson)).toHaveBeenCalledWith(
      expect.stringContaining("/json/stations/bycountry/India?limit=1000"),
      undefined,
      expect.objectContaining({ softFail: true })
    );
    const cache = countryCacheWith({}, "India", {
      status: "ready",
      stations,
    });
    expect(cache[countryCacheKey("INDIA")]?.stations).toBe(stations);
  });
  it("keeps the active signal playing when an AI pool replaces its queue", () => {
    const current = station("current");
    const queue = [current, station("next")];
    usePlayerStore.getState().startStation(queue[1]!, {
      autoPlay: false,
      queueSession: createQueueSession({
        sourceType: "atlas",
        sourceLabel: "Current queue",
        stations: queue,
      }),
    });
    const queueBefore = usePlayerStore
      .getState()
      .queue.map((entry) => entry.uuid);
    const indexBefore = usePlayerStore.getState().currentStationIndex;
    const aiPool = [station("ai-a"), station("ai-b")];
    applyAiPreviewPool(
      {
        visual: "card_stack",
        stations: aiPool,
        play: { strategy: "queue_only" },
      },
      (stations) => expect(stations).toBe(aiPool)
    );
    expect(usePlayerStore.getState().nowPlaying?.uuid).toBe("next");
    expect(usePlayerStore.getState().queue.map((entry) => entry.uuid)).toEqual(
      queueBefore
    );
    expect(usePlayerStore.getState().currentStationIndex).toBe(indexBefore);
  });
  it("gates journey mutations and cancels an incomplete global stamp session", () => {
    expect(canMutateJourney(false)).toBe(false);
    expect(canMutateJourney(true)).toBe(true);
    expect(
      stampForContinuousSession(station("session"), 1_000, 60_999, true)
    ).toBeNull();
    expect(
      stampForContinuousSession(station("session"), 1_000, 61_000, false)
    ).toBeNull();
    expect(
      stampForContinuousSession(station("session"), 1_000, 61_000, true)?.city
    ).toBe("Kochi");
  });
  it("clears debounce loading for short search and permits retry cache replacement", () => {
    expect(catalogRequestState("j")).toEqual({
      shouldFetch: false,
      isLoading: false,
    });
    expect(catalogRequestState("jazz")).toEqual({
      shouldFetch: true,
      isLoading: true,
    });
    const failed = countryCacheWith({}, "Japan", {
      status: "error",
      stations: [],
      message: "offline",
    });
    const retried = countryCacheWith(failed, "Japan", {
      status: "loading",
      stations: [],
    });
    expect(retried[countryCacheKey("Japan")]?.status).toBe("loading");
  });
});

describe("Kept-signal snapshots survive a gone search catalog", () => {
  it("persists a slim snapshot that can play without the live pool", () => {
    const searchOnly = station("search-only");
    const slim = toSlimStation(searchOnly);
    expect(slim).toMatchObject({
      uuid: "search-only",
      name: "Signal search-only",
      streamUrl: searchOnly.streamUrl,
      city: "Kochi",
      country: "India",
      countryCode: "IN",
      longitude: 76.26,
      latitude: 9.93,
    });
    const resolved = resolveKeptSignals(["search-only"], [slim!], []);
    expect(resolved).toHaveLength(1);
    expect(resolved[0]?.uuid).toBe("search-only");
    expect(resolved[0]?.streamUrl).toBe(searchOnly.streamUrl);
  });

  it("reads snapshots first, then fills remaining hearts from the live pool", () => {
    const live = station("live");
    const gone = station("gone");
    const slim = toSlimStation(gone)!;
    const resolved = resolveKeptSignals(
      ["gone", "live", "missing"],
      [slim],
      [live]
    );
    expect(resolved.map((entry) => entry.uuid)).toEqual(["gone", "live"]);
    expect(resolved[0]?.name).toBe(gone.name);
  });

  it("caps snapshots and drops one when the heart is removed", () => {
    const first = toSlimStation(station("keep"))!;
    let list = upsertFavoriteSnapshot([], first);
    for (let i = 0; i < FAVORITE_SNAPSHOT_CAP; i++) {
      list = upsertFavoriteSnapshot(list, toSlimStation(station(`s${i}`))!);
    }
    expect(list).toHaveLength(FAVORITE_SNAPSHOT_CAP);
    expect(list.some((entry) => entry.uuid === "keep")).toBe(false);
    expect(dropFavoriteSnapshot(list, "s0").some((entry) => entry.uuid === "s0")).toBe(
      false
    );
  });

  it("hydrates old favorite ids without snapshots, and new hearts write both", () => {
    const values = new Map<string, string>([
      [
        "radio-passport-journey",
        JSON.stringify({
          travelerNumber: "000 001",
          memberSince: 1,
          favoriteStationIds: ["legacy-id"],
        }),
      ],
    ]);
    const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        localStorage: {
          getItem: (key: string) => values.get(key) ?? null,
          setItem: (key: string, value: string) => values.set(key, value),
        },
      },
    });
    useJourneyStore.setState({
      hydrated: false,
      favoriteStationIds: [],
      favoriteStations: [],
    });
    useJourneyStore.getState().hydrate();
    expect(useJourneyStore.getState().favoriteStationIds).toEqual(["legacy-id"]);
    expect(useJourneyStore.getState().favoriteStations).toEqual([]);
    expect(parseFavoriteSnapshots(undefined)).toEqual([]);

    useJourneyStore.getState().toggleFavorite("search-heart", station("search-heart"));
    expect(useJourneyStore.getState().favoriteStationIds).toContain("search-heart");
    expect(
      useJourneyStore.getState().favoriteStations.some((entry) => entry.uuid === "search-heart")
    ).toBe(true);
    useJourneyStore.getState().toggleFavorite("search-heart");
    expect(
      useJourneyStore.getState().favoriteStations.some((entry) => entry.uuid === "search-heart")
    ).toBe(false);
    if (previous) Object.defineProperty(globalThis, "window", previous);
    else Reflect.deleteProperty(globalThis, "window");
  });
});
