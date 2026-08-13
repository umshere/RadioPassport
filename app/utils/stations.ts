import type { Station } from "~/types/radio";

type StationLike = Partial<Station> & {
  stationuuid?: string;
  url_resolved?: string;
  countrycode?: string;
  iso_3166_1?: string;
  bitrate?: number | string | null;
  favicon?: string | null;
  tags?: string | null;
  language?: string | null;
  state?: string | null;
  city?: string | null;
  geo_lat?: number | string | null;
  geo_long?: number | string | null;
  languagecodes?: string | null;
  homepage?: string | null;
  lastcheckok?: number | boolean;
  lastcheckoktime?: string | null;
  lastcheckoktime_iso8601?: string | null;
  lastchecktime?: string | null;
  lastchecktime_iso8601?: string | null;
  lastlocalchecktime?: string | null;
  lastlocalchecktime_iso8601?: string | null;
  ssl_error?: number | boolean;
  hls?: number | boolean;
  votes?: number | string | null;
  clickcount?: number | string | null;
  clicktrend?: number | string | null;
};

const FALLBACK_COUNTRY = "Unknown";
const INVALID_ASSET_TOKENS = new Set([
  "",
  "null",
  "undefined",
  "n/a",
  "na",
  "-",
  "0",
]);

const failedArtworkUrls = new Set<string>();

export function markArtworkUrlFailed(url?: string | null) {
  if (!url) return;
  const normalized = sanitizeArtworkUrl(url);
  if (normalized) {
    failedArtworkUrls.add(normalized);
  }
}

export function isKnownFailedArtworkUrl(url?: string | null) {
  if (!url) return false;
  const normalized = sanitizeArtworkUrl(url);
  return normalized ? failedArtworkUrls.has(normalized) : false;
}

/**
 * Title-case city/state place names for display grouping.
 * Only preserves uppercase when the original token was already all-caps length-2 (e.g. "NY").
 */
export function titleCasePlaceName(value: string): string {
  return value
    .trim()
    .split(/(\s+|-)/)
    .map((part) => {
      if (!part || /^\s+$/.test(part) || part === "-") return part;
      if (/^[A-Z]{2}$/.test(part)) return part;
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join("");
}

export function sanitizeArtworkUrl(url?: string | null): string | null {
  if (typeof url !== "string") return null;
  const trimmed = url.trim();
  if (INVALID_ASSET_TOKENS.has(trimmed.toLowerCase())) return null;
  if (
    /^https?:\/\//i.test(trimmed) ||
    /^\/\//.test(trimmed) ||
    /^\//.test(trimmed) ||
    /^data:image\//i.test(trimmed)
  ) {
    return failedArtworkUrls.has(trimmed) ? null : trimmed;
  }
  return null;
}

export function normalizeStation(
  raw: StationLike | null | undefined
): Station | null {
  if (!raw) return null;

  const uuid =
    raw.uuid ??
    raw.stationuuid ??
    (typeof raw.url === "string" ? raw.url : undefined);
  const rawResolved = (raw as { url_resolved?: string | null | undefined })
    .url_resolved;
  const resolvedUrl = typeof rawResolved === "string" ? rawResolved.trim() : "";
  const rawUrl = typeof raw.url === "string" ? raw.url.trim() : "";
  const streamUrl = resolvedUrl || rawUrl || null;
  const homepage =
    typeof raw.homepage === "string" ? raw.homepage.trim() || null : null;
  const name = raw.name?.trim() ?? null;

  if (!uuid || !name || (!streamUrl && !homepage)) {
    return null;
  }

  const bitrateRaw = raw.bitrate;
  let bitrateNumeric = 0;
  if (typeof bitrateRaw === "number") {
    bitrateNumeric = bitrateRaw;
  } else if (typeof bitrateRaw === "string") {
    const parsed = Number.parseInt(bitrateRaw, 10);
    if (!Number.isNaN(parsed)) {
      bitrateNumeric = parsed;
    }
  }

  const languageCodes =
    typeof raw.languagecodes === "string"
      ? raw.languagecodes
          .split(",")
          .map((code) => code.trim())
          .filter(Boolean)
      : undefined;

  const tagList =
    typeof raw.tags === "string"
      ? raw.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean)
      : undefined;

  const lastCheckOk =
    typeof raw.lastcheckok === "boolean"
      ? raw.lastcheckok
      : raw.lastcheckok === 1;
  const lastCheckOkTime =
    raw.lastcheckoktime_iso8601 ?? raw.lastcheckoktime ?? null;
  const lastCheckTime = raw.lastchecktime_iso8601 ?? raw.lastchecktime ?? null;
  const lastLocalCheckTime =
    raw.lastlocalchecktime_iso8601 ?? raw.lastlocalchecktime ?? null;
  const sslError =
    typeof raw.ssl_error === "boolean" ? raw.ssl_error : raw.ssl_error === 1;
  const hls = typeof raw.hls === "boolean" ? raw.hls : raw.hls === 1;
  const votes =
    typeof raw.votes === "number"
      ? raw.votes
      : raw.votes
      ? Number(raw.votes)
      : undefined;
  const clickCount =
    typeof raw.clickcount === "number"
      ? raw.clickcount
      : raw.clickcount
      ? Number(raw.clickcount)
      : undefined;
  const clickTrend =
    typeof raw.clicktrend === "number"
      ? raw.clicktrend
      : raw.clicktrend
      ? Number(raw.clicktrend)
      : undefined;
  const latitude =
    raw.geo_lat === null || raw.geo_lat === undefined || raw.geo_lat === ""
      ? null
      : Number(raw.geo_lat);
  const longitude =
    raw.geo_long === null || raw.geo_long === undefined || raw.geo_long === ""
      ? null
      : Number(raw.geo_long);

  const isStreamHealthy =
    Boolean(streamUrl) && !sslError && (lastCheckOk ?? true);
  let healthStatus: Station["healthStatus"] = undefined;
  if (!streamUrl) healthStatus = "warning";
  else if (sslError || lastCheckOk === false) healthStatus = "warning";
  else if (isStreamHealthy) healthStatus = "good";
  if (sslError && lastCheckOk === false) healthStatus = "error";

  return {
    uuid,
    name,
    url: streamUrl ?? "",
    streamUrl,
    favicon: sanitizeArtworkUrl(raw.favicon) ?? "",
    country: raw.country ?? raw.countrycode ?? FALLBACK_COUNTRY,
    countryCode:
      typeof raw.countrycode === "string"
        ? raw.countrycode || null
        : typeof raw.iso_3166_1 === "string"
        ? raw.iso_3166_1 || null
        : null,
    state: raw.state && raw.state.trim() ? raw.state : null,
    city: raw.city && raw.city.trim() ? raw.city.trim() : null,
    latitude:
      Number.isFinite(latitude) && latitude! >= -90 && latitude! <= 90
        ? latitude
        : null,
    longitude:
      Number.isFinite(longitude) && longitude! >= -180 && longitude! <= 180
        ? longitude
        : null,
    language: raw.language && raw.language.trim() ? raw.language : null,
    languageCodes,
    tags: raw.tags ?? null,
    tagList,
    bitrate: Number.isFinite(bitrateNumeric) ? bitrateNumeric : 0,
    codec: raw.codec ?? null,
    homepage,
    hls,
    lastCheckOk,
    lastCheckOkTime,
    lastCheckTime,
    lastLocalCheckTime,
    sslError,
    votes,
    clickCount,
    clickTrend,
    isStreamHealthy,
    healthStatus,
  };
}

export function normalizeStations(
  rawStations: StationLike[] | null | undefined
): Station[] {
  if (!Array.isArray(rawStations)) return [];
  const normalized: Station[] = [];
  for (const raw of rawStations) {
    const station = normalizeStation(raw);
    if (station) {
      normalized.push(station);
    }
  }
  return normalized;
}
