import { describe, expect, it } from "vitest";

import { prefersLowBitrate, upgradeHttpToHttps } from "~/utils/streamHeuristics";

describe("upgradeHttpToHttps", () => {
  it("upgrades absolute plaintext streams to https", () => {
    expect(upgradeHttpToHttps("http://stream.example/a")).toBe(
      "https://stream.example/a"
    );
    expect(upgradeHttpToHttps("HTTP://stream.example:8080/a?x=1#z")).toBe(
      "https://stream.example:8080/a?x=1#z"
    );
  });

  it("leaves secure, protocol-relative, relative and empty inputs alone", () => {
    for (const url of [
      "https://stream.example/a",
      "//stream.example/a",
      "/a",
      "stream.example/a",
      "",
    ]) {
      expect(upgradeHttpToHttps(url)).toBe(url);
    }
  });

  it("leaves invalid plaintext input alone", () => {
    expect(upgradeHttpToHttps("http://")).toBe("http://");
    expect(upgradeHttpToHttps("http://[bad")).toBe("http://[bad");
  });
});

describe("prefersLowBitrate", () => {
  it("honours Data Saver and very slow connections", () => {
    expect(prefersLowBitrate({ saveData: true })).toBe(true);
    expect(prefersLowBitrate({ effectiveType: "2g" })).toBe(true);
    expect(prefersLowBitrate({ effectiveType: "slow-2g" })).toBe(true);
  });

  it("stays normal on wifi, 3g/4g, or no connection info", () => {
    expect(prefersLowBitrate({ saveData: false, effectiveType: "4g" })).toBe(false);
    expect(prefersLowBitrate({ effectiveType: "3g" })).toBe(false);
    expect(prefersLowBitrate(null)).toBe(false);
    expect(prefersLowBitrate(undefined)).toBe(false);
  });
});
