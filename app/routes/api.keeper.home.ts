import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { handleKeeperHome } from "~/services/keeper/keeper.server";

/** POST /api/keeper/home — route the arrival question (Jev, rules on the client as fallback). Dark unless KEEPER_ASK_ENABLED. */
export async function action({ request }: ActionFunctionArgs) {
  return handleKeeperHome(request);
}

export function loader() {
  return json({ error: "method_not_allowed" }, { status: 405 });
}
