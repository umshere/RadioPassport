import { describe, expect, it } from "vitest";
import {
  MOTION_DOT_FLOOR,
  MOTION_PHASE_SPEED,
  MOTION_SCROLL_GAIN,
  MOTION_SETTLE_RATE,
  arcControl,
  boneDaylight,
  cubicPoint,
  dampTowards,
  decayBoost,
  dotFalloff,
  hash01,
  hypotrochoidPoint,
  lissajousPoint,
  orbitPoint,
  orbitSlot,
  quadPoint,
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

  it("shares orbit rings evenly and revolves with time", () => {
    const a0 = orbitSlot(0, 4, 0, 0.1, 0);
    const a1 = orbitSlot(1, 4, 0, 0.1, 0);
    const a2 = orbitSlot(2, 4, 0, 0.1, 0);
    expect(a1 - a0).toBeCloseTo(Math.PI / 2, 10);
    expect(a2 - a1).toBeCloseTo(Math.PI / 2, 10);
    expect(orbitSlot(0, 4, 10, 0.1, 0) - a0).toBeCloseTo(1, 10);
    const [x, y] = orbitPoint(100, 100, 50, 0);
    expect(x).toBeCloseTo(150, 10);
    expect(y).toBeCloseTo(100, 10);
  });

  it("bows arcs perpendicular and seats the comet on the curve", () => {
    const [cx, cy] = arcControl(0, 0, 10, 0, 0.2, false);
    expect(cx).toBeCloseTo(5, 10);
    expect(cy).toBeCloseTo(2, 10);
    const [fx, fy] = arcControl(0, 0, 10, 0, 0.2, true);
    expect(fx).toBeCloseTo(5, 10);
    expect(fy).toBeCloseTo(-2, 10);
    const p0: [number, number] = [0, 0];
    const pc: [number, number] = [5, 10];
    const p1: [number, number] = [10, 0];
    expect(quadPoint(p0, pc, p1, 0)).toEqual([0, 0]);
    expect(quadPoint(p0, pc, p1, 1)).toEqual([10, 0]);
    expect(quadPoint(p0, pc, p1, 0.5)).toEqual([5, 5]);
  });

  it("seats dots along cubic meridian flows", () => {
    const p0: [number, number] = [0, 60];
    const p1: [number, number] = [70, 86];
    const p2: [number, number] = [150, 94];
    const p3: [number, number] = [220, 82];
    expect(cubicPoint(p0, p1, p2, p3, 0)).toEqual([0, 60]);
    expect(cubicPoint(p0, p1, p2, p3, 1)).toEqual([220, 82]);
    const [mx, my] = cubicPoint(p0, p1, p2, p3, 0.5);
    expect(mx).toBeCloseTo(110, 0);
    expect(my).toBeGreaterThan(60);
    expect(my).toBeLessThan(94);
  });

  it("seeds deterministic shimmer in range", () => {
    for (const index of [0, 1, 7, 99, 1024]) {
      const value = hash01(index);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
      expect(hash01(index)).toBe(value);
    }
    expect(hash01(3)).not.toBe(hash01(4));
  });

  it("tells night bone from day bone", () => {
    expect(boneDaylight([232, 223, 208])).toBe(false);
    expect(boneDaylight([26, 22, 18])).toBe(true);
  });
});
