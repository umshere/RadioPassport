import { useLocation } from "@remix-run/react";
import { useEffect } from "react";
import { logUsage, usagePage } from "~/utils/usage";

const SEEN_KEY = "elsewhere-visit-day";

/**
 * Two anonymous counts: a page view per route change (a bucket like "home",
 * never the URL) and one "visit" per browser per day (a date flag in local
 * storage, no id). Honours Do Not Track. Nothing here identifies anyone.
 */
export function PageViewBridge() {
  const { pathname } = useLocation();
  useEffect(() => {
    if (navigator.doNotTrack === "1" || pathname.startsWith("/admin")) return;
    logUsage("pageview", undefined, usagePage(pathname));
    try {
      const today = new Date().toISOString().slice(0, 10);
      if (window.localStorage.getItem(SEEN_KEY) !== today) {
        window.localStorage.setItem(SEEN_KEY, today);
        logUsage("visit");
      }
    } catch {
      // Private mode: the pageview still counted.
    }
  }, [pathname]);
  return null;
}
