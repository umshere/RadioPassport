import type { ProviderSceneIntent } from "./BaseProvider";
import {
  dedupeStations,
  filterStationCandidates,
  normalizePreferenceList,
} from "./providerUtils";
import type { Station } from "~/types/radio";
import { rbFetchJson } from "~/utils/radioBrowser";
import { normalizeStations } from "~/utils/stations";

async function fetchAndFilter(path: string): Promise<Station[]> {
  try {
    const rawStations = await rbFetchJson<unknown>(path);
    const stations = normalizeStations(
      Array.isArray(rawStations) ? rawStations : []
    );
    return filterStationCandidates(stations);
  } catch (error) {
    console.error("Failed to fetch stations from Radio Browser:", error);
    return [];
  }
}

export async function fetchStationsForIntent(
  limit = 60,
  intent?: ProviderSceneIntent
): Promise<Station[]> {
  const baseStations = await fetchAndFilter(
    `/json/stations/search?limit=${limit}&hidebroken=true&order=clickcount&reverse=true&has_geo_info=true`
  );

  const targeted: Station[] = [];
  const preferredCountries = normalizePreferenceList(intent?.preferredCountries);
  const preferredLanguages = normalizePreferenceList(intent?.preferredLanguages);
  const preferredTags = normalizePreferenceList(intent?.preferredTags);

  for (const country of preferredCountries.slice(0, 2)) {
    targeted.push(
      ...(await fetchAndFilter(
        `/json/stations/bycountry/${encodeURIComponent(
          country
        )}?limit=30&hidebroken=true&order=clickcount&reverse=true`
      ))
    );
  }

  for (const language of preferredLanguages.slice(0, 2)) {
    targeted.push(
      ...(await fetchAndFilter(
        `/json/stations/bylanguage/${encodeURIComponent(
          language
        )}?limit=30&hidebroken=true&order=clickcount&reverse=true`
      ))
    );
  }

  for (const tag of preferredTags.slice(0, 3)) {
    targeted.push(
      ...(await fetchAndFilter(
        `/json/stations/bytag/${encodeURIComponent(
          tag
        )}?limit=30&hidebroken=true&order=clickcount&reverse=true`
      ))
    );
  }

  return dedupeStations([...targeted, ...baseStations]).slice(0, limit);
}

export function buildStationContext(stations: Station[]) {
  return stations
    .slice(0, 20)
    .map((station, idx) => {
      const tags = station.tagList?.slice(0, 3).join(",") || "none";
      return `${idx + 1}. ${station.name} [${station.uuid}]|${
        station.country
      }|${tags}|${station.bitrate}k`;
    })
    .join("\n");
}
