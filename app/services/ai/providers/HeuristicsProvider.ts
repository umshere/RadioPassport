import { parseSceneDescriptor } from "./sceneDescriptorParser";
import type {
  AiProvider,
  ProviderSceneContext,
} from "./BaseProvider";
import { completeJson, getGatewayConfig } from "~/services/ai/gateway";
import {
  buildStationContext,
  fetchStationsForIntent,
} from "./stationPool";
import type { SceneDescriptor } from "~/scenes/types";
import type { Station } from "~/types/radio";

const SYSTEM_PROMPT = `You are Elsewhere's live radio curator. Create a card_stack scene JSON.

Return JSON with:
- visual: "card_stack"
- mood: 2-4 evocative words (e.g. "Midnight Berber Reverie")
- animation: "slow_pan" | "slow_orbit" | "cascade_drop"
- play: { strategy: "autoplay_first", crossfadeMs: 4000 }
- reason: one italic line, max 12 words, place + hour + texture
- selectedStationIds: ["uuid1", ...] - pick 6-8 from list, 3+ countries, 1+ non-US
- stationEnhancements: { "uuid1": { highlight: "why it fits (<=120 chars)", tagList: ["mood","instrument","decade","locale"], healthStatus: "good", healthScore: 85-100 } }

Make it feel like a live itinerary, not a playlist. Return ONLY JSON.`;

type HeuristicsSceneResponse = {
  visual?: unknown;
  mood?: unknown;
  animation?: unknown;
  play?: unknown;
  reason?: unknown;
  selectedStationIds?: unknown;
  stationEnhancements?: unknown;
};

export class HeuristicsProvider implements AiProvider {
  constructor(
    private readonly apiKey: string,
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly baseUrl = getGatewayConfig().baseUrl,
    private readonly models = getGatewayConfig().models
  ) {
    if (!apiKey) {
      throw new Error(
        "HEURISTICS_API_KEY is required when using the Heuristics provider"
      );
    }
  }

  async getSceneDescriptor(
    prompt: string,
    context?: ProviderSceneContext
  ): Promise<SceneDescriptor> {
    const availableStations = await fetchStationsForIntent(
      60,
      context?.intent
    );

    if (availableStations.length === 0) {
      throw new Error("No stations available from Radio Browser");
    }

    const aiResponse = await completeJson<HeuristicsSceneResponse>({
      system: SYSTEM_PROMPT,
      user: `USER REQUEST: "${prompt}"

AVAILABLE STATIONS:
${buildStationContext(availableStations)}

Curate a SceneDescriptor that matches this request. Return ONLY valid JSON.`,
      fetchImpl: this.fetchImpl,
      apiKey: this.apiKey,
      baseUrl: this.baseUrl,
      models: this.models,
      timeoutMs: 12_000,
    });

    const selectedIds = new Set(
      Array.isArray(aiResponse.selectedStationIds)
        ? aiResponse.selectedStationIds.filter(
            (value): value is string => typeof value === "string"
          )
        : []
    );
    const stationEnhancements =
      aiResponse.stationEnhancements &&
      typeof aiResponse.stationEnhancements === "object"
        ? (aiResponse.stationEnhancements as Record<
            string,
            {
              highlight?: string;
              tagList?: string[];
              healthStatus?: Station["healthStatus"];
              healthScore?: number;
            }
          >)
        : {};

    const curatedStations = availableStations
      .filter((station) => selectedIds.has(station.uuid))
      .map((station) => {
        const enhancement = stationEnhancements[station.uuid];
        if (!enhancement) return station;
        return {
          ...station,
          highlight: enhancement.highlight || station.highlight,
          tagList: enhancement.tagList || station.tagList,
          healthStatus: enhancement.healthStatus || station.healthStatus,
          healthScore: enhancement.healthScore ?? station.healthScore,
        };
      });

    if (curatedStations.length < 6) {
      curatedStations.push(...availableStations.slice(0, 8));
    }

    return parseSceneDescriptor({
      visual: aiResponse.visual || "card_stack",
      mood: aiResponse.mood || "Elsewhere",
      animation: aiResponse.animation || "slow_orbit",
      play: aiResponse.play || {
        strategy: "autoplay_first",
        crossfadeMs: 4000,
      },
      stations: curatedStations.slice(0, 8),
      reason: aiResponse.reason,
    });
  }
}
