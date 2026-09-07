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

export type Point2 = [number, number];

/**
 * Slot angle for the index-th body sharing an orbit ring: even shares plus
 * a slow revolution. Inner rings take higher speeds — Kepler-ish.
 */
export function orbitSlot(
  index: number,
  count: number,
  timeSeconds: number,
  speedRadPerSec: number,
  phase0: number
): number {
  const safe = Math.max(1, count);
  const share = ((index % safe) + safe) % safe / safe;
  return phase0 + share * Math.PI * 2 + timeSeconds * speedRadPerSec;
}

/** Cartesian point on an orbit ring. */
export function orbitPoint(
  cx: number,
  cy: number,
  radius: number,
  angle: number
): Point2 {
  return [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius];
}

/**
 * Control point for an orbital arc: bows perpendicular to the spoke so the
 * path reads as a journey around the core, weaving either way by flip.
 */
export function arcControl(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  bend: number,
  flip: boolean
): Point2 {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  const push = (flip ? -1 : 1) * bend * len;
  return [
    (x0 + x1) / 2 + (-dy / len) * push,
    (y0 + y1) / 2 + (dx / len) * push,
  ];
}

/** Point on a quadratic bezier at t — the comet's seat. */
export function quadPoint(p0: Point2, pc: Point2, p1: Point2, t: number): Point2 {
  const clamped = Math.min(1, Math.max(0, t));
  const u = 1 - clamped;
  return [
    u * u * p0[0] + 2 * u * clamped * pc[0] + clamped * clamped * p1[0],
    u * u * p0[1] + 2 * u * clamped * pc[1] + clamped * clamped * p1[1],
  ];
}

/** Point on a cubic bezier at t — seating dots along the meridian flows. */
export function cubicPoint(
  p0: Point2,
  p1: Point2,
  p2: Point2,
  p3: Point2,
  t: number
): Point2 {
  const clamped = Math.min(1, Math.max(0, t));
  const u = 1 - clamped;
  const a = u * u * u;
  const b = 3 * u * u * clamped;
  const c = 3 * u * clamped * clamped;
  const d = clamped * clamped * clamped;
  return [
    a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0],
    a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1],
  ];
}

/** Deterministic 0..1 shimmer seed — fields breathe per-dot, never pulse. */
export function hash01(index: number): number {
  const x = Math.sin(index * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * True when the room's bone ink is dark — i.e. a day room, where canvas
 * figures need stronger alphas to read against the light. Night bone is
 * near-white; day bone is near-black.
 */
export function boneDaylight(bone: readonly [number, number, number]): boolean {
  const luminance = (bone[0] * 0.299 + bone[1] * 0.587 + bone[2] * 0.114) / 255;
  return luminance < 0.5;
}
