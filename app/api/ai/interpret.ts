import { json, type ActionFunctionArgs } from "@remix-run/node";
import { clientKey, createTokenBucket } from "~/services/keeper/rateLimit.server";
import { completeJson, isGatewayConfigured } from "~/services/ai/gateway";
import {
  extractPromptIntent,
  resolveTypedIntent,
  wantsMixFromPrompt,
} from "~/services/ai/intent/promptIntent";
import { interpretWithJev } from "~/services/ai/intent/jevInterpret.server";
import { trimEnv } from "~/services/ai/completeFallback";
import type {
  InterpretRequest,
  InterpretResponse,
  InterpretedIntent,
} from "~/types/ai";

export { wantsMixFromPrompt };

/** ~30 interpretations an hour per listener: enough for typed searches, not for scripts. */
const INTERPRET_PER_HOUR = 30;
const interpretBucket = createTokenBucket({
  capacity: INTERPRET_PER_HOUR,
  refillPerHour: INTERPRET_PER_HOUR,
});

function rateLimitResponse(retryAfterMs: number) {
  return json(
    { error: "Too many requests" },
    {
      status: 429,
      headers: {
        "Retry-After": String(Math.max(1, Math.ceil(retryAfterMs / 1000))),
      },
    }
  );
}

export function intentFromExtractor(
  prompt: string,
  fallbackWantsMix = wantsMixFromPrompt(prompt)
): InterpretedIntent {
  const extracted = extractPromptIntent(prompt);
  const resolved = resolveTypedIntent(prompt);
  const confidence =
    extracted.confidence === "none" ? "low" : extracted.confidence;
  return {
    query: resolved.query || prompt.trim(),
    mood: extracted.tags[0] ?? resolved.hour,
    place: null,
    country: extracted.countries[0] ?? null,
    language: extracted.languages[0] ?? null,
    tags: extracted.tags,
    wantsMix: fallbackWantsMix,
    confidence,
  };
}

function normalizeIntent(
  raw: Partial<InterpretedIntent> | null | undefined,
  prompt: string
): InterpretedIntent {
  const fallback = intentFromExtractor(prompt, false);
  const confidence =
    raw?.confidence === "high" ||
    raw?.confidence === "medium" ||
    raw?.confidence === "low"
      ? raw.confidence
      : fallback.confidence;
  return {
    query:
      typeof raw?.query === "string" && raw.query.trim()
        ? raw.query.trim()
        : fallback.query,
    mood: raw?.mood ?? fallback.mood,
    place: raw?.place ?? fallback.place,
    country: raw?.country ?? fallback.country,
    language: raw?.language ?? fallback.language,
    tags: Array.isArray(raw?.tags)
      ? raw.tags.filter((tag): tag is string => typeof tag === "string")
      : fallback.tags,
    wantsMix: resolveTypedIntent(prompt).wantsMix,
    confidence,
  };
}

export async function interpretPrompt(
  body: InterpretRequest
): Promise<InterpretResponse> {
  const prompt = (body.prompt ?? "").trim();
  if (!prompt) {
    return {
      intent: intentFromExtractor("", false),
      fallback: true,
    };
  }

  if (!isGatewayConfigured()) {
    if (trimEnv(process.env.TYPESAFE_API_KEY)) {
      const jev = await interpretWithJev(prompt);
      if (jev) return { intent: jev, fallback: false };
    }
    return { intent: intentFromExtractor(prompt), fallback: true };
  }

  try {
    const raw = await completeJson<Partial<InterpretedIntent>>({
      system: `You interpret live-radio travel requests for Elsewhere.
Return ONLY JSON:
{
  "query": "short catalog search string",
  "mood": "string or null",
  "place": "city or null",
  "country": "country or null",
  "language": "language or null",
  "tags": ["tag"],
  "wantsMix": true,
  "confidence": "high" | "medium" | "low"
}
wantsMix is true only for surprise, take me, anywhere, mix, random, or wander. Place or language plus an hour (dusk, dawn, night, tonight) is catalog search, not a mix.
Keep query useful for Radio Browser search.`,
      user: JSON.stringify({
        prompt,
        currentStationId: body.currentStationId ?? null,
        country: body.country ?? null,
        language: body.language ?? null,
      }),
      timeoutMs: 8_000,
    });
    return { intent: normalizeIntent(raw, prompt), fallback: false };
  } catch {
    return { intent: intentFromExtractor(prompt), fallback: true };
  }
}

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }
  const limit = interpretBucket.take(clientKey(request));
  if (!limit.ok) return rateLimitResponse(limit.retryAfterMs);
  const body = (await request.json()) as InterpretRequest;
  return json(await interpretPrompt(body));
}
