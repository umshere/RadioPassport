import { parseJsonObjectFromText } from "~/services/ai/providers/providerUtils";

export type GatewayChatOptions = {
  system: string;
  user: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  baseUrl?: string;
  apiKey?: string;
  models?: string[];
};

export function getGatewayConfig() {
  const baseUrl = (
    process.env.HEURISTICS_BASE_URL ?? "http://localhost:4000"
  ).replace(/\/$/, "");
  const apiKey = process.env.HEURISTICS_API_KEY ?? "";
  // Cost lock: Flash only. Ignore Pro / other aliases even if .env asks.
  return { baseUrl, apiKey, models: ["deepseek-v4-flash"] };
}

export function isGatewayConfigured(apiKey = process.env.HEURISTICS_API_KEY) {
  return Boolean(apiKey && apiKey.trim());
}

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(label)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function completeOnce(
  model: string,
  options: GatewayChatOptions,
  config: ReturnType<typeof getGatewayConfig>
) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const request = fetchImpl(
    `${options.baseUrl ?? config.baseUrl}/v1/chat/completions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${options.apiKey ?? config.apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.6,
        messages: [
          { role: "system", content: options.system },
          { role: "user", content: options.user },
        ],
      }),
    }
  ).then(async (response) => {
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(
        `Heuristics gateway ${model} failed (${response.status}): ${detail.slice(0, 240)}`
      );
    }
    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = payload.choices?.[0]?.message?.content;
    if (!text) {
      throw new Error(`Heuristics gateway ${model} returned empty content`);
    }
    return text;
  });

  return withTimeout(
    request,
    options.timeoutMs ?? 12_000,
    `Heuristics gateway ${model} timed out`
  );
}

export async function completeText(options: GatewayChatOptions) {
  const config = getGatewayConfig();
  const apiKey = options.apiKey ?? config.apiKey;
  if (!isGatewayConfigured(apiKey)) {
    throw new Error("Heuristics gateway is not configured");
  }
  const models = options.models?.length ? options.models : config.models;
  const errors: string[] = [];
  for (const model of models) {
    try {
      return await completeOnce(model, { ...options, apiKey }, config);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }
  throw new Error(errors.join(" | ") || "Heuristics gateway failed");
}

export async function completeJson<T>(options: GatewayChatOptions): Promise<T> {
  const text = await completeText(options);
  return parseJsonObjectFromText(text) as T;
}
