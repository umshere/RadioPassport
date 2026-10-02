import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "@remix-run/react";
import { useKeeperStore } from "~/state/keeperStore";
import { usePlayerStore } from "~/state/playerStore";
import { Eyebrow } from "~/components/ui/Eyebrow";
import { FlapText } from "./FlapText";
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
 * its deck, if open) and the phone band. The keeper rests above the highest
 * of them, so it never sits on the play or next controls.
 */
function measureBounds(): KeeperBounds {
  const height = window.innerHeight;
  let top = height;
  for (const selector of [".rp-dock", ".ew-band-nav.is-band"]) {
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
  // On the desk and the home the keeper stands on the page's own horizon
  // (the sky); no second figure.
  const { pathname } = useLocation();
  const onDesk = pathname === "/listen" || pathname === "/";
  const murmur = useKeeperStore((state) => state.murmur);
  const setMurmur = useKeeperStore((state) => state.setMurmur);
  const stationId = usePlayerStore((state) => state.nowPlaying?.uuid ?? null);
  const [spot, setSpot] = useState<KeeperSpot>(DEFAULT_KEEPER_SPOT);
  const [bounds, setBounds] = useState<KeeperBounds | null>(null);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [hopping, setHopping] = useState(false);
  const pointer = useRef<{ id: number; x: number; y: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const floatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSpot(readSpot());
  }, []);

  // Dragging the keeper must never scroll the page under the finger (that is
  // the scrollbar that used to flash): CSS touch-action is not honoured by
  // every iOS gesture, so also cancel touchmove on the figure itself.
  const present = view.present;
  useEffect(() => {
    const node = floatRef.current;
    if (!node) return;
    const stop = (event: TouchEvent) => event.preventDefault();
    node.addEventListener("touchmove", stop, { passive: false });
    return () => node.removeEventListener("touchmove", stop);
  }, [present, bounds]);

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

  if (!view.present || !bounds || onDesk) return null;

  const resting = clampKeeperSpot(spot, bounds);
  const peek = keeperPeeks({
    state: view.state,
    engaged: hovered || focused || Boolean(drag),
    hopping: hopping || Boolean(murmur),
  });
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
      ref={floatRef}
      className="ew-keeper-float"
      data-side={resting.side}
      data-peek={peek || undefined}
      data-hop={hopping || undefined}
      data-dragging={drag ? true : undefined}
      data-away={view.sheetOpen || undefined}
      style={style}
      onPointerEnter={(event) => event.pointerType === "mouse" && setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
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
        // Swallow only the click this drag's release produces; if the
        // browser fires none (the figure moved under the pointer), the
        // next real tap must still open the sheet.
        suppressClick.current = true;
        window.setTimeout(() => {
          suppressClick.current = false;
        }, 0);
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
      {murmur && !view.sheetOpen ? (
        <div
          className="ew-keeper-murmur"
          data-side={resting.side}
          role="status"
          onPointerDown={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className="ew-keeper-murmur-body"
            aria-label={`The keeper, on ${murmur.topic}: ${murmur.text} Open the keeper for more.`}
            onClick={() => openSheet({ line: { topic: murmur.topic, text: murmur.text } })}
          >
            <Eyebrow as="span" tone="foil">{murmur.topic}</Eyebrow>
            <FlapText key={murmur.id} className="ew-keeper-murmur-text" text={murmur.text} />
          </button>
          <button
            type="button"
            className="ew-keeper-murmur-x"
            aria-label="Dismiss"
            onClick={() => setMurmur(null)}
          >
            &times;
          </button>
        </div>
      ) : null}
      <span id="ew-keeper-move-hint" className="sr-only">
        Drag the keeper, or use the arrow keys, to move it.
      </span>
    </div>
  );
}
