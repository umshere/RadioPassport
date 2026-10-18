import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "@remix-run/react";
import { useKeeperStore } from "~/state/keeperStore";
import { Provenance } from "./KeeperAttachment";
import {
  anchorInView,
  KEEPER_ANCHOR_ATTR,
  ROAM_MIN_WIDTH,
  ROAM_SIZE,
  roamFacing,
  roamSpot,
  roamSpriteUrl,
  wanderDue,
  type Rect,
  type RoamBubble,
  type RoamPose,
  type RoamSpot,
  type RoamStop,
  type Viewport,
} from "./keeperRoamModel";
import type { KeeperView } from "./useKeeper";
import { VOICE } from "./keeperVoice";

const WIDE_QUERY = `(min-width: ${ROAM_MIN_WIDTH}px)`;

function useWide(): boolean {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const query = window.matchMedia(WIDE_QUERY);
    const update = () => setWide(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return wide;
}

/** The first rendered element registered under `name`. */
export function findKeeperAnchor(name: string): HTMLElement | null {
  const escaped = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(name) : name;
  const nodes = document.querySelectorAll<HTMLElement>(`[${KEEPER_ANCHOR_ATTR}="${escaped}"]`);
  for (const node of nodes) {
    const rect = node.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) return node;
  }
  return null;
}

function toRect(rect: DOMRect): Rect {
  return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
}

/** Header above, dock (and its deck) below: the band he may be seen in. */
function measureViewport(): Viewport {
  const height = window.innerHeight;
  let floorTop = height;
  const dock = document.querySelector<HTMLElement>(".rp-dock");
  if (dock && window.getComputedStyle(dock).position === "fixed") {
    const rect = dock.getBoundingClientRect();
    if (rect.height > 0) floorTop = Math.min(floorTop, rect.top);
  }
  const header = document.querySelector<HTMLElement>(".ew-site-bar");
  const ceiling = header ? Math.max(0, header.getBoundingClientRect().bottom) : 0;
  return {
    width: document.documentElement.clientWidth,
    height,
    ceiling,
    floor: Math.max(0, height - floorTop),
  };
}

/** He walks in the document: absolute from its origin, so he scrolls with the page. */
function measureStage(): Rect {
  const root = document.documentElement;
  return {
    left: -window.scrollX,
    top: -window.scrollY,
    width: root.clientWidth,
    height: root.scrollHeight,
  };
}

function inViewNow(name: string): boolean {
  const node = findKeeperAnchor(name);
  return node ? anchorInView(toRect(node.getBoundingClientRect()), measureViewport()) : false;
}

function sameSpot(a: RoamSpot | null, b: RoamSpot | null) {
  return Boolean(a && b && a.x === b.x && a.y === b.y && a.flip === b.flip && a.below === b.below);
}

/**
 * Pages hand him the places to wander between while they are mounted; when
 * the page goes, he leaves with it (and the edge float comes back).
 */
export function useKeeperRoamStops(stops: RoamStop[] | null) {
  const setRoamStops = useKeeperStore((state) => state.setRoamStops);
  const roamLeave = useKeeperStore((state) => state.roamLeave);
  const key = stops ? JSON.stringify(stops.map((stop) => [stop.anchor, stop.line, stop.sub])) : "";
  const latest = useRef(stops);
  latest.current = stops;
  useEffect(() => {
    setRoamStops(latest.current ?? []);
  }, [key, setRoamStops]);
  useEffect(
    () => () => {
      setRoamStops([]);
      roamLeave();
    },
    [roamLeave, setRoamStops],
  );
}

/**
 * The keeper as a pet, on wider screens: he walks between anchors on the
 * page (a CSS transform transition, with a walk wiggle), faces the way he
 * walks, bobs at rest, hops when poked, and says a line in a bubble beside
 * him. Below 960px he stays the edge-hugging float. He sits under the header
 * and the dock in the stack, so he can never cover the transport.
 */
export function KeeperRoam({ view, askEnabled }: { view: KeeperView; askEnabled: boolean }) {
  const wide = useWide();
  const roam = useKeeperStore((state) => state.roam);
  const stops = useKeeperStore((state) => state.roamStops);
  const hushed = useKeeperStore((state) => state.hushed);
  const murmur = useKeeperStore((state) => state.murmur);
  const setMurmur = useKeeperStore((state) => state.setMurmur);
  const openSheet = useKeeperStore((state) => state.openSheet);
  const poke = useKeeperStore((state) => state.poke);
  const roamQuiet = useKeeperStore((state) => state.roamQuiet);
  const roamWander = useKeeperStore((state) => state.roamWander);
  const setRoamShown = useKeeperStore((state) => state.setRoamShown);
  const [spot, setSpot] = useState<RoamSpot | null>(null);
  const [facing, setFacing] = useState<1 | -1>(1);
  const spotRef = useRef<RoamSpot | null>(null);

  const anchor = wide ? roam.anchor : null;

  const measure = useCallback(() => {
    if (!anchor) return setSpot(null);
    const node = findKeeperAnchor(anchor);
    if (!node) return setSpot(null);
    const next = roamSpot({
      anchor: toRect(node.getBoundingClientRect()),
      stage: measureStage(),
      viewport: measureViewport(),
      size: ROAM_SIZE,
      below: node.dataset.keeperBelow === "true" ? true : undefined,
    });
    const previous = spotRef.current;
    if (sameSpot(previous, next)) return;
    if (previous) setFacing((current) => roamFacing(previous.x, next.x, current));
    spotRef.current = next;
    setSpot(next);
  }, [anchor]);

  // Re-measure on a new anchor, a resize, any scroll, and on a light poll (cards grow,
  // fonts land, the dock deck opens). Same reasoning as KeeperFloat.
  useEffect(() => {
    measure();
    if (!anchor) return;
    window.addEventListener("resize", measure);
    // Capture: the home and desk scroll inside their own columns, not the page.
    window.addEventListener("scroll", measure, { capture: true, passive: true });
    const timer = window.setInterval(measure, 500);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, { capture: true });
      window.clearInterval(timer);
    };
  }, [anchor, measure]);

  const shown = Boolean(anchor && spot);
  useEffect(() => {
    setRoamShown(shown);
  }, [setRoamShown, shown]);
  useEffect(() => () => setRoamShown(false), [setRoamShown]);

  // Wander when nothing is happening: not while the sheet is open, the tab
  // is hidden or he has been asked to keep quiet.
  useEffect(() => {
    if (!shown || stops.length === 0 || hushed || view.sheetOpen) return;
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      const state = useKeeperStore.getState();
      if (state.murmur || !wanderDue(state.roam, Date.now())) return;
      roamWander(inViewNow);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [hushed, roamWander, shown, stops.length, view.sheetOpen]);

  if (!shown || !spot) return null;

  const walking = roam.phase === "walking";
  // A murmur from the existing unasked-lines loop speaks through his bubble.
  const murmurBubble: RoamBubble | null =
    murmur && !roam.bubble && !walking
      ? {
          line: murmur.text,
          sub: murmur.topic,
          source: null,
          actions: [
            {
              label: VOICE.roamMurmurMore,
              onSelect: () => openSheet({ line: { topic: murmur.topic, text: murmur.text } }),
            },
          ],
        }
      : null;
  const bubble = walking ? null : (roam.bubble ?? murmurBubble);
  const pose: RoamPose = walking ? "travel" : murmurBubble ? "speaking" : roam.pose;

  const onPoke = () => {
    const lines = VOICE.roamPokes;
    poke({
      pose: "found",
      line: lines[roam.pokes % lines.length],
      actions:
        askEnabled && view.facts
          ? [{ label: VOICE.roamAskMe, onSelect: () => openSheet() }]
          : [],
    });
  };

  return createPortal(
    <div
      className="ew-roam"
      data-walking={walking || undefined}
      data-hop={roam.hopping || undefined}
      data-flip={spot.flip || undefined}
      data-below={spot.below || undefined}
      data-away={view.sheetOpen || undefined}
      data-pose={pose}
      style={{ transform: `translate(${spot.x}px, ${spot.y}px)` }}
    >
      <div className="ew-roam-say" role="status">
        {bubble ? (
          <div className="ew-roam-bubble" key={bubble.line}>
            <p className="ew-roam-doing">{VOICE.roamDoing[pose]}</p>
            <p className="ew-roam-line">{bubble.line}</p>
            {bubble.source ? <Provenance kind={bubble.source} /> : null}
            {bubble.sub ? <p className="ew-roam-sub">{bubble.sub}</p> : null}
            {bubble.actions.length > 0 ? (
              <div className="ew-roam-actions">
                {bubble.actions.map((action, index) =>
                  action.href ? (
                    <Link
                      key={action.label}
                      to={action.href}
                      className="ew-roam-act"
                      data-primary={index === 0 || undefined}
                      onClick={action.onSelect}
                    >
                      {action.label}
                    </Link>
                  ) : (
                    <button
                      key={action.label}
                      type="button"
                      className="ew-roam-act"
                      data-primary={index === 0 || undefined}
                      onClick={action.onSelect}
                    >
                      {action.label}
                    </button>
                  ),
                )}
              </div>
            ) : null}
            <button
              type="button"
              className="ew-roam-x"
              aria-label={VOICE.roamDismiss}
              onClick={() => (murmurBubble ? setMurmur(null) : roamQuiet())}
            >
              ×
            </button>
          </div>
        ) : null}
      </div>
      <button type="button" className="ew-roam-body" aria-label={VOICE.roamPoke} onClick={onPoke}>
        <img
          key={pose}
          className="ew-roam-sprite"
          src={roamSpriteUrl(pose)}
          alt=""
          width={ROAM_SIZE}
          height={ROAM_SIZE}
          draggable={false}
          style={{ transform: `scaleX(${facing})` }}
        />
      </button>
      <span className="ew-roam-shadow" aria-hidden="true" />
    </div>,
    document.body,
  );
}
