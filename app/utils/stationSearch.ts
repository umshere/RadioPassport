import type { Station } from "~/types/radio";

function lower(value: string | null | undefined) {
  return (value || "").toLowerCase();
}

/** Every whitespace-separated word of the query must appear in the station's searchable fields. */
export function stationMatches(station: Station, query: string) {
  const queryTokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!queryTokens.length) return true;
  const haystack = [
    station.name,
    station.tags,
    station.language,
    station.country,
    station.city,
    station.state,
    station.codec,
  ]
    .map(lower)
    .join(" ");
  return queryTokens.every((token) => haystack.includes(token));
}
