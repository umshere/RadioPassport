/**
 * Anonymous usage counters. A name only — no id, no station, no text. The
 * server writes one log line per beacon; counting happens in the log drain.
 */
export const USAGE_EVENTS = [
  "keeper_open",
  "keeper_ask",
  "desk_view",
] as const;
export type UsageEvent = (typeof USAGE_EVENTS)[number];

export function logUsage(event: UsageEvent) {
  try {
    if (typeof navigator === "undefined") return;
    const body = JSON.stringify({ event });
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/usage", new Blob([body], { type: "application/json" }));
    }
  } catch {
    // Counting never gets in the way.
  }
}
