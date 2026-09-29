import { useKeeperStore } from "~/state/keeperStore";
import type { FactKind } from "./keeperMurmur";

const CLIENT_TIMEOUT_MS = 7000;
const seen = new Map<string, Promise<string | null>>();
let inFlight = 0;

/**
 * One grounded fact for a topic, or null. Remembered for the visit and shared
 * between the murmurs and the sheet; a miss is not remembered so it can retry.
 * The keeper shows as "reading" (the searching pose) while any fetch is out.
 */
export async function readKeeperFact(
  stationId: string,
  kind: FactKind,
  name: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string | null> {
  const key = `${kind}:${name.toLowerCase()}`;
  let promise = seen.get(key);
  if (!promise) {
    const store = useKeeperStore.getState();
    inFlight += 1;
    store.setReading(true);
    const request = fetchImpl("/api/keeper/fact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, name }),
    })
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as { fact?: unknown } | null;
        return typeof payload?.fact === "string" && payload.fact.trim() ? payload.fact.trim() : null;
      })
      .catch(() => null);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<null>((resolve) => {
      timer = setTimeout(() => resolve(null), CLIENT_TIMEOUT_MS);
    });
    promise = Promise.race([request, timeout]).finally(() => {
      if (timer) clearTimeout(timer);
      inFlight -= 1;
      if (inFlight <= 0) {
        inFlight = 0;
        useKeeperStore.getState().setReading(false);
      }
    });
    seen.set(key, promise);
    void promise.then((value) => {
      if (!value) seen.delete(key);
    });
  }
  const text = await promise;
  if (text) useKeeperStore.getState().addFact(stationId, { topic: name, kind, text });
  return text;
}
