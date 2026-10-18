import { useEffect, useState } from "react";
import { useLocation } from "@remix-run/react";
import { useKeeperStore } from "~/state/keeperStore";
import { KEEPER_ANCHOR_ATTR, type RoamStop } from "./keeperRoamModel";

/**
 * Demo wiring for the roaming keeper, dev server only: `?roam=demo` tags runtime
 * selectors as anchors on a page that has no real ones. The home and the desk
 * both have real `keeperAnchor()` attributes now, so the plan is empty; add a
 * route here only for a page that has none.
 */
const FLAG_KEY = "elsewhere.keeper.roamDemo";

const DEMO: Record<string, Array<{ selector: string; stop: RoamStop }>> = {};

function readFlag(search: string): boolean {
  if (!import.meta.env.DEV) return false;
  try {
    const param = new URLSearchParams(search).get("roam");
    if (param === "demo") window.sessionStorage.setItem(FLAG_KEY, "1");
    if (param === "off") window.sessionStorage.removeItem(FLAG_KEY);
    return window.sessionStorage.getItem(FLAG_KEY) === "1";
  } catch {
    return new URLSearchParams(search).get("roam") === "demo";
  }
}

export function useKeeperRoamDemo() {
  const { pathname, search } = useLocation();
  const [on, setOn] = useState(false);
  const setRoamStops = useKeeperStore((state) => state.setRoamStops);
  const goTo = useKeeperStore((state) => state.goTo);
  const roamLeave = useKeeperStore((state) => state.roamLeave);

  useEffect(() => {
    setOn(readFlag(search));
  }, [search]);

  useEffect(() => {
    const plan = DEMO[pathname];
    if (!on || !plan) return;
    let tagged: RoamStop[] = [];
    // The cards mount after the station loads; tag whatever is there now and
    // again as more arrive.
    const tag = () => {
      const stops: RoamStop[] = [];
      for (const { selector, stop } of plan) {
        const node = document.querySelector<HTMLElement>(selector);
        if (!node) continue;
        if (node.getAttribute(KEEPER_ANCHOR_ATTR) !== stop.anchor) {
          node.setAttribute(KEEPER_ANCHOR_ATTR, stop.anchor);
        }
        stops.push(stop);
      }
      if (stops.length === tagged.length) return;
      const first = tagged.length === 0;
      tagged = stops;
      setRoamStops(stops);
      if (first && stops[0]) goTo(stops[0].anchor, stops[0]);
    };
    tag();
    const timer = window.setInterval(tag, 1000);
    return () => {
      window.clearInterval(timer);
      setRoamStops([]);
      roamLeave();
    };
  }, [goTo, on, pathname, roamLeave, setRoamStops]);
}
