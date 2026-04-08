import { describe, expect, it } from "vitest";

import {
  DEFAULT_OPENROUTER_MODEL,
  getOpenRouterModelRotation,
  getOpenRouterTriviaModelRotation,
} from "~/services/ai/providers/openRouterModels";

describe("OpenRouter model rotation", () => {
  it("defaults to the free router", () => {
    expect(getOpenRouterModelRotation({})).toEqual([
      DEFAULT_OPENROUTER_MODEL,
    ]);
  });

  it("uses a configured primary model with the free router as safety fallback", () => {
    expect(
      getOpenRouterModelRotation({
        OPENROUTER_MODEL: "meta-llama/llama-3.3-8b-instruct:free",
      })
    ).toEqual([
      "meta-llama/llama-3.3-8b-instruct:free",
      DEFAULT_OPENROUTER_MODEL,
    ]);
  });

  it("dedupes comma-separated fallback models", () => {
    expect(
      getOpenRouterModelRotation({
        OPENROUTER_MODEL: "openrouter/free",
        OPENROUTER_MODELS:
          "openrouter/free, z-ai/glm-4.5-air:free, z-ai/glm-4.5-air:free",
      })
    ).toEqual([DEFAULT_OPENROUTER_MODEL, "z-ai/glm-4.5-air:free"]);
  });

  it("prefers the trivia model before shared OpenRouter settings", () => {
    expect(
      getOpenRouterTriviaModelRotation({
        OPENROUTER_MODEL: "meta-llama/llama-3.3-8b-instruct:free",
        OPENROUTER_TRIVIA_MODEL: "z-ai/glm-4.5-air:free",
      })
    ).toEqual(["z-ai/glm-4.5-air:free", DEFAULT_OPENROUTER_MODEL]);
  });
});
