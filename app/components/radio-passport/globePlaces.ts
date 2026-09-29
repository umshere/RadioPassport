import type { Station } from "~/types/radio";
import { getContinent } from "~/utils/geography";
import { GLOBE_LIST_CAP, type GlobePlace } from "./ParticleGlobe";
import { stationLocation } from "./StationRow";
import { COUNTRY_CENTROIDS } from "~/utils/countryCentroids";


const COUNTRY_NAME_TO_ISO: Record<string, string> = {
  india: "IN",
  "sri lanka": "LK",
  malaysia: "MY",
  singapore: "SG",
  bahrain: "BH",
  pakistan: "PK",
  "united states": "US",
  "united states of america": "US",
  "the united states of america": "US",
  "united kingdom": "GB",
  "the united kingdom of great britain and northern ireland": "GB",
  "united kingdom of great britain and northern ireland": "GB",
  canada: "CA",
  australia: "AU",
  germany: "DE",
  france: "FR",
  spain: "ES",
  italy: "IT",
  portugal: "PT",
  brazil: "BR",
  mexico: "MX",
  japan: "JP",
  "south korea": "KR",
  "republic of korea": "KR",
  china: "CN",
  indonesia: "ID",
  philippines: "PH",
  thailand: "TH",
  vietnam: "VN",
  "south africa": "ZA",
  nigeria: "NG",
  kenya: "KE",
  egypt: "EG",
  turkey: "TR",
  "the netherlands": "NL",
  netherlands: "NL",
  belgium: "BE",
  switzerland: "CH",
  austria: "AT",
  sweden: "SE",
  norway: "NO",
  denmark: "DK",
  finland: "FI",
  poland: "PL",
  ireland: "IE",
  "new zealand": "NZ",
  argentina: "AR",
  chile: "CL",
  colombia: "CO",
  peru: "PE",
  russia: "RU",
  "the russian federation": "RU",
  "russian federation": "RU",
  ukraine: "UA",
  bangladesh: "BD",
  nepal: "NP",
  "united arab emirates": "AE",
  "the united arab emirates": "AE",
  qatar: "QA",
  "saudi arabia": "SA",
  israel: "IL",
  greece: "GR",
  "czech republic": "CZ",
  czechia: "CZ",
  hungary: "HU",
  romania: "RO",
  morocco: "MA",
  ghana: "GH",
  tanzania: "TZ",
  uganda: "UG",
  ethiopia: "ET",
  "hong kong": "HK",
  taiwan: "TW",
};

export type GlobeCoordSource = "station" | "country";

export type GlobeCoords = {
  latitude: number;
  longitude: number;
  sourced: GlobeCoordSource;
};

export function isoFromCountry(
  countryCode?: string | null,
  country?: string | null
) {
  const code = (countryCode || "").trim().toUpperCase();
  if (code.length === 2 && COUNTRY_CENTROIDS[code]) return code;
  const name = (country || "").trim().toLowerCase();
  if (!name) return null;
  return COUNTRY_NAME_TO_ISO[name] ?? null;
}

export function countryCentroid(
  countryCode?: string | null,
  country?: string | null
): { latitude: number; longitude: number } | null {
  const iso = isoFromCountry(countryCode, country);
  if (!iso) return null;
  const pair = COUNTRY_CENTROIDS[iso];
  if (!pair) return null;
  return { latitude: pair[0], longitude: pair[1] };
}

export function stationGlobeCoords(
  station: Pick<Station, "latitude" | "longitude" | "countryCode" | "country">
): GlobeCoords | null {
  if (
    typeof station.latitude === "number" &&
    typeof station.longitude === "number"
  ) {
    return {
      latitude: station.latitude,
      longitude: station.longitude,
      sourced: "station",
    };
  }
  const fallback = countryCentroid(station.countryCode, station.country);
  if (!fallback) return null;
  return { ...fallback, sourced: "country" };
}

/**
 * Globe is the list, drawn. Keep the world globe only while a typed
 * search catalog has not landed yet — never a second, denser catalog.
 */
export function globeStationPool(
  query: string,
  catalog: Station[],
  initialStations: Station[],
  listStations: Station[] = []
) {
  if (query.trim().length >= 2 && catalog.length === 0) return initialStations;
  if (listStations.length > 0) return listStations;
  if (query.trim().length >= 2 && catalog.length > 0) return catalog;
  return initialStations;
}

export function globeFocusId(
  nowPlaying: Pick<Station, "uuid"> | null,
  query: string,
  catalogReady: boolean,
  places: GlobePlace[]
) {
  if (nowPlaying && places.some((place) => place.id === nowPlaying.uuid)) {
    return nowPlaying.uuid;
  }
  if (query.trim().length >= 2 && catalogReady && places[0]) {
    return places[0].id;
  }
  return null;
}

/** Deterministic scatter so country-only rows do not stack as one gimmick. */
export function spreadCountryOffset(
  id: string,
  sourced: GlobeCoordSource
): { latitude: number; longitude: number } {
  if (sourced !== "country") return { latitude: 0, longitude: 0 };
  const n = [...id].reduce(
    (total, char) => (total * 33 + char.charCodeAt(0)) >>> 0,
    7
  );
  const golden = Math.PI * (3 - Math.sqrt(5));
  const unit = (n % 360) / 360;
  const radius = 0.9 + Math.sqrt(unit) * 4.6;
  const angle = n * golden;
  return {
    latitude: Math.sin(angle) * radius,
    longitude: Math.cos(angle) * radius,
  };
}

function hueFromId(id: string) {
  return [...id].reduce(
    (total, char) => (total * 31 + char.charCodeAt(0)) % 360,
    0
  );
}

export function buildGlobePlaces(
  stations: Station[],
  ctx: {
    nowPlaying: Station | null;
    place: string | null;
    stampedKeys: Set<string>;
  }
): GlobePlace[] {
  const located = stations.filter((station) => stationGlobeCoords(station));
  let picked = located.slice(0, GLOBE_LIST_CAP);
  const playing = ctx.nowPlaying;
  if (
    playing &&
    located.some((station) => station.uuid === playing.uuid) &&
    !picked.some((station) => station.uuid === playing.uuid)
  ) {
    picked = [
      ...picked.slice(0, Math.max(0, GLOBE_LIST_CAP - 1)),
      playing,
    ];
  }
  return picked.map((station) => {
    const point = stationGlobeCoords(station)!;
    const spread = spreadCountryOffset(station.uuid, point.sourced);
    const location = stationLocation(station);
    const key = `${station.country}:${location}`;
    const latitude = Math.max(
      -90,
      Math.min(90, point.latitude + spread.latitude)
    );
    const longitude = ((point.longitude + spread.longitude + 540) % 360) - 180;
    return {
      id: station.uuid,
      name: location,
      country: station.country,
      countryCode: station.countryCode ?? null,
      region: getContinent(station.countryCode || undefined),
      stationName: station.name,
      count: 1,
      latitude,
      longitude,
      active: ctx.place === location,
      playing: playing?.uuid === station.uuid,
      stamped: ctx.stampedKeys.has(key),
      hue: hueFromId(station.uuid),
      clicks: station.clickCount || 0,
    };
  });
}
