import { rbFetchJson } from "~/utils/radioBrowser";
import { normalizeStations } from "~/utils/stations";
import { applyLiveCatalog } from "~/utils/stationMeta";
import type { Country, Station } from "~/types/radio";

/** Headers for the home document: browsers never keep the board. */
export const HOME_NO_STORE = { "Cache-Control": "private, no-store" } as const;
const RB_NO_STORE = { cache: "no-store" as RequestCache };

export type HomeBoard = {
  countries: Country[];
  stations: Station[];
};

// The countries + top-240 barely move within minutes, but every tab crossing
// back home paid two external round trips for them. Short server-side cache:
// browsers still get no-store and the board seed stays fresh per load, while
// repeat visits answer from memory. Only full answers are kept — outages
// serve the last good board instead of an empty one, and never poison it.
const HOME_CATALOG_TTL_MS = 5 * 60 * 1000;
let homeCatalogCache: (HomeBoard & { at: number }) | null = null;

const EMPTY_BOARD: HomeBoard = { countries: [], stations: [] };

function fromCache(cache: HomeBoard & { at: number }): HomeBoard {
  return { countries: cache.countries, stations: cache.stations };
}

/** The home board: cached if fresh, else fetched; on outage, the last good board. */
export async function loadHomeBoard(): Promise<HomeBoard> {
  if (homeCatalogCache && Date.now() - homeCatalogCache.at < HOME_CATALOG_TTL_MS) {
    return fromCache(homeCatalogCache);
  }
  try {
    const [countriesRaw, stationsRaw] = await Promise.all([
      rbFetchJson<Country[]>("/json/countries", RB_NO_STORE, { softFail: true }),
      rbFetchJson<unknown>(
        "/json/stations/search?limit=240&hidebroken=true&order=clickcount&reverse=true&has_geo_info=true",
        RB_NO_STORE,
        { softFail: true },
      ),
    ]);
    const countries = Array.isArray(countriesRaw) ? countriesRaw : [];
    const stations = applyLiveCatalog(
      normalizeStations(Array.isArray(stationsRaw) ? stationsRaw : []),
    );
    if (countries.length > 0 && stations.length > 0) {
      homeCatalogCache = { at: Date.now(), countries, stations };
    }
    return { countries, stations };
  } catch {
    return homeCatalogCache ? fromCache(homeCatalogCache) : EMPTY_BOARD;
  }
}
