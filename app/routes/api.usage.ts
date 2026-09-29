import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { USAGE_EVENTS } from "~/utils/usage";

/** POST /api/usage — one anonymous counter line per beacon. */
export async function action({ request }: ActionFunctionArgs) {
  try {
    const { event } = (await request.json()) as { event?: string };
    if (event && (USAGE_EVENTS as readonly string[]).includes(event)) {
      console.log(JSON.stringify({ usage: event }));
    }
  } catch {
    // ignore malformed beacons
  }
  return new Response(null, { status: 204 });
}

export function loader() {
  return json({ error: "method_not_allowed" }, { status: 405 });
}
