import { json } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { isStationUuid, lookupStation } from "~/services/station/lookup.server";

/** GET /api/station?uuid=… — one station by its directory id, for shared links. */
export async function loader({ request }: LoaderFunctionArgs) {
  const uuid = new URL(request.url).searchParams.get("uuid")?.trim() ?? "";
  if (!isStationUuid(uuid)) return json({ station: null, error: "bad_uuid" }, { status: 400 });
  const station = await lookupStation(uuid);
  return json(
    { station },
    { headers: { "Cache-Control": station ? "public, max-age=300" : "no-store" } },
  );
}
