import { describe, expect, it } from "vitest";
import { envDurationMs, envGain, gustEnvelope, gustFrames } from "~/components/env/envModel";
import { readFileSync } from "node:fs";

describe("environment model", () => {
  it("takes longer the further the hour travels", () => {
    expect(envDurationMs("dawn", "midday")).toBe(3300);
    expect(envDurationMs("dawn", "night")).toBe(4700);
    expect(envDurationMs("night", "dawn")).toBe(4700);
  });
  it("lets the light in most on the home", () => {
    expect(envGain("/")).toBeGreaterThan(envGain("/listen"));
    expect(envGain("/listen")).toBeGreaterThan(envGain("/about"));
  });
  it("gusts rise, decay and settle", () => {
    expect(gustEnvelope(0)).toBe(0);
    expect(gustEnvelope(0.6)).toBeGreaterThan(gustEnvelope(4));
    expect(gustEnvelope(4.2)).toBeLessThan(0.03);
    const frames = gustFrames({ seconds: 4.2, strength: 0.9, direction: -1 });
    expect(frames).toHaveLength(25);
    expect(Math.abs(parseFloat(frames[0]?.translate ?? "1"))).toBe(0);
  });
  it("keeps every hour's light inside the opacity budget", () => {
    const css = readFileSync("app/styles/15-env.css", "utf8");
    const peaks = [...css.matchAll(/--env-peak: (\.\d+)/g)].map((m) => Number(m[1]));
    expect(Math.max(...peaks)).toBeLessThanOrEqual(0.1);
  });
  it("honours reduced motion and the room swap", () => {
    const css = readFileSync("app/styles/15-env.css", "utf8");
    expect(css).toContain("prefers-reduced-motion: reduce");
    expect(css).toContain("ew-atmosphere-shift");
  });
});
