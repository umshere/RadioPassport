import { logUsage } from "~/utils/usage";
import type { SolarHour } from "~/utils/localTime";
import type { KeeperFacts } from "./keeperFacts";
import { isKeeperIntent, type KeeperIntent } from "./keeperIntent";
import { isKeeperState, type KeeperState } from "./keeperState";

export type KeeperReply = {
  answer: string;
  state: KeeperState;
  intent: KeeperIntent;
  /** knowledge: from general knowledge, not from the station. */
  basis: "station" | "knowledge";
  topic?: string;
  stationLine?: string;
  action?: { kind: "hour_hop"; hour: SolarHour };
};

const CLIENT_TIMEOUT_MS = 9000;

/**
 * Ask the server keeper (flag on only). Never on the audio path; a slow or
 * failed reply resolves to null and the sheet answers locally instead.
 * The request is raced, never aborted (repo rule: requests are never aborted on
 * Remix fetches).
 */
export async function askKeeper(
  question: string,
  facts: KeeperFacts,
  fetchImpl: typeof fetch = fetch,
  timeoutMs = CLIENT_TIMEOUT_MS,
): Promise<KeeperReply | null> {
  logUsage("keeper_ask");
  const request = fetchImpl("/api/keeper/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, facts }),
  })
    .then(async (response) => {
      const payload = (await response.json().catch(() => null)) as Partial<KeeperReply> | null;
      if (!payload || typeof payload.answer !== "string" || !payload.answer.trim()) {
        return null;
      }
      const action =
        payload.action?.kind === "hour_hop" &&
        ["Dawn", "Midday", "Dusk", "Night"].includes(payload.action.hour)
          ? payload.action
          : undefined;
      return {
        answer: payload.answer.trim(),
        state: isKeeperState(payload.state) ? payload.state : "speaking",
        intent: isKeeperIntent(payload.intent) ? payload.intent : "unknown",
        basis: payload.basis === "knowledge" ? "knowledge" : "station",
        topic: typeof payload.topic === "string" ? payload.topic : undefined,
        stationLine: typeof payload.stationLine === "string" ? payload.stationLine : undefined,
        action,
      } satisfies KeeperReply;
    })
    .catch(() => null);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), timeoutMs);
  });
  try {
    return await Promise.race([request, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
