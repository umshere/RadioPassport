import { parseSceneDescriptor } from "./sceneDescriptorParser";
import type {
  AiProvider,
  ProviderSceneContext,
  ProviderSceneIntent,
} from "./BaseProvider";
import {
  dedupeStations,
  filterStationCandidates,
  normalizePreferenceList,
  parseJsonObjectFromText,
} from "./providerUtils";
import type { SceneDescriptor } from "~/scenes/types";
import type { Station } from "~/types/radio";
import { rbFetchJson } from "~/utils/radioBrowser";
import { normalizeStations } from "~/utils/stations";
import { getOpenRouterModelRotation } from "./openRouterModels";

type OpenRouterSceneResponse = {
  visual?: unknown;
  mood?: unknown;
  animation?: unknown;
  play?: unknown;
  reason?: unknown;
  selectedStationIds?: unknown;
  stationEnhancements?: unknown;
};

function isScenePlayOptions(value: unknown): value is SceneDescriptor["play"] {
  return (
    value !== null &&
    typeof value === "object" &&
    "strategy" in value &&
    typeof (value as { strategy?: unknown }).strategy === "string"
  );
}

function isHealthStatus(value: unknown): value is Station["healthStatus"] {
  return value === "good" || value === "warning" || value === "error";
}

const SYSTEM_PROMPT = `You are Radio Passport's music curator. Create a card_stack scene JSON.

Return JSON with:
- visual: "card_stack"
- mood: 2-4 evocative words (e.g. "Midnight Berber Reverie")
- animation: "slow_pan" | "slow_orbit" | "cascade_drop" (match energy)
- play: { strategy: "preview_on_hover" or "autoplay_first", crossfadeMs: 4000 }
- reason: 2 paragraphs (max 420 chars), cinematic with continents/instruments/decades
- selectedStationIds: ["uuid1", ...] - pick 6-8 from list, 3+ countries, 1+ non-US
- stationEnhancements: { "uuid1": { highlight: "why it fits (<=120 chars)", tagList: ["mood","instrument","decade","locale"], healthStatus: "good", healthScore: 85-100 } }

Make it feel like a bespoke mixtape. Return ONLY JSON.`;

export class OpenRouterProvider implements AiProvider {
  constructor(
    private readonly apiKey: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {
    if (!apiKey) {
      throw new Error(
        "OPENROUTER_API_KEY is required when using the OpenRouter provider",
      );
    }
  }

  private async fetchAvailableStations(
    limit: number = 60,
    intent?: ProviderSceneIntent,
  ): Promise<Station[]> {
    const baseStations = await this.fetchAndFilter(
      `/json/stations/search?limit=${limit}&hidebroken=true&order=clickcount&reverse=true&has_geo_info=true`,
    );

    const targeted: Station[] = [];
    const preferredCountries = normalizePreferenceList(
      intent?.preferredCountries,
    );
    const preferredLanguages = normalizePreferenceList(
      intent?.preferredLanguages,
    );
    const preferredTags = normalizePreferenceList(intent?.preferredTags);

    for (const country of preferredCountries.slice(0, 2)) {
      targeted.push(
        ...(await this.fetchAndFilter(
          `/json/stations/bycountry/${encodeURIComponent(
            country,
          )}?limit=30&hidebroken=true&order=clickcount&reverse=true`,
        )),
      );
    }

    for (const language of preferredLanguages.slice(0, 2)) {
      targeted.push(
        ...(await this.fetchAndFilter(
          `/json/stations/bylanguage/${encodeURIComponent(
            language,
          )}?limit=30&hidebroken=true&order=clickcount&reverse=true`,
        )),
      );
    }

    for (const tag of preferredTags.slice(0, 3)) {
      targeted.push(
        ...(await this.fetchAndFilter(
          `/json/stations/bytag/${encodeURIComponent(
            tag,
          )}?limit=30&hidebroken=true&order=clickcount&reverse=true`,
        )),
      );
    }

    const combined = dedupeStations([...targeted, ...baseStations]);
    return combined.slice(0, limit);
  }

  private async fetchAndFilter(path: string): Promise<Station[]> {
    try {
      const rawStations = await rbFetchJson<unknown>(path);
      const stations = normalizeStations(
        Array.isArray(rawStations) ? rawStations : [],
      );
      return filterStationCandidates(stations);
    } catch (error) {
      console.error("Failed to fetch stations from Radio Browser:", error);
      return [];
    }
  }

  private buildStationContext(stations: Station[]): string {
    return stations
      .slice(0, 20)
      .map((station, idx) => {
        const tags = station.tagList?.slice(0, 3).join(",") || "none";
        return `${idx + 1}. ${station.name} [${station.uuid}]|${
          station.country
        }|${tags}|${station.bitrate}k`;
      })
      .join("\n");
  }

  async getSceneDescriptor(
    prompt: string,
    context?: ProviderSceneContext,
  ): Promise<SceneDescriptor> {
    const availableStations = await this.fetchAvailableStations(
      60,
      context?.intent,
    );
    if (availableStations.length === 0) {
      throw new Error("No stations available from Radio Browser");
    }

    const stationContext = this.buildStationContext(availableStations);
    const userPrompt = `USER REQUEST: "${prompt}"\n\nAVAILABLE STATIONS:\n${stationContext}\n\nCurate a SceneDescriptor that matches this request. Return ONLY valid JSON matching the schema.`;

    let lastError: Error | null = null;

    const modelRotation = getOpenRouterModelRotation();
    const MODEL_TIMEOUT_MS = 15_000;

    for (const model of modelRotation) {
      try {
        console.log(`Attempting to use model: ${model}`);
        const fetchPromise = this.fetchImpl(
          "https://openrouter.ai/api/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${this.apiKey}`,
              "HTTP-Referer": "https://world.builder/app",
              "X-Title": "World Builder",
            },
            body: JSON.stringify({
              model: model,
              messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: userPrompt },
              ],
              temperature: 0.8,
            }),
          },
        );
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(
            () =>
              reject(
                new Error(
                  `Model ${model} timed out after ${MODEL_TIMEOUT_MS}ms`,
                ),
              ),
            MODEL_TIMEOUT_MS,
          ),
        );
        const response = await Promise.race([fetchPromise, timeoutPromise]);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `OpenRouter request failed for model ${model} with status ${response.status}: ${errorText}`,
          );
        }

        const payload = await response.json();
        const text = payload?.choices?.[0]?.message?.content;

        if (!text) {
          throw new Error(
            `OpenRouter response for model ${model} did not include content`,
          );
        }

        const aiResponse = parseJsonObjectFromText(
          text,
        ) as OpenRouterSceneResponse;
        const selectedIds = new Set(
          Array.isArray(aiResponse.selectedStationIds)
            ? aiResponse.selectedStationIds.map(String)
            : [],
        );
        const stationEnhancements =
          aiResponse.stationEnhancements &&
          typeof aiResponse.stationEnhancements === "object"
            ? (aiResponse.stationEnhancements as Record<
                string,
                Record<string, unknown>
              >)
            : {};

        const curatedStations = availableStations
          .filter((station) => selectedIds.has(station.uuid))
          .map((station) => {
            const enhancement = stationEnhancements[station.uuid];
            if (!enhancement) return station;
            return {
              ...station,
              highlight:
                typeof enhancement.highlight === "string"
                  ? enhancement.highlight
                  : station.highlight,
              tagList: Array.isArray(enhancement.tagList)
                ? enhancement.tagList.map(String)
                : station.tagList,
              healthStatus: isHealthStatus(enhancement.healthStatus)
                ? enhancement.healthStatus
                : station.healthStatus,
              healthScore:
                typeof enhancement.healthScore === "number"
                  ? enhancement.healthScore
                  : station.healthScore,
            };
          });

        if (curatedStations.length < 6) {
          console.warn(
            `AI (${model}) selected too few stations, supplementing with top stations.`,
          );
          const needed = 8 - curatedStations.length;
          curatedStations.push(...availableStations.slice(0, needed));
        }

        const descriptor: SceneDescriptor = {
          visual:
            typeof aiResponse.visual === "string"
              ? aiResponse.visual
              : "card_stack",
          mood:
            typeof aiResponse.mood === "string"
              ? aiResponse.mood
              : "Sonic Journey",
          animation:
            typeof aiResponse.animation === "string"
              ? aiResponse.animation
              : "slow_orbit",
          play: isScenePlayOptions(aiResponse.play)
            ? aiResponse.play
            : {
                strategy: "preview_on_hover",
                crossfadeMs: 4000,
              },
          stations: curatedStations.slice(0, 8),
          reason:
            typeof aiResponse.reason === "string"
              ? aiResponse.reason
              : undefined,
        };

        const selectedModel =
          typeof payload?.model === "string" ? payload.model : model;
        console.log(
          `Successfully generated scene with model: ${selectedModel}`,
        );
        return parseSceneDescriptor(descriptor);
      } catch (error) {
        lastError =
          error instanceof Error
            ? error
            : new Error("An unknown error occurred");
        console.warn(
          `Model ${model} failed: ${lastError.message}. Trying next model.`,
        );
      }
    }

    throw new Error(
      `All models in the rotation failed. Last error: ${lastError?.message}`,
    );
  }
}
