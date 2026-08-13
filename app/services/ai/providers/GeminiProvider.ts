import { parseSceneDescriptor } from "./sceneDescriptorParser";
import type { AiProvider, ProviderSceneContext, ProviderSceneIntent } from "./BaseProvider";
import {
  dedupeStations,
  filterStationCandidates,
  normalizePreferenceList,
} from "./providerUtils";
import type { SceneDescriptor } from "~/scenes/types";
import type { Station } from "~/types/radio";
import { rbFetchJson } from "~/utils/radioBrowser";
import { normalizeStations } from "~/utils/stations";

const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

const PREFERRED_MODEL_ORDER = [
  DEFAULT_GEMINI_MODEL,
  "gemini-2.5-flash-lite",
  "gemini-2.5-pro",
  "gemini-2.0-flash-exp",
  "gemini-flash-latest",
  "gemini-pro-latest",
];

const DEFAULT_GEMINI_API_VERSION = "v1beta";
const PREFERRED_API_VERSIONS = ["v1beta", "v1"];

function getFallbackModels(): string[] {
  const configuredModel = (process.env.GEMINI_MODEL ?? "")
    .replace(/\\n/g, "")
    .replace(/\r?\n/g, "")
    .trim();
  return Array.from(
    new Set(
      [configuredModel || DEFAULT_GEMINI_MODEL, ...PREFERRED_MODEL_ORDER].filter(
        Boolean
      )
    )
  );
}

function getApiVersions(): string[] {
  const configuredVersion =
    process.env.GEMINI_API_VERSION ?? DEFAULT_GEMINI_API_VERSION;
  return Array.from(
    new Set([configuredVersion, ...PREFERRED_API_VERSIONS].filter(Boolean))
  );
}

function buildGenerationConfig(apiVersion: string) {
  const baseConfig = {
    temperature: 0.8,
  };

  // Only v1beta supports responseMimeType for JSON output
  // v1 does NOT support this field at all
  if (apiVersion === "v1beta") {
    return {
      ...baseConfig,
      responseMimeType: "application/json",
    };
  }

  return baseConfig;
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

export class GeminiProvider implements AiProvider {
  constructor(
    private readonly apiKey: string,
    private readonly fetchImpl: typeof fetch = fetch
  ) {
    if (!apiKey) {
      throw new Error(
        "GEMINI_API_KEY is required when using the Gemini provider"
      );
    }
  }

  private async fetchAvailableStations(
    limit: number = 60,
    intent?: ProviderSceneIntent
  ): Promise<Station[]> {
    const baseStations = await this.fetchAndFilter(
      `/json/stations/search?limit=${limit}&hidebroken=true&order=clickcount&reverse=true&has_geo_info=true`
    );

    const targeted: Station[] = [];
    const preferredCountries = normalizePreferenceList(intent?.preferredCountries);
    const preferredLanguages = normalizePreferenceList(intent?.preferredLanguages);
    const preferredTags = normalizePreferenceList(intent?.preferredTags);

    for (const country of preferredCountries.slice(0, 2)) {
      targeted.push(
        ...(
          await this.fetchAndFilter(
            `/json/stations/bycountry/${encodeURIComponent(
              country
            )}?limit=30&hidebroken=true&order=clickcount&reverse=true`
          )
        )
      );
    }

    for (const language of preferredLanguages.slice(0, 2)) {
      targeted.push(
        ...(
          await this.fetchAndFilter(
            `/json/stations/bylanguage/${encodeURIComponent(
              language
            )}?limit=30&hidebroken=true&order=clickcount&reverse=true`
          )
        )
      );
    }

    for (const tag of preferredTags.slice(0, 3)) {
      targeted.push(
        ...(
          await this.fetchAndFilter(
            `/json/stations/bytag/${encodeURIComponent(
              tag
            )}?limit=30&hidebroken=true&order=clickcount&reverse=true`
          )
        )
      );
    }

    const combined = dedupeStations([...targeted, ...baseStations]);
    return combined.slice(0, limit);
  }

  private async fetchAndFilter(path: string): Promise<Station[]> {
    try {
      const rawStations = await rbFetchJson<unknown>(path);
      const stations = normalizeStations(
        Array.isArray(rawStations) ? rawStations : []
      );
      return filterStationCandidates(stations);
    } catch (error) {
      console.error("Failed to fetch stations from Radio Browser:", error);
      return [];
    }
  }

  private buildStationContext(stations: Station[]): string {
    // Ultra-compact format: minimal tokens for fastest response
    return stations
      .slice(0, 20) // Only 20 stations (AI needs 6-8, this gives 2.5x variety)
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
    context?: ProviderSceneContext
  ): Promise<SceneDescriptor> {
    // Fetch available stations from Radio Browser
    const availableStations = await this.fetchAvailableStations(60, context?.intent);

    if (availableStations.length === 0) {
      throw new Error("No stations available from Radio Browser");
    }

    const stationContext = this.buildStationContext(availableStations);

    const userPrompt = `${SYSTEM_PROMPT}

USER REQUEST: "${prompt}"

AVAILABLE STATIONS:
${stationContext}

Curate a SceneDescriptor that matches this request. Return ONLY valid JSON matching the schema.`;

    const text = await this.generateSceneJson(userPrompt);

    // Parse AI response
    const aiResponse = JSON.parse(text);

    // Map selected station IDs to actual stations and apply enhancements
    const selectedIds = new Set(aiResponse.selectedStationIds || []);
    const stationEnhancements = aiResponse.stationEnhancements || {};

    const curatedStations = availableStations
      .filter((station) => selectedIds.has(station.uuid))
      .map((station) => {
        const enhancement = stationEnhancements[station.uuid];
        if (!enhancement) return station;

        // Apply AI-provided enhancements to station metadata
        return {
          ...station,
          highlight: enhancement.highlight || station.highlight,
          tagList: enhancement.tagList || station.tagList,
          healthStatus: enhancement.healthStatus || station.healthStatus,
          healthScore: enhancement.healthScore ?? station.healthScore,
        };
      });

    // If AI didn't select enough stations or made errors, fall back to top stations
    if (curatedStations.length < 6) {
      console.warn(
        "AI selected too few stations, falling back to top stations"
      );
      curatedStations.push(...availableStations.slice(0, 8));
    }

    // Build the final descriptor
    const descriptor: SceneDescriptor = {
      visual: aiResponse.visual || "card_stack",
      mood: aiResponse.mood || "Sonic Journey",
      animation: aiResponse.animation || "slow_orbit",
      play: aiResponse.play || {
        strategy: "preview_on_hover",
        crossfadeMs: 4000,
      },
      stations: curatedStations.slice(0, 8), // Target 6-8 stations
      reason: aiResponse.reason,
    };

    return parseSceneDescriptor(descriptor);
  }

  private async generateSceneJson(prompt: string): Promise<string> {
    let lastError: Error | null = null;
    const models = getFallbackModels();
    const apiVersions = getApiVersions();
    let attemptIndex = 0;

    modelLoop: for (const model of models) {
      let advanceModel = false;
      for (const apiVersion of apiVersions) {
        const endpoint = `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${this.apiKey}`;

        try {
          attemptIndex += 1;
          const generationConfig = buildGenerationConfig(apiVersion);
          const response = await this.fetchImpl(endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents: [
                {
                  role: "user",
                  parts: [
                    {
                      text: prompt,
                    },
                  ],
                },
              ],
              generationConfig,
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            const message = `Gemini request failed for model ${model} (${apiVersion}) with status ${response.status}: ${errorText}`;

            // If the model/version combo is not found, decide whether to try next API version or model
            if (
              response.status === 404 &&
              (errorText.includes("is not found") ||
                errorText.includes("model not found") ||
                errorText.includes("NOT_FOUND"))
            ) {
              lastError = new Error(message);
              console.warn(message);
              const maybeVersionIssue =
                /api version/i.test(errorText) ||
                /supported for generatecontent/i.test(errorText);
              if (maybeVersionIssue) {
                continue;
              } else {
                advanceModel = true;
                break;
              }
            }

            throw new Error(message);
          }

          const payload = await response.json();
          const candidates = payload?.candidates ?? [];
          const text = candidates[0]?.content?.parts?.[0]?.text;

          if (!text) {
            throw new Error("Gemini response did not include JSON output");
          }

          if (attemptIndex > 1) {
            console.info(
              `Gemini fallback succeeded using model ${model} (${apiVersion})`
            );
          }

          return text;
        } catch (error) {
          if (
            error instanceof Error &&
            error.message.includes("Gemini response did not include JSON")
          ) {
            throw error;
          }

          lastError = error instanceof Error ? error : new Error(String(error));
          throw lastError;
        }
      }

      if (advanceModel) {
        continue modelLoop;
      }
    }

    throw (
      lastError ?? new Error("Gemini request failed for all configured models")
    );
  }
}
