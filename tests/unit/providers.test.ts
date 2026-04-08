import { describe, expect, it, beforeEach } from "vitest";

import { getProvider, resetProviderCache } from "~/services/ai/providers";
import { OpenAIProvider } from "~/services/ai/providers/OpenAIProvider";
import { GeminiProvider } from "~/services/ai/providers/GeminiProvider";
import { OllamaProvider } from "~/services/ai/providers/OllamaProvider";
import { OpenRouterProvider } from "~/services/ai/providers/OpenRouterProvider";
import { FallbackProvider } from "~/services/ai/providers/FallbackProvider";

const ORIGINAL_ENV = { ...process.env };

describe("AI provider switcher", () => {
  beforeEach(() => {
    resetProviderCache();
    Object.assign(process.env, ORIGINAL_ENV);
    process.env.OPENAI_API_KEY = "test-openai";
    process.env.GEMINI_API_KEY = "test-gemini";
    process.env.OLLAMA_URL = "http://localhost:11434";
    delete process.env.OPENROUTER_API_KEY;
  });

  it("returns OpenAI provider by default", () => {
    delete process.env.AI_PROVIDER;
    delete process.env.GEMINI_API_KEY;
    delete process.env.OLLAMA_URL;
    const provider = getProvider();
    expect(provider).toBeInstanceOf(OpenAIProvider);
  });

  it("returns Gemini provider when configured", () => {
    process.env.AI_PROVIDER = "gemini";
    delete process.env.OPENAI_API_KEY;
    delete process.env.OLLAMA_URL;
    const provider = getProvider();
    expect(provider).toBeInstanceOf(GeminiProvider);
  });

  it("returns Ollama provider when configured", () => {
    process.env.AI_PROVIDER = "ollama";
    delete process.env.OPENAI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    const provider = getProvider();
    expect(provider).toBeInstanceOf(OllamaProvider);
  });

  it("caches provider instances", () => {
    process.env.AI_PROVIDER = "openai";
    delete process.env.GEMINI_API_KEY;
    delete process.env.OLLAMA_URL;
    const first = getProvider();
    const second = getProvider();
    expect(first).toBe(second);
  });

  it("uses OpenRouter before Gemini when both are configured", () => {
    process.env.AI_PROVIDER = "gemini";
    process.env.OPENROUTER_API_KEY = "test-openrouter";

    const provider = getProvider();

    expect(provider).toBeInstanceOf(FallbackProvider);
    const providers = (provider as any).providers;
    expect(providers[0]).toBeInstanceOf(OpenRouterProvider);
    expect(providers.at(-1)).toBeInstanceOf(GeminiProvider);
  });
});
