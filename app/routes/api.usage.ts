import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { USAGE_EVENTS, USAGE_SOURCES } from "~/utils/usage";
import { bump, bumpCountry } from "~/services/admin/counters.server";

/** POST /api/usage — one anonymous counter line per beacon. */
export async function action({ request }: ActionFunctionArgs) {
  try {
    const { event, source, page } = (await request.json()) as { event?: string; source?: string; page?: string };
    if (event && (USAGE_EVENTS as readonly string[]).includes(event)) {
      const from = source && (USAGE_SOURCES as readonly string[]).includes(source) ? source : undefined;
      console.log(JSON.stringify(from ? { usage: event, source: from } : { usage: event }));
      await bump(event, { source: from, page });
      // Where in the world, as a country code the host already puts on the request. No address kept.
      const country = (request.headers.get("x-vercel-ip-country") ?? "").toUpperCase();
      if (event === "visit" && /^[A-Z]{2}$/.test(country)) await bumpCountry(country);
    }
  } catch {
    // ignore malformed beacons
  }
  return new Response(null, { status: 204 });
}

export function loader() {
  return json({ error: "method_not_allowed" }, { status: 405 });
}
