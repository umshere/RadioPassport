import { json, type LoaderFunctionArgs } from "@remix-run/node";
import type { TrackTriviaResponse, TrackTrivia } from "~/types/trivia";
import { resolveTrackImage } from "~/utils/imageSearch";

const MUSICBRAINZ_BASE = "https://musicbrainz.org/ws/2";
const USER_AGENT =
  "radio-passport/1.0 (https://github.com/umshere/RadioPassport)";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const AI_CACHE_TTL_MS = 60 * 60 * 1000;
const AI_PROVIDER = (process.env.AI_PROVIDER ?? "openai").trim().toLowerCase();

const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
const OPENROUTER_MODEL =
  process.env.OPENROUTER_TRIVIA_MODEL ??
  process.env.OPENROUTER_MODEL ??
  "openai/gpt-oss-20b:free";
const OPENROUTER_TRIVIA_MODELS = (
  process.env.OPENROUTER_TRIVIA_MODELS ??
  "openai/gpt-oss-20b:free,google/gemma-3n-4b-it:free,mistralai/mistral-7b-instruct:free"
)
  .split(",")
  .map((model) => model.trim())
  .filter(Boolean);
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";
const GEMINI_API_VERSION = process.env.GEMINI_API_VERSION ?? "v1beta";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "radio-passport";
const OLLAMA_URL = process.env.OLLAMA_URL ?? "";

const AI_SYSTEM_PROMPT = `You are a music trivia assistant.
Return JSON only with:
- summary: 1 sentence (max 22 words), high-confidence, factual, written to sound engaging.
- facts: 3 items, each { label, value } (short, factual).
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
  artist?: string | null
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
    " "
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
  options?: { links?: TrackTrivia["links"]; imageUrl?: string | null }
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
    facts: facts.slice(0, 3),
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
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) return null;
    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch {
      return null;
    }
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
  const modelsToTry = [
    OPENROUTER_MODEL,
    ...OPENROUTER_TRIVIA_MODELS.filter((model) => model !== OPENROUTER_MODEL),
  ];

  let lastError = "OpenRouter request failed.";
  for (const model of modelsToTry) {
    const response = await fetch(
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
      }
    );
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

async function fetchGeminiTrivia(prompt: string): Promise<AiTriviaResult> {
  const apiKey = process.env.GEMINI_API_KEY ?? "";
  if (!apiKey) return { trivia: null, error: "Missing GEMINI_API_KEY." };
  const apiVersion = GEMINI_API_VERSION || "v1beta";
  const url = `https://generativelanguage.googleapis.com/${apiVersion}/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  const generationConfig: Record<string, unknown> = { temperature: 0.4 };
  if (apiVersion === "v1beta") {
    generationConfig.responseMimeType = "application/json";
  }
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: AI_SYSTEM_PROMPT }] },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig,
    }),
  });
  if (!response.ok) {
    return {
      trivia: null,
      error: `Gemini request failed (${response.status}).`,
    };
  }
  const payload = await response.json();
  const text =
    payload?.candidates?.[0]?.content?.parts?.[0]?.text ??
    payload?.candidates?.[0]?.content?.parts?.[0];
  if (!text || typeof text !== "string") {
    return { trivia: null, error: "Gemini response was empty." };
  }
  const parsed = parseJsonFromText(text);
  return { trivia: normalizeTriviaPayload(parsed, "ai") };
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
    }
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
  promptOverride?: string
) {
  const promptParts = ["Track info request:"];
  if (title) promptParts.push(`Title: ${title}`);
  if (artist) promptParts.push(`Artist: ${artist}`);
  promptParts.push("Return JSON only.");
  const prompt = promptOverride ?? promptParts.join("\n");

  // Build a fallback chain based on configured provider and available keys
  type ProviderFn = () => Promise<AiTriviaResult>;
  const chain: ProviderFn[] = [];

  const hasOpenRouter = Boolean((process.env.OPENROUTER_API_KEY ?? "").trim());
  const hasOpenAI = Boolean((process.env.OPENAI_API_KEY ?? "").trim());
  const hasGemini = Boolean((process.env.GEMINI_API_KEY ?? "").trim());
  const hasOllama = Boolean((process.env.OLLAMA_URL ?? "").trim());

  const pushIf = (cond: boolean, fn: ProviderFn) => {
    if (cond) chain.push(fn);
  };

  // Helper to enqueue by name
  const enqueueByName = (name: string) => {
    const n = name.trim().toLowerCase();
    if (n === "gemini") pushIf(hasGemini, () => fetchGeminiTrivia(prompt));
    else if (n === "openrouter")
      pushIf(hasOpenRouter, () => fetchOpenRouterTrivia(prompt));
    else if (n === "openai") pushIf(hasOpenAI, () => fetchOpenAiTrivia(prompt));
    else if (n === "ollama") pushIf(hasOllama, () => fetchOllamaTrivia(prompt));
  };

  // 1) Preferred provider first
  enqueueByName(AI_PROVIDER);
  // 2) Fallback order: OpenRouter → OpenAI → Gemini → Ollama (skip duplicates)
  ["openrouter", "openai", "gemini", "ollama"].forEach((p) => {
    // avoid duplicate entries by checking function reference presence
    const beforeLen = chain.length;
    enqueueByName(p);
    // If preferred already added the same provider, this will no-op due to cond checks
  });

  // Ensure at least one option (even if keys are missing, we'll get an error which we surface)
  if (chain.length === 0) {
    // No keys present; try Gemini then OpenRouter then OpenAI then Ollama to return a clear error
    chain.push(
      () => fetchGeminiTrivia(prompt),
      () => fetchOpenRouterTrivia(prompt),
      () => fetchOpenAiTrivia(prompt),
      () => fetchOllamaTrivia(prompt)
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
      { status: 400 }
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

    const searchQuery = buildSearchQuery(
      trivia.cleanTitle ?? title ?? "",
      trivia.cleanArtist ?? artist ?? ""
    );
    const youtubeUrl = searchQuery
      ? `https://www.youtube.com/results?search_query=${encodeURIComponent(
          searchQuery
        )}`
      : null;
    const wikipediaUrl = searchQuery
      ? `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(
          searchQuery
        )}`
      : null;
    const links = [
      youtubeUrl
        ? { label: "YouTube", url: youtubeUrl, kind: "youtube" as const }
        : null,
      wikipediaUrl
        ? { label: "Wiki", url: wikipediaUrl, kind: "info" as const }
        : null,
    ].filter(Boolean) as TrackTrivia["links"];

    const imageUrl = await resolveTrackImage(
      trivia.cleanTitle ?? title ?? "",
      trivia.cleanArtist ?? artist ?? ""
    );

    const response: TrackTriviaResponse = {
      status: "ok",
      trivia: {
        ...trivia,
        imageUrl,
        links,
      },
    };
    triviaCache.set(cacheKey, {
      expiresAt: Date.now() + AI_CACHE_TTL_MS,
      value: response,
    });
    return json(response);
  }

  const queryParts = [];
  if (title) queryParts.push(`recording:"${escapeQueryValue(title)}"`);
  if (artist) queryParts.push(`artist:"${escapeQueryValue(artist)}"`);
  const query = queryParts.join(" AND ");

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

  const summaryPieces = [`${recording.title ?? title ?? "This track"}`];
  if (artistName) summaryPieces.push(`by ${artistName}`);
  if (releaseYear) summaryPieces.push(`(${releaseYear})`);
  const summary = summaryPieces.join(" ");

  const searchQuery = buildSearchQuery(
    recording.title ?? title ?? "",
    artistName
  );
  const youtubeUrl = searchQuery
    ? `https://www.youtube.com/results?search_query=${encodeURIComponent(
        searchQuery
      )}`
    : null;
  const wikipediaUrl = searchQuery
    ? `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(
        searchQuery
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

  // Fallback to Wikipedia/iTunes if MusicBrainz doesn't have an image
  if (!imageUrl) {
    imageUrl = await resolveTrackImage(recording.title ?? title ?? "", artistName);
  }

  const trivia: TrackTrivia = {
    summary,
    facts: facts.slice(0, 3),
    links,
    imageUrl,
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
