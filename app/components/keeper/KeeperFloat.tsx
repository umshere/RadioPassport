import { useCallback, useEffect, useRef, useState } from "react";
import { useKeeperStore } from "~/state/keeperStore";
import { usePlayerStore } from "~/state/playerStore";
import { Keeper } from "./Keeper";
import {
  clampKeeperSpot,
  DEFAULT_KEEPER_SPOT,
  KEEPER_FLOAT_SIZE,
  KEEPER_SPOT_KEY,
  keeperPeeks,
  nudgeKeeperSpot,
  parseKeeperSpot,
  snapKeeperSpot,
  type KeeperBounds,
  type KeeperSpot,
} from "./keeperPlacement";
import type { KeeperView } from "./useKeeper";

/** How long the keeper stands fully in after a station change or a title. */
const HOP_MS = 3200;
const DRAG_THRESHOLD_PX = 6;

function readSpot(): KeeperSpot {
  try {
    return parseKeeperSpot(window.localStorage.getItem(KEEPER_SPOT_KEY));
  } catch {
    return DEFAULT_KEEPER_SPOT;
  }
}

function writeSpot(spot: KeeperSpot) {
  try {
    window.localStorage.setItem(KEEPER_SPOT_KEY, JSON.stringify(spot));
  } catch {
    // Private mode / blocked storage: the spot lasts the visit.
  }
}

/**
 * The floor is whatever stands at the bottom of the screen: the dock (with
 * its deck, if open) and, on the phone home, the peeking board sheet. The
 * keeper rests above the highest of them, so it never sits on the play or
 * next controls or the sheet's grip.
 */
function measureBounds(): KeeperBounds {
  const height = window.innerHeight;
  let top = height;
  for (const selector of [".rp-dock", ".ew-band-nav.is-band", ".rp-board-sheet"]) {
    const node = document.querySelector<HTMLElement>(selector);
    if (!node) continue;
    const style = window.getComputedStyle(node);
    if (style.display === "none" || style.display === "contents") continue;
    if (style.position !== "fixed") continue;
    const rect = node.getBoundingClientRect();
    if (rect.height > 0) top = Math.min(top, rect.top);
  }
  const header = document.querySelector<HTMLElement>(".ew-site-bar");
  const ceiling = header ? Math.max(0, header.getBoundingClientRect().bottom) + 8 : 16;
  return {
    viewportWidth: window.innerWidth,
    viewportHeight: height,
    floor: Math.max(0, height - top) + 8,
    ceiling,
    size: KEEPER_FLOAT_SIZE,
  };
}

function sameBounds(a: KeeperBounds, b: KeeperBounds) {
  return (
    a.viewportWidth === b.viewportWidth &&
    a.viewportHeight === b.viewportHeight &&
    Math.round(a.floor) === Math.round(b.floor) &&
    Math.round(a.ceiling) === Math.round(b.ceiling)
  );
}

/**
 * The keeper, free of any slot: fixed over the page, above the dock. Drag it
 * to either edge (it snaps and remembers), or focus it and use the arrow
 * keys. Idle or dozing it peeks half off the edge; it hops fully in when the
 * station changes or a title arrives. Tap opens the sheet.
 */
export function KeeperFloat({ view }: { view: KeeperView }) {
  const openSheet = useKeeperStore((state) => state.openSheet);
  const stationId = usePlayerStore((state) => state.nowPlaying?.uuid ?? null);
  const [spot, setSpot] = useState<KeeperSpot>(DEFAULT_KEEPER_SPOT);
  const [bounds, setBounds] = useState<KeeperBounds | null>(null);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const [engaged, setEngaged] = useState(false);
  const [hopping, setHopping] = useState(false);
  const pointer = useRef<{ id: number; x: number; y: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);

  useEffect(() => {
    setSpot(readSpot());
  }, []);

  // Keep the floor honest: the dock deck opens, the board sheet slides,
  // the phone rotates. A light poll beats wiring observers to three owners.
  useEffect(() => {
    if (!view.present) return;
    const update = () =>
      setBounds((current) => {
        const next = measureBounds();
        return current && sameBounds(current, next) ? current : next;
      });
    update();
    window.addEventListener("resize", update);
    const timer = window.setInterval(update, 500);
    return () => {
      window.removeEventListener("resize", update);
      window.clearInterval(timer);
    };
  }, [view.present]);

  // Hop in on a new station and on a fresh title (delight).
  useEffect(() => {
    if (!stationId) return;
    setHopping(true);
    const timer = window.setTimeout(() => setHopping(false), HOP_MS);
    return () => window.clearTimeout(timer);
  }, [stationId]);
  useEffect(() => {
    if (view.state !== "delight") return;
    setHopping(true);
    const timer = window.setTimeout(() => setHopping(false), HOP_MS);
    return () => window.clearTimeout(timer);
  }, [view.state]);

  const place = useCallback(
    (next: KeeperSpot) => {
      const clamped = bounds ? clampKeeperSpot(next, bounds) : next;
      setSpot(clamped);
      writeSpot(clamped);
    },
    [bounds],
  );

  if (!view.present || !bounds) return null;

  const resting = clampKeeperSpot(spot, bounds);
  const peek = keeperPeeks({ state: view.state, engaged: engaged || Boolean(drag), hopping });
  const style: React.CSSProperties = drag
    ? {
        left: drag.x - KEEPER_FLOAT_SIZE / 2,
        top: drag.y - KEEPER_FLOAT_SIZE / 2,
      }
    : {
        [resting.side]: 0,
        bottom: bounds.floor + resting.lift,
      };

  return (
    <div
      className="ew-keeper-float"
      data-side={resting.side}
      data-peek={peek || undefined}
      data-hop={hopping || undefined}
      data-dragging={drag ? true : undefined}
      data-away={view.sheetOpen || undefined}
      style={style}
      onPointerEnter={() => setEngaged(true)}
      onPointerLeave={() => setEngaged(false)}
      onFocus={() => setEngaged(true)}
      onBlur={() => setEngaged(false)}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        pointer.current = {
          id: event.pointerId,
          x: event.clientX,
          y: event.clientY,
          moved: false,
        };
      }}
      onPointerMove={(event) => {
        const start = pointer.current;
        if (!start || start.id !== event.pointerId) return;
        if (
          !start.moved &&
          Math.hypot(event.clientX - start.x, event.clientY - start.y) < DRAG_THRESHOLD_PX
        ) {
          return;
        }
        if (!start.moved) {
          start.moved = true;
          event.currentTarget.setPointerCapture(event.pointerId);
        }
        setDrag({ x: event.clientX, y: event.clientY });
      }}
      onPointerUp={(event) => {
        const start = pointer.current;
        pointer.current = null;
        if (!start?.moved) return;
        suppressClick.current = true;
        setDrag(null);
        place(snapKeeperSpot(event.clientX, event.clientY, bounds));
      }}
      onPointerCancel={() => {
        pointer.current = null;
        setDrag(null);
      }}
      onKeyDown={(event) => {
        const next = nudgeKeeperSpot(resting, event.key, bounds);
        if (!next) return;
        event.preventDefault();
        place(next);
      }}
    >
      <Keeper
        state={view.state}
        mood={view.mood}
        size="float"
        expanded={view.sheetOpen}
        label={
          view.facts
            ? `The keeper of ${view.facts.station.name}. Open to ask about the station and its hour.`
            : "Open the keeper"
        }
        describedBy="ew-keeper-move-hint"
        onOpen={() => {
          if (suppressClick.current) {
            suppressClick.current = false;
            return;
          }
          openSheet();
        }}
      />
      <span id="ew-keeper-move-hint" className="sr-only">
        Drag the keeper, or use the arrow keys, to move it.
      </span>
    </div>
  );
}
