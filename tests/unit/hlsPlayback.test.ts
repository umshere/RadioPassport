import { describe, expect, it } from "vitest";

import {
  canPlayNativeHls,
  destroyHlsFor,
  hlsFailureReason,
  hlsFor,
  isHlsPending,
  isHlsStreamUrl,
  rememberHls,
  setHlsPending,
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

describe("hls instance registry", () => {
  function handle(label: string, calls: string[]) {
    return {
      destroy: () => calls.push(label),
      startLoad: () => undefined,
      loadSource: () => undefined,
    };
  }

  it("keeps one instance per element and destroys the old one", () => {
    const audio = {};
    const calls: string[] = [];
    const first = handle("first", calls);
    const second = handle("second", calls);

    rememberHls(audio, first);
    expect(hlsFor(audio)).toBe(first);

    rememberHls(audio, second);
    expect(calls).toEqual(["first"]);
    expect(hlsFor(audio)).toBe(second);

    destroyHlsFor(audio);
    expect(calls).toEqual(["first", "second"]);
    expect(hlsFor(audio)).toBeNull();

    destroyHlsFor(audio);
    expect(calls).toEqual(["first", "second"]);
  });

  it("survives a destroy that throws", () => {
    const audio = {};
    rememberHls(audio, {
      destroy: () => {
        throw new Error("already gone");
      },
      startLoad: () => undefined,
      loadSource: () => undefined,
    });
    expect(() => destroyHlsFor(audio)).not.toThrow();
    expect(hlsFor(audio)).toBeNull();
  });
});

describe("hls pending flag", () => {
  it("marks a source as loading and clears it on destroy", () => {
    const audio = {};
    setHlsPending(audio, true);
    expect(isHlsPending(audio)).toBe(true);
    setHlsPending(audio, true);
    expect(isHlsPending(audio)).toBe(true);
    setHlsPending(audio, false);
    expect(isHlsPending(audio)).toBe(false);
  });

  it("clears pending when the instance is destroyed", () => {
    const audio = {};
    setHlsPending(audio, true);
    destroyHlsFor(audio);
    expect(isHlsPending(audio)).toBe(false);
  });
});
