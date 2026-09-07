/**
 * Dots & Damping math core — the portable half of docs/MOTION_DESIGN.md.
 * Pure functions only (no DOM, no canvas), so this file can be copied into
 * any site and unit-tested anywhere. Pair with a thin canvas painter.
 */

/** Boost decay per second: scroll flares motion, then it settles. */
export const MOTION_SETTLE_RATE = 3;
/** Radians of phase wound per pixel scrolled. */
export const MOTION_SCROLL_GAIN = 0.0016;
/** Radians per second the field breathes on its own. */
export const MOTION_PHASE_SPEED = 0.22;
/** Dots smaller than this are skipped — the stipple edge. */
export const MOTION_DOT_FLOOR = 0.25;

/**
 * Exponential ease toward a target. Rate 4–8/s feels alive, above 12 feels
 * snappy, below 2 feels drunk. Frame-rate independent via dt seconds.
 */
export function dampTowards(
  current: number,
  target: number,
  rate: number,
  dtSeconds: number
): number {
  if (!(dtSeconds > 0) || !(rate > 0)) return current;
  const step = 1 - Math.exp(-rate * dtSeconds);
  return current + (target - current) * step;
}

/** One frame of scroll-boost decay — the settle after the flare. */
export function decayBoost(
  boost: number,
  dtSeconds: number,
  rate = MOTION_SETTLE_RATE
): number {
  return dampTowards(boost, 0, rate, dtSeconds);
}

/**
 * Harmonograph knot. t in [0, 2π]; output in [-1, 1]².
 * Small integer ratios (3:2, 4:3, 5:4) weave the geometric figures.
 */
export function lissajousPoint(
  a: number,
  b: number,
  delta: number,
  t: number
): [number, number] {
  return [Math.sin(a * t + delta), Math.sin(b * t)];
}

/**
 * Spirograph point: a pen at offset d on a circle of radius r rolling
 * inside a circle of radius R. Output normalized by R (≈[-1, 1]²).
 * The Tusi couple (R = 2r, d = r) draws a straight line — y is always 0.
 */
export function hypotrochoidPoint(
  bigR: number,
  rollerR: number,
  penD: number,
  theta: number
): [number, number] {
  const k = bigR - rollerR;
  const ratio = k / rollerR;
  return [
    (k * Math.cos(theta) + penD * Math.cos(ratio * theta)) / bigR,
    (k * Math.sin(theta) - penD * Math.sin(ratio * theta)) / bigR,
  ];
}

/**
 * Dither falloff: dot radius from a 0..1 depth, skipped below the floor.
 * Depth can be distance-from-center, viewer-facing z, or node age.
 */
export function dotFalloff(
  depth01: number,
  base: number,
  contrast: number
): number {
  const clamped = Math.min(1, Math.max(0, depth01));
  const size = base * Math.min(1, clamped * contrast);
  return size < MOTION_DOT_FLOOR ? 0 : size;
}
