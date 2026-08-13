import { json, type LoaderFunctionArgs } from "@remix-run/node";
import type { TrackTriviaResponse, TrackTrivia } from "~/types/trivia";
import { resolveTrackImage } from "~/utils/imageSearch";
import { getOpenRouterTriviaModelRotation } from "~/services/ai/providers/openRouterModels";
import { parseJsonObjectFromText } from "~/services/ai/providers/providerUtils";
import {
  completeGeminiJson,
  getGeminiModel,
  hasGeminiKey,
  trimEnv,
} from "~/services/ai/completeFallback";
import { completeJson, isGatewayConfigured } from "~/services/ai/gateway";

const MUSICBRAINZ_BASE = "https://musicbrainz.org/ws/2";
const USER_AGENT =
  "radio-passport/1.0 (https://github.com/umshere/RadioPassport)";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const AI_CACHE_TTL_MS = 60 * 60 * 1000;
const AI_PROVIDER = trimEnv(process.env.AI_PROVIDER).toLowerCase() || "openai";

const OPENAI_MODEL = trimEnv(process.env.OPENAI_MODEL) || "gpt-4o-mini";
const GEMINI_MODEL = getGeminiModel();
const OLLAMA_MODEL = trimEnv(process.env.OLLAMA_MODEL) || "radio-passport";
const OLLAMA_URL = trimEnv(process.env.OLLAMA_URL);

const AI_SYSTEM_PROMPT = `You are a music trivia assistant.
Return JSON only with:
- summary: 1 or 2 short sentences (max 34 words total), high-confidence, factual, written to sound engaging.
- facts: 4 items, each { label, value } (short, factual).
- cleanTitle: cleaned song title for search (no extra tags like "lyrics", "HQ", "live").
- cleanArtist: cleaned artist name for search (no extra tags).
Prioritize: release year, album, genre/style, artist origin, notable chart info, writers/producers, or awards.
If unsure, leave the field empty rather than guessing.`;

type CacheEntry = {
  expiresAt: number;
  value: TrackTriviaResponse;
};

const triviaCache = new Map<string, CacheEntry>();

function getCacheKey(
  source: string,
  title?: string | null,
  artist?: string | null,
) {
  return `${source}:${(title ?? "").toLowerCase().trim()}|${(artist ?? "")
    .toLowerCase()
    .trim()}`;
}

function escapeQueryValue(value: string) {
  return value.replace(/"/g, '\\"').replace(/:/g, " ").trim();
}

function cleanSearchTerm(value: string): string {
  const withoutBrackets = value.replace(/\[[^\]]*\]|\([^\)]*\)/g, " ");
  const withoutNoise = withoutBrackets.replace(
    /\b(hq|lyrics?|lyric video|official|video|audio|remaster(ed)?|live|full|mix|version|feat\.?|ft\.?|featuring|cover|performance|m\/v|mv|hd|4k|8k|explicit|clean)\b/gi,
    " ",
  );
  return withoutNoise
    .replace(/[“”"']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildSearchQuery(title?: string | null, artist?: string | null) {
  const safeTitle = title ? cleanSearchTerm(title) : "";
  const safeArtist = artist ? cleanSearchTerm(artist) : "";
  return `${safeArtist} ${safeTitle}`.trim();
}

function normalizeTriviaPayload(
  raw: unknown,
  source: "free" | "ai",
  options?: { links?: TrackTrivia["links"]; imageUrl?: string | null },
): TrackTrivia | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const summary = typeof obj.summary === "string" ? obj.summary.trim() : "";
  const cleanTitle =
    typeof obj.cleanTitle === "string" ? obj.cleanTitle.trim() : null;
  const cleanArtist =
    typeof obj.cleanArtist === "string" ? obj.cleanArtist.trim() : null;
  const factsRaw = Array.isArray(obj.facts) ? obj.facts : [];
  const facts = factsRaw
    .map((fact) => {
      if (!fact || typeof fact !== "object") return null;
      const entry = fact as Record<string, unknown>;
      const label = typeof entry.label === "string" ? entry.label.trim() : "";
      const value = typeof entry.value === "string" ? entry.value.trim() : "";
      if (!label || !value) return null;
      return { label, value };
    })
    .filter(Boolean) as { label: string; value: string }[];

  if (!summary && facts.length === 0) return null;

  return {
    summary,
    facts: facts.slice(0, 4),
    links: options?.links,
    imageUrl: options?.imageUrl ?? null,
    cleanTitle,
    cleanArtist,
    source,
    fetchedAt: new Date().toISOString(),
  };
}

type AiTriviaResult = {
  trivia: TrackTrivia | null;
  error?: string;
};

function parseJsonFromText(text: string): unknown | null {
  try {
    return parseJsonObjectFromText(text);
  } catch {
    return null;
  }
}

async function fetchOpenAiTrivia(prompt: string): Promise<AiTriviaResult> {
  const apiKey = process.env.OPENAI_API_KEY ?? "";
  if (!apiKey) return { trivia: null, error: "Missing OPENAI_API_KEY." };
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [
        { role: "system", content: AI_SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.4,
    }),
  });
  if (!response.ok) {
    return {
      trivia: null,
      error: `OpenAI request failed (${response.status}).`,
    };
  }
  const payload = await response.json();
  const text = payload?.choices?.[0]?.message?.content;
  if (!text) return { trivia: null, error: "OpenAI response was empty." };
  const parsed = parseJsonFromText(text);
  return { trivia: normalizeTriviaPayload(parsed, "ai") };
}

async function fetchOpenRouterTrivia(prompt: string): Promise<AiTriviaResult> {
  const apiKey = process.env.OPENROUTER_API_KEY ?? "";
  if (!apiKey) return { trivia: null, error: "Missing OPENROUTER_API_KEY." };
  const modelsToTry = getOpenRouterTriviaModelRotation();

  let lastError = "OpenRouter request failed.";
  for (const model of modelsToTry) {
    let response: Response;
    try {
      const fetchPromise = fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: AI_SYSTEM_PROMPT },
              { role: "user", content: prompt },
            ],
            temperature: 0.4,
          }),
        },
      );
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Model ${model} timed out`)), 12_000),
      );
      response = await Promise.race([fetchPromise, timeoutPromise]);
    } catch (err) {
      lastError = `OpenRouter request failed for ${model}: ${
        err instanceof Error ? err.message : String(err)
      }`;
      continue;
    }
    if (!response.ok) {
      const errorText = await response.text();
      const trimmed = errorText.trim().slice(0, 200);
      lastError = `OpenRouter request failed (${response.status}) for ${model}. ${trimmed}`;
      continue;
    }

    const payload = await response.json();
    const text = payload?.choices?.[0]?.message?.content;
    if (!text) {
      lastError = `OpenRouter response was empty for ${model}.`;
      continue;
    }
    const parsed = parseJsonFromText(text);
    const trivia = normalizeTriviaPayload(parsed, "ai");
    if (trivia) return { trivia };
    lastError = `OpenRouter response parse failed for ${model}.`;
  }

  return { trivia: null, error: lastError };
}

async function fetchHeuristicsTrivia(prompt: string): Promise<AiTriviaResult> {
  if (!isGatewayConfigured()) {
    return { trivia: null, error: "Heuristics gateway is not configured." };
  }
  try {
    const parsed = await completeJson<unknown>({
      system: AI_SYSTEM_PROMPT,
      user: prompt,
      timeoutMs: 8_000,
    });
    return { trivia: normalizeTriviaPayload(parsed, "ai") };
  } catch (error) {
    return {
      trivia: null,
      error:
        error instanceof Error
          ? error.message
          : "Heuristics trivia request failed.",
    };
  }
}

async function fetchGeminiTrivia(prompt: string): Promise<AiTriviaResult> {
  if (!hasGeminiKey()) return { trivia: null, error: "Missing GEMINI_API_KEY." };
  try {
    const parsed = await completeGeminiJson<unknown>({
      system: AI_SYSTEM_PROMPT,
      user: prompt,
      timeoutMs: 8_000,
    });
    return { trivia: normalizeTriviaPayload(parsed, "ai") };
  } catch (error) {
    return {
      trivia: null,
      error:
        error instanceof Error
          ? error.message
          : `Gemini ${GEMINI_MODEL} request failed.`,
    };
  }
}

async function fetchOllamaTrivia(prompt: string): Promise<AiTriviaResult> {
  if (!OLLAMA_URL) return { trivia: null, error: "Missing OLLAMA_URL." };
  const response = await fetch(
    `${OLLAMA_URL.replace(/\/$/, "")}/api/generate`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: `${AI_SYSTEM_PROMPT}\n\n${prompt}`,
        format: "json",
        stream: false,
      }),
    },
  );
  if (!response.ok) {
    return {
      trivia: null,
      error: `Ollama request failed (${response.status}).`,
    };
  }
  const payload = await response.json();
  const text = payload?.response ?? payload?.output ?? payload;
  if (!text || typeof text !== "string") {
    return { trivia: null, error: "Ollama response was empty." };
  }
  const parsed = parseJsonFromText(text);
  return { trivia: normalizeTriviaPayload(parsed, "ai") };
}

async function fetchAiTrivia(
  title?: string | null,
  artist?: string | null,
  promptOverride?: string,
) {
  const promptParts = ["Track info request:"];
  if (title) promptParts.push(`Title: ${title}`);
  if (artist) promptParts.push(`Artist: ${artist}`);
  promptParts.push("Return JSON only.");
  const prompt = promptOverride ?? promptParts.join("\n");

  // Build a fallback chain based on configured provider and available keys
  type ProviderFn = () => Promise<AiTriviaResult>;
  const chain: ProviderFn[] = [];
  const queuedProviders = new Set<string>();

  const hasOpenRouter = Boolean(trimEnv(process.env.OPENROUTER_API_KEY));
  const hasOpenAI = Boolean(trimEnv(process.env.OPENAI_API_KEY));
  const hasGemini = hasGeminiKey();
  const hasOllama = Boolean(OLLAMA_URL);
  const hasHeuristics = isGatewayConfigured();

  const pushIf = (name: string, cond: boolean, fn: ProviderFn) => {
    if (!cond || queuedProviders.has(name)) return;
    queuedProviders.add(name);
    chain.push(fn);
  };

  const enqueueByName = (name: string) => {
    const n = name.trim().toLowerCase();
    if (n === "heuristics")
      pushIf(n, hasHeuristics, () => fetchHeuristicsTrivia(prompt));
    else if (n === "gemini")
      pushIf(n, hasGemini, () => fetchGeminiTrivia(prompt));
    else if (n === "openrouter")
      pushIf(n, hasOpenRouter, () => fetchOpenRouterTrivia(prompt));
    else if (n === "openai")
      pushIf(n, hasOpenAI, () => fetchOpenAiTrivia(prompt));
    else if (n === "ollama")
      pushIf(n, hasOllama, () => fetchOllamaTrivia(prompt));
  };

  // Flash locally when the gateway is up. Gemini 2.5 Flash next (free, better than Lite).
  enqueueByName("heuristics");
  enqueueByName(AI_PROVIDER);
  ["gemini", "openrouter", "openai", "ollama"].forEach(enqueueByName);

  // Ensure at least one option (even if keys are missing, we'll get an error which we surface)
  if (chain.length === 0) {
    // No keys present; try free/preferred sources before Gemini to return clear errors.
    chain.push(
      () => fetchOpenRouterTrivia(prompt),
      () => fetchOpenAiTrivia(prompt),
      () => fetchOllamaTrivia(prompt),
      () => fetchGeminiTrivia(prompt),
    );
  }

  const errors: string[] = [];
  for (const attempt of chain) {
    try {
      const result = await attempt();
      if (result.trivia) return result; // success
      if (result.error) errors.push(result.error);
    } catch (err) {
      errors.push((err as Error)?.message ?? String(err));
    }
  }

  return {
    trivia: null,
    error: errors.join(" | ") || "All AI providers failed.",
  };
}

function pickReleaseYear(date?: string | null) {
  if (!date) return null;
  const match = date.match(/\d{4}/);
  return match ? match[0] : null;
}

function formatDuration(ms?: number | null) {
  if (!ms || ms <= 0) return null;
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
      },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function fetchMusicBrainzEnrichment(
  title?: string | null,
  artist?: string | null,
): Promise<{
  facts: TrackTrivia["facts"];
  links: TrackTrivia["links"];
  imageUrl: string | null;
}> {
  const queryParts = [];
  if (title) queryParts.push(`recording:"${escapeQueryValue(title)}"`);
  if (artist) queryParts.push(`artist:"${escapeQueryValue(artist)}"`);
  const query = queryParts.join(" AND ");
  if (!query) {
    return { facts: [], links: [], imageUrl: null };
  }

  const searchUrl = new URL(`${MUSICBRAINZ_BASE}/recording/`);
  searchUrl.searchParams.set("query", query);
  searchUrl.searchParams.set("fmt", "json");
  searchUrl.searchParams.set("limit", "1");
  searchUrl.searchParams.set("inc", "artists+releases+tags");

  const searchData = await fetchJson<{
    recordings?: Array<{
      id?: string;
      title?: string;
      length?: number;
      "first-release-date"?: string;
      releases?: Array<{ id?: string; title?: string; date?: string }>;
      "artist-credit"?: Array<{
        name?: string;
        artist?: { id?: string; name?: string };
      }>;
      tags?: Array<{ name: string }>;
    }>;
  }>(searchUrl.toString());

  const recording = searchData?.recordings?.[0];
  if (!recording) {
    const fallbackQuery = buildSearchQuery(title ?? "", artist ?? "");
    const fallbackYoutubeUrl = fallbackQuery
      ? `https://www.youtube.com/results?search_query=${encodeURIComponent(
          fallbackQuery,
        )}`
      : null;
    const fallbackWikipediaUrl = fallbackQuery
      ? `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(
          fallbackQuery,
        )}`
      : null;
    return {
      facts: [],
      links: [
        fallbackYoutubeUrl
          ? {
              label: "YouTube",
              url: fallbackYoutubeUrl,
              kind: "youtube" as const,
            }
          : null,
        fallbackWikipediaUrl
          ? { label: "Wiki", url: fallbackWikipediaUrl, kind: "info" as const }
          : null,
      ].filter(Boolean) as TrackTrivia["links"],
      imageUrl: await resolveTrackImage(title ?? "", artist ?? ""),
    };
  }

  const artistCredit = recording["artist-credit"]?.[0];
  const artistName =
    artistCredit?.name ??
    artistCredit?.artist?.name ??
    artist ??
    "Unknown artist";
  const artistId = artistCredit?.artist?.id ?? null;
  const release = recording.releases?.[0];
  const releaseTitle = release?.title ?? null;
  const releaseId = release?.id ?? null;
  const recordingId = recording.id ?? null;
  const releaseDate = recording["first-release-date"] ?? release?.date ?? null;
  const releaseYear = pickReleaseYear(releaseDate);
  const duration = formatDuration(recording.length ?? null);

  let artistArea: string | null = null;
  let artistTags: string[] = [];
  if (artistId) {
    const artistUrl = `${MUSICBRAINZ_BASE}/artist/${artistId}?fmt=json&inc=tags`;
    const artistData = await fetchJson<{
      area?: { name?: string };
      country?: string;
      tags?: Array<{ name: string }>;
    }>(artistUrl);
    artistArea = artistData?.area?.name ?? artistData?.country ?? null;
    artistTags = (artistData?.tags ?? []).map((tag) => tag.name).slice(0, 3);
  }

  const recordingTags = (recording.tags ?? [])
    .map((tag) => tag.name)
    .slice(0, 3);
  const tags = [...recordingTags, ...artistTags].filter(Boolean);

  const facts: TrackTrivia["facts"] = [];
  if (releaseTitle) facts.push({ label: "Release", value: releaseTitle });
  if (releaseYear) facts.push({ label: "Year", value: releaseYear });
  if (artistArea) facts.push({ label: "Origin", value: artistArea });
  if (duration) facts.push({ label: "Length", value: duration });
  if (tags.length > 0)
    facts.push({ label: "Style", value: tags.slice(0, 2).join(", ") });

  const searchQuery = buildSearchQuery(
    recording.title ?? title ?? "",
    artistName,
  );
  const youtubeUrl = searchQuery
    ? `https://www.youtube.com/results?search_query=${encodeURIComponent(
        searchQuery,
      )}`
    : null;
  const wikipediaUrl = searchQuery
    ? `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(
        searchQuery,
      )}`
    : null;

  const links = [
    youtubeUrl
      ? { label: "YouTube", url: youtubeUrl, kind: "youtube" as const }
      : null,
    recordingId
      ? {
          label: "Track",
          url: `https://musicbrainz.org/recording/${recordingId}`,
          kind: "track" as const,
        }
      : null,
    releaseId
      ? {
          label: "Release",
          url: `https://musicbrainz.org/release/${releaseId}`,
          kind: "release" as const,
        }
      : null,
    artistId
      ? {
          label: "Artist",
          url: `https://musicbrainz.org/artist/${artistId}`,
          kind: "artist" as const,
        }
      : null,
    wikipediaUrl
      ? {
          label: "Wiki",
          url: wikipediaUrl,
          kind: "info" as const,
        }
      : null,
  ].filter(Boolean) as TrackTrivia["links"];

  let imageUrl = releaseId
    ? `https://coverartarchive.org/release/${releaseId}/front-250`
    : null;
  if (!imageUrl) {
    imageUrl = await resolveTrackImage(
      recording.title ?? title ?? "",
      artistName,
    );
  }

  return {
    facts,
    links,
    imageUrl,
  };
}

function mergeTriviaFacts(
  primaryFacts: TrackTrivia["facts"] = [],
  secondaryFacts: TrackTrivia["facts"] = [],
) {
  const seen = new Set<string>();
  const merged: TrackTrivia["facts"] = [];
  for (const fact of [...primaryFacts, ...secondaryFacts]) {
    const key = `${fact.label.toLowerCase()}::${fact.value.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(fact);
  }
  return merged.slice(0, 5);
}

function mergeTriviaLinks(
  primaryLinks: TrackTrivia["links"] = [],
  secondaryLinks: TrackTrivia["links"] = [],
) {
  const seen = new Set<string>();
  const merged: TrackTrivia["links"] = [];
  for (const link of [...primaryLinks, ...secondaryLinks]) {
    const key = `${link.kind}:${link.url}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(link);
  }
  return merged;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const title = url.searchParams.get("title");
  const artist = url.searchParams.get("artist");
  const source = url.searchParams.get("source") ?? "free";
  const contextRaw = url.searchParams.get("context");
  let contextInfo: {
    summary?: string;
    facts?: Array<{ label: string; value: string }>;
  } | null = null;

  if (contextRaw) {
    try {
      const parsed = JSON.parse(contextRaw) as {
        summary?: string;
        facts?: Array<{ label: string; value: string }>;
      };
      contextInfo = parsed;
    } catch {
      contextInfo = null;
    }
  }

  if (!title && !artist) {
    return json<TrackTriviaResponse>(
      { status: "error", reason: "Missing track title or artist." },
      { status: 400 },
    );
  }

  const cacheKey = getCacheKey(source, title, artist);
  const cached = triviaCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return json<TrackTriviaResponse>(cached.value);
  }

  if (source === "ai") {
    let prompt = "Track info request:";
    if (title) prompt += `\nTitle: ${title}`;
    if (artist) prompt += `\nArtist: ${artist}`;
    if (contextInfo?.summary) {
      prompt += `\nKnown summary: ${contextInfo.summary}`;
    }
    if (contextInfo?.facts?.length) {
      const factLines = contextInfo.facts
        .map((fact) => `${fact.label}: ${fact.value}`)
        .join("; ");
      prompt += `\nKnown facts: ${factLines}`;
    }
    prompt += "\nUse known facts as grounding. Return JSON only.";

    const { trivia, error } = await fetchAiTrivia(title, artist, prompt);
    if (!trivia) {
      const response: TrackTriviaResponse = {
        status: "error",
        reason: error?.includes("429")
          ? "AI provider rate-limited. Please try again shortly."
          : error ?? "AI trivia unavailable.",
      };
      triviaCache.set(cacheKey, {
        expiresAt: Date.now() + AI_CACHE_TTL_MS,
        value: response,
      });
      return json(response, { status: 500 });
    }
    const enrichment = await fetchMusicBrainzEnrichment(
      trivia.cleanTitle ?? title ?? "",
      trivia.cleanArtist ?? artist ?? "",
    );

    const response: TrackTriviaResponse = {
      status: "ok",
      trivia: {
        ...trivia,
        facts: mergeTriviaFacts(trivia.facts, enrichment.facts),
        imageUrl: enrichment.imageUrl ?? trivia.imageUrl ?? null,
        links: mergeTriviaLinks(trivia.links, enrichment.links),
      },
    };
    triviaCache.set(cacheKey, {
      expiresAt: Date.now() + AI_CACHE_TTL_MS,
      value: response,
    });
    return json(response);
  }

  const enrichment = await fetchMusicBrainzEnrichment(title, artist);
  const mbTrackLink = enrichment.links?.find((link) => link.kind === "track");
  const recordingId = mbTrackLink?.url.split("/").pop() ?? null;
  const mbReleaseLink = enrichment.links?.find(
    (link) => link.kind === "release",
  );
  const releaseId = mbReleaseLink?.url.split("/").pop() ?? null;
  const mbArtistLink = enrichment.links?.find((link) => link.kind === "artist");
  const artistId = mbArtistLink?.url.split("/").pop() ?? null;
  const recording = recordingId
    ? await fetchJson<{
        id?: string;
        title?: string;
        length?: number;
        "first-release-date"?: string;
        releases?: Array<{ id?: string; title?: string; date?: string }>;
        "artist-credit"?: Array<{
          name?: string;
          artist?: { id?: string; name?: string };
        }>;
        tags?: Array<{ name: string }>;
      }>(
        `${MUSICBRAINZ_BASE}/recording/${recordingId}?fmt=json&inc=artists+releases+tags`,
      )
    : null;
  if (!recording) {
    const response: TrackTriviaResponse = {
      status: "empty",
      reason: "No free trivia found for this track yet.",
    };
    triviaCache.set(cacheKey, {
      expiresAt: Date.now() + CACHE_TTL_MS,
      value: response,
    });
    return json(response);
  }

  const artistCredit = recording["artist-credit"]?.[0];
  const artistName =
    artistCredit?.name ??
    artistCredit?.artist?.name ??
    artist ??
    "Unknown artist";
  const resolvedArtistId = artistCredit?.artist?.id ?? artistId ?? null;
  const release = recording.releases?.[0];
  const releaseTitle = release?.title ?? null;
  const resolvedReleaseId = release?.id ?? releaseId ?? null;
  const resolvedRecordingId = recording.id ?? recordingId ?? null;
  const releaseDate = recording["first-release-date"] ?? release?.date ?? null;
  const releaseYear = pickReleaseYear(releaseDate);
  const duration = formatDuration(recording.length ?? null);

  let artistArea: string | null = null;
  let artistTags: string[] = [];
  if (resolvedArtistId) {
    const artistUrl = `${MUSICBRAINZ_BASE}/artist/${resolvedArtistId}?fmt=json&inc=tags`;
    const artistData = await fetchJson<{
      area?: { name?: string };
      country?: string;
      tags?: Array<{ name: string }>;
    }>(artistUrl);
    artistArea = artistData?.area?.name ?? artistData?.country ?? null;
    artistTags = (artistData?.tags ?? []).map((tag) => tag.name).slice(0, 3);
  }

  const recordingTags = (recording.tags ?? [])
    .map((tag) => tag.name)
    .slice(0, 3);
  const tags = [...recordingTags, ...artistTags].filter(Boolean);

  const facts: TrackTrivia["facts"] = [];
  if (releaseTitle) facts.push({ label: "Release", value: releaseTitle });
  if (releaseYear) facts.push({ label: "Year", value: releaseYear });
  if (artistArea) facts.push({ label: "Origin", value: artistArea });
  if (duration) facts.push({ label: "Length", value: duration });
  if (tags.length > 0)
    facts.push({ label: "Style", value: tags.slice(0, 2).join(", ") });

  const summaryPieces = [`${recording.title ?? title ?? "This track"}`];
  if (artistName) summaryPieces.push(`by ${artistName}`);
  if (releaseYear) summaryPieces.push(`(${releaseYear})`);
  const summary = summaryPieces.join(" ");

  const trivia: TrackTrivia = {
    summary,
    facts: mergeTriviaFacts(facts, enrichment.facts),
    links: mergeTriviaLinks([], enrichment.links),
    imageUrl: enrichment.imageUrl,
    source: "free",
    fetchedAt: new Date().toISOString(),
  };

  const response: TrackTriviaResponse = {
    status: "ok",
    trivia,
  };

  triviaCache.set(cacheKey, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    value: response,
  });
  return json(response);
}
