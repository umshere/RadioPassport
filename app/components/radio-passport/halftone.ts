/**
 * Halftone grain for the atmosphere washes — the night reads as print, not
 * glow. One fixed 6×6 dot tile is built once per document and reused as a
 * CanvasPattern; stamping it is a plain fill, never a per-pixel loop.
 * Skipped entirely under reduced motion: calm skies stay calm.
 */

const TILE = 6;
let tile: HTMLCanvasElement | null = null;

function inkTile(): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null;
  if (!tile) {
    tile = document.createElement("canvas");
    tile.width = TILE;
    tile.height = TILE;
    const ink = tile.getContext("2d");
    if (!ink) return null;
    ink.fillStyle = "#000";
    ink.beginPath();
    ink.arc(1.5, 1.5, 0.85, 0, Math.PI * 2);
    ink.arc(4.5, 4.5, 0.85, 0, Math.PI * 2);
    ink.fill();
  }
  return tile;
}

/** Refill the current path with halftone grain (nebulae, cloud washes). */
export function grainPath(
  context: CanvasRenderingContext2D,
  alpha: number,
): void {
  const source = inkTile();
  if (!source || alpha <= 0) return;
  const pattern = context.createPattern(source, "repeat");
  if (!pattern) return;
  context.save();
  context.globalAlpha = alpha;
  context.fillStyle = pattern;
  context.fill();
  context.restore();
}

/** Grain a rectangle (full-canvas washes). */
export function grainRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  alpha: number,
): void {
  const source = inkTile();
  if (!source || alpha <= 0) return;
  const pattern = context.createPattern(source, "repeat");
  if (!pattern) return;
  context.save();
  context.globalAlpha = alpha;
  context.fillStyle = pattern;
  context.fillRect(x, y, width, height);
  context.restore();
}
