import { applyLiveCatalog } from "~/utils/stationMeta";
import { rbFetchJson } from "~/utils/radioBrowser";
import { normalizeStations } from "~/utils/stations";
import { normalizeLanguages } from "~/utils/languages";
import type { Station } from "~/types/radio";

export const COUNTRY_CATALOG_LIMIT = 1000;
export const COUNTRY_LANGUAGE_LIMIT = 400;

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
    )}?limit=${COUNTRY_CATALOG_LIMIT}&hidebroken=true&order=clickcount&reverse=true`,
    undefined,
    { softFail: true }
  );
  if (!Array.isArray(raw)) {
    throw new Error("Radio Browser did not return a country catalog.");
  }
  return applyLiveCatalog(normalizeStations(raw)).slice(
    0,
    COUNTRY_CATALOG_LIMIT
  );
}

export function stationSpeaksLanguage(station: Station, language: string) {
  const wanted = language.trim().toLowerCase();
  if (!wanted) return true;
  return normalizeLanguages(station.language).some(
    (item) => item.toLowerCase() === wanted
  );
}

export function languageChipsFromStations(stations: Station[], limit = 12) {
  return rankedValues(
    stations.flatMap((station) => normalizeLanguages(station.language))
  ).slice(0, limit);
}

export function mergeStationLists(...lists: Station[][]) {
  const seen = new Set<string>();
  const merged: Station[] = [];
  for (const list of lists) {
    for (const station of list) {
      if (!station?.uuid || seen.has(station.uuid)) continue;
      seen.add(station.uuid);
      merged.push(station);
    }
  }
  return applyLiveCatalog(merged);
}

export async function fetchStationsByCountryLanguage(
  country: string,
  language: string
): Promise<Station[]> {
  const params = new URLSearchParams({
    country,
    language: language.trim().toLowerCase(),
    hidebroken: "true",
    order: "clickcount",
    reverse: "true",
    limit: String(COUNTRY_LANGUAGE_LIMIT),
  });
  const raw = await rbFetchJson<unknown>(
    `/json/stations/search?${params.toString()}`,
    undefined,
    { softFail: true }
  );
  if (!Array.isArray(raw)) {
    throw new Error("Radio Browser did not return a language catalog.");
  }
  return applyLiveCatalog(normalizeStations(raw)).slice(
    0,
    COUNTRY_LANGUAGE_LIMIT
  );
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
    counts.set(key, {
      label: prior?.label ?? label,
      count: (prior?.count ?? 0) + 1,
    });
  });
  return [...counts.values()]
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .map((entry) => entry.label);
}

export function aggregateCountryStationContext(
  stations: Station[]
): CountryStationContext {
  return {
    playableCount: stations.filter((station) =>
      Boolean(station.streamUrl || station.url)
    ).length,
    languages: rankedValues(
      stations.flatMap((station) => normalizeLanguages(station.language))
    ).slice(0, 4),
    tags: rankedValues(
      stations.flatMap((station) =>
        station.tagList?.length ? station.tagList : (station.tags ?? "").split(",")
      )
    ).slice(0, 5),
  };
}
