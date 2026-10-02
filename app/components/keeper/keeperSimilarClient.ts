import type { Station } from "~/types/radio";
import { primaryLanguage, similarStations, SIMILAR_MAX, type Similar } from "./keeperSimilar";

const catalogByLanguage = new Map<string, Promise<Station[]>>();

/** One catalog read per language per visit; a failure just means no extras. */
function catalogFor(language: string): Promise<Station[]> {
  const key = language.toLowerCase();
  let held = catalogByLanguage.get(key);
  if (!held) {
    held = fetch(`/api/radio-catalog?stations=8000&q=${encodeURIComponent(language)}`)
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      // The catalog answers already normalized; running it again would lose the health flags.
      .then((data: { stations?: Station[] }) => (data.stations || []).filter((station) => station?.uuid))
      .catch(() => {
        catalogByLanguage.delete(key);
        return [] as Station[];
      });
    catalogByLanguage.set(key, held);
  }
  return held;
}

/**
 * Similar stations from what is already in hand (the queue), widened by one
 * catalog read for the station's language when that is not enough. Never on
 * the audio path.
 */
export async function findSimilar(current: Station, queue: Station[]): Promise<Similar | null> {
  const first = similarStations(current, queue);
  if (first && first.reason === "language" && first.stations.length >= SIMILAR_MAX) return first;
  const language = primaryLanguage(current);
  if (!language) return first;
  const extra = await catalogFor(language);
  return similarStations(current, [...queue, ...extra]) ?? first;
}
