export const DEFAULT_OPENROUTER_MODEL = "openrouter/free";

type OpenRouterModelEnv = Record<string, string | undefined>;

function parseModelList(value?: string): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((model) => model.trim())
    .filter(Boolean);
}

function dedupe(models: string[]): string[] {
  return Array.from(new Set(models));
}

export function getOpenRouterModelRotation(
  env: OpenRouterModelEnv = process.env
): string[] {
  const primaryModels = parseModelList(env.OPENROUTER_MODEL);
  const fallbackModels = parseModelList(env.OPENROUTER_MODELS);
  return dedupe([
    ...(primaryModels.length > 0 ? primaryModels : [DEFAULT_OPENROUTER_MODEL]),
    ...fallbackModels,
    DEFAULT_OPENROUTER_MODEL,
  ]);
}

export function getOpenRouterTriviaModelRotation(
  env: OpenRouterModelEnv = process.env
): string[] {
  const primaryModels = parseModelList(
    env.OPENROUTER_TRIVIA_MODEL ?? env.OPENROUTER_MODEL
  );
  const fallbackModels = parseModelList(env.OPENROUTER_TRIVIA_MODELS);
  return dedupe([
    ...(primaryModels.length > 0 ? primaryModels : [DEFAULT_OPENROUTER_MODEL]),
    ...fallbackModels,
    DEFAULT_OPENROUTER_MODEL,
  ]);
}
