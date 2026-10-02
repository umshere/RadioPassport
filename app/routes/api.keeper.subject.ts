import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { handleKeeperSubject } from "~/services/keeper/keeper.server";

/** POST /api/keeper/subject — is this station named for a person or group? Dark unless KEEPER_ASK_ENABLED. */
export async function action({ request }: ActionFunctionArgs) {
  return handleKeeperSubject(request);
}

export function loader() {
  return json({ error: "method_not_allowed" }, { status: 405 });
}
