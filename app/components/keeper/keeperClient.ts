import { logUsage } from "~/utils/usage";
import type { SolarHour } from "~/utils/localTime";
import type { KeeperFacts } from "./keeperFacts";
import { foldName } from "./keeperAliases";
import { subjectCandidate, type StationSubject } from "./keeperSubject";
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
  /** A Wikimedia thumbnail and the article it came from. */
  image?: string;
  pageUrl?: string;
  facts?: string[];
};

const WIKIMEDIA = /^https:\/\/(?:upload|thumb)\.wikimedia\.org\//;
const WIKIPEDIA = /^https:\/\/[a-z-]+\.wikipedia\.org\//;

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
  return (await askKeeperDetailed(question, facts, fetchImpl, timeoutMs)).reply;
}

/** Why an ask came back empty: the line is down, the desk is rationing, or it simply failed. */
export type AskStatus = "ok" | "offline" | "limited" | "failed";

export async function askKeeperDetailed(
  question: string,
  facts: KeeperFacts,
  fetchImpl: typeof fetch = fetch,
  timeoutMs = CLIENT_TIMEOUT_MS,
): Promise<{ reply: KeeperReply | null; status: AskStatus }> {
  logUsage("keeper_ask");
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return { reply: null, status: "offline" };
  }
  let status: AskStatus = "ok";
  const request = fetchImpl("/api/keeper/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, facts }),
  })
    .then(async (response) => {
      const payload = (await response.json().catch(() => null)) as (Partial<KeeperReply> & { error?: string }) | null;
      if (response.status === 429 || payload?.error === "rate_limited") status = "limited";
      if (!payload || typeof payload.answer !== "string" || !payload.answer.trim()) {
        if (status === "ok") status = "failed";
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
        image: typeof payload.image === "string" && WIKIMEDIA.test(payload.image) ? payload.image : undefined,
        pageUrl: typeof payload.pageUrl === "string" && WIKIPEDIA.test(payload.pageUrl) ? payload.pageUrl : undefined,
        facts: Array.isArray(payload.facts)
          ? payload.facts.filter((f): f is string => typeof f === "string").slice(0, 4)
          : undefined,
      } satisfies KeeperReply;
    })
    .catch(() => {
      // A request that cannot even leave: the line to the notebook is down.
      status = "offline";
      return null;
    });
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => {
      if (status === "ok") status = "failed";
      resolve(null);
    }, timeoutMs);
  });
  try {
    const reply = await Promise.race([request, timeout]);
    return { reply, status: reply && status === "ok" ? "ok" : status };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export type HomeAskReply = { choice: string; hour: string | null };

/**
 * The arrival field's question to Jev, via the server. Null on any failure,
 * a missing key or a slow reply (raced, never aborted): the home's own rules
 * answer instead, so the field never waits long and never breaks.
 */
export async function askHomeKeeper(
  question: string,
  fetchImpl: typeof fetch = fetch,
  timeoutMs = 2500,
): Promise<HomeAskReply | null> {
  logUsage("keeper_ask");
  const request = fetchImpl("/api/keeper/home", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  })
    .then(async (response) => {
      const payload = (await response.json().catch(() => null)) as
        | { source?: string; choice?: unknown; hour?: unknown }
        | null;
      if (!payload || payload.source !== "jev" || typeof payload.choice !== "string") return null;
      return { choice: payload.choice, hour: typeof payload.hour === "string" ? payload.hour : null };
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

const subjectCache = new Map<string, Promise<StationSubject | null>>();

/**
 * Is the station named for a person or group? One quiet lookup per station
 * name; null (nothing offered) on any failure, a missing flag or a slow reply.
 */
export function findSubject(
  station: { name: string; country?: string | null; city?: string | null },
  fetchImpl: typeof fetch = fetch,
  timeoutMs = 4000,
): Promise<StationSubject | null> {
  const candidate = subjectCandidate(station.name, [station.country, station.city]);
  if (!candidate) return Promise.resolve(null);
  const key = foldName(candidate);
  const known = subjectCache.get(key);
  if (known) return known;
  const request = fetchImpl("/api/keeper/subject", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: station.name, country: station.country ?? null, city: station.city ?? null }),
  })
    .then(async (response) => {
      const payload = (await response.json().catch(() => null)) as { subject?: Partial<StationSubject> | null } | null;
      const subject = payload?.subject;
      if (!subject || typeof subject.title !== "string" || !subject.title) return null;
      return {
        title: subject.title,
        description: typeof subject.description === "string" ? subject.description : "",
        image: typeof subject.image === "string" && WIKIMEDIA.test(subject.image) ? subject.image : null,
        pageUrl: typeof subject.pageUrl === "string" && WIKIPEDIA.test(subject.pageUrl) ? subject.pageUrl : null,
      } satisfies StationSubject;
    })
    .catch(() => null);
  const raced = Promise.race([request, new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs))]);
  subjectCache.set(key, raced);
  // A miss is not remembered: a later visit to this station tries again.
  raced.then((value) => {
    if (!value) subjectCache.delete(key);
  });
  return raced;
}
