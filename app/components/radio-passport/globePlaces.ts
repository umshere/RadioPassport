import type { Station } from "~/types/radio";
import { getContinent } from "~/utils/geography";
import type { GlobePlace } from "./ParticleGlobe";
import { stationLocation } from "./StationRow";

/**
 * Locator-only country centers. Used when Radio Browser left geo_lat /
 * geo_long empty. Never written back onto Station — solar hour and
 * stamps still require a real coordinate.
 */
const COUNTRY_CENTROIDS: Record<string, readonly [number, number]> = {
  AD: [42.55, 1.58],
  AE: [23.42, 53.85],
  AF: [33.94, 67.71],
  AL: [41.15, 20.17],
  AM: [40.07, 45.04],
  AO: [-11.2, 17.87],
  AR: [-38.42, -63.62],
  AT: [47.52, 14.55],
  AU: [-25.27, 133.78],
  AZ: [40.14, 47.58],
  BA: [43.92, 17.68],
  BD: [23.68, 90.36],
  BE: [50.5, 4.47],
  BF: [12.24, -1.56],
  BG: [42.73, 25.49],
  BH: [26.07, 50.56],
  BI: [-3.37, 29.92],
  BJ: [9.31, 2.32],
  BN: [4.54, 114.73],
  BO: [-16.29, -63.59],
  BR: [-14.24, -51.93],
  BT: [27.51, 90.43],
  BW: [-22.33, 24.68],
  BY: [53.71, 27.95],
  BZ: [17.19, -88.5],
  CA: [56.13, -106.35],
  CD: [-4.04, 21.76],
  CF: [6.61, 20.94],
  CG: [-0.23, 15.83],
  CH: [46.82, 8.23],
  CI: [7.54, -5.55],
  CL: [-35.68, -71.54],
  CM: [7.37, 12.35],
  CN: [35.86, 104.2],
  CO: [4.57, -74.3],
  CR: [9.75, -83.75],
  CU: [21.52, -77.78],
  CV: [16.0, -24.01],
  CY: [35.13, 33.43],
  CZ: [49.82, 15.47],
  DE: [51.17, 10.45],
  DJ: [11.83, 42.59],
  DK: [56.26, 9.5],
  DO: [18.74, -70.16],
  DZ: [28.03, 1.66],
  EC: [-1.83, -78.18],
  EE: [58.6, 25.01],
  EG: [26.82, 30.8],
  ER: [15.18, 39.78],
  ES: [40.46, -3.75],
  ET: [9.15, 40.49],
  FI: [61.92, 25.75],
  FJ: [-16.58, 179.41],
  FR: [46.23, 2.21],
  GA: [-0.8, 11.61],
  GB: [55.38, -3.44],
  GE: [42.32, 43.36],
  GH: [7.95, -1.02],
  GM: [13.44, -15.31],
  GN: [9.95, -9.7],
  GQ: [1.65, 10.27],
  GR: [39.07, 21.82],
  GT: [15.78, -90.23],
  GW: [11.8, -15.18],
  GY: [4.86, -58.93],
  HK: [22.4, 114.11],
  HN: [15.2, -86.24],
  HR: [45.1, 15.2],
  HT: [18.97, -72.29],
  HU: [47.16, 19.5],
  ID: [-0.79, 113.92],
  IE: [53.41, -8.24],
  IL: [31.05, 34.85],
  IM: [54.24, -4.55],
  IN: [20.59, 78.96],
  IQ: [33.22, 43.68],
  IR: [32.43, 53.69],
  IS: [64.96, -19.02],
  IT: [41.87, 12.57],
  JM: [18.11, -77.3],
  JO: [30.59, 36.24],
  JP: [36.2, 138.25],
  KE: [-0.02, 37.91],
  KG: [41.2, 74.77],
  KH: [12.57, 104.99],
  KM: [-11.88, 43.87],
  KR: [35.91, 127.77],
  KW: [29.31, 47.48],
  KZ: [48.02, 66.92],
  LA: [19.86, 102.5],
  LB: [33.85, 35.86],
  LI: [47.17, 9.56],
  LK: [7.87, 80.77],
  LR: [6.43, -9.43],
  LS: [-29.61, 28.23],
  LT: [55.17, 23.88],
  LU: [49.82, 6.13],
  LV: [56.88, 24.6],
  LY: [26.34, 17.23],
  MA: [31.79, -7.09],
  MC: [43.75, 7.41],
  MD: [47.41, 28.37],
  ME: [42.71, 19.37],
  MG: [-18.77, 46.87],
  MK: [41.61, 21.75],
  ML: [17.57, -4.0],
  MM: [21.91, 95.96],
  MN: [46.86, 103.85],
  MO: [22.2, 113.54],
  MR: [21.01, -10.94],
  MT: [35.94, 14.38],
  MU: [-20.35, 57.55],
  MV: [3.2, 73.22],
  MW: [-13.25, 34.3],
  MX: [23.63, -102.55],
  MY: [4.21, 101.98],
  MZ: [-18.67, 35.53],
  NA: [-22.96, 18.49],
  NE: [17.61, 8.08],
  NG: [9.08, 8.68],
  NI: [12.87, -85.21],
  NL: [52.13, 5.29],
  NO: [60.47, 8.47],
  NP: [28.39, 84.12],
  NZ: [-40.9, 174.89],
  OM: [21.47, 55.98],
  PA: [8.54, -80.78],
  PE: [-9.19, -75.02],
  PG: [-6.31, 143.96],
  PH: [12.88, 121.77],
  PK: [30.38, 69.35],
  PL: [51.92, 19.15],
  PR: [18.22, -66.59],
  PS: [31.95, 35.23],
  PT: [39.4, -8.22],
  PY: [-23.44, -58.44],
  QA: [25.35, 51.18],
  RO: [45.94, 24.97],
  RS: [44.02, 21.01],
  RU: [61.52, 105.32],
  RW: [-1.94, 29.87],
  SA: [23.89, 45.08],
  SD: [12.86, 30.22],
  SE: [60.13, 18.64],
  SG: [1.35, 103.82],
  SI: [46.15, 14.99],
  SK: [48.67, 19.7],
  SL: [8.46, -11.78],
  SM: [43.94, 12.46],
  SN: [14.5, -14.45],
  SO: [5.15, 46.2],
  SR: [3.92, -56.03],
  SS: [6.88, 31.31],
  SV: [13.79, -88.9],
  SY: [34.8, 38.0],
  SZ: [-26.52, 31.47],
  TD: [15.45, 18.73],
  TG: [8.62, 0.82],
  TH: [15.87, 100.99],
  TJ: [38.86, 71.28],
  TL: [-8.87, 125.73],
  TM: [38.97, 59.56],
  TN: [33.89, 9.54],
  TR: [38.96, 35.24],
  TT: [10.69, -61.22],
  TW: [23.7, 120.96],
  TZ: [-6.37, 34.89],
  UA: [48.38, 31.17],
  UG: [1.37, 32.29],
  US: [37.09, -95.71],
  UY: [-32.52, -55.77],
  UZ: [41.38, 64.59],
  VA: [41.9, 12.45],
  VE: [6.42, -66.59],
  VN: [14.06, 108.28],
  XK: [42.6, 20.9],
  YE: [15.55, 48.52],
  ZA: [-30.56, 22.94],
  ZM: [-13.13, 27.85],
  ZW: [-19.02, 29.15],
};

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

/** Search catalog is empty until the fetch lands — keep the live world globe. */
export function globeStationPool(
  query: string,
  catalog: Station[],
  initialStations: Station[]
) {
  if (query.trim().length >= 2 && catalog.length > 0) return catalog;
  return initialStations;
}

export function globeFocusId(
  nowPlaying: Pick<Station, "country"> | null,
  nowPlayingLocation: string | null,
  query: string,
  catalogReady: boolean,
  places: GlobePlace[]
) {
  if (nowPlaying && nowPlayingLocation) {
    return `${nowPlaying.country}:${nowPlayingLocation}`;
  }
  if (query.trim().length >= 2 && catalogReady && places[0]) {
    return places[0].id;
  }
  return null;
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
  const map = new Map<string, GlobePlace>();
  stations.forEach((station) => {
    const point = stationGlobeCoords(station);
    if (!point) return;
    const location = stationLocation(station);
    const key = `${station.country}:${location}`;
    const old = map.get(key);
    const lead = !old || (station.clickCount || 0) >= (old.clicks || 0);
    map.set(key, {
      id: key,
      name: location,
      country: station.country,
      countryCode: station.countryCode ?? null,
      region: getContinent(station.countryCode || undefined),
      stationName: lead ? station.name : old.stationName,
      count: (old?.count || 0) + 1,
      latitude: lead ? point.latitude : old.latitude,
      longitude: lead ? point.longitude : old.longitude,
      active: ctx.place === location,
      playing: ctx.nowPlaying
        ? stationLocation(ctx.nowPlaying) === location &&
          ctx.nowPlaying.country === station.country
        : false,
      stamped: ctx.stampedKeys.has(key),
      hue: lead ? hueFromId(station.uuid) : old.hue,
      clicks: lead ? station.clickCount || 0 : old.clicks,
    });
  });
  return [...map.values()].sort((a, b) => b.count - a.count).slice(0, 30);
}
