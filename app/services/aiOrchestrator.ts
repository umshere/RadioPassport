import { sceneManager } from "~/services/sceneManager";
import type { SceneDescriptor } from "~/scenes/types";
import type { Station } from "~/types/radio";
import { usePlayerStore } from "~/state/playerStore";

const ENDPOINT = "/api/ai/recommend";

type AiRecommendationResponse = {
  descriptor: SceneDescriptor;
};

type LoadWorldDescriptorOptions = {
  signal?: AbortSignal;
  prompt?: string;
  mood?: string;
  visual?: string;
  sceneId?: string;
  country?: string | null;
  language?: string | null;
  preferredCountries?: string[];
  preferredLanguages?: string[];
  favoriteStationIds?: string[];
  recentStationIds?: string[];
  dislikedStationIds?: string[];
  currentStationId?: string | null;
  onStationsResolved?: (stations: Station[]) => void;
  onStartStation?: (station: Station, options: { autoPlay: boolean }) => void;
};

type WorldDescriptorPreviewOptions = Omit<
  LoadWorldDescriptorOptions,
  "onStationsResolved" | "onStartStation"
>;

function isSceneDescriptor(value: unknown): value is SceneDescriptor {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.visual === "string" && Array.isArray(candidate.stations);
}

function parseResponse(payload: unknown): SceneDescriptor {
  if (!payload || typeof payload !== "object" || !("descriptor" in payload)) {
    throw new Error("AI payload missing descriptor field");
  }

  const raw = (payload as AiRecommendationResponse).descriptor;
  if (!isSceneDescriptor(raw)) {
    throw new Error("AI payload descriptor is malformed");
  }

  return {
    visual: raw.visual,
    mood: raw.mood,
    animation: raw.animation,
    play: raw.play,
    stations: raw.stations,
    reason: raw.reason,
  };
}

function buildRequestOptions(options: LoadWorldDescriptorOptions | WorldDescriptorPreviewOptions) {
  const {
    prompt,
    mood,
    visual,
    sceneId,
    country,
    language,
    preferredCountries,
    preferredLanguages,
    favoriteStationIds,
    recentStationIds,
    dislikedStationIds,
    currentStationId,
  } = options;
  const usePost = typeof prompt === "string" && prompt.trim().length > 0;
  const query = new URLSearchParams();

  if (!usePost) {
    if (mood) query.set("mood", mood);
    if (visual) query.set("visual", visual);
    if (sceneId) query.set("sceneId", sceneId);
    if (country) query.set("country", country);
    if (language) query.set("language", language);
    if (currentStationId) query.set("currentStationId", currentStationId);
    for (const entry of preferredCountries ?? []) {
      query.append("preferredCountries", entry);
    }
    for (const entry of preferredLanguages ?? []) {
      query.append("preferredLanguages", entry);
    }
    for (const entry of favoriteStationIds ?? []) {
      query.append("favoriteStationIds", entry);
    }
    for (const entry of recentStationIds ?? []) {
      query.append("recentStationIds", entry);
    }
    for (const entry of dislikedStationIds ?? []) {
      query.append("dislikedStationIds", entry);
    }
  }

  const endpoint = usePost
    ? ENDPOINT
    : query.size > 0
    ? `${ENDPOINT}?${query.toString()}`
    : ENDPOINT;

  const fetchInit = {
    method: usePost ? "POST" : "GET",
    headers: usePost
      ? {
          "Content-Type": "application/json",
        }
      : undefined,
    body: usePost
      ? JSON.stringify({
          prompt,
          mood,
          visual,
          sceneId,
          country,
          language,
          preferredCountries,
          preferredLanguages,
          favoriteStationIds,
          recentStationIds,
          dislikedStationIds,
          currentStationId,
        })
      : undefined,
  };

  return { endpoint, fetchInit };
}

async function fetchDescriptor(
  options: LoadWorldDescriptorOptions | WorldDescriptorPreviewOptions
) {
  const { endpoint, fetchInit } = buildRequestOptions(options);
  const response = await fetch(endpoint, {
    ...fetchInit,
    signal: options.signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to load AI descriptor (${response.status})`);
  }

  const payload: unknown = await response.json();
  return parseResponse(payload);
}

export async function loadWorldDescriptor(options: LoadWorldDescriptorOptions = {}) {
  const {
    signal,
    prompt,
    mood,
    visual,
    sceneId,
    country,
    language,
    preferredCountries,
    preferredLanguages,
    favoriteStationIds,
    recentStationIds,
    dislikedStationIds,
    currentStationId,
    onStationsResolved,
    onStartStation,
  } = options;

  const descriptor = await fetchDescriptor({
    signal,
    prompt,
    mood,
    visual,
    sceneId,
    country,
    language,
    preferredCountries,
    preferredLanguages,
    favoriteStationIds,
    recentStationIds,
    dislikedStationIds,
    currentStationId,
  });

  sceneManager.setDescriptor(descriptor);

  const player = usePlayerStore.getState();
  const autoStation = player.applySceneDescriptor(descriptor);

  onStationsResolved?.(descriptor.stations);

  if (autoStation) {
    onStartStation?.(autoStation, { autoPlay: true });
  }

  return descriptor;
}

export async function loadWorldDescriptorPreview(options: WorldDescriptorPreviewOptions = {}) {
  return fetchDescriptor(options);
}
