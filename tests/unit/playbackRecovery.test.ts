import { describe, expect, it } from "vitest";

import {
  canRetryPlayback,
  getRetryDelayMs,
  MAX_PLAYBACK_RECOVERY_ATTEMPTS,
  withRetryToken,
} from "~/utils/playbackRecovery";

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
