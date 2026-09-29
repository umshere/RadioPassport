import { json } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { rbFetchJson } from "~/utils/radioBrowser";
import { normalizeStations } from "~/utils/stations";
import { applyLiveCatalog } from "~/utils/stationMeta";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** GET /api/station?uuid=… — one station by its directory id, for shared links. */
export async function loader({ request }: LoaderFunctionArgs) {
  const uuid = new URL(request.url).searchParams.get("uuid")?.trim() ?? "";
  if (!UUID.test(uuid)) return json({ station: null, error: "bad_uuid" }, { status: 400 });
  const raw = await rbFetchJson<unknown>(
    `/json/stations/byuuid/${uuid}`,
    undefined,
    { softFail: true },
  );
  const station = Array.isArray(raw) ? applyLiveCatalog(normalizeStations(raw))[0] ?? null : null;
  return json(
    { station },
    { headers: { "Cache-Control": station ? "public, max-age=300" : "no-store" } },
  );
}
