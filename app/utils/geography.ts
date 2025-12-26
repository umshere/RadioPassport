import type { Station } from "~/types/radio";

export function getContinent(iso2?: string): string {
  if (!iso2) return "Other";

  const continentMap: Record<string, string> = {
    AT: "Europe",
    BE: "Europe",
    BG: "Europe",
    HR: "Europe",
    CY: "Europe",
    CZ: "Europe",
    DK: "Europe",
    EE: "Europe",
    FI: "Europe",
    FR: "Europe",
    DE: "Europe",
    GR: "Europe",
    HU: "Europe",
    IS: "Europe",
    IE: "Europe",
    IT: "Europe",
    LV: "Europe",
    LT: "Europe",
    LU: "Europe",
    MT: "Europe",
    NL: "Europe",
    NO: "Europe",
    PL: "Europe",
    PT: "Europe",
    RO: "Europe",
    SK: "Europe",
    SI: "Europe",
    ES: "Europe",
    SE: "Europe",
    CH: "Europe",
    GB: "Europe",
    UA: "Europe",
    RU: "Europe",
    BY: "Europe",
    MD: "Europe",
    RS: "Europe",
    AL: "Europe",
    BA: "Europe",
    MK: "Europe",
    ME: "Europe",
    US: "North America",
    CA: "North America",
    MX: "North America",
    GT: "North America",
    HN: "North America",
    SV: "North America",
    AR: "South America",
    BO: "South America",
    BR: "South America",
    CL: "South America",
    CO: "South America",
    EC: "South America",
    CN: "Asia",
    IN: "Asia",
    ID: "Asia",
    JP: "Asia",
    KR: "Asia",
    MY: "Asia",
    PH: "Asia",
    SG: "Asia",
    TH: "Asia",
    VN: "Asia",
    ZA: "Africa",
    EG: "Africa",
    NG: "Africa",
    KE: "Africa",
    GH: "Africa",
    AU: "Australia",
    NZ: "Australia",
    PG: "Australia",
    FJ: "Australia",
  };

  return continentMap[iso2.toUpperCase()] || "Other";
}

export type Country = {
  name: string;
  iso_3166_1: string;
  stationcount: number;
};

export function dedupeStations(stations: Station[]): Station[] {
  const seen = new Set<string>();
  const unique: Station[] = [];
  for (const station of stations) {
    const key = createStationKey(station);
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(station);
    }
  }
  return unique;
}

function createStationKey(station: Station): string {
  const fingerprint = getStreamFingerprint(station);
  return `${station.uuid}::${fingerprint}`;
}

function getStreamFingerprint(station: Station): string {
  const source = station.streamUrl || station.url || "";
  if (!source) return "no-stream";
  try {
    const url = new URL(source);
    return `${url.origin}${url.pathname}`.toLowerCase();
  } catch {
    return source;
  }
}
