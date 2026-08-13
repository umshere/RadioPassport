import type { SceneDescriptor } from "~/scenes/types";

export type DescriptorStatus = "idle" | "loading" | "success" | "error";

export type AiDescriptorState = {
  status: DescriptorStatus;
  mood: string | null;
  transcript: string | null;
  descriptorSummary: string | null;
  sceneDescriptor: SceneDescriptor | null;
  error: string | null;
  updatedAt: number | null;
};

export type VoiceCommandPayload = {
  mood: string;
  transcript: string;
  visual?: string;
  country?: string | null;
  language?: string | null;
  preferredCountries?: string[];
  preferredLanguages?: string[];
  preferredTags?: string[];
  favoriteStationIds?: string[];
  recentStationIds?: string[];
  dislikedStationIds?: string[];
  currentStationId?: string | null;
  sceneId?: string | null;
};

export type AiRecommendationResponse = {
  descriptor: SceneDescriptor;
};

export type RecommendRequestBody = {
  prompt?: string;
  mood?: string;
  visual?: string;
  scene?: string;
  sceneId?: string;
  country?: string | null;
  language?: string | null;
  preferredCountries?: string[];
  preferredLanguages?: string[];
  preferredTags?: string[];
  favoriteStationIds?: string[];
  recentStationIds?: string[];
  dislikedStationIds?: string[];
  currentStationId?: string | null;
};

export type InterpretRequest = {
  prompt: string;
  currentStationId?: string | null;
  country?: string | null;
  language?: string | null;
};

export type InterpretedIntent = {
  query: string;
  mood: string | null;
  place: string | null;
  country: string | null;
  language: string | null;
  tags: string[];
  wantsMix: boolean;
  confidence: "high" | "medium" | "low";
};

export type InterpretResponse = {
  intent: InterpretedIntent;
  fallback: boolean;
};

export type DispatchRequest = {
  stationId: string;
  stationName: string;
  city?: string | null;
  country?: string | null;
  countryCode?: string | null;
  language?: string | null;
  tags?: string[];
  localTimeISO: string;
  timezone?: string | null;
  track?: { title: string | null; artist: string | null; raw: string } | null;
};

export type PlaceDispatch = {
  id: string;
  headline: string;
  body: string;
  mood: string;
  localLabel: string;
};

export type DispatchResponse = {
  dispatch: PlaceDispatch | null;
  cached: boolean;
  fallback: boolean;
};
