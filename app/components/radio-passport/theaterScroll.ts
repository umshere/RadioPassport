// Sky gesture forwarding: the theater sky holds no scroll container of its
// own (the app shell locks the page at 100dvh and only the letter scrolls),
// so wheel and drag gestures that begin over the sky would fall into a dead
// zone. These pure helpers decide how much of a sky gesture belongs to the
// letter; listen.tsx attaches the real listeners and preventDefaults only
// when a helper reports the letter actually moved.

export interface SkyScrollTarget {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
}

export function skyMaxScroll(target: SkyScrollTarget): number {
  return Math.max(0, target.scrollHeight - target.clientHeight);
}

// Returns true when the caller should preventDefault: a vertical,
// non-pinch wheel that moves the letter. Horizontal and pinch-zoom
// gestures are always left alone.
export function forwardSkyWheel(
  target: SkyScrollTarget,
  deltaX: number,
  deltaY: number,
  ctrlKey: boolean,
): boolean {
  if (ctrlKey) return false;
  if (!Number.isFinite(deltaY) || Math.abs(deltaY) <= Math.abs(deltaX ?? 0))
    return false;
  const max = skyMaxScroll(target);
  if (max <= 0) return false;
  const next = Math.min(max, Math.max(0, target.scrollTop + deltaY));
  if (next === target.scrollTop) return false;
  target.scrollTop = next;
  return true;
}

export interface SkyTouchDrag {
  start: (y: number) => void;
  move: (y: number) => boolean;
  reset: () => void;
}

// A sky drag becomes a letter scroll only past the threshold, so taps on
// knowledge nodes still click. Returns true from move() once the caller
// should preventDefault (a real drag is in flight).
export function createSkyTouchDrag(
  target: SkyScrollTarget,
  threshold = 12,
): SkyTouchDrag {
  let anchor: number | null = null;
  let last = 0;
  return {
    start(y: number) {
      anchor = y;
      last = y;
    },
    move(y: number) {
      if (anchor === null || !Number.isFinite(y)) return false;
      if (Math.abs(y - anchor) < threshold) return false;
      const max = skyMaxScroll(target);
      if (max > 0) {
        target.scrollTop = Math.min(
          max,
          Math.max(0, target.scrollTop + (last - y)),
        );
      }
      last = y;
      return true;
    },
    reset() {
      anchor = null;
    },
  };
}
