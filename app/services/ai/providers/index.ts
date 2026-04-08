import { OpenAIProvider } from "./OpenAIProvider";
import { GeminiProvider } from "./GeminiProvider";
import { OllamaProvider } from "./OllamaProvider";
import { OpenRouterProvider } from "./OpenRouterProvider";
import { FallbackProvider } from "./FallbackProvider";
import type { AiProvider } from "./BaseProvider";

const providerCache: { instance: AiProvider | null } = { instance: null };

type ProviderName = "openai" | "gemini" | "openrouter" | "ollama";

function normalizeProviderName(value?: string): ProviderName {
  const name = (value ?? "openai").trim().toLowerCase();
  if (
    name === "openai" ||
    name === "gemini" ||
    name === "openrouter" ||
    name === "ollama"
  ) {
    return name;
  }
  return "openai";
}

function getConfiguredProviderNames(preferredProvider: ProviderName): ProviderName[] {
  const order: ProviderName[] = [];
  const add = (providerName: ProviderName) => {
    if (!order.includes(providerName)) order.push(providerName);
  };

  if (preferredProvider !== "gemini") add(preferredProvider);
  add("openrouter");
  add("openai");
  add("ollama");
  add("gemini");

  return order;
}

function getProviderForName(providerName: ProviderName): AiProvider | null {
  switch (providerName) {
    case "openrouter": {
      const apiKey = process.env.OPENROUTER_API_KEY ?? "";
      return apiKey ? new OpenRouterProvider(apiKey) : null;
    }
    case "openai": {
      const apiKey = process.env.OPENAI_API_KEY ?? "";
      return apiKey ? new OpenAIProvider(apiKey) : null;
    }
    case "ollama": {
      const baseUrl = process.env.OLLAMA_URL ?? "";
      return baseUrl ? new OllamaProvider(baseUrl) : null;
    }
    case "gemini": {
      const apiKey = process.env.GEMINI_API_KEY ?? "";
      return apiKey ? new GeminiProvider(apiKey) : null;
    }
  }
}

export function getProvider(): AiProvider {
  if (providerCache.instance) {
    return providerCache.instance;
  }

  const providerName = normalizeProviderName(process.env.AI_PROVIDER);
  const providers = getConfiguredProviderNames(providerName)
    .map(getProviderForName)
    .filter((provider): provider is AiProvider => Boolean(provider));

  if (providers.length === 1) {
    providerCache.instance = providers[0] ?? null;
  } else if (providers.length > 1) {
    providerCache.instance = new FallbackProvider(providers);
  }

  if (!providerCache.instance) {
    throw new Error(`Failed to initialize AI provider for ${providerName}`);
  }

  return providerCache.instance;
}

export function resetProviderCache() {
  providerCache.instance = null;
}
