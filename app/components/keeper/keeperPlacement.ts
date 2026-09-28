/**
 * Where the free-floating keeper rests. It always hugs a side edge and
 * stands `lift` px above the floor — the top of the dock (and, on the phone
 * home, the peeking board sheet) — so it can never sit on the transport.
 * Pure, so the tests hold the rules.
 */
export type KeeperSide = "left" | "right";
export type KeeperSpot = { side: KeeperSide; lift: number };

export const KEEPER_FLOAT_SIZE = 64;
export const KEEPER_SPOT_KEY = "ew-keeper-spot";
export const DEFAULT_KEEPER_SPOT: KeeperSpot = { side: "right", lift: 12 };
/** Keyboard step for the arrow keys. */
export const KEEPER_NUDGE_PX = 48;

export type KeeperBounds = {
  viewportWidth: number;
  viewportHeight: number;
  /** px from the viewport bottom that belong to the dock / band / sheet. */
  floor: number;
  /** px from the viewport top that belong to the header. */
  ceiling: number;
  size?: number;
};

export function maxKeeperLift(bounds: KeeperBounds): number {
  const size = bounds.size ?? KEEPER_FLOAT_SIZE;
  return Math.max(0, bounds.viewportHeight - bounds.floor - bounds.ceiling - size);
}

export function clampKeeperSpot(spot: KeeperSpot, bounds: KeeperBounds): KeeperSpot {
  const lift = Math.round(Math.min(maxKeeperLift(bounds), Math.max(0, spot.lift)));
  return { side: spot.side, lift };
}

/** A drag ends: snap to the nearer side edge, keep the height, clamp it. */
export function snapKeeperSpot(
  centerX: number,
  centerY: number,
  bounds: KeeperBounds,
): KeeperSpot {
  const size = bounds.size ?? KEEPER_FLOAT_SIZE;
  const side: KeeperSide = centerX < bounds.viewportWidth / 2 ? "left" : "right";
  const bottomEdge = centerY + size / 2;
  const lift = bounds.viewportHeight - bounds.floor - bottomEdge;
  return clampKeeperSpot({ side, lift }, bounds);
}

/** Arrow keys: up/down move by a step, left/right change sides. */
export function nudgeKeeperSpot(
  spot: KeeperSpot,
  key: string,
  bounds: KeeperBounds,
): KeeperSpot | null {
  switch (key) {
    case "ArrowUp":
      return clampKeeperSpot({ ...spot, lift: spot.lift + KEEPER_NUDGE_PX }, bounds);
    case "ArrowDown":
      return clampKeeperSpot({ ...spot, lift: spot.lift - KEEPER_NUDGE_PX }, bounds);
    case "ArrowLeft":
      return { ...spot, side: "left" };
    case "ArrowRight":
      return { ...spot, side: "right" };
    default:
      return null;
  }
}

/** Stored spot, read defensively: anything odd is the default. */
export function parseKeeperSpot(raw: string | null | undefined): KeeperSpot {
  if (!raw) return DEFAULT_KEEPER_SPOT;
  try {
    const value = JSON.parse(raw) as Partial<KeeperSpot>;
    const side = value.side === "left" || value.side === "right" ? value.side : null;
    const lift = typeof value.lift === "number" && Number.isFinite(value.lift) ? value.lift : null;
    if (!side || lift === null) return DEFAULT_KEEPER_SPOT;
    return { side, lift: Math.max(0, Math.round(lift)) };
  } catch {
    return DEFAULT_KEEPER_SPOT;
  }
}

/** Peeks half off the edge only while nothing is happening. */
export function keeperPeeks(input: {
  state: string;
  engaged: boolean;
  hopping: boolean;
}): boolean {
  if (input.engaged || input.hopping) return false;
  return input.state === "idle" || input.state === "sleeping";
}
