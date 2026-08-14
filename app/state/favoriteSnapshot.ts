import type { Station } from "~/types/radio";

export const FAVORITE_SNAPSHOT_CAP = 24;

export type SlimStation = {
  uuid: string;
  name: string;
  url: string;
  streamUrl: string | null;
  city?: string | null;
  state: string | null;
  country: string;
  countryCode?: string | null;
  favicon: string;
  longitude?: number | null;
  latitude?: number | null;
};

export type SlimStationSource = {
  uuid?: string | null;
  name?: string | null;
  url?: string | null;
  streamUrl?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  countryCode?: string | null;
  favicon?: string | null;
  longitude?: number | null;
  latitude?: number | null;
};

function readText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

/** Enough of a station to play after the search catalog is gone. */
export function toSlimStation(station: SlimStationSource): SlimStation | null {
  const uuid = readText(station.uuid);
  const name = readText(station.name);
  const stream = readText(station.streamUrl);
  const url = readText(station.url);
  const playUrl = stream || url;
  if (!uuid || !name || !playUrl) return null;
  const slim: SlimStation = {
    uuid,
    name,
    url: url || playUrl,
    streamUrl: stream || playUrl,
    city: readText(station.city) || null,
    state: readText(station.state) || null,
    country: readText(station.country),
    countryCode: readText(station.countryCode) || null,
    favicon: readText(station.favicon),
  };
  if (typeof station.longitude === "number") slim.longitude = station.longitude;
  if (typeof station.latitude === "number") slim.latitude = station.latitude;
  return slim;
}

export function slimToStation(slim: SlimStation): Station {
  return {
    uuid: slim.uuid,
    name: slim.name,
    url: slim.url || slim.streamUrl || "",
    streamUrl: slim.streamUrl,
    favicon: slim.favicon || "",
    country: slim.country || "",
    countryCode: slim.countryCode ?? null,
    state: slim.state ?? null,
    city: slim.city ?? null,
    latitude: slim.latitude ?? null,
    longitude: slim.longitude ?? null,
    language: null,
    tags: null,
    bitrate: 0,
    codec: null,
  };
}

export function parseFavoriteSnapshots(value: unknown): SlimStation[] {
  if (!Array.isArray(value)) return [];
  const parsed: SlimStation[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const slim = toSlimStation(entry as SlimStationSource);
    if (!slim) continue;
    parsed.push(slim);
    if (parsed.length >= FAVORITE_SNAPSHOT_CAP) break;
  }
  return parsed;
}

export function upsertFavoriteSnapshot(
  list: SlimStation[],
  next: SlimStation
): SlimStation[] {
  return [next, ...list.filter((entry) => entry.uuid !== next.uuid)].slice(
    0,
    FAVORITE_SNAPSHOT_CAP
  );
}

export function dropFavoriteSnapshot(list: SlimStation[], stationId: string) {
  return list.filter((entry) => entry.uuid !== stationId);
}

/** Snapshots first so a search-only heart still plays; live pool fills the rest. */
export function resolveKeptSignals(
  favoriteIds: string[],
  snapshots: SlimStation[],
  livePool: Station[]
): Station[] {
  const bySnapshot = new Map(snapshots.map((entry) => [entry.uuid, entry]));
  const byLive = new Map(livePool.map((entry) => [entry.uuid, entry]));
  const resolved: Station[] = [];
  const seen = new Set<string>();
  for (const id of favoriteIds) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const snapshot = bySnapshot.get(id);
    if (snapshot) {
      resolved.push(slimToStation(snapshot));
      continue;
    }
    const live = byLive.get(id);
    if (live) resolved.push(live);
  }
  return resolved;
}
