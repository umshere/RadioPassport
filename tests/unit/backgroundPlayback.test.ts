import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  isMediaClockStalled,
  shouldResumeOnReturn,
  STALL_TIMEOUT_MS,
} from "~/utils/playbackRecovery";

const root = readFileSync(
  new URL("../../app/root.tsx", import.meta.url),
  "utf8"
);

describe("background playback (screen locked)", () => {
  it("reads a stall from the media clock, not timer cadence", () => {
    const base = {
      isPlaying: true,
      currentTime: 42,
      lastCurrentTime: 42,
      lastAdvanceAt: 1_000,
    };
    expect(
      isMediaClockStalled({ ...base, now: 1_000 + STALL_TIMEOUT_MS })
    ).toBe(true);
    expect(
      isMediaClockStalled({ ...base, now: 1_000 + STALL_TIMEOUT_MS - 1 })
    ).toBe(false);
    // The clock moved: a throttled timer that wakes late is not a stall.
    expect(
      isMediaClockStalled({ ...base, currentTime: 80, now: 120_000 })
    ).toBe(false);
    expect(
      isMediaClockStalled({ ...base, isPlaying: false, now: 120_000 })
    ).toBe(false);
    expect(
      isMediaClockStalled({ ...base, lastAdvanceAt: 0, now: 120_000 })
    ).toBe(false);
  });

  it("resumes a parked station on return unless the listener acted", () => {
    expect(
      shouldResumeOnReturn({
        parkedStationId: "a",
        stationNow: "a",
        playbackIntent: false,
      })
    ).toBe(true);
    expect(
      shouldResumeOnReturn({
        parkedStationId: "a",
        stationNow: "b",
        playbackIntent: false,
      })
    ).toBe(false);
    expect(
      shouldResumeOnReturn({
        parkedStationId: "a",
        stationNow: "a",
        playbackIntent: true,
      })
    ).toBe(false);
    expect(
      shouldResumeOnReturn({
        parkedStationId: null,
        stationNow: "a",
        playbackIntent: false,
      })
    ).toBe(false);
  });

  it("checks playback when the page returns, including after a freeze", () => {
    expect(root).toContain('addEventListener("visibilitychange", handleReturn)');
    expect(root).toContain('addEventListener("resume", handleReturn)');
  });

  it("parks instead of skipping when the stream dies behind a locked screen", () => {
    expect(root).toMatch(/document\.hidden && canRetryPlayback\(reason\)[\s\S]{0,60}parkForReturn/);
    expect(root).toMatch(/Hls\.ErrorTypes\.NETWORK_ERROR &&\s*document\.hidden/);
  });

  it("retries a stalled hls.js stream instead of failing it as unsupported", () => {
    expect(root).toMatch(/if \(hlsFor\(audio\)\) return "timeout";/);
  });

  it("uses explicit lock-screen play and pause, not a toggle", () => {
    expect(root).not.toContain('safeSetHandler("play", () => playPause())');
    expect(root).not.toContain('safeSetHandler("pause", () => playPause())');
  });

  it("never holds the screen awake", () => {
    expect(root).not.toMatch(/wakeLock/);
  });
});
