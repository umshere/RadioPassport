/**
 * Anonymous usage counters. A name only (plus, for a few, where it came
 * from) — no id, no station, no text. The server writes one log line per
 * beacon; counting happens in the log drain.
 */
export const USAGE_EVENTS = [
  "keeper_open",
  "keeper_ask",
  "desk_view",
  "station_share",
  "tune_join",
  "ticket_open",
  "ticket_share",
  "ticket_copy",
  "ticket_save",
  "visit",
  "pageview",
] as const;
export type UsageEvent = (typeof USAGE_EVENTS)[number];

/** Where an event came from, when that is the whole point of counting it. */
export const USAGE_SOURCES = ["ticket", "link"] as const;
export type UsageSource = (typeof USAGE_SOURCES)[number];

/** Which page a pageview was: a bucket, never the URL (no station, no text). */
export const USAGE_PAGES = ["home", "desk", "about", "ticket", "other"] as const;
export type UsagePage = (typeof USAGE_PAGES)[number];

export function usagePage(pathname: string): UsagePage {
  if (pathname === "/") return "home";
  if (pathname === "/listen") return "desk";
  if (pathname === "/about") return "about";
  if (pathname.startsWith("/t/")) return "ticket";
  return "other";
}

export function logUsage(event: UsageEvent, source?: UsageSource, page?: UsagePage) {
  try {
    if (typeof navigator === "undefined") return;
    const payload: Record<string, string> = { event };
    if (source) payload.source = source;
    if (page) payload.page = page;
    const body = JSON.stringify(payload);
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/usage", new Blob([body], { type: "application/json" }));
    }
  } catch {
    // Counting never gets in the way.
  }
}
