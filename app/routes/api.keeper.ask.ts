import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { handleKeeperAsk } from "~/services/keeper/keeper.server";

/** POST /api/keeper/ask — a grounded keeper answer from the facts the sheet sends. Dark unless KEEPER_ASK_ENABLED. */
export async function action({ request }: ActionFunctionArgs) {
  return handleKeeperAsk(request);
}

export function loader() {
  return json({ error: "method_not_allowed" }, { status: 405 });
}
