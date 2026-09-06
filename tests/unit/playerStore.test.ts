import { describe, expect, it, beforeEach } from "vitest";

import { usePlayerStore } from "~/state/playerStore";
import type { SceneDescriptor } from "~/scenes/types";
import type { Station } from "~/types/radio";

const mockStation = (overrides: Partial<Station> = {}): Station => ({
  uuid: "station-1",
  name: "Mock Station",
  url: "https://example.com",
  streamUrl: "https://example.com/stream",
  favicon: "",
  country: "USA",
  countryCode: "US",
  state: null,
  language: "English",
  languageCodes: ["en"],
  tags: null,
  tagList: [],
  bitrate: 192,
  codec: "mp3",
  homepage: null,
  hls: false,
  lastCheckOk: true,
  lastCheckOkTime: null,
  lastCheckTime: null,
  lastLocalCheckTime: null,
  sslError: false,
  clickCount: 0,
  clickTrend: 0,
  votes: 0,
  highlight: null,
  isStreamHealthy: undefined,
  healthStatus: undefined,
  isLikelyUp: null,
  healthScore: null,
  ...overrides,
});

describe("playerStore applySceneDescriptor", () => {
  beforeEach(() => {
    const store = usePlayerStore.getState();
    store.clearQueue();
    store.setNowPlaying(null);
    store.setCrossfadeMs(0);
  });

  it("queues stations and returns autoplay candidate", () => {
    const station = mockStation({ uuid: "auto" });
    const descriptor: SceneDescriptor = {
      visual: "atlas",
      stations: [station],
      play: { strategy: "autoplay_first", crossfadeMs: 4000 },
      mood: "Lush",
    };

    const auto = usePlayerStore.getState().applySceneDescriptor(descriptor);
    expect(auto?.uuid).toBe("auto");

    const state = usePlayerStore.getState();
    expect(state.queue[0]?.uuid).toBe("auto");
    expect(state.crossfadeMs).toBe(4000);
  });

  it("handles queue_only without autoplay", () => {
    const station = mockStation({ uuid: "queue-only" });
    const descriptor: SceneDescriptor = {
      visual: "atlas",
      stations: [station],
      play: { strategy: "queue_only" },
    };

    const auto = usePlayerStore.getState().applySceneDescriptor(descriptor);
    expect(auto).toBeNull();
    expect(usePlayerStore.getState().queue[0]?.uuid).toBe("queue-only");
  });
});

describe("playerStore recordLastTrack", () => {
  it("remembers the last aired title per station and ignores repeats", () => {
    const store = usePlayerStore.getState();
    const track = { artist: "The Beatles", title: "Revolution" };
    store.recordLastTrack("ontario", track as never);
    expect(
      usePlayerStore.getState().lastTrackByStation["ontario"]?.track,
    ).toMatchObject(track);

    const before = usePlayerStore.getState().lastTrackByStation["ontario"];
    store.recordLastTrack("ontario", { ...track } as never);
    expect(usePlayerStore.getState().lastTrackByStation["ontario"]).toBe(
      before,
    );

    store.recordLastTrack("ontario", {
      artist: "The Beatles",
      title: "Come Together",
    } as never);
    expect(
      usePlayerStore.getState().lastTrackByStation["ontario"]?.track.title,
    ).toBe("Come Together");
  });

  it("caps remembered stations instead of archiving storage", () => {
    const store = usePlayerStore.getState();
    for (let index = 0; index < 25; index += 1) {
      store.recordLastTrack(`station-${index}`, {
        artist: "A",
        title: `T${index}`,
      } as never);
    }
    const remembered = Object.keys(
      usePlayerStore.getState().lastTrackByStation,
    );
    expect(remembered.length).toBeLessThanOrEqual(20);
    expect(remembered).toContain("station-24");
  });
});
