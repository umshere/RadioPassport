import labelsFile from "~/data/stationLabels.json";
import vocab from "~/data/stationLabelVocab.json";

/**
 * Station labels, generated once offline by scripts/label-stations.mjs (Jev).
 * They describe how a station presents itself (name and tags), never what is
 * on air now.
 */

/**
 * An answer below this is treated as unknown. Chosen from the 200-station run
 * (see docs/station-labels-wave1.md); raise it for stricter shelves.
 */
export const STATION_LABEL_MIN_CONFIDENCE = 0.6;

export type StationFormat = keyof typeof vocab.formats;
export type StationFamily = keyof typeof vocab.families;

type RawAnswer = { choice: string; confidence: number | null; probabilities?: unknown } | null;
type RawEntry = {
  format?: RawAnswer;
  family?: RawAnswer;
  label1?: RawAnswer;
  label2?: RawAnswer;
  label3?: RawAnswer;
};
export type StationLabelsFile = { generatedAt: string | null; model: string | null; stations: Record<string, RawEntry> };

export type StationLabels = {
  /** null when unknown, "unclear", or below the confidence threshold. */
  format: StationFormat | null;
  family: StationFamily | null;
  /** Up to three distinct readable labels, most confident first. */
  labels: string[];
};

const FORMATS = new Set(Object.keys(vocab.formats));
const FAMILIES = new Set(Object.keys(vocab.families));
const LABELS = new Set(vocab.labels);

function confident(a: RawAnswer | undefined, minConfidence: number): string | null {
  if (!a || typeof a.choice !== "string") return null;
  if (typeof a.confidence !== "number" || a.confidence < minConfidence) return null;
  return a.choice;
}

/**
 * Labels for one station, or null when the station is unknown or nothing in
 * its entry clears `minConfidence`.
 */
export function stationLabelsFor(
  uuid: string,
  options: { file?: StationLabelsFile; minConfidence?: number } = {},
): StationLabels | null {
  const file = options.file ?? (labelsFile as unknown as StationLabelsFile);
  const min = options.minConfidence ?? STATION_LABEL_MIN_CONFIDENCE;
  const entry = Object.prototype.hasOwnProperty.call(file.stations, uuid) ? file.stations[uuid] : undefined;
  if (!entry) return null;

  const format = confident(entry.format, min);
  const family = confident(entry.family, min);
  const slots = [entry.label1, entry.label2, entry.label3]
    .filter((a): a is NonNullable<RawAnswer> => !!a && typeof a.confidence === "number" && a.confidence >= min)
    .sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));
  const labels: string[] = [];
  for (const a of slots) {
    if (a.choice !== "none" && LABELS.has(a.choice) && !labels.includes(a.choice)) labels.push(a.choice);
  }
  const out: StationLabels = {
    format: format && format !== "unclear" && FORMATS.has(format) ? (format as StationFormat) : null,
    family: family && family !== "none" && FAMILIES.has(family) ? (family as StationFamily) : null,
    labels,
  };
  return out.format || out.family || out.labels.length ? out : null;
}

/**
 * The station's label slot 1 alone, when it clears `minConfidence`: the one
 * slot reliable enough to print on a card (slots 2 and 3 are noisy; see
 * docs/station-labels-wave1.md). Null for unknown stations and for "none".
 */
export function stationPrimaryLabel(
  uuid: string,
  options: { file?: StationLabelsFile; minConfidence?: number } = {},
): string | null {
  const file = options.file ?? (labelsFile as unknown as StationLabelsFile);
  const min = options.minConfidence ?? STATION_LABEL_MIN_CONFIDENCE;
  const entry = Object.prototype.hasOwnProperty.call(file.stations, uuid) ? file.stations[uuid] : undefined;
  const choice = confident(entry?.label1, min);
  return choice && choice !== "none" && LABELS.has(choice) ? choice : null;
}

/** Short, readable words for a format, for the desk's "What this station plays". */
const FORMAT_WORDS: Record<StationFormat, string | null> = {
  mostly_music: "Mostly music",
  mostly_talk_or_news: "Mostly talk and news",
  mixed: "Music and talk",
  religious: "Religious",
  unclear: null,
};

/** Short, readable words for a music family. */
const FAMILY_WORDS: Record<StationFamily, string | null> = {
  pop: "Pop",
  rock: "Rock",
  jazz: "Jazz and blues",
  classical: "Classical",
  electronic_dance: "Electronic and dance",
  hiphop_rnb: "Hip-hop and R&B",
  folk_traditional: "Folk and regional",
  film_soundtrack: "Film songs and soundtracks",
  oldies_hits: "Oldies and past hits",
  eclectic: "A bit of everything",
  none: null,
};

/** At most this many shelf labels per station. */
export const SHELF_LABEL_MAX = 3;

/**
 * The desk's shelf labels for one station: only the reliable answers (the
 * first label slot, the family, the format; see docs/station-labels-wave1.md),
 * most specific first, in plain words, deduped. Empty when nothing clears the
 * threshold: the desk then shows the station's raw tags as before.
 */
export function stationShelfLabels(
  uuid: string,
  options: { file?: StationLabelsFile; minConfidence?: number } = {},
): string[] {
  const file = options.file ?? (labelsFile as unknown as StationLabelsFile);
  const min = options.minConfidence ?? STATION_LABEL_MIN_CONFIDENCE;
  const entry = Object.prototype.hasOwnProperty.call(file.stations, uuid) ? file.stations[uuid] : undefined;
  if (!entry) return [];
  const label = confident(entry.label1, min);
  const family = confident(entry.family, min);
  const format = confident(entry.format, min);
  const words = [
    label && label !== "none" && LABELS.has(label) ? label : null,
    family && FAMILIES.has(family) ? FAMILY_WORDS[family as StationFamily] : null,
    format && FORMATS.has(format) ? FORMAT_WORDS[format as StationFormat] : null,
  ];
  const out: string[] = [];
  for (const word of words) {
    if (word && !out.some((held) => held.toLowerCase() === word.toLowerCase())) out.push(word);
  }
  return out.slice(0, SHELF_LABEL_MAX);
}

/** Every labelled station's shelf labels, for a route loader: small, no confidences. */
export function allStationShelfLabels(
  options: { file?: StationLabelsFile; minConfidence?: number } = {},
): Record<string, string[]> {
  const file = options.file ?? (labelsFile as unknown as StationLabelsFile);
  const out: Record<string, string[]> = {};
  for (const uuid of Object.keys(file.stations)) {
    const labels = stationShelfLabels(uuid, { ...options, file });
    if (labels.length) out[uuid] = labels;
  }
  return out;
}
