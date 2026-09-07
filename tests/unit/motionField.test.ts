import { describe, expect, it } from "vitest";
import {
  MOTION_DOT_FLOOR,
  MOTION_PHASE_SPEED,
  MOTION_SCROLL_GAIN,
  MOTION_SETTLE_RATE,
  dampTowards,
  decayBoost,
  dotFalloff,
  hypotrochoidPoint,
  lissajousPoint,
} from "~/components/radio-passport/motionField";

describe("dots & damping math", () => {
  it("damps toward the target and never overshoots", () => {
    let value = 0;
    for (let i = 0; i < 240; i++) {
      value = dampTowards(value, 1, 5, 1 / 60);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
    expect(value).toBeCloseTo(1, 3);
    expect(dampTowards(4, 4, 5, 1 / 60)).toBe(4);
    expect(dampTowards(4, 9, 5, 0)).toBe(4);
  });

  it("settles scroll boost back to rest", () => {
    let boost = 2.4;
    for (let i = 0; i < 240; i++) boost = decayBoost(boost, 1 / 60);
    expect(Math.abs(boost)).toBeLessThan(0.001);
    expect(MOTION_SETTLE_RATE).toBeGreaterThanOrEqual(2);
    expect(MOTION_SETTLE_RATE).toBeLessThanOrEqual(4);
    expect(MOTION_SCROLL_GAIN).toBeGreaterThan(0);
    expect(MOTION_PHASE_SPEED).toBeGreaterThan(0);
  });

  it("weaves lissajous knots inside the unit square", () => {
    const seen = new Set<string>();
    for (let i = 0; i <= 512; i++) {
      const [x, y] = lissajousPoint(3, 2, Math.PI / 2, (i / 512) * Math.PI * 2);
      expect(Math.abs(x)).toBeLessThanOrEqual(1);
      expect(Math.abs(y)).toBeLessThanOrEqual(1);
      seen.add(`${x.toFixed(2)},${y.toFixed(2)}`);
    }
    // A 3:2 knot covers ground — not a dot, not a line.
    expect(seen.size).toBeGreaterThan(200);
    const [x0, y0] = lissajousPoint(3, 2, 0, 0);
    expect(x0).toBeCloseTo(0, 10);
    expect(y0).toBeCloseTo(0, 10);
  });

  it("draws the Tusi couple as a straight line", () => {
    // R = 2r, d = r: the rolling circle's pen rides a diameter. y ≡ 0.
    for (let i = 0; i <= 64; i++) {
      const [x, y] = hypotrochoidPoint(2, 1, 1, (i / 64) * Math.PI * 2);
      expect(y).toBeCloseTo(0, 10);
      expect(Math.abs(x)).toBeLessThanOrEqual(1 + 1e-9);
    }
  });

  it("draws spirograph loops inside the unit square", () => {
    let minX = Infinity;
    let maxX = -Infinity;
    for (let i = 0; i <= 1024; i++) {
      const [x, y] = hypotrochoidPoint(5, 3, 2.2, (i / 1024) * Math.PI * 2);
      expect(Math.abs(x)).toBeLessThanOrEqual(1 + 1e-9);
      expect(Math.abs(y)).toBeLessThanOrEqual(1 + 1e-9);
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
    }
    expect(maxX - minX).toBeGreaterThan(1.2);
  });

  it("dithers dots out below the floor", () => {
    expect(dotFalloff(0, 1.4, 4)).toBe(0);
    expect(dotFalloff(0.04, 1.4, 4)).toBe(0);
    expect(dotFalloff(1, 1.4, 4)).toBeCloseTo(1.4, 5);
    expect(dotFalloff(2, 1.4, 4)).toBeCloseTo(1.4, 5);
    expect(MOTION_DOT_FLOOR).toBeGreaterThan(0);
  });
});
