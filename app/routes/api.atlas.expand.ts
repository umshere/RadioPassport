import { json } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { fetchRadioBrowserCatalogSnapshot } from "~/services/radioBrowser/catalogSnapshot";
import { buildAtlasView } from "~/services/atlas/atlasGraph.server";

const VALID_KINDS = new Set(["country", "language", "station"]);

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const kind = url.searchParams.get("kind")?.trim() ?? "";
  const id = url.searchParams.get("id")?.trim() ?? "";

  // Validate before touching the snapshot: a garbage request must not spend
  // a mirror round-trip to learn it was garbage.
  if (!VALID_KINDS.has(kind) || !id) {
    return json({ error: "bad-request" }, { status: 400 });
  }

  let snapshot: Awaited<
    ReturnType<typeof fetchRadioBrowserCatalogSnapshot>
  >;
  try {
    snapshot = await fetchRadioBrowserCatalogSnapshot();
  } catch {
    // An outage is not an empty atlas. Name it so the sky can say
    // "Signal lost" instead of lying "No signal".
    return json(
      { error: "snapshot-unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  const view = buildAtlasView(kind, id, snapshot);
  if (!view) {
    return json({ error: "not-found" }, { status: 404 });
  }

  // Atlas views are pure catalog derivation and change only when the shared
  // 5-minute snapshot does, so they cache harder than the raw catalog.
  return json(view, {
    headers: {
      "Cache-Control":
        "public, s-maxage=3600, stale-while-revalidate=1800",
    },
  });
}
