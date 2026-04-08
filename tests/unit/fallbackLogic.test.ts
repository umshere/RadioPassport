import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getProvider, resetProviderCache } from "~/services/ai/providers";
import { FallbackProvider } from "~/services/ai/providers/FallbackProvider";
import { GeminiProvider } from "~/services/ai/providers/GeminiProvider";
import { OpenRouterProvider } from "~/services/ai/providers/OpenRouterProvider";

describe("Fallback Logic Verification", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    resetProviderCache();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns GeminiProvider when only Gemini is configured", () => {
    process.env.AI_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "test-key";
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.OLLAMA_URL;

    const provider = getProvider();
    expect(provider).toBeInstanceOf(GeminiProvider);
    expect(provider).not.toBeInstanceOf(FallbackProvider);
  });

  it("returns FallbackProvider when Gemini and OpenRouter are configured", () => {
    process.env.AI_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "test-key";
    process.env.OPENROUTER_API_KEY = "or-test-key";

    const provider = getProvider();
    expect(provider).toBeInstanceOf(FallbackProvider);
    const providers = (provider as any).providers;
    expect(providers[0]).toBeInstanceOf(OpenRouterProvider);
    expect(providers.at(-1)).toBeInstanceOf(GeminiProvider);
  });

  it("FallbackProvider executes providers in order", async () => {
    const mockProvider1 = {
      getSceneDescriptor: () => Promise.reject(new Error("Fail 1")),
    };
    const mockProvider2 = {
      getSceneDescriptor: () => Promise.resolve({ visual: "test" } as any),
    };

    const fallback = new FallbackProvider([mockProvider1, mockProvider2]);
    const result = await fallback.getSceneDescriptor("prompt");
    
    expect(result.visual).toBe("test");
  });
  
  it("FallbackProvider fails if all providers fail", async () => {
    const mockProvider1 = {
      getSceneDescriptor: () => Promise.reject(new Error("Fail 1")),
    };
    const mockProvider2 = {
      getSceneDescriptor: () => Promise.reject(new Error("Fail 2")),
    };

    const fallback = new FallbackProvider([mockProvider1, mockProvider2]);
    await expect(fallback.getSceneDescriptor("prompt")).rejects.toThrow("All providers failed");
  });
});
