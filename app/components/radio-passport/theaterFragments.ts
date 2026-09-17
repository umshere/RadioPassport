import type { Station } from "~/types/radio";
import { stationTags } from "./stationInsights";
import { formatClock, localDateAtLongitude } from "~/utils/localTime";

export type TheaterFragment = {
  place: string;
  hour: string;
  detail: string;
};

function clean(value: string | null | undefined): string {
  return value?.trim().replace(/\s+/g, " ") ?? "";
}

function unique(values: string[]): string[] {
  const seen = new Set<string>();
  const bases = new Set<string>();
  return values.filter((value) => {
    const key = value.normalize("NFC").toLowerCase();
    // Base form strips punctuation so "78-rpm" and "78rpm" count as one
    // variant. Unicode-aware: \p{L}\p{N} keeps CJK values intact, so a
    // Japanese value never collapses onto another's base.
    const base = key.replace(/[\p{P}\p{Z}\s]/gu, "");
    if (!key || seen.has(key) || (base && bases.has(base))) return false;
    seen.add(key);
    if (base) bases.add(base);
    return true;
  });
}

/** Drop URL junk and filler tags. Case-insensitive, substring-safe. */
function isJunkTag(tag: string): boolean {
  const key = tag.toLowerCase();
  return (
    key.includes("http") ||
    key.includes("www.") ||
    ["various", "music", "radio", "station", "top", "hits", "web", "online"].includes(key)
  );
}

/** Catalog evidence only. Room letters and sourced track facts stay in the Well.
 * An explicit instant makes this selector deterministic and independent of the
 * listener's timezone. Longitude gives an estimate, never a civil clock or
 * proof of actual dawn/dusk (which would require latitude and season).
 */
export function theaterFragment(station: Station, now: Date): TheaterFragment {
  const place = unique([station.city, station.state, station.country].map(clean)).join(", ")
    || "Place not listed";
  const longitude = station.longitude;
  const validTime = typeof longitude === "number" && Number.isFinite(longitude)
    && Math.abs(longitude) <= 180 && Number.isFinite(now.getTime());
  const hour = validTime
    ? `Around ${formatClock(localDateAtLongitude(longitude, now))} by longitude. You can stay a while.`
    : "The local hour is not listed. You can stay a while.";
  // Similar genre names are not equivalent evidence: preserve them even
  // when one is a whole word inside another (rock / hard rock).
  const tags = unique(stationTags(station).map(clean).filter((tag) => !isJunkTag(tag))).slice(0, 3);
  const languages = unique((station.language ?? "").split(/[,;]/).map(clean)).slice(0, 3);
  const details = [
    tags.length ? `Filed under ${tags.join(" · ")}.` : "",
    languages.length ? `Language listed: ${languages.join(" · ")}.` : "",
  ].filter(Boolean);
  return {
    place,
    hour,
    detail: details.join(" ") || "No tags or language listed. There is no need to fill in the silence.",
  };
}
