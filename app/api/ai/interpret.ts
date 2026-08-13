import { json, type ActionFunctionArgs } from "@remix-run/node";
import { extractPromptIntent } from "~/services/ai/intent/promptIntent";
import { completeJson, isGatewayConfigured } from "~/services/ai/gateway";
import type {
  InterpretRequest,
  InterpretResponse,
  InterpretedIntent,
} from "~/types/ai";

const MIX_PATTERN =
  /\b(mix|surprise|take me|anywhere|itinerary|world|elsewhere|dj|wander|random|tonight)\b/i;

export function wantsMixFromPrompt(prompt: string) {
  return MIX_PATTERN.test(prompt);
}

export function intentFromExtractor(
  prompt: string,
  fallbackWantsMix = wantsMixFromPrompt(prompt)
): InterpretedIntent {
  const extracted = extractPromptIntent(prompt);
  const confidence =
    extracted.confidence === "none" ? "low" : extracted.confidence;
  return {
    query: prompt.trim(),
    mood: extracted.tags[0] ?? null,
    place: null,
    country: extracted.countries[0] ?? null,
    language: extracted.languages[0] ?? null,
    tags: extracted.tags,
    wantsMix: fallbackWantsMix || extracted.confidence === "none",
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
    wantsMix:
      typeof raw?.wantsMix === "boolean" ? raw.wantsMix : fallback.wantsMix,
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
wantsMix is true when the user wants a curated itinerary, surprise, world mix, or a vibe sentence rather than one station.
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
  const body = (await request.json()) as InterpretRequest;
  return json(await interpretPrompt(body));
}
