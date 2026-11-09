import type { Station } from "~/types/radio";
import { hourWord, VOICE } from "~/components/keeper/keeperVoice";
import { tidyStationName } from "~/components/keeper/keeperFacts";
import { shortCountry, stationLocation } from "~/components/radio-passport/StationRow";
import type { SolarHour } from "~/utils/localTime";
import { homeDepartures, type HomeDeparture } from "./homeModel";

/**
 * The home's shelves: horizontal rows of stations, each with an honest
 * one-line "why" and a count. Pure, so the tests hold the rules.
 *
 *   hour    where it is morning / midday / evening / the small hours now,
 *           from the real local clock (no labels needed)
 *   music   stations that call themselves mostly music
 *   voices  talk, news and sport
 *   genre   one or two music families, the biggest in the pool
 *
 * Label shelves are built on the server from the offline Jev labels joined
 * to the live home pool (no per-visitor AI). A station without labels simply
 * is not on them. No shelf ever claims what is on air this minute.
 */

export type ShelfKind = "hour" | "music" | "voices" | "genre";

/** What the server sends: which stations, never the words. */
export type ShelfSpec = { id: string; kind: Exclude<ShelfKind, "hour">; family?: string; uuids: string[] };

/** The label facts one station carries (from the offline labels). */
export type StationLabelFacts = {
  format: string | null;
  family: string | null;
  /** Label slot 1 only, the reliable one. */
  label: string | null;
};

export type ShelfCard = HomeDeparture & {
  /** One readable label, the station's own; null when it has none. */
  label: string | null;
};

export type HomeShelf = {
  id: string;
  kind: ShelfKind;
  title: string;
  why: string;
  count: number;
  cards: ShelfCard[];
};

/** A shelf with fewer stations than this is hidden. */
export const SHELF_MIN = 4;
/** Cards shown per shelf; the count still says how many there are. */
export const SHELF_CAP = 16;
export const GENRE_SHELVES = 2;
/** Families that make no shelf of their own. */
const NO_SHELF_FAMILIES = new Set(["none", "eclectic"]);

/**
 * Label shelves from the pool, in pool order: music, voices, then up to two
 * of the biggest music families. Shelves under SHELF_MIN are dropped here,
 * so the page never draws a near-empty row.
 */
export function buildLabelShelves(
  stations: Array<{ uuid: string }>,
  labelsFor: (uuid: string) => StationLabelFacts | null,
  options: { min?: number; genres?: number } = {},
): ShelfSpec[] {
  const min = options.min ?? SHELF_MIN;
  const music: string[] = [];
  const voices: string[] = [];
  const families = new Map<string, string[]>();
  const seen = new Set<string>();
  for (const { uuid } of stations) {
    if (seen.has(uuid)) continue;
    seen.add(uuid);
    const facts = labelsFor(uuid);
    if (!facts) continue;
    if (facts.format === "mostly_music") music.push(uuid);
    if (facts.format === "mostly_talk_or_news") voices.push(uuid);
    if (facts.family && !NO_SHELF_FAMILIES.has(facts.family) && facts.format !== "mostly_talk_or_news") {
      const list = families.get(facts.family) ?? [];
      list.push(uuid);
      families.set(facts.family, list);
    }
  }
  const shelves: ShelfSpec[] = [];
  if (music.length >= min) shelves.push({ id: "music", kind: "music", uuids: music });
  if (voices.length >= min) shelves.push({ id: "voices", kind: "voices", uuids: voices });
  const genres = [...families.entries()]
    .filter(([family, list]) => list.length >= min && family in VOICE.shelfGenreTitle)
    // Biggest first; ties by name so the order never flickers.
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
    .slice(0, options.genres ?? GENRE_SHELVES);
  for (const [family, uuids] of genres) {
    shelves.push({ id: `genre-${family}`, kind: "genre", family, uuids });
  }
  return shelves;
}

function toCards(rows: HomeDeparture[], labels: Record<string, string>): ShelfCard[] {
  return rows.map((row) => ({ ...row, label: labels[row.station.uuid] ?? null }));
}

/** A server spec turned into a shelf of live stations; null when too few are left. */
export function shelfFromSpec(
  spec: ShelfSpec,
  byId: Map<string, Station>,
  labels: Record<string, string>,
  now = new Date(),
): HomeShelf | null {
  const stations = spec.uuids.map((id) => byId.get(id)).filter((s): s is Station => Boolean(s));
  if (stations.length < SHELF_MIN) return null;
  const title =
    spec.kind === "music"
      ? VOICE.shelfMusicTitle
      : spec.kind === "voices"
        ? VOICE.shelfVoicesTitle
        : VOICE.shelfGenreTitle[spec.family ?? ""] ?? null;
  if (!title) return null;
  const why =
    spec.kind === "music" ? VOICE.shelfMusicWhy : spec.kind === "voices" ? VOICE.shelfVoicesWhy : VOICE.shelfGenreWhy;
  return {
    id: spec.id,
    kind: spec.kind,
    title,
    why,
    count: stations.length,
    cards: toCards(homeDepartures(stations.slice(0, SHELF_CAP), now), labels),
  };
}

/**
 * Where it is a given hour now, by each station's local clock. Stations with
 * no clock (no coordinates, no single-clock country) are left off: no guess.
 */
export function buildHourShelf(
  stations: Station[],
  hour: SolarHour,
  labels: Record<string, string>,
  now = new Date(),
): HomeShelf | null {
  const rows = homeDepartures(stations, now).filter((row) => row.clock && row.solar === hour);
  if (rows.length === 0) return null;
  return {
    id: "hour",
    kind: "hour",
    title: VOICE.shelfHourTitle[hour] ?? VOICE.shelfHourTitle.Night!,
    why: VOICE.shelfHourWhy(hourWord(hour)),
    count: rows.length,
    cards: toCards(rows.slice(0, SHELF_CAP), labels),
  };
}

const HOURS: SolarHour[] = ["Dawn", "Midday", "Dusk", "Night"];

/** The hour that is not the listener's own: somewhere else, on purpose. */
export function otherHour(own: SolarHour): SolarHour {
  return own === "Night" ? "Dawn" : own === "Dawn" ? "Dusk" : own === "Dusk" ? "Dawn" : "Night";
}

/**
 * The hour shelf's hour: the gate if one is lit; else an hour that is not the
 * listener's own; before we know theirs, the hour with the most stations.
 * An hour with no stations falls to the fullest one.
 */
export function shelfHour(input: {
  gate: SolarHour | null;
  listenerHour: SolarHour | null;
  counts: Record<SolarHour, number>;
}): SolarHour {
  if (input.gate) return input.gate;
  const fullest = [...HOURS].sort((a, b) => input.counts[b] - input.counts[a])[0]!;
  if (!input.listenerHour) return fullest;
  const away = otherHour(input.listenerHour);
  return input.counts[away] > 0 ? away : fullest;
}

/** How many stations sit in each hour now (clocked stations only). */
export function hourCounts(stations: Station[], now = new Date()): Record<SolarHour, number> {
  const counts: Record<SolarHour, number> = { Dawn: 0, Midday: 0, Dusk: 0, Night: 0 };
  for (const row of homeDepartures(stations, now)) {
    if (row.clock && row.solar) counts[row.solar] += 1;
  }
  return counts;
}

/**
 * The card the keeper points at on a shelf: one with a known local time,
 * preferring one that carries its own label and is not already playing.
 * Deterministic, so the tour is the same walk on every render.
 */
export function pickForShelf(cards: ShelfCard[], playingUuid: string | null = null): ShelfCard | null {
  const clocked = cards.filter((card) => card.clock && card.station.uuid !== playingUuid);
  return clocked.find((card) => card.label) ?? clocked[0] ?? cards.find((card) => card.clock) ?? null;
}

/** "Kochi · India", the place once, the country once. */
export function cardPlace(station: Station): string {
  const where = stationLocation(station);
  const country = shortCountry(station.country || "");
  return country && country !== shortCountry(where) ? `${where} · ${country}` : where;
}

/**
 * The keeper's words for a pick: the station and its place, then only what
 * the data says (the local clock, the station's own label). Never a track,
 * never "playing now".
 */
export function pickLine(card: ShelfCard, options: { saved?: boolean } = {}): { line: string; sub: string | null } {
  const name = tidyStationName(card.station.name);
  const line = VOICE.guidePick(name, stationLocation(card.station));
  const parts: string[] = [];
  if (options.saved) parts.push(VOICE.guidePickSaved);
  if (card.clock && card.solar) parts.push(VOICE.guidePickClock(card.clock, hourWord(card.solar)));
  if (card.label) parts.push(VOICE.guidePickLabel(card.label));
  return { line, sub: parts.length ? parts.join(" ") : null };
}

/** The anchor the keeper stands on for a shelf's pick. */
export function pickAnchor(shelfId: string, uuid: string): string {
  return `pick-${shelfId}-${uuid}`;
}

export type TourStop = { shelfId: string; card: ShelfCard; anchor: string; saved: boolean };

/** One stop per shelf with a pick, in page order. */
export function tourStops(
  shelves: Array<{ id: string; cards: ShelfCard[]; saved?: boolean }>,
  playingUuid: string | null = null,
): TourStop[] {
  const stops: TourStop[] = [];
  for (const shelf of shelves) {
    const card = pickForShelf(shelf.cards, playingUuid);
    if (!card) continue;
    stops.push({ shelfId: shelf.id, card, anchor: pickAnchor(shelf.id, card.station.uuid), saved: Boolean(shelf.saved) });
  }
  return stops;
}
