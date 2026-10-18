import { describe, expect, it } from "vitest";

import {
  canRetryPlayback,
  classifyPlayRejection,
  getRetryDelayMs,
  isPlaybackStalled,
  MAX_PLAYBACK_RECOVERY_ATTEMPTS,
  retryStreamUrl,
  STALL_TIMEOUT_MS,
  withRetryToken,
} from "~/utils/playbackRecovery";
import { playbackNoticeCopy } from "~/utils/playbackNoticeCopy";

describe("playbackRecovery", () => {
  it("retries only recoverable reasons", () => {
    expect(canRetryPlayback("audio_error")).toBe(true);
    expect(canRetryPlayback("play_rejected")).toBe(true);
    expect(canRetryPlayback("timeout")).toBe(true);
    expect(canRetryPlayback("unknown")).toBe(true);
    expect(canRetryPlayback("hls_native_error")).toBe(true);
    expect(canRetryPlayback("mixed_content")).toBe(false);
    expect(canRetryPlayback("hls_stream")).toBe(false);
    expect(canRetryPlayback("hls_unsupported")).toBe(false);
  });

  it("returns bounded retry delays", () => {
    expect(getRetryDelayMs(1)).toBe(700);
    expect(getRetryDelayMs(2)).toBe(1600);
    expect(getRetryDelayMs(999)).toBe(1600);
    expect(MAX_PLAYBACK_RECOVERY_ATTEMPTS).toBe(2);
  });

  it("adds cache-busting token to absolute URLs", () => {
    expect(withRetryToken("https://example.com/stream", "abc")).toBe(
      "https://example.com/stream?rp_retry=abc"
    );
  });

  it("reloads HLS playlists without adding a query param", () => {
    expect(retryStreamUrl("https://example.com/live.m3u8", "abc")).toBe(
      "https://example.com/live.m3u8"
    );
    expect(retryStreamUrl("https://example.com/stream", "abc")).toBe(
      "https://example.com/stream?rp_retry=abc"
    );
  });
});

describe("classifyPlayRejection", () => {
  it("separates autoplay policy and our own aborts from stream failures", () => {
    expect(classifyPlayRejection({ name: "NotAllowedError" })).toBe("blocked");
    expect(classifyPlayRejection({ name: "AbortError" })).toBe("aborted");
    expect(classifyPlayRejection(new Error("decode"))).toBe("stream");
    expect(classifyPlayRejection(null)).toBe("stream");
    expect(classifyPlayRejection(undefined)).toBe("stream");
  });
});

describe("isPlaybackStalled", () => {
  const started = {
    isPlaying: true,
    paused: false,
    hidden: false,
    lastProgressAt: 1000,
    now: 1000 + STALL_TIMEOUT_MS,
  };

  it("flags a started stream that has made no progress", () => {
    expect(isPlaybackStalled(started)).toBe(true);
    expect(isPlaybackStalled({ ...started, now: started.now - 1 })).toBe(false);
  });

  it("never flags pause, background throttling, or an unstarted stream", () => {
    expect(isPlaybackStalled({ ...started, isPlaying: false })).toBe(false);
    expect(isPlaybackStalled({ ...started, paused: true })).toBe(false);
    expect(isPlaybackStalled({ ...started, hidden: true })).toBe(false);
    expect(isPlaybackStalled({ ...started, lastProgressAt: 0 })).toBe(false);
  });
});

describe("playbackNoticeCopy", () => {
  it("names retry, skip, empty line, and pause without saying filters", () => {
    expect(
      playbackNoticeCopy("retrying", {
        attempt: 1,
        maxAttempts: MAX_PLAYBACK_RECOVERY_ATTEMPTS,
      })
    ).toBe("Signal unstable. Retrying (1/2).");
    expect(
      playbackNoticeCopy("retrying", {
        attempt: 2,
        maxAttempts: MAX_PLAYBACK_RECOVERY_ATTEMPTS,
      })
    ).toBe("Signal unstable. Retrying (2/2).");
    expect(playbackNoticeCopy("skip")).toBe("This signal failed. Next station.");
    expect(playbackNoticeCopy("queue-empty")).toBe(
      "No other live signal in this line."
    );
    expect(playbackNoticeCopy("too-many-failures")).toBe(
      "Playback paused. Try another station."
    );
    expect(playbackNoticeCopy("tap-play")).toBe(
      "Tap play to start the signal."
    );
    expect(playbackNoticeCopy("http-only")).toBe(
      "This signal only speaks HTTP; the browser won't allow it."
    );
    expect(playbackNoticeCopy("silent-switch")).toBe(
      "No sound? Check the silent switch."
    );
    for (const kind of [
      "retrying",
      "skip",
      "queue-empty",
      "too-many-failures",
      "tap-play",
      "http-only",
      "silent-switch",
    ] as const) {
      expect(playbackNoticeCopy(kind)).not.toMatch(/filter/i);
    }
  });
});
