import { json } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { fetchRadioBrowserCatalogSnapshot } from "~/services/radioBrowser/catalogSnapshot";
import { rbFetchJson } from "~/utils/radioBrowser";
import { normalizeStations } from "~/utils/stations";
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
  const searchLimit = Math.min(Math.max(limit, 24), 120);
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

  return dedupeStations(merged).slice(0, searchLimit);
}

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const limitParam = url.searchParams.get("stations");
  const force = url.searchParams.get("refresh") === "true";
  const query = url.searchParams.get("q")?.trim() ?? "";
  const stationLimit = limitParam ? Math.max(100, Number(limitParam)) : undefined;

  const snapshot = await fetchRadioBrowserCatalogSnapshot({
    stationLimit,
    forceRefresh: force,
  });

  if (!query || query.length < 2) {
    return json(snapshot, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  }

  const searchedStations = await searchStationsByQuery(query, 72);
  const mergedStations = dedupeStations([...searchedStations, ...snapshot.stations]);

  return json({ ...snapshot, stations: mergedStations }, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export const action = loader;
