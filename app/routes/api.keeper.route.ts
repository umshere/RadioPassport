import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { handleKeeperRoute } from "~/services/keeper/keeper.server";

/** POST /api/keeper/route — classify a keeper question (Jev, rule fallback). Dark unless KEEPER_ASK_ENABLED. */
export async function action({ request }: ActionFunctionArgs) {
  return handleKeeperRoute(request);
}

export function loader() {
  return json({ error: "method_not_allowed" }, { status: 405 });
}
