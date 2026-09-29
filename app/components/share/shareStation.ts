import type { Station } from "~/types/radio";
import { logUsage } from "~/utils/usage";

export const TUNE_PARAM = "tune";

/** A link that lands a friend on this station, ready to play. */
export function tuneLink(station: Pick<Station, "uuid">, origin = "https://elsewheremusic.com") {
  return `${origin}/?${TUNE_PARAM}=${encodeURIComponent(station.uuid)}`;
}

export function shareCopy(station: Pick<Station, "name" | "city" | "country">, clock?: string | null) {
  const place = station.city || station.country || "somewhere else";
  return {
    title: `${station.name} · ${place}`,
    text: clock
      ? `It’s ${clock} in ${place} right now. Listen live with me.`
      : `Listen live with me: ${station.name}, ${place}.`,
  };
}

export type ShareResult = "shared" | "copied" | "failed";

/** The phone's share sheet where there is one, else the clipboard. */
export async function shareStation(
  station: Pick<Station, "uuid" | "name" | "city" | "country">,
  clock?: string | null,
): Promise<ShareResult> {
  const url = tuneLink(station, typeof window !== "undefined" ? window.location.origin : undefined);
  const { title, text } = shareCopy(station, clock);
  logUsage("station_share");
  try {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      await navigator.share({ title, text, url });
      return "shared";
    }
  } catch (error) {
    // The listener closed the share sheet: nothing to do, nothing failed.
    if (error instanceof DOMException && error.name === "AbortError") return "failed";
  }
  try {
    await navigator.clipboard.writeText(`${text} ${url}`);
    return "copied";
  } catch {
    return "failed";
  }
}
