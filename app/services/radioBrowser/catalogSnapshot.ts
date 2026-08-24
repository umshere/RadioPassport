import { rbFetchJson } from "~/utils/radioBrowser";
import { normalizeStations } from "~/utils/stations";
import type { Station, Country } from "~/types/radio";

export type LanguageSummary = {
  name: string;
  stationcount: number;
};

export type TagSummary = {
  name: string;
  stationcount: number;
};

export type RadioBrowserCatalogSnapshot = {
  fetchedAt: string;
  stations: Station[];
  countries: Country[];
  languages: LanguageSummary[];
  tags: TagSummary[];
};

const DEFAULT_STATION_LIMIT = 8000;
const CACHE_TTL_MS = 5 * 60 * 1000;
// The limit=8000 search ships ~10MB and measured 16.8s upstream — the shared
// 5s default kills every mirror before the body lands. Only this heavy call
// gets a longer leash; countries/languages/tags stay on the global default.
const HEAVY_STATION_TIMEOUT_MS = 30000;

let cachedSnapshot: {
  expiresAt: number;
  promise: Promise<RadioBrowserCatalogSnapshot>;
} | null = null;

async function fetchStations(limit: number): Promise<Station[]> {
  const raw = await rbFetchJson<unknown>(
    `/json/stations/search?limit=${limit}&hidebroken=true&order=clickcount&reverse=true&has_geo_info=true`,
    undefined,
    { softFail: true, timeoutMs: HEAVY_STATION_TIMEOUT_MS }
  );

  // softFail turns total mirror failure into null; that is an outage, not an
  // empty catalog, so surface it as a rejection the route can answer honestly.
  if (raw == null) {
    throw new Error(
      `RadioBrowser catalog unavailable for stations search (limit ${limit})`
    );
  }

  return normalizeStations(Array.isArray(raw) ? raw : []);
}

async function fetchCountries(): Promise<Country[]> {
  const raw = await rbFetchJson<Country[]>(`/json/countries`);
  return Array.isArray(raw) ? raw : [];
}

async function fetchLanguages(): Promise<LanguageSummary[]> {
  const raw = await rbFetchJson<LanguageSummary[]>(`/json/languages`);
  return Array.isArray(raw) ? raw : [];
}

async function fetchTags(limit: number = 500): Promise<TagSummary[]> {
  const raw = await rbFetchJson<TagSummary[]>(
    `/json/tags?limit=${limit}&order=stationcount&reverse=true`
  );
  return Array.isArray(raw) ? raw : [];
}

async function buildSnapshot(
  stationLimit: number
): Promise<RadioBrowserCatalogSnapshot> {
  const [stations, countries, languages, tags] = await Promise.all([
    fetchStations(stationLimit),
    fetchCountries(),
    fetchLanguages(),
    fetchTags(),
  ]);

  return {
    fetchedAt: new Date().toISOString(),
    stations,
    countries,
    languages,
    tags,
  };
}

export async function fetchRadioBrowserCatalogSnapshot(options?: {
  stationLimit?: number;
  forceRefresh?: boolean;
}): Promise<RadioBrowserCatalogSnapshot> {
  const stationLimit = options?.stationLimit ?? DEFAULT_STATION_LIMIT;
  const forceRefresh = options?.forceRefresh ?? false;

  const now = Date.now();
  if (!forceRefresh && cachedSnapshot && cachedSnapshot.expiresAt > now) {
    return cachedSnapshot.promise;
  }

  const promise = buildSnapshot(stationLimit);
  cachedSnapshot = {
    expiresAt: now + CACHE_TTL_MS,
    promise,
  };

  // A failed build must never be negative-cached: clear the slot so the next
  // caller retries fresh instead of replaying this rejection for the full TTL.
  promise.catch(() => {
    if (cachedSnapshot?.promise === promise) {
      cachedSnapshot = null;
    }
  });

  return promise;
}
