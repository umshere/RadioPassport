import { json } from "@remix-run/node";
import {
  answerLocally,
  sanitizeKeeperFacts,
  type KeeperFacts,
} from "~/components/keeper/keeperFacts";
import { KEEPER_QUESTION_MAX, type KeeperIntent } from "~/components/keeper/keeperIntent";
import type { KeeperState } from "~/components/keeper/keeperState";
import { completeJsonPreferringGateway, trimEnv } from "~/services/ai/completeFallback";
import { getOpenRouterModelRotation } from "~/services/ai/providers/openRouterModels";
import { parseJsonObjectFromText } from "~/services/ai/providers/providerUtils";
import type { SolarHour } from "~/utils/localTime";
import { isKeeperAskEnabled } from "./flag.server";
import { classifyKeeperQuestion } from "./jev.server";
import { extractTopic, isNowPlayingQuestion, looksLikeInjection } from "~/components/keeper/keeperTopic";
import { resolveAlias } from "~/components/keeper/keeperAliases";
import { KNOWLEDGE_SYSTEM_PROMPT, fetchKnowledgeSnippet, firstSentence } from "./knowledge.server";
import { validateKeeperAnswer } from "./validateKeeperAnswer";
import { clientKey, keeperBucket, type TokenBucket } from "./rateLimit.server";

/** Request bodies above this are refused before parsing. */
export const KEEPER_BODY_MAX = 8 * 1024;
export const KEEPER_ANSWER_WORDS = 70;
const MODEL_TIMEOUT_MS = 4500;
/** Knowledge answers give up on the model here and use the snippet's sentence. */
const KNOWLEDGE_DEADLINE_MS = 4000;

export const KEEPER_SYSTEM_PROMPT = `You are the keeper: the night clerk at the desk of a live radio station on Elsewhere, a site for hearing live radio from somewhere it is another hour.
Rules, all of them hard:
- Answer ONLY from the FACTS JSON you are given. Nothing you remember from elsewhere counts.
- If the answer is not in FACTS, say plainly that you don't know from here.
- NEVER invent or guess a track title, an artist, a programme, or anything about the station that FACTS does not state. If FACTS.track is null, the station sends no titles: say so.
- At most 60 words. Warm, plain, a little literary. One or two sentences.
- No emoji, no hashtags, no lists. Never use the words discover, seamless, playlist, unlock, explore, widget.
Return ONLY JSON: {"answer": "..."}`;

export type KeeperDeps = {
  env?: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
  bucket?: TokenBucket;
  now?: () => number;
  /** Model call for grounded prose; defaults to the provider chain. */
  complete?: (system: string, user: string) => Promise<string>;
};

type KeeperJson = {
  answer?: string;
  state?: KeeperState;
  intent?: KeeperIntent | `knowledge_${string}`;
  source?: string;
  basis?: "station" | "knowledge";
  topic?: string;
  stationLine?: string;
  action?: { kind: "hour_hop"; hour: SolarHour };
  error?: string;
};

function reply(body: KeeperJson, status = 200, headers?: HeadersInit) {
  return json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

type Parsed =
  | { ok: true; question: string; raw: Record<string, unknown> }
  | { ok: false; response: Response };

/** Method, flag, size, JSON, question — the checks both routes share. */
async function parseQuestion(request: Request, env: NodeJS.ProcessEnv): Promise<Parsed> {
  if (request.method !== "POST") {
    return { ok: false, response: reply({ error: "method_not_allowed" }, 405) };
  }
  if (!isKeeperAskEnabled(env)) {
    return { ok: false, response: reply({ error: "keeper_off" }, 404) };
  }
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > KEEPER_BODY_MAX) {
    return { ok: false, response: reply({ error: "too_large" }, 413) };
  }
  const text = await request.text();
  if (text.length > KEEPER_BODY_MAX) {
    return { ok: false, response: reply({ error: "too_large" }, 413) };
  }
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, response: reply({ error: "bad_json" }, 400) };
  }
  if (!raw || typeof raw !== "object") {
    return { ok: false, response: reply({ error: "bad_json" }, 400) };
  }
  const body = raw as Record<string, unknown>;
  const question =
    typeof body.question === "string" ? body.question.replace(/\s+/g, " ").trim() : "";
  if (!question) return { ok: false, response: reply({ error: "no_question" }, 400) };
  if (question.length > KEEPER_QUESTION_MAX) {
    return { ok: false, response: reply({ error: "question_too_long" }, 400) };
  }
  return { ok: true, question, raw: body };
}

function limited(request: Request, deps: KeeperDeps): Response | null {
  const bucket = deps.bucket ?? keeperBucket;
  const taken = bucket.take(clientKey(request), deps.now?.());
  if (taken.ok) return null;
  return reply(
    {
      answer: "That’s enough questions for this hour. The radio is still on.",
      state: "sleeping",
      error: "rate_limited",
    },
    429,
    { "Retry-After": String(Math.ceil(taken.retryAfterMs / 1000)) },
  );
}

/** POST /api/keeper/route — classify only. */
export async function handleKeeperRoute(request: Request, deps: KeeperDeps = {}) {
  const env = deps.env ?? process.env;
  const parsed = await parseQuestion(request, env);
  if (!parsed.ok) return parsed.response;
  const blocked = limited(request, deps);
  if (blocked) return blocked;
  const routing = await classifyKeeperQuestion(parsed.question, {
    env,
    fetchImpl: deps.fetchImpl,
  });
  return reply({ intent: routing.intent, source: routing.source, state: "thinking" });
}

/** Intents the facts answer outright; no model is asked. */
const LOCAL_INTENTS = new Set<KeeperIntent>([
  "track",
  "language",
  "city",
  "station",
  "hour_hop",
  "off_topic",
]);

export function clampWords(text: string, max = KEEPER_ANSWER_WORDS) {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  if (words.length <= max) return words.join(" ");
  const cut = words.slice(0, max).join(" ");
  // Prefer ending on a whole sentence over a mid-thought ellipsis.
  const sentenceEnd = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
  if (sentenceEnd > cut.length * 0.4) return cut.slice(0, sentenceEnd + 1);
  return `${cut.replace(/[,;:]$/, "")}…`;
}

/**
 * A model answer is kept only if everything it quotes is in the facts, and
 * it does not name a song when the station sends none. Otherwise the keeper
 * falls back to its local line.
 */
export function answerIsGrounded(answer: string, facts: KeeperFacts): boolean {
  const haystack = JSON.stringify(facts).toLowerCase();
  const quoted = answer.match(/[“"]([^”"]{2,})[”"]/g) ?? [];
  for (const chunk of quoted) {
    const inner = chunk.slice(1, -1).trim().toLowerCase();
    if (inner && !haystack.includes(inner)) return false;
  }
  if (!facts.track && /\b(song|track|tune|title)\b[^.]*\b(called|named|titled)\b/i.test(answer)) {
    return false;
  }
  return true;
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("timeout")), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * The provider chain the rest of the app uses: Heuristics gateway, then
 * Gemini (completeJsonPreferringGateway), then OpenRouter's rotation.
 */
export function defaultKeeperComplete(env: NodeJS.ProcessEnv, fetchImpl: typeof fetch) {
  return async (system: string, user: string): Promise<string> => {
    try {
      const { value } = await completeJsonPreferringGateway<{ answer?: string }>({
        system,
        user,
        timeoutMs: MODEL_TIMEOUT_MS,
        fetchImpl,
        noThinking: true,
      });
      if (typeof value?.answer === "string" && value.answer.trim()) return value.answer;
    } catch {
      // fall through to OpenRouter
    }
    const key = trimEnv(env.OPENROUTER_API_KEY);
    if (!key) throw new Error("no provider");
    for (const model of getOpenRouterModelRotation(env).slice(0, 2)) {
      try {
        const text = await withTimeout(
          fetchImpl("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${key}`,
              "HTTP-Referer": "https://elsewheremusic.com",
              "X-Title": "Elsewhere",
            },
            body: JSON.stringify({
              model,
              temperature: 0.4,
              messages: [
                { role: "system", content: system },
                { role: "user", content: user },
              ],
            }),
          }).then(async (response) => {
            if (!response.ok) throw new Error(`openrouter ${response.status}`);
            const payload = (await response.json()) as {
              choices?: Array<{ message?: { content?: string } }>;
            };
            return payload.choices?.[0]?.message?.content ?? "";
          }),
          MODEL_TIMEOUT_MS,
        );
        const parsed = parseJsonObjectFromText(text) as { answer?: string } | null;
        if (typeof parsed?.answer === "string" && parsed.answer.trim()) return parsed.answer;
      } catch {
        // next model
      }
    }
    throw new Error("no answer");
  };
}

/** POST /api/keeper/ask — classify, then answer from the facts. */
export async function handleKeeperAsk(request: Request, deps: KeeperDeps = {}) {
  const env = deps.env ?? process.env;
  const fetchImpl = deps.fetchImpl ?? fetch;
  const parsed = await parseQuestion(request, env);
  if (!parsed.ok) return parsed.response;
  const facts = sanitizeKeeperFacts(parsed.raw.facts);
  if (!facts) return reply({ error: "bad_facts" }, 400);
  const blocked = limited(request, deps);
  if (blocked) return blocked;

  // A named topic ("Who is Ilayaraja?", "what's fado?") is answered from
  // general knowledge and labelled as such. Anything that smells of the air
  // right now — or of an injection — stays strictly on the station's facts.
  const strict = looksLikeInjection(parsed.question) || isNowPlayingQuestion(parsed.question);
  const topic = strict ? null : extractTopic(parsed.question, facts.station.tags);
  if (topic) {
    const snippet = await fetchKnowledgeSnippet(topic.canonical, topic.kind, { fetchImpl });
    const onAirArtist = facts.track?.artist ?? null;
    const stationLine =
      onAirArtist && resolveAlias(onAirArtist) === resolveAlias(topic.canonical)
        ? `The station’s title names ${topic.canonical}.`
        : undefined;
    const knowledge = (answer: string, source: string) =>
      reply({
        answer,
        state: "speaking",
        intent: `knowledge_${topic.kind}`,
        basis: "knowledge",
        topic: topic.canonical,
        ...(stationLine ? { stationLine } : {}),
        source,
      });
    const fallback = snippet
      ? firstSentence(snippet.text)
      : `I don’t know enough about ${topic.canonical} to say from this desk.`;
    try {
      const complete = deps.complete ?? defaultKeeperComplete(env, fetchImpl);
      const raw = await withTimeout(
        complete(
        KNOWLEDGE_SYSTEM_PROMPT,
        JSON.stringify({
          TOPIC: topic.canonical,
          KIND: topic.kind,
          SNIPPET: snippet?.text ?? null,
          QUESTION: parsed.question,
        }),
        ),
        KNOWLEDGE_DEADLINE_MS,
      );
      const answer = clampWords(raw);
      const verdict = validateKeeperAnswer(answer, {
        basis: "knowledge",
        question: parsed.question,
        snippet: snippet?.text ?? null,
        facts: null,
      });
      return knowledge(verdict.ok ? answer : fallback, verdict.ok ? "knowledge+model" : "knowledge+fallback");
    } catch {
      return knowledge(fallback, "knowledge+fallback");
    }
  }

  const routing = looksLikeInjection(parsed.question)
    ? { intent: "track" as KeeperIntent, source: "rules" }
    : await classifyKeeperQuestion(parsed.question, { env, fetchImpl });
  const local = answerLocally(routing.intent, facts);
  const answerLocal = () =>
    reply({
      answer: local.text,
      state: "speaking",
      intent: routing.intent,
      source: `${routing.source}+facts`,
      ...(local.action ? { action: local.action } : {}),
    });

  // No title sent: the artist is unknowable, and no model may guess one.
  if (LOCAL_INTENTS.has(routing.intent) || (routing.intent === "artist" && !facts.track)) {
    return answerLocal();
  }

  try {
    const complete = deps.complete ?? defaultKeeperComplete(env, fetchImpl);
    const raw = await complete(
      KEEPER_SYSTEM_PROMPT,
      JSON.stringify({ FACTS: facts, QUESTION: parsed.question }),
    );
    const answer = clampWords(raw);
    if (!answer || !answerIsGrounded(answer, facts)) return answerLocal();
    return reply({
      answer,
      state: "speaking",
      intent: routing.intent,
      source: `${routing.source}+model`,
    });
  } catch {
    return answerLocal();
  }
}
