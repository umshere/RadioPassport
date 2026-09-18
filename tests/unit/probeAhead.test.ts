import { describe, expect, it } from "vitest";
import type { Station } from "~/types/radio";
import {
  nextProbeTargets,
  pickSkipCandidate,
  shouldSkipBeforePlay,
} from "~/utils/probeAhead";
import { pickTopStation, scoreStation } from "~/utils/stationMeta";

const station = (overrides: Partial<Station> = {}): Station => ({
  uuid: "a",
  name: "A",
  url: "https://stream.example/a",
  streamUrl: "https://stream.example/a",
  favicon: "",
  country: "India",
  state: null,
  language: null,
  tags: null,
  bitrate: 128,
  codec: "mp3",
  ...overrides,
});

describe("probe-ahead skip", () => {
  it("asks the next three lands, wrapping the queue", () => {
    const queue = [
      station({ uuid: "a" }),
      station({ uuid: "b" }),
      station({ uuid: "c" }),
      station({ uuid: "d" }),
    ];
    expect(nextProbeTargets(queue, 0).map((row) => row.uuid)).toEqual([
      "b",
      "c",
      "d",
    ]);
    expect(nextProbeTargets(queue, 3).map((row) => row.uuid)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("skips mixed content and confirmed-down probes, then prefers a live probe", () => {
    const http = station({
      uuid: "http",
      url: "http://stream.example/plain",
      streamUrl: "http://stream.example/plain",
    });
    const down = station({ uuid: "down", probeStatus: "down" });
    const unknown = station({ uuid: "unknown" });
    const live = station({ uuid: "live", probeStatus: "ok" });
    const current = station({ uuid: "now" });
    const picked = pickSkipCandidate({
      queue: [current, http, down, unknown, live],
      startIndex: 0,
      pinnedId: "now",
      protocol: "https:",
    });
    expect(picked?.uuid).toBe("live");
  });

  it("does not celebrate a dead land before play", () => {
    expect(
      shouldSkipBeforePlay(
        station({ probeStatus: "down" }),
        "https:"
      )
    ).toBe("unknown");
    expect(
      shouldSkipBeforePlay(
        station({
          url: "http://stream.example/plain",
          streamUrl: "http://stream.example/plain",
        }),
        "https:"
      )
    ).toBe("mixed_content");
    expect(shouldSkipBeforePlay(station(), "https:")).toBeNull();
  });
});

describe("https land", () => {
  it("ranks a secure stream above a plaintext twin", () => {
    const secure = station({ uuid: "https" });
    const plaintext = station({
      uuid: "http",
      url: "http://stream.example/plain",
      streamUrl: "http://stream.example/plain",
    });
    expect(scoreStation(secure)).toBeGreaterThan(scoreStation(plaintext));
    expect(pickTopStation([plaintext, secure])?.uuid).toBe("https");
  });
});
