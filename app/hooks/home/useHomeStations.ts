import { useMemo } from "react";
import {
  buildGlobePlaces,
  globeStationPool,
} from "~/components/radio-passport/globePlaces";
import { stationLocation } from "~/components/radio-passport/StationRow";
import {
  countryCacheKey,
  mergeStationLists,
  type CountryDrilldownState,
} from "~/components/radio-passport/countryData";
import { shouldClearBrowsingFilters } from "~/components/radio-passport/searchState";
import { useShelfProbe } from "~/hooks/useShelfProbe";
import type { Station } from "~/types/radio";
import { stationMatchesSolarHour, type SolarHour } from "~/utils/localTime";
import { applyLiveCatalog } from "~/utils/stationMeta";
import { stationMatches } from "~/utils/stationSearch";

const MAX_BOARD = 120;
const MAX_POOL = 60;

type Stamp = { country: string; city: string };

/**
 * Every station list the home derives, in one place and in order:
 *
 *   base       what we are searching in (typed query > world mix > top 240)
 *   filtered   base narrowed by query, hour and place
 *   live       filtered, with the leading shelf probed for a live signal
 *   globe      what the globe draws
 *   pool       what a tap plays through (live, else the base)
 *
 * Pure derivation — no fetching, no writes — so it is safe to call every render.
 */
export function useHomeStations({
  initialStations,
  catalog,
  query,
  hour,
  place,
  countryCache,
  listeningMode,
  exploreStations,
  nowPlaying,
  stamps,
  played,
  journeyReady,
}: {
  initialStations: Station[];
  catalog: Station[];
  query: string;
  hour: SolarHour | null;
  place: string | null;
  countryCache: Record<string, CountryDrilldownState>;
  listeningMode: string;
  exploreStations: Station[];
  nowPlaying: Station | null;
  stamps: Stamp[];
  played: string[];
  journeyReady: boolean;
}) {
  const featured = useMemo(() => {
    const geo = initialStations.filter((station) => typeof station.latitude === "number");
    return (
      [...geo].sort((a, b) => (b.clickCount || 0) - (a.clickCount || 0))[0] ??
      initialStations[0] ??
      null
    );
  }, [initialStations]);

  const continueStation = useMemo(() => {
    if (!journeyReady) return null;
    const lastId = played[0];
    if (!lastId) return null;
    return (
      initialStations.find((station) => station.uuid === lastId) ??
      catalog.find((station) => station.uuid === lastId) ??
      null
    );
  }, [catalog, initialStations, journeyReady, played]);

  // Landing from a country drilldown already holds that country's stations:
  // deal them as the instant board instead of searching from zero while the
  // catalog fetch flies. The catalog merges in behind (instant rows stay
  // parked), so the board fills at once and refines. A hand-typed query that
  // matches a visited country gets the same head start.
  const seekingInstantPool = useMemo(
    () =>
      query.trim().length >= 2
        ? countryCache[countryCacheKey(query)]?.stations ?? []
        : [],
    [countryCache, query],
  );
  const seekingBase = useMemo(
    () => mergeStationLists(seekingInstantPool, catalog),
    [seekingInstantPool, catalog],
  );
  const baseStations =
    query.trim().length >= 2
      ? seekingBase
      : listeningMode === "world" && exploreStations.length
        ? exploreStations
        : initialStations;

  const filtered = useMemo(
    () =>
      applyLiveCatalog(
        baseStations.filter((station) => {
          if (!stationMatches(station, query)) return false;
          if (shouldClearBrowsingFilters(query)) return true;
          return (
            stationMatchesSolarHour(station.longitude, hour) &&
            (!place || stationLocation(station) === place)
          );
        }),
      ).slice(0, MAX_BOARD),
    [baseStations, hour, place, query],
  );
  const liveFiltered = useShelfProbe(
    filtered,
    `${query}|${hour ?? ""}|${place ?? ""}|${listeningMode}`,
  );

  const globeStations = globeStationPool(query, catalog, initialStations, liveFiltered);
  const stampedKeys = useMemo(
    () => new Set(stamps.map((stamp) => `${stamp.country}:${stamp.city}`)),
    [stamps],
  );
  const places = useMemo(
    () => buildGlobePlaces(globeStations, { nowPlaying, place, stampedKeys }),
    [globeStations, nowPlaying, place, stampedKeys],
  );

  const selectedPool = liveFiltered.length
    ? liveFiltered
    : applyLiveCatalog(baseStations).slice(0, MAX_POOL);

  return {
    featured,
    continueStation,
    baseStations,
    filtered,
    liveFiltered,
    globeStations,
    stampedKeys,
    places,
    selectedPool,
  };
}
