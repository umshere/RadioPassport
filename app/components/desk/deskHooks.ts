import { useEffect, useLayoutEffect, useState } from "react";

/** The clock, re-read on each minute boundary so the flaps turn on time. */
export function useMinuteClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let interval: number | undefined;
    const first = window.setTimeout(() => {
      setNow(new Date());
      interval = window.setInterval(() => setNow(new Date()), 60_000);
    }, 60_000 - (Date.now() % 60_000) + 50);
    return () => {
      window.clearTimeout(first);
      if (interval) window.clearInterval(interval);
    };
  }, []);
  return now;
}

/**
 * A page that scrolls inside the app frame (the desk, the home) must let its
 * last row clear the dock and the phone band, which stand fixed over the
 * bottom of it. Measured, since the dock's deck opens and the band comes and
 * goes. `floor` is how much of the page they cover; `height` is the page.
 */
export function useFloorClearance(ref: React.RefObject<HTMLElement>, active = true) {
  const [box, setBox] = useState({ floor: 0, height: 0 });
  useLayoutEffect(() => {
    if (!active) return;
    const update = () => {
      const page = ref.current;
      if (!page) return;
      const bottom = page.getBoundingClientRect().bottom;
      let top = bottom;
      for (const selector of [".rp-dock", ".ew-band-nav.is-band"]) {
        const node = document.querySelector<HTMLElement>(selector);
        if (!node) continue;
        const style = window.getComputedStyle(node);
        if (style.display === "none" || style.position !== "fixed") continue;
        const rect = node.getBoundingClientRect();
        if (rect.height > 0) top = Math.min(top, rect.top);
      }
      const floor = Math.max(0, Math.round(bottom - top));
      const height = Math.round(page.clientHeight);
      setBox((current) =>
        current.floor === floor && current.height === height ? current : { floor, height },
      );
    };
    update();
    window.addEventListener("resize", update);
    const timer = window.setInterval(update, 800);
    return () => {
      window.removeEventListener("resize", update);
      window.clearInterval(timer);
    };
  }, [active, ref]);
  return box;
}
