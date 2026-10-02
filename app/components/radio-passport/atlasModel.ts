import type { Country } from "~/types/radio";
import { getContinent } from "~/utils/geography";

export const POPULAR = "Popular";
/** Tiles shown before "Show all". */
export const ATLAS_PAGE = 24;

export type AtlasTab = { id: string; label: string; count: number };

const byStations = (a: Country, b: Country) =>
  b.stationcount - a.stationcount || a.name.localeCompare(b.name);

/** Countries sorted busiest first; those with no stations sink to the end. */
function ranked(countries: Country[]): Country[] {
  return [...countries].sort(byStations);
}

/** Popular, then one tab per continent that has any country, biggest first. */
export function atlasTabs(countries: Country[]): AtlasTab[] {
  const counts = new Map<string, number>();
  for (const country of countries) {
    const region = getContinent(country.iso_3166_1) || "Other";
    counts.set(region, (counts.get(region) ?? 0) + 1);
  }
  const regions = [...counts.entries()]
    .sort((a, b) => Number(a[0] === "Other") - Number(b[0] === "Other") || b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([label, count]) => ({ id: label, label, count }));
  return [{ id: POPULAR, label: POPULAR, count: Math.min(ATLAS_PAGE, countries.length) }, ...regions];
}

/** What a tab holds: Popular is the busiest countries anywhere. */
export function atlasTabCountries(countries: Country[], tab: string): Country[] {
  const live = ranked(countries);
  if (tab === POPULAR) return live.slice(0, ATLAS_PAGE);
  return live.filter((country) => (getContinent(country.iso_3166_1) || "Other") === tab);
}

/** Search spans every country, in the same busiest-first order. */
export function atlasSearch(countries: Country[], language: (country: Country) => string, query: string): Country[] {
  const needle = query.toLowerCase().trim();
  return ranked(countries).filter((country) =>
    `${country.name} ${country.iso_3166_1} ${language(country)}`.toLowerCase().includes(needle),
  );
}
