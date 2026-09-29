import type { Station } from "~/types/radio";
import { hourWord, VOICE } from "~/components/keeper/keeperVoice";
import { isDeepNight, type KeeperState } from "~/components/keeper/keeperState";
import {
  formatClock,
  localDateAtLongitude,
  solarHourAtLongitude,
  type SolarHour,
} from "~/utils/localTime";
import type { Departure } from "~/components/desk/deskModel";

/**
 * The departures hall's pure rules: which phase the home is in, the board it
 * shows, the keeper's one line for it. Nothing is guessed: a station without
 * a longitude gets no clock and no sky, and no line names a track.
 *
 *   arrive  nothing asked yet: the sky over a city, the board of departures
 *   seek    two or more letters typed: the board is the answer
 *   hour    an hour gate is lit: everywhere it is that hour
 *   aboard  a station is playing: the sky is its city
 *   empty   the question found nothing (and nothing is still loading)
 */
export type HomePhase = "arrive" | "seek" | "hour" | "aboard" | "empty";

export const SEEK_MIN = 2;
export const BOARD_STEPS = [8, 16, 32] as const;
export const SEEK_CAP = 32;

export function isSeekQuery(query: string): boolean {
  return query.trim().length >= SEEK_MIN;
}

export function homePhase(input: {
  query: string;
  hour: SolarHour | null;
  isPlaying: boolean;
  count: number;
  loading: boolean;
}): HomePhase {
  const seeking = isSeekQuery(input.query);
  if (input.count === 0 && !input.loading && (seeking || input.hour)) return "empty";
  if (seeking) return "seek";
  if (input.hour) return "hour";
  if (input.isPlaying) return "aboard";
  if (input.count === 0 && !input.loading) return "empty";
  return "arrive";
}

/** How many rows the board shows: a seek answer in full, else 8 → 16 → 32. */
export function homeBoardCap(phase: HomePhase, more: number): number {
  if (phase === "seek") return SEEK_CAP;
  const step = Math.max(0, Math.min(BOARD_STEPS.length - 1, Math.floor(more)));
  return BOARD_STEPS[step]!;
}

/** Another press of "More departures" would show more rows. */
export function canShowMore(phase: HomePhase, more: number, available: number): boolean {
  if (phase === "seek" || phase === "empty") return false;
  return more < BOARD_STEPS.length - 1 && available > homeBoardCap(phase, more);
}

export type HomeDeparture = Omit<Departure, "shared">;

function longitudeOf(station: Station): number | null {
  return typeof station.longitude === "number" && Number.isFinite(station.longitude)
    ? station.longitude
    : null;
}

/** Stations as departures: the clock and the hour there, never a guess. */
export function homeDepartures(stations: Station[], now = new Date()): HomeDeparture[] {
  return stations.map((station) => {
    const longitude = longitudeOf(station);
    return {
      station,
      clock: longitude === null ? null : formatClock(localDateAtLongitude(longitude, now)),
      solar: longitude === null ? null : solarHourAtLongitude(longitude, now),
    };
  });
}

export type ArrivalSky = {
  /** "21:04" at the station's longitude, or null without coordinates. */
  clock: string | null;
  solar: SolarHour | null;
  localHour: number | null;
  minute: number;
};

export function arrivalSky(station: Station | null | undefined, now = new Date()): ArrivalSky {
  const longitude = station ? longitudeOf(station) : null;
  if (longitude === null) return { clock: null, solar: null, localHour: null, minute: 0 };
  const local = localDateAtLongitude(longitude, now);
  return {
    clock: formatClock(local),
    solar: solarHourAtLongitude(longitude, now),
    localHour: local.getUTCHours(),
    minute: local.getUTCMinutes(),
  };
}

/** Hours between the arrival city and the listener, the smaller way round. */
export function hoursFromListener(localHour: number | null, listenerHour: number): number | null {
  if (localHour === null) return null;
  let diff = (((localHour - listenerHour) % 24) + 24) % 24;
  if (diff > 12) diff -= 24;
  return diff;
}

/** The keeper's one line for the phase. Never names a track. */
export function homeKeeperLine(input: {
  phase: HomePhase;
  city: string;
  query: string;
  hour: SolarHour | null;
  solar: SolarHour | null;
  firstVisit: boolean;
  asleep: boolean;
}): string {
  switch (input.phase) {
    case "seek":
      return VOICE.homeSeeking(input.query.trim());
    case "hour":
      return VOICE.homeHourGate(hourWord(input.hour ?? "Night"));
    case "empty":
      return VOICE.homeEmpty;
    case "aboard":
      return VOICE.homeLanded(input.city);
    default:
      if (input.asleep) return VOICE.homeAsleep;
      if (input.firstVisit || !input.solar) return VOICE.homeWelcome;
      return VOICE.homeSomewhere(hourWord(input.solar));
  }
}

/** Asleep in the deep night there with nothing playing; otherwise at work. */
export function homeKeeperState(input: {
  phase: HomePhase;
  loading: boolean;
  isPlaying: boolean;
  localHour: number | null;
}): KeeperState {
  if (!input.isPlaying && input.phase === "arrive" && isDeepNight(input.localHour)) return "sleeping";
  if (input.phase === "seek" && input.loading) return "thinking";
  if (input.phase === "aboard") return "speaking";
  return "idle";
}

/** The board's heading (uppercased by the flaps). */
export function homeBoardHeading(input: {
  phase: HomePhase;
  hour: SolarHour | null;
  seekLabel: string | null;
}): string {
  switch (input.phase) {
    case "seek":
      return input.seekLabel ?? VOICE.homeBoard;
    case "hour":
      return VOICE.homeBoardHour(input.hour ?? "Night");
    case "aboard":
      return VOICE.homeBoardAboard;
    case "empty":
      return VOICE.homeNoDepartures;
    default:
      return VOICE.homeBoard;
  }
}

/** Split-flap drums read upper case and a short line; keep it to the board. */
export function flapLine(text: string, max = 28): string {
  // The drum has plain letters only: "México" flaps as MEXICO (the real name
  // rides the sr-only copy beside it).
  const flat = text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
  // No ellipsis: the drum has no such flap. The full text rides the sr-only copy.
  return flat.length > max ? flat.slice(0, max).trimEnd() : flat;
}
