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

  it("tries mixed content as https instead of skipping it before play", () => {
    const http = station({
      uuid: "http",
      url: "http://stream.example/plain",
      streamUrl: "http://stream.example/plain",
    });
    const down = station({ uuid: "down", probeStatus: "down" });
    const unknown = station({ uuid: "unknown" });
    const live = station({ uuid: "live", probeStatus: "ok" });
    const current = station({ uuid: "now" });
    expect(
      pickSkipCandidate({
        queue: [current, http, down, unknown, live],
        startIndex: 0,
        pinnedId: "now",
        protocol: "https:",
      })?.uuid
    ).toBe("live");
    expect(
      pickSkipCandidate({
        queue: [current, http, down, unknown],
        startIndex: 0,
        pinnedId: "now",
        protocol: "https:",
      })?.uuid
    ).toBe("http");
  });

  it("prefers the smaller stream when Data Saver is on", () => {
    const big = station({ uuid: "big", bitrate: 320, probeStatus: "ok" });
    const small = station({ uuid: "small", bitrate: 64, probeStatus: "ok" });
    const current = station({ uuid: "now" });
    const base = {
      queue: [current, big, small],
      startIndex: 0,
      pinnedId: "now",
      protocol: "https:",
    };
    expect(pickSkipCandidate({ ...base })?.uuid).toBe("big");
    expect(pickSkipCandidate({ ...base, saveData: true })?.uuid).toBe("small");
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
    ).toBeNull();
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
