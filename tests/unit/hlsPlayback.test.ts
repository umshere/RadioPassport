import { describe, expect, it } from "vitest";

import {
  canPlayNativeHls,
  hlsFailureReason,
  isHlsStreamUrl,
} from "~/utils/hlsPlayback";

describe("isHlsStreamUrl", () => {
  it("detects playlists by path, case and scheme", () => {
    for (const url of [
      "https://radio.example/live.m3u8",
      "http://radio.example/live.M3U8",
      "https://radio.example/live.m3u8?token=abc",
      "//radio.example/live.m3u8",
      "/live.m3u8",
    ]) {
      expect(isHlsStreamUrl(url), url).toBe(true);
    }
  });

  it("leaves other streams alone", () => {
    for (const url of [
      "https://radio.example/live.mp3",
      "https://radio.example/m3u8",
      "https://radio.example/live.m3u8.mp3",
      "",
    ]) {
      expect(isHlsStreamUrl(url), url).toBe(false);
    }
  });
});

describe("canPlayNativeHls", () => {
  it("asks the element for the HLS type", () => {
    expect(
      canPlayNativeHls({
        canPlayType: (type) =>
          type === "application/vnd.apple.mpegurl" ? "maybe" : "",
      })
    ).toBe(true);
    expect(canPlayNativeHls({ canPlayType: () => "" })).toBe(false);
  });

  it("does not throw when the element is hostile", () => {
    expect(
      canPlayNativeHls({
        canPlayType: () => {
          throw new Error("nope");
        },
      })
    ).toBe(false);
  });
});

describe("hlsFailureReason", () => {
  it("names native HLS failures separately from unsupported browsers", () => {
    expect(hlsFailureReason({ isHls: true, nativeHls: true })).toBe(
      "hls_native_error"
    );
    expect(hlsFailureReason({ isHls: true, nativeHls: false })).toBe(
      "hls_unsupported"
    );
  });

  it("is null for non-HLS streams", () => {
    expect(hlsFailureReason({ isHls: false, nativeHls: true })).toBeNull();
    expect(hlsFailureReason({ isHls: false, nativeHls: false })).toBeNull();
  });
});
