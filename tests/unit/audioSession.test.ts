import { afterEach, describe, expect, it, vi } from "vitest";

import { isIosDevice } from "~/utils/audioSession";

const navigatorDescriptor = Object.getOwnPropertyDescriptor(
  globalThis,
  "navigator"
);

function stubNavigator(value: unknown) {
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    writable: true,
    value,
  });
}

afterEach(() => {
  if (navigatorDescriptor) {
    Object.defineProperty(globalThis, "navigator", navigatorDescriptor);
  } else {
    Reflect.deleteProperty(globalThis, "navigator");
  }
  vi.resetModules();
});

const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const IPAD =
  "Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1";
const IPOD =
  "Mozilla/5.0 (iPod touch; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1";
const IPAD_DESKTOP =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";
const ANDROID =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";

describe("isIosDevice", () => {
  it("recognises iPhone, iPad and iPod", () => {
    expect(isIosDevice(IPHONE)).toBe(true);
    expect(isIosDevice(IPAD)).toBe(true);
    expect(isIosDevice(IPOD)).toBe(true);
  });

  it("treats iPadOS desktop mode as iOS", () => {
    stubNavigator({ userAgent: IPAD_DESKTOP, maxTouchPoints: 5 });
    expect(isIosDevice()).toBe(true);
    expect(isIosDevice(IPAD_DESKTOP)).toBe(true);
  });

  it("leaves Android and macOS Safari alone", () => {
    expect(isIosDevice(ANDROID)).toBe(false);
    stubNavigator({ userAgent: IPAD_DESKTOP, maxTouchPoints: 0 });
    expect(isIosDevice()).toBe(false);
  });

  it("is false for empty or missing user agents", () => {
    expect(isIosDevice("")).toBe(false);
    Reflect.deleteProperty(globalThis, "navigator");
    expect(isIosDevice()).toBe(false);
  });
});

describe("setPlaybackAudioSession", () => {
  it("sets the session type once when the slot exists", async () => {
    const session = { type: "auto" };
    let assignments = 0;
    const audioSession = {};
    Object.defineProperty(audioSession, "type", {
      get: () => session.type,
      set: (next: string) => {
        session.type = next;
        assignments += 1;
      },
    });
    stubNavigator({ userAgent: IPHONE, audioSession });

    const { setPlaybackAudioSession } = await import("~/utils/audioSession");
    setPlaybackAudioSession();
    setPlaybackAudioSession();

    expect(session.type).toBe("playback");
    expect(assignments).toBe(1);
  });

  it("does not throw when the slot or navigator is absent", async () => {
    stubNavigator({ userAgent: IPHONE });
    const first = await import("~/utils/audioSession");
    expect(() => first.setPlaybackAudioSession()).not.toThrow();

    vi.resetModules();
    Reflect.deleteProperty(globalThis, "navigator");
    const second = await import("~/utils/audioSession");
    expect(() => second.setPlaybackAudioSession()).not.toThrow();
  });
});
