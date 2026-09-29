import type { Station } from "~/types/radio";
import { rbFetchJson } from "~/utils/radioBrowser";
import { normalizeStations } from "~/utils/stations";
import { applyLiveCatalog } from "~/utils/stationMeta";

/** A Radio Browser station id. Anything else never reaches the directory. */
export const STATION_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isStationUuid(value: unknown): value is string {
  return typeof value === "string" && STATION_UUID.test(value);
}

/** One station by its directory id, normalised like every other record. Null when unknown. */
export async function lookupStation(uuid: string): Promise<Station | null> {
  if (!isStationUuid(uuid)) return null;
  const raw = await rbFetchJson<unknown>(`/json/stations/byuuid/${uuid}`, undefined, { softFail: true });
  return Array.isArray(raw) ? applyLiveCatalog(normalizeStations(raw))[0] ?? null : null;
}
