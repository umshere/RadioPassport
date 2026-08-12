import { rankStations } from "~/utils/stationMeta";
import { rbFetchJson } from "~/utils/radioBrowser";
import { normalizeStations } from "~/utils/stations";
import { normalizeLanguages } from "~/utils/languages";
import type { Station } from "~/types/radio";

export type CountryDrilldownState =
  | { status: "loading"; stations: Station[] }
  | { status: "ready"; stations: Station[] }
  | { status: "error"; stations: Station[]; message: string };

export function countryCacheKey(country: string) {
  return country.trim().toLocaleLowerCase();
}

export async function fetchCountryDrilldown(
  country: string
): Promise<Station[]> {
  const raw = await rbFetchJson<unknown>(
    `/json/stations/bycountry/${encodeURIComponent(
      country
    )}?limit=140&hidebroken=true&order=clickcount&reverse=true`,
    undefined,
    { softFail: true }
  );
  if (!Array.isArray(raw)) {
    throw new Error("Radio Browser did not return a country catalog.");
  }
  return rankStations(normalizeStations(raw)).slice(0, 140);
}

export function countryCacheWith(
  cache: Record<string, CountryDrilldownState>,
  country: string,
  entry: CountryDrilldownState
) {
  return { ...cache, [countryCacheKey(country)]: entry };
}

export type CountryStationContext = {
  playableCount: number;
  languages: string[];
  tags: string[];
};

function rankedValues(values: Array<string | null | undefined>) {
  const counts = new Map<string, { label: string; count: number }>();
  values.forEach((value) => {
    if (!value?.trim()) return;
    const label = value.trim();
    const key = label.toLocaleLowerCase();
    const prior = counts.get(key);
    counts.set(key, { label: prior?.label ?? label, count: (prior?.count ?? 0) + 1 });
  });
  return [...counts.values()]
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .map((entry) => entry.label);
}

export function aggregateCountryStationContext(stations: Station[]): CountryStationContext {
  return {
    playableCount: stations.filter((station) => Boolean(station.streamUrl || station.url)).length,
    languages: rankedValues(
      stations.flatMap((station) => normalizeLanguages(station.language))
    ).slice(0, 4),
    tags: rankedValues(stations.flatMap((station) => station.tagList?.length ? station.tagList : (station.tags ?? "").split(","))).slice(0, 5),
  };
}
