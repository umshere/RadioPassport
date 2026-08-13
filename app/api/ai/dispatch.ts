import { json, type ActionFunctionArgs } from "@remix-run/node";
import { completeJson, isGatewayConfigured } from "~/services/ai/gateway";
import type {
  DispatchRequest,
  DispatchResponse,
  PlaceDispatch,
} from "~/types/ai";

const CACHE_TTL_MS = 30 * 60 * 1000;
const dispatchCache = new Map<
  string,
  { expiresAt: number; value: PlaceDispatch }
>();

export function dispatchCacheKey(request: DispatchRequest) {
  const hour = request.localTimeISO.slice(0, 13);
  const track = request.track?.raw ?? `${request.track?.artist ?? ""}|${request.track?.title ?? ""}`;
  return `${request.stationId}|${track}|${hour}`;
}

export function templateDispatch(request: DispatchRequest): PlaceDispatch {
  const when = new Date(request.localTimeISO);
  const clock = Number.isNaN(when.getTime())
    ? "this hour"
    : when.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
  const city = request.city || request.country || "the air";
  const track =
    request.track?.artist && request.track?.title
      ? `${request.track.artist} — ${request.track.title}`
      : request.track?.title || request.track?.raw || null;
  return {
    id: dispatchCacheKey(request),
    headline: `Live from ${city}`,
    body: track
      ? `${request.stationName} is carrying ${track} through ${city}.`
      : `${request.stationName} is on the air from ${city}. This station is not sending track titles.`,
    mood: request.tags?.[0] || request.language || "live",
    localLabel: `${clock} in ${city}`,
  };
}

export function rememberDispatch(key: string, value: PlaceDispatch) {
  dispatchCache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, value });
}

export function readDispatch(key: string) {
  const hit = dispatchCache.get(key);
  if (!hit) return null;
  if (hit.expiresAt < Date.now()) {
    dispatchCache.delete(key);
    return null;
  }
  return hit.value;
}

export function clearDispatchCache() {
  dispatchCache.clear();
}

function normalizeDispatch(
  raw: Partial<PlaceDispatch> | null | undefined,
  request: DispatchRequest
): PlaceDispatch {
  const fallback = templateDispatch(request);
  return {
    id: fallback.id,
    headline:
      typeof raw?.headline === "string" && raw.headline.trim()
        ? raw.headline.trim().slice(0, 80)
        : fallback.headline,
    body:
      typeof raw?.body === "string" && raw.body.trim()
        ? raw.body.trim().slice(0, 320)
        : fallback.body,
    mood:
      typeof raw?.mood === "string" && raw.mood.trim()
        ? raw.mood.trim()
        : fallback.mood,
    localLabel:
      typeof raw?.localLabel === "string" && raw.localLabel.trim()
        ? raw.localLabel.trim()
        : fallback.localLabel,
  };
}

export async function writePlaceDispatch(
  request: DispatchRequest
): Promise<DispatchResponse> {
  const key = dispatchCacheKey(request);
  const cached = readDispatch(key);
  if (cached) {
    return { dispatch: cached, cached: true, fallback: false };
  }

  if (!isGatewayConfigured()) {
    const dispatch = templateDispatch(request);
    rememberDispatch(key, dispatch);
    return { dispatch, cached: false, fallback: true };
  }

  try {
    const raw = await completeJson<Partial<PlaceDispatch>>({
      system: `You write one live radio caption for Elsewhere.
Return ONLY JSON:
{ "headline": "≤10 words", "body": "2 sentences, place + local hour + what is on", "mood": "one word", "localLabel": "HH:MM in City" }
No chatbot voice. No hashtags. If there is no track, write about the city and the station, never invent a song.`,
      user: JSON.stringify(request),
      timeoutMs: 8_000,
    });
    const dispatch = normalizeDispatch(raw, request);
    rememberDispatch(key, dispatch);
    return { dispatch, cached: false, fallback: false };
  } catch {
    const dispatch = templateDispatch(request);
    rememberDispatch(key, dispatch);
    return { dispatch, cached: false, fallback: true };
  }
}

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }
  const body = (await request.json()) as DispatchRequest;
  if (!body?.stationId || !body?.stationName) {
    return json(
      { dispatch: null, cached: false, fallback: true } satisfies DispatchResponse
    );
  }
  return json(await writePlaceDispatch(body));
}
