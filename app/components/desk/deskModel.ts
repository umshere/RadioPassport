import { cleanTrack, cleanTrackLine } from "~/services/keeper/cleanTitle";
import { estimatedLongitude } from "~/utils/countryCentroids";
import type { Station } from "~/types/radio";
import {
  formatClock,
  localDateAtLongitude,
  solarHourFromLocal,
  stationLocalDate,
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
    out.push(departureFor(next, current, now));
  }
  return out;
}

/** One station as a departure from the one on now: its own clock and what it shares. */
export function departureFor(next: Station, current: Station, now = new Date()): Departure {
  const estimated = estimatedLongitude(next);
  const local = stationLocalDate(next, now) ?? (estimated === null ? null : localDateAtLongitude(estimated, now));
  return {
    station: next,
    clock: local ? formatClock(local) : null,
    solar: local ? solarHourFromLocal(local) : null,
    shared: sharedSignals(current, next),
  };
}

export type ShelfCard = Departure & {
  /** One of the keeper's "somewhere like this" picks (shares something real). */
  similar: boolean;
};

/**
 * "Next on this shelf": the keeper's similar picks first (they share a
 * language, a tag or the hour), then the room's queue in order. No station
 * twice, never the one on now.
 */
export function deskShelf(
  current: Station,
  similar: Station[],
  departures: Departure[],
  now = new Date(),
  limit = 6,
): ShelfCard[] {
  const out: ShelfCard[] = [];
  const seen = new Set([current.uuid]);
  for (const station of similar) {
    if (out.length >= limit || seen.has(station.uuid)) continue;
    seen.add(station.uuid);
    out.push({ ...departureFor(station, current, now), similar: true });
  }
  for (const row of departures) {
    if (out.length >= limit || seen.has(row.station.uuid)) continue;
    seen.add(row.station.uuid);
    out.push({ ...row, similar: false });
  }
  return out;
}

/** Seconds left of the stamp's continuous minute, from the dock's ink (0..1); null without it. */
export function stampSecondsLeft(ink: number | null): number | null {
  if (ink === null || !Number.isFinite(ink)) return null;
  const clamped = Math.min(1, Math.max(0, ink));
  return Math.max(0, Math.ceil(60 * (1 - clamped) - 0.001));
}

/**
 * What the station plays: its readable shelf labels when the offline labeller
 * was confident, else its own raw tags shown as they are.
 */
export function deskPlays(labels: string[] | null | undefined, tags: string[]): {
  labels: string[];
  raw: string[];
  /** No labels: the raw tags are the card, not a reveal. */
  rawOnly: boolean;
} {
  const raw = [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))].slice(0, 12);
  const clean = (labels ?? []).filter(Boolean).slice(0, 3);
  return { labels: clean, raw, rawOnly: clean.length === 0 };
}

/** The next note in the keeper's stack, round again after the last. */
export function nextNoteIndex(index: number, count: number): number {
  return count > 0 ? (index + 1) % count : 0;
}
