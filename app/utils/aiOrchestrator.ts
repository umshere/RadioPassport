import type { AiRecommendationResponse, RecommendRequestBody, VoiceCommandPayload } from "~/types/ai";
import type { SceneDescriptor } from "~/scenes/types";

export type AiOrchestratorResult = {
  descriptor: SceneDescriptor;
  summary: string;
  mood?: string;
};

export async function callAiOrchestrator(
  payload: VoiceCommandPayload,
  options?: { signal?: AbortSignal }
): Promise<AiOrchestratorResult> {
  const body: RecommendRequestBody = {
    prompt: payload.transcript,
    mood: payload.mood,
    visual: payload.visual,
    scene: payload.sceneId ?? undefined,
    sceneId: payload.sceneId ?? undefined,
    country: payload.country ?? null,
    language: payload.language ?? null,
    preferredCountries: payload.preferredCountries,
    preferredLanguages: payload.preferredLanguages,
    preferredTags: payload.preferredTags,
    favoriteStationIds: payload.favoriteStationIds,
    recentStationIds: payload.recentStationIds,
    dislikedStationIds: payload.dislikedStationIds,
    currentStationId: payload.currentStationId ?? null,
  };

  const response = await fetch("/api/ai/recommend", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: options?.signal,
  });

  if (!response.ok) {
    throw new Error(`AI orchestrator request failed: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as AiRecommendationResponse;
  const descriptor = data.descriptor;
  if (!descriptor || typeof descriptor.visual !== "string") {
    throw new Error("AI orchestrator returned an invalid descriptor");
  }

  return {
    descriptor,
    summary: descriptor.reason ?? descriptor.mood ?? "World Mode mix",
    mood: descriptor.mood ?? payload.mood,
  };
}
