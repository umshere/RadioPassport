import { json } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { fetchRadioBrowserCatalogSnapshot } from "~/services/radioBrowser/catalogSnapshot";
import { rbFetchJson } from "~/utils/radioBrowser";
import { normalizeStations } from "~/utils/stations";
import { applyLiveCatalog } from "~/utils/stationMeta";
import type { Station } from "~/types/radio";

function dedupeStations(stations: Station[]) {
  const seen = new Set<string>();
  return stations.filter((station) => {
    if (!station.uuid || seen.has(station.uuid)) return false;
    seen.add(station.uuid);
    return true;
  });
}

async function searchStationsByQuery(query: string, limit: number) {
  const encoded = encodeURIComponent(query);
  const searchLimit = Math.min(Math.max(limit, 24), 250);
  const paths = [
    `/json/stations/search?name=${encoded}&limit=${searchLimit}&hidebroken=true&order=clickcount&reverse=true`,
    `/json/stations/bytag/${encoded}?limit=${searchLimit}&hidebroken=true&order=clickcount&reverse=true`,
    `/json/stations/bylanguage/${encoded}?limit=${searchLimit}&hidebroken=true&order=clickcount&reverse=true`,
    `/json/stations/bycountry/${encoded}?limit=${searchLimit}&hidebroken=true&order=clickcount&reverse=true`,
    `/json/stations/bystate/${encoded}?limit=${searchLimit}&hidebroken=true&order=clickcount&reverse=true`,
  ];

  const settled = await Promise.allSettled(
    paths.map((path) => rbFetchJson<unknown>(path, undefined, { softFail: true }))
  );

  const merged = settled.flatMap((result) => {
    if (result.status !== "fulfilled" || !Array.isArray(result.value)) return [];
    return normalizeStations(result.value);
  });

  return applyLiveCatalog(dedupeStations(merged)).slice(0, searchLimit);
}

// Focused queries fire five parallel mirror calls per settled keystroke —
// retypes and back-and-forth edits would repay that in full. Short cache per
// normalized query; only non-empty answers are kept, so an outage window
// never reads as "no results" for the TTL.
const QUERY_CACHE_TTL_MS = 60 * 1000;
const QUERY_CACHE_MAX = 40;
const queryCache = new Map<string, { at: number; stations: Station[] }>();

function readQueryCache(query: string): Station[] | null {
  const hit = queryCache.get(query.toLowerCase());
  if (!hit) return null;
  if (Date.now() - hit.at >= QUERY_CACHE_TTL_MS) {
    queryCache.delete(query.toLowerCase());
    return null;
  }
  return hit.stations;
}

function writeQueryCache(query: string, stations: Station[]) {
  if (stations.length === 0) return;
  const key = query.toLowerCase();
  if (!queryCache.has(key) && queryCache.size >= QUERY_CACHE_MAX) {
    const oldest = queryCache.keys().next();
    if (!oldest.done) queryCache.delete(oldest.value);
  }
  queryCache.set(key, { at: Date.now(), stations });
}

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const limitParam = url.searchParams.get("stations");
  const force = url.searchParams.get("refresh") === "true";
  const query = url.searchParams.get("q")?.trim() ?? "";
  const stationLimit = limitParam ? Math.max(100, Number(limitParam)) : undefined;

  let snapshot: Awaited<ReturnType<typeof fetchRadioBrowserCatalogSnapshot>>;
  try {
    snapshot = await fetchRadioBrowserCatalogSnapshot({
      stationLimit,
      forceRefresh: force,
    });
  } catch {
    // An outage is not an empty catalog. Name it so the cover can say
    // "Signal lost" instead of lying "No signal".
    return json(
      {
        error: "snapshot-unavailable",
        stations: [],
        fetchedAt: null,
        countries: [],
        languages: [],
        tags: [],
      },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  if (!query || query.length < 2) {
    return json(snapshot, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  }

  const searchedStations =
    readQueryCache(query) ?? (await searchStationsByQuery(query, 200));
  writeQueryCache(query, searchedStations);

  // A focused query already returns bounded, relevant candidates — do not
  // re-attach the full multi-thousand-station snapshot to the response.
  return json({ ...snapshot, stations: searchedStations }, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export const action = loader;
