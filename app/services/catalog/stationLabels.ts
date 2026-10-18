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
export const STATION_LABEL_MIN_CONFIDENCE = 0.5;

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
