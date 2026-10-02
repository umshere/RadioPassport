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

export type SheetHeight = "open" | "tall";

/**
 * The counter's rests once it is open: content height ("open") or all the
 * room above the dock ("tall"), or closed. A flick decides by direction, a
 * slow drag by travel (48px toward the nearest rest; 96px down from open to
 * close).
 */
export function snapRest(travelY: number, velocityY: number, current: SheetHeight): "closed" | SheetHeight {
  if (current === "tall") {
    if (velocityY > 0.4 || travelY > 48) return "open";
    return "tall";
  }
  if (velocityY < -0.4 || travelY < -48) return "tall";
  if (velocityY > 0.4 || travelY > 96) return "closed";
  return "open";
}
