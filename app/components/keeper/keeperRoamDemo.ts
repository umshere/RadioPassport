import { useEffect, useState } from "react";
import { useLocation } from "@remix-run/react";
import { useKeeperStore } from "~/state/keeperStore";
import { KEEPER_ANCHOR_ATTR, type RoamStop } from "./keeperRoamModel";
import { VOICE } from "./keeperVoice";

/**
 * Demo wiring for the roaming keeper, dev server only (the desk has its own
 * real anchors now; this is the home's until its rebuild): open a page with
 * `?roam=demo` (it sticks for the tab; `?roam=off` clears it). Production
 * builds never read the flag. It tags the
 * desk's and the home's existing cards as anchors at runtime, so their
 * layouts stay untouched, and sets him wandering between them. The desk and
 * home rebuilds replace this with real `keeperAnchor()` attributes and
 * `useKeeperRoamStops()`.
 */
const FLAG_KEY = "elsewhere.keeper.roamDemo";

const D = VOICE.roamDemo;
const DEMO: Record<string, Array<{ selector: string; stop: RoamStop }>> = {
  "/": [
    { selector: ".ew-gates", stop: { anchor: "gates", pose: "speaking", line: D.gates } },
    { selector: ".ew-home-board", stop: { anchor: "board", pose: "listening", line: D.board } },
    { selector: ".ew-home-sky-col", stop: { anchor: "place", pose: "idle", line: D.place } },
  ],
};

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
