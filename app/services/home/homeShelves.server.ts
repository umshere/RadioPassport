import { stationLabelsFor, stationPrimaryLabel } from "~/services/catalog/stationLabels.server";
import { buildLabelShelves, type ShelfSpec, type StationLabelFacts } from "~/components/home/homeShelves";
import { VOICE } from "~/components/keeper/keeperVoice";

export type HomeShelfData = {
  shelves: ShelfSpec[];
  /** One readable label per labelled station in the pool. */
  labels: Record<string, string>;
};

function factsFor(uuid: string): StationLabelFacts | null {
  const labels = stationLabelsFor(uuid);
  if (!labels) return null;
  return { format: labels.format, family: labels.family, label: stationPrimaryLabel(uuid) };
}

/**
 * The label shelves for the live home pool: the offline Jev labels (computed
 * once, shipped as JSON) joined to whatever stations the board has now. No
 * model call per visitor. Each card's one label is the station's slot-1
 * label, else its format in plain words.
 */
export function homeShelfData(stations: Array<{ uuid: string }>): HomeShelfData {
  const labels: Record<string, string> = {};
  for (const { uuid } of stations) {
    const facts = factsFor(uuid);
    if (!facts) continue;
    const word =
      facts.label ??
      (facts.format === "mostly_music"
        ? VOICE.shelfMusicLabel
        : facts.format === "mostly_talk_or_news"
          ? VOICE.shelfVoicesLabel
          : null);
    if (word) labels[uuid] = word;
  }
  return { shelves: buildLabelShelves(stations, factsFor), labels };
}
