import { describe, expect, it } from "vitest";

import { upgradeHttpToHttps } from "~/utils/streamHeuristics";

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
