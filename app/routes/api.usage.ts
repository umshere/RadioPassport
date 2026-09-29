import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { USAGE_EVENTS, USAGE_SOURCES } from "~/utils/usage";

/** POST /api/usage — one anonymous counter line per beacon. */
export async function action({ request }: ActionFunctionArgs) {
  try {
    const { event, source } = (await request.json()) as { event?: string; source?: string };
    if (event && (USAGE_EVENTS as readonly string[]).includes(event)) {
      const from = source && (USAGE_SOURCES as readonly string[]).includes(source) ? source : undefined;
      console.log(JSON.stringify(from ? { usage: event, source: from } : { usage: event }));
    }
  } catch {
    // ignore malformed beacons
  }
  return new Response(null, { status: 204 });
}

export function loader() {
  return json({ error: "method_not_allowed" }, { status: 405 });
}
