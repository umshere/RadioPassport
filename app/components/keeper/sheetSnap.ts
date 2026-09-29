export type SheetRest = "peek" | "open";

/**
 * Where a dragged sheet comes to rest. Pure, so the tests hold it: a flick
 * decides by direction, a slow drag decides by travel, always toward the
 * nearest rest. The keeper's sheet uses it for its grip.
 */
export function snapSheet(travelY: number, velocityY: number, current: SheetRest): SheetRest {
  if (velocityY < -0.4) return "open";
  if (velocityY > 0.4) return "peek";
  if (current === "peek") return travelY < -48 ? "open" : "peek";
  return travelY > 48 ? "peek" : "open";
}
