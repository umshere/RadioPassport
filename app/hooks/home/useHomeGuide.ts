import { useCallback, useEffect, useMemo, useRef } from "react";
import { useKeeperStore } from "~/state/keeperStore";
import { useKeeperRoamStops, findKeeperAnchor } from "~/components/keeper/KeeperRoam";
import type { RoamAction, RoamStop } from "~/components/keeper/keeperRoamModel";
import { VOICE } from "~/components/keeper/keeperVoice";
import { pickLine, type TourStop } from "~/components/home/homeShelves";
import type { Station } from "~/types/radio";
import type { SolarHour } from "~/utils/localTime";

export const GUIDE_LANDING = "landing";
export const GUIDE_SEEK = "seek";
export const GUIDE_BOARD = "board";

function reducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Bring a card into view in its row and its column, without a jump if it is already there. */
function bringIntoView(anchor: string) {
  if (typeof window === "undefined") return;
  window.requestAnimationFrame(() => {
    const node = findKeeperAnchor(anchor);
    node?.scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth", block: "center", inline: "center" });
  });
}

/**
 * The keeper as the home's guide (the roaming figure, wider screens). He
 * greets on the landing band with "Show me around" and "Land here"; the tour
 * walks shelf by shelf and points at one pick per shelf, with "Board it" and
 * "Next shelf"; an hour gate sends him to the hour shelf's pick; a typed
 * search sends him to the search box; idle, he wanders between the picks.
 * Every word comes from the data: place, local clock, the station's own label.
 * Below 960px the store still takes the calls, but no figure walks.
 */
export function useHomeGuide({
  stops,
  hourShelfId,
  hour,
  seeking,
  query,
  greetWord,
  canLand,
  onLand,
  onBoard,
}: {
  stops: TourStop[];
  hourShelfId: string | null;
  hour: SolarHour | null;
  seeking: boolean;
  query: string;
  /** The listener's own hour word ("evening"), once known. */
  greetWord: string | null;
  canLand: boolean;
  onLand: () => void;
  onBoard: (station: Station) => void;
}) {
  const goTo = useKeeperStore((state) => state.goTo);
  const latest = useRef({ stops, onLand, onBoard, canLand, greetWord });
  latest.current = { stops, onLand, onBoard, canLand, greetWord };

  const visit = useCallback(
    (index: number) => {
      const all = latest.current.stops;
      if (index >= all.length) {
        goTo(GUIDE_BOARD, {
          pose: "speaking",
          line: VOICE.guideTourDone,
          actions: [{ label: VOICE.guideFirstShelf, onSelect: () => visit(0) }],
        });
        bringIntoView(GUIDE_BOARD);
        return;
      }
      const stop = all[index]!;
      const words = pickLine(stop.card, { saved: stop.saved });
      bringIntoView(stop.anchor);
      goTo(stop.anchor, {
        pose: "found",
        line: words.line,
        sub: words.sub,
        actions: [
          { label: VOICE.guideBoardIt, onSelect: () => latest.current.onBoard(stop.card.station) },
          { label: VOICE.guideNextShelf, onSelect: () => visit(index + 1) },
        ],
      });
    },
    [goTo],
  );

  const greet = useCallback(
    (instant = false) => {
      const { canLand: land, greetWord: word } = latest.current;
      const actions: RoamAction[] = [{ label: VOICE.guideShowAround, onSelect: () => visit(0) }];
      if (land) actions.push({ label: VOICE.guideLand, onSelect: () => latest.current.onLand() });
      goTo(GUIDE_LANDING, { pose: "speaking", line: VOICE.guideGreet(word), actions, instant });
    },
    [goTo, visit],
  );

  // He greets once the page is up.
  useEffect(() => {
    greet(true);
  }, [greet]);

  // An hour gate sends him to that shelf's pick (and the shelf into view).
  const hourIndex = hourShelfId ? stops.findIndex((stop) => stop.shelfId === hourShelfId) : -1;
  const hourAnchor = hourIndex >= 0 ? stops[hourIndex]!.anchor : null;
  const lastHour = useRef<SolarHour | null>(hour);
  useEffect(() => {
    if (hour === lastHour.current) return;
    lastHour.current = hour;
    if (hour && hourIndex >= 0) visit(hourIndex);
    else if (!hour) greet();
    // hourAnchor: a new pick for the same hour is the same visit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hour, hourAnchor]);

  // Typing a search sends him to the search box, looking.
  const wasSeeking = useRef(seeking);
  useEffect(() => {
    if (seeking && !wasSeeking.current) {
      goTo(GUIDE_SEEK, { pose: "searching", line: VOICE.guideSearch(query.trim()) });
    } else if (!seeking && wasSeeking.current) {
      greet();
    }
    wasSeeking.current = seeking;
    // The query is read at the moment the search starts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seeking, goTo, greet]);

  // Idle, he wanders between the picks (scenery: no buttons, not read out).
  const wander = useMemo<RoamStop[] | null>(() => {
    if (seeking) return null;
    return stops.map((stop) => {
      const words = pickLine(stop.card, { saved: stop.saved });
      return { anchor: stop.anchor, pose: "found", line: words.line, sub: words.sub };
    });
  }, [seeking, stops]);
  useKeeperRoamStops(wander);

  return { startTour: () => visit(0), greet };
}
