import {
  isKeeperIntent,
  KEEPER_INTENT_CRITERIA,
  ruleClassify,
  type KeeperIntent,
} from "~/components/keeper/keeperIntent";
import { trimEnv } from "~/services/ai/completeFallback";

/**
 * TypeSafe System One — Jev — as the keeper's router. Wire format per
 * https://docs.typesafe.ai/api.md (checked 2026-09-28):
 *
 *   POST https://api.typesafe.ai/v1/systemone
 *   Authorization: Bearer <TYPESAFE_API_KEY>
 *   { "model": "jev-latest", "state": <string|object>,
 *     "questions": { "<id>": { "type": "choice", "instructions": "…",
 *                               "criteria": { "<option>": "<description>" } } } }
 *   → { "model": "jev-1.x", "answers": { "<id>": { "type": "choice",
 *        "choice": "<option>", "probabilities": {…}, "confidence": 0.82 } },
 *       "usage": {…} }
 *
 * Everything Jev-specific lives in `jevDecide()`; if the wire format moves,
 * that is the one function to change. The key is read server-side only and
 * never logged or echoed.
 */
export const JEV_URL = "https://api.typesafe.ai/v1/systemone";
export const JEV_MODEL = "jev-latest";
export const JEV_TIMEOUT_MS = 1200;
/** Below this, Jev's pick yields to the keyword rules when they have one. */
export const JEV_MIN_CONFIDENCE = 0.35;

export type JevDecision = {
  intent: KeeperIntent;
  confidence: number | null;
};

export function jevRequestBody(question: string) {
  return {
    model: JEV_MODEL,
    state: {
      setting:
        "A listener is hearing a live radio station in another city and asks the station's keeper a question.",
      question,
    },
    questions: {
      intent: {
        type: "choice",
        instructions:
          "What is the listener asking the keeper about? Pick the closest option.",
        criteria: KEEPER_INTENT_CRITERIA,
      },
    },
  };
}

/** One Jev call. Throws on any failure; the caller decides the fallback. */
export async function jevDecide(
  question: string,
  options: { apiKey: string; fetchImpl?: typeof fetch },
): Promise<JevDecision> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchImpl(JEV_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${options.apiKey}`,
    },
    body: JSON.stringify(jevRequestBody(question)),
  });
  if (!response.ok) {
    // Status only: the body may echo request details.
    throw new Error(`jev ${response.status}`);
  }
  const payload = (await response.json()) as {
    answers?: { intent?: { choice?: unknown; confidence?: unknown } };
  };
  const answer = payload.answers?.intent;
  if (!answer || !isKeeperIntent(answer.choice)) {
    throw new Error("jev returned no usable choice");
  }
  const confidence =
    typeof answer.confidence === "number" && Number.isFinite(answer.confidence)
      ? answer.confidence
      : null;
  return { intent: answer.choice, confidence };
}

export type KeeperRouting = {
  intent: KeeperIntent;
  source: "jev" | "rules";
  confidence: number | null;
};

/**
 * Classify a question: Jev when a key is set and it answers within
 * JEV_TIMEOUT_MS, else the keyword rules. The Jev request is raced, never
 * aborted — a late reply is simply ignored.
 */
export async function classifyKeeperQuestion(
  question: string,
  options: {
    env?: NodeJS.ProcessEnv;
    fetchImpl?: typeof fetch;
    timeoutMs?: number;
  } = {},
): Promise<KeeperRouting> {
  const rules: KeeperRouting = {
    intent: ruleClassify(question),
    source: "rules",
    confidence: null,
  };
  const apiKey = trimEnv((options.env ?? process.env).TYPESAFE_API_KEY);
  if (!apiKey) return rules;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), options.timeoutMs ?? JEV_TIMEOUT_MS);
  });
  try {
    const decision = await Promise.race([
      jevDecide(question, { apiKey, fetchImpl: options.fetchImpl }).catch(() => null),
      timeout,
    ]);
    if (!decision) return rules;
    if (
      decision.confidence !== null &&
      decision.confidence < JEV_MIN_CONFIDENCE &&
      rules.intent !== "unknown"
    ) {
      return rules;
    }
    return { intent: decision.intent, source: "jev", confidence: decision.confidence };
  } finally {
    if (timer) clearTimeout(timer);
  }
}
