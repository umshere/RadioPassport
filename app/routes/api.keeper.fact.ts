import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { handleKeeperFact } from "~/services/keeper/keeperFact.server";

/** POST /api/keeper/fact — a grounded fact for the keeper's murmurs. Dark unless KEEPER_ASK_ENABLED. */
export async function action({ request }: ActionFunctionArgs) {
  return handleKeeperFact(request);
}

export function loader() {
  return json({ error: "method_not_allowed" }, { status: 405 });
}
