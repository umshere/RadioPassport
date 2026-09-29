import type { LoaderFunctionArgs } from "@remix-run/node";
import { parseTicketFormat, ticketFields, ticketParamUuid } from "~/components/share/ticketModel";
import { isStationUuid, lookupStation } from "~/services/station/lookup.server";
import { loadTicketAssets } from "~/services/ticket/ticketAssets.server";

export const TICKET_FALLBACK_IMAGE = "/elsewhere-og.jpg";

/** The house still, when a ticket cannot be printed. Link previews never break. */
function fallback(cache: string) {
  return new Response(null, {
    status: 302,
    headers: { Location: TICKET_FALLBACK_IMAGE, "Cache-Control": cache },
  });
}

/**
 * GET /ticket/<uuid>.png[?format=story] — the station's ticket as a PNG:
 * 1200×630 for link previews, 1080×1350 for stories. Printed from the
 * directory record and the clock at the station's longitude, nothing else.
 */
export async function loader({ request, params }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const uuid = ticketParamUuid(params.uuid);
  if (!isStationUuid(uuid)) return fallback("no-store");
  const format = parseTicketFormat(url.searchParams.get("format"));
  try {
    const station = await lookupStation(uuid);
    if (!station) return fallback("public, max-age=60");
    const [assets, { renderTicketPng }] = await Promise.all([
      loadTicketAssets(url.origin),
      // Loaded on demand so the image engine never weighs on other routes' cold starts.
      import("~/services/ticket/renderTicket.server"),
    ]);
    const png = await renderTicketPng(ticketFields(station), format, assets);
    return new Response(new Uint8Array(png), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Length": String(png.length),
        // The local hour is printed on it: a short edge life, then a fresh print.
        "Cache-Control": "public, max-age=300, s-maxage=600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error(JSON.stringify({ ticket: "render_failed", uuid, message: String(error) }));
    return fallback("public, max-age=60");
  }
}
