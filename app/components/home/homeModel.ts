import { estimatedLongitude } from "~/utils/countryCentroids";
import type { Station } from "~/types/radio";
import { hourWord, VOICE } from "~/components/keeper/keeperVoice";
import { isDeepNight, type KeeperState } from "~/components/keeper/keeperState";
import {
  formatClock,
  localDateAtLongitude,
  solarHourAtLongitude,
  solarHourFromLocal,
  stationLocalDate,
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
    // No coordinates: use the country's centre, so the row still shows a rough hour.
    const estimated = estimatedLongitude(station);
    const local = stationLocalDate(station, now) ?? (estimated === null ? null : localDateAtLongitude(estimated, now));
    return {
      station,
      clock: local ? formatClock(local) : null,
      solar: local ? solarHourFromLocal(local) : null,
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
  const local = station ? stationLocalDate(station, now) : null;
  if (!local) return { clock: null, solar: null, localHour: null, minute: 0 };
  return {
    clock: formatClock(local),
    solar: solarHourFromLocal(local),
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

export type GuideChip =
  | { id: "hour"; label: string; hour: SolarHour }
  | { id: "surprise" | "ask" | "how"; label: string };

/** The hour that is not the listener's own: somewhere else, on purpose. */
function otherHour(own: SolarHour): SolarHour {
  return own === "Night" ? "Dawn" : own === "Dawn" ? "Dusk" : own === "Dusk" ? "Dawn" : "Night";
}

/**
 * What the keeper offers on the home besides the one big button: two or three
 * taps that fit the moment (the listener's own hour, whether a station is on).
 * Plain rules, nothing guessed, nothing on the audio path.
 */
export function homeGuide(input: {
  phase: HomePhase;
  isPlaying: boolean;
  city: string;
  firstVisit?: boolean;
  listenerHour: SolarHour | null;
}): { line: string | null; chips: GuideChip[] } {
  if (input.phase === "aboard" && input.isPlaying) {
    return {
      line: null,
      chips: [
        { id: "ask", label: VOICE.guideAsk(input.city) },
        { id: "surprise", label: VOICE.guideSurprise },
      ],
    };
  }
  if (input.phase !== "arrive") return { line: null, chips: [] };
  const own = input.listenerHour;
  const chips: GuideChip[] = [];
  let line: string | null = null;
  if (own) {
    const target = otherHour(own);
    chips.push({ id: "hour", hour: target, label: VOICE.guideElsewhere(hourWord(target)) });
    if (own === "Night") line = VOICE.guideLate;
    else if (own === "Midday") line = VOICE.guideDay;
  }
  if (input.firstVisit) chips.unshift({ id: "how", label: VOICE.guideHow });
  // First-timers already have Surprise in the search field; one is enough.
  if (!input.firstVisit) chips.push({ id: "surprise", label: VOICE.guideSurprise });
  return { line, chips };
}

export type HomeAsk =
  | { kind: "hour"; hour: SolarHour; line: string }
  | { kind: "surprise"; line: string }
  | { kind: "help"; line: string }
  | { kind: "search"; query: string };

const ASK_HOURS: Array<{ hour: SolarHour; test: RegExp }> = [
  { hour: "Dawn", test: /\b(morning|sunrise|dawn|early)\b/ },
  { hour: "Midday", test: /\b(afternoon|midday|noon|daytime|daylight)\b/ },
  { hour: "Dusk", test: /\b(evening|sunset|dusk|twilight)\b/ },
  { hour: "Night", test: /\b(night|midnight|late|sleep|sleepy)\b/ },
];

/**
 * The keeper's ear on arrival, before any station is on. Plain rules, instant,
 * no network: how-it-works questions get his own answer, a bare hour or a
 * "surprise me" does it, and anything else is a search (the field already
 * reads sentences). Null when there is nothing to ask.
 */
export function routeHomeAsk(question: string): HomeAsk | null {
  const text = question.toLowerCase().replace(/[’`]/g, "'").trim();
  if (text.replace(/[^a-z\p{L}]/gu, "").length < 2) return null;
  if (/\b(free|cost|price|pay|paid|subscription)\b/.test(text)) return { kind: "help", line: VOICE.askFree };
  if (/\b(passport|stamps?|stamped)\b/.test(text)) return { kind: "help", line: VOICE.askPassport };
  if (/\b(how (?:does|do|is|it)|what is (?:this|elsewhere)|what's (?:this|elsewhere)|how.*work|help|confused|lost)\b/.test(text))
    return { kind: "help", line: VOICE.askHelp };
  if (/\b(surprise|random|anything|you choose|pick for me|whatever|dealer)\b/.test(text))
    return { kind: "surprise", line: VOICE.askSurprise };
  const short = text.split(/\s+/).length <= 5 && !/\b(in|at|from|near)\s+\w+/.test(text.replace(/\bat (?:night|dawn|dusk|noon|midday)\b/, ""));
  if (short) {
    const hit = ASK_HOURS.find((item) => item.test.test(text));
    if (hit) return { kind: "hour", hour: hit.hour, line: VOICE.hop(hourWord(hit.hour)) };
  }
  return { kind: "search", query: question.trim() };
}

/** Jev's pick for the arrival field, turned into the same shape the rules give. */
export function homeAskFromChoice(
  choice: string,
  hour: string | null,
  question: string,
): HomeAsk | null {
  switch (choice) {
    case "how_it_works":
      return { kind: "help", line: VOICE.askHelp };
    case "passport":
      return { kind: "help", line: VOICE.askPassport };
    case "free":
      return { kind: "help", line: VOICE.askFree };
    case "surprise":
      return { kind: "surprise", line: VOICE.askSurprise };
    case "hour_hop": {
      const found = ASK_HOURS.find((item) => item.hour === hour);
      return found ? { kind: "hour", hour: found.hour, line: VOICE.hop(hourWord(found.hour)) } : null;
    }
    case "search":
      return { kind: "search", query: question.trim() };
    default:
      return null;
  }
}
