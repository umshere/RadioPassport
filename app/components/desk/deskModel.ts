import { cleanTrack, cleanTrackLine } from "~/services/keeper/cleanTitle";
import { estimatedLongitude } from "~/utils/countryCentroids";
import type { Station } from "~/types/radio";
import {
  formatClock,
  localDateAtLongitude,
  solarHourAtLongitude,
  type SolarHour,
} from "~/utils/localTime";

/**
 * The desk's pure rules: where the sun stands in the station's sky, what is
 * on air in plain words, and the departures board. Nothing here is guessed:
 * a missing longitude means no sky body and no clock, and a line the stream
 * did not send is never shown as if it had.
 */

/** "night" | "dawn" | "midday" | "dusk", or "unknown" without coordinates. */
export type SkyHour = Lowercase<SolarHour> | "unknown";

export function skyHour(solar: SolarHour | null | undefined): SkyHour {
  return solar ? (solar.toLowerCase() as SkyHour) : "unknown";
}

export type SkyBody = {
  kind: "sun" | "moon";
  /** 0 = the left horizon (rising), 1 = the right horizon (setting). */
  x: number;
  /** 0 = on the horizon, 1 = overhead. */
  y: number;
};

/**
 * Where the sun (06:00–17:59) or the moon (18:00–05:59) stands at a local
 * time, snapped to the quarter hour so it moves in pixel steps, never glides.
 */
export function skyBody(localHour: number, minute = 0): SkyBody {
  const quarters = Math.floor(((localHour % 24) * 60 + minute) / 15);
  const hours = (quarters * 15) / 60;
  const day = hours >= 6 && hours < 18;
  const progress = day ? (hours - 6) / 12 : ((hours + 6) % 24) / 12;
  const x = Math.round(progress * 1000) / 1000;
  const y = Math.round(Math.sin(Math.PI * progress) * 1000) / 1000;
  return { kind: day ? "sun" : "moon", x, y };
}

/** The listener's own clock, 24h. */
export function listenerClock(now: Date): string {
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

/** Whole minutes since the station was first heard; never negative. */
export function minutesAboard(landedAt: number, now: number): number {
  if (!(landedAt > 0) || now <= landedAt) return 0;
  return Math.floor((now - landedAt) / 60_000);
}

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

/** "29 SEP": the date the keeper writes on a postcard's postmark. */
export function postmarkDate(now: Date): string {
  return `${String(now.getDate()).padStart(2, "0")} ${MONTHS[now.getMonth()]}`;
}

export type OnAir =
  | { kind: "track"; artist: string | null; title: string | null }
  | { kind: "ident" }
  | { kind: "ad" }
  | { kind: "talk" }
  /** A programme line ("UK Top 40"): what the station sent, shown as the show. */
  | { kind: "programme"; line: string }
  | { kind: "waiting" }
  /** The stream names nothing (or only noise). */
  | { kind: "silent" };

/**
 * What is on air, in plain words, from exactly what the stream sent. Only a
 * line that reads as a song becomes artist and title; idents, adverts, talk
 * and programme names are called what they are.
 */
export function deskOnAir(input: {
  raw: { artist?: string | null; title?: string | null } | null | undefined;
  stationName: string;
  titles: "sent" | "none" | "waiting";
}): OnAir {
  const raw = input.raw;
  if (raw && (raw.artist || raw.title)) {
    const cleaned = cleanTrack(raw.artist, raw.title, input.stationName);
    switch (cleaned.kind) {
      case "track":
        if (cleaned.confidence >= 0.6 && (cleaned.artist || cleaned.title)) {
          return { kind: "track", artist: cleaned.artist, title: cleaned.title };
        }
        break;
      case "jingle_or_station_id":
        return { kind: "ident" };
      case "ad":
        return { kind: "ad" };
      case "news_or_talk":
        return { kind: "talk" };
      case "programme": {
        const line = cleanTrackLine(raw);
        return line ? { kind: "programme", line } : { kind: "silent" };
      }
      default:
        break;
    }
  }
  return input.titles === "waiting" ? { kind: "waiting" } : { kind: "silent" };
}

/** The language and at most two tags the next station shares with this one. */
export function sharedSignals(current: Station, next: Station): string[] {
  const out: string[] = [];
  if (
    current.language &&
    next.language &&
    current.language.toLowerCase() === next.language.toLowerCase()
  ) {
    out.push(next.language);
  }
  const currentTags = new Set((current.tagList ?? []).map((t) => t.toLowerCase()));
  for (const tag of next.tagList ?? []) {
    if (out.length >= 2) break;
    const lower = tag.toLowerCase();
    if (currentTags.has(lower) && !out.some((v) => v.toLowerCase() === lower)) {
      out.push(tag);
    }
  }
  return out;
}

export type Departure = {
  station: Station;
  /** The local clock at the station's longitude; null without coordinates. */
  clock: string | null;
  solar: SolarHour | null;
  /** Language or tags it shares with the station on now. */
  shared: string[];
};

/** The next few stations in the room's queue, as a departures board. */
export function deskDepartures(
  queue: Station[],
  index: number,
  current: Station,
  now = new Date(),
  limit = 4,
): Departure[] {
  if (queue.length < 2) return [];
  const out: Departure[] = [];
  const seen = new Set([current.uuid]);
  for (let step = 1; step <= queue.length && out.length < limit; step += 1) {
    const next = queue[(((index + step) % queue.length) + queue.length) % queue.length];
    if (!next || seen.has(next.uuid)) continue;
    seen.add(next.uuid);
    const longitude =
      typeof next.longitude === "number" && Number.isFinite(next.longitude)
        ? next.longitude
        : estimatedLongitude(next);
    out.push({
      station: next,
      clock: longitude === null ? null : formatClock(localDateAtLongitude(longitude, now)),
      solar: longitude === null ? null : solarHourAtLongitude(longitude, now),
      shared: sharedSignals(current, next),
    });
  }
  return out;
}
