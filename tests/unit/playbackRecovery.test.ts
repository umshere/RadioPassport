import { describe, expect, it } from "vitest";

import {
  canRetryPlayback,
  getRetryDelayMs,
  MAX_PLAYBACK_RECOVERY_ATTEMPTS,
  withRetryToken,
} from "~/utils/playbackRecovery";
import { playbackNoticeCopy } from "~/utils/playbackNoticeCopy";

describe("playbackRecovery", () => {
  it("retries only recoverable reasons", () => {
    expect(canRetryPlayback("audio_error")).toBe(true);
    expect(canRetryPlayback("play_rejected")).toBe(true);
    expect(canRetryPlayback("timeout")).toBe(true);
    expect(canRetryPlayback("unknown")).toBe(true);
    expect(canRetryPlayback("mixed_content")).toBe(false);
    expect(canRetryPlayback("hls_stream")).toBe(false);
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
    for (const kind of [
      "retrying",
      "skip",
      "queue-empty",
      "too-many-failures",
    ] as const) {
      expect(playbackNoticeCopy(kind)).not.toMatch(/filter/i);
    }
  });
});
