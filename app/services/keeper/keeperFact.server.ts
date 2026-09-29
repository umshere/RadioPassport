import { json } from "@remix-run/node";
import { foldName } from "~/components/keeper/keeperAliases";
import { isKeeperAskEnabled } from "./flag.server";
import { clampWords, defaultKeeperComplete, type KeeperDeps } from "./keeper.server";
import { fetchKnowledgeSnippet, firstSentence } from "./knowledge.server";
import { clientKey, createTokenBucket } from "./rateLimit.server";
import { validateKeeperAnswer } from "./validateKeeperAnswer";

export const FACT_KINDS = ["place", "country", "language", "genre", "artist"] as const;
export type FactKind = (typeof FACT_KINDS)[number];

/** Facts are background reading, so they get their own, roomier bucket. */
const factBucket = createTokenBucket({ capacity: 60, refillPerHour: 60 });

const FACT_WORDS = 26;
const FACT_DEADLINE_MS = 6000;
const FACT_TTL_MS = 30 * 60 * 1000;
const cache = new Map<string, { at: number; value: FactBody }>();

export type FactBody = { fact: string; topic: string; kind: FactKind; source: string };

const FACT_SYSTEM_PROMPT = `You are the Keeper of the Passport on Elsewhere, the dry, kind border clerk of a live radio site. From SNIPPET only, pick the single most surprising or vivid concrete fact about TOPIC, the kind a listener would repeat to a friend.
Voice: headphones on, warm, a little wry, like telling a friend across the desk, never a caption.
Rules, all of them hard:
- One sentence, at most ${FACT_WORDS} words. Plain, warm, a little literary.
- Use only what SNIPPET states. No numbers, dates or names that SNIPPET does not contain.
- Never say or imply anything is playing now. No emoji, links, lists or hashtags. Never use the words discover, seamless, playlist, unlock, explore, widget.
Return ONLY JSON: {"answer": "..."}`;

function query(kind: FactKind, name: string) {
  return kind === "language" && !/language|tongue/i.test(name) ? `${name} language` : name;
}

/** Every number the fact states must be in the snippet it came from. */
function numbersAreInSnippet(fact: string, snippet: string) {
  return (fact.match(/\d[\d,.]*/g) ?? []).every((n) => snippet.includes(n));
}

function reply(body: object, status = 200) {
  return json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/** POST /api/keeper/fact — one grounded, surprising fact about a place, country, language, genre or artist. */
export async function handleKeeperFact(request: Request, deps: KeeperDeps = {}) {
  const env = deps.env ?? process.env;
  const fetchImpl = deps.fetchImpl ?? fetch;
  if (request.method !== "POST") return reply({ error: "method_not_allowed" }, 405);
  if (!isKeeperAskEnabled(env)) return reply({ error: "keeper_off" }, 404);
  const text = await request.text();
  if (text.length > 1024) return reply({ error: "too_large" }, 413);
  let body: { kind?: unknown; name?: unknown };
  try {
    body = JSON.parse(text);
  } catch {
    return reply({ error: "bad_json" }, 400);
  }
  const kind = FACT_KINDS.find((k) => k === body.kind);
  const name = typeof body.name === "string" ? body.name.replace(/\s+/g, " ").trim().slice(0, 60) : "";
  if (!kind || name.length < 2) return reply({ error: "bad_request" }, 400);

  const key = `${kind}:${foldName(name)}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < FACT_TTL_MS) return reply(hit.value);

  const taken = (deps.bucket ?? factBucket).take(clientKey(request), deps.now?.());
  if (!taken.ok) return reply({ fact: null, error: "rate_limited" }, 429);

  const snippet = await fetchKnowledgeSnippet(query(kind, name), kind === "artist" ? "artist" : kind === "genre" ? "genre" : "other", { fetchImpl });
  if (!snippet) return reply({ fact: null });

  let fact = "";
  let source = "snippet";
  try {
    const complete = deps.complete ?? defaultKeeperComplete(env, fetchImpl);
    const raw = await Promise.race([
      complete(FACT_SYSTEM_PROMPT, JSON.stringify({ TOPIC: name, SNIPPET: snippet.text })),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), FACT_DEADLINE_MS)),
    ]);
    const candidate = clampWords(raw, FACT_WORDS);
    const verdict = validateKeeperAnswer(candidate, {
      basis: "knowledge",
      question: name,
      snippet: snippet.text,
      facts: null,
    });
    if (verdict.ok && numbersAreInSnippet(candidate, snippet.text)) {
      fact = candidate;
      source = "snippet+model";
    } else {
      source = `snippet:rejected:${verdict.ok ? "number" : verdict.reason}`;
    }
  } catch (error) {
    // The snippet's own first sentence is the safe fact.
    source = `snippet:${error instanceof Error && error.message === "timeout" ? "timeout" : "error"}`;
  }
  if (!fact) fact = clampWords(firstSentence(snippet.text), FACT_WORDS + 6);
  const value: FactBody = { fact, topic: name, kind, source };
  cache.set(key, { at: Date.now(), value });
  return reply(value);
}
