import {
  completeJson,
  isGatewayConfigured,
  type GatewayChatOptions,
} from "~/services/ai/gateway";
import { parseJsonObjectFromText } from "~/services/ai/providers/providerUtils";

export function trimEnv(value?: string | null) {
  return (value ?? "")
    .replace(/\\n/g, "")
    .replace(/\r?\n/g, "")
    .trim();
}

export const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

export function getGeminiModel(env: NodeJS.ProcessEnv = process.env) {
  return trimEnv(env.GEMINI_MODEL) || DEFAULT_GEMINI_MODEL;
}

export function hasGeminiKey(env: NodeJS.ProcessEnv = process.env) {
  return Boolean(trimEnv(env.GEMINI_API_KEY));
}

export async function completeGeminiJson<T>(
  options: Pick<GatewayChatOptions, "system" | "user" | "timeoutMs" | "fetchImpl">
): Promise<T> {
  const apiKey = trimEnv(process.env.GEMINI_API_KEY);
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }
  const model = getGeminiModel();
  const apiVersion = trimEnv(process.env.GEMINI_API_VERSION) || "v1beta";
  const fetchImpl = options.fetchImpl ?? fetch;
  const controllerTimeout = options.timeoutMs ?? 12_000;
  const url = `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${apiKey}`;

  const request = fetchImpl(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: options.system }] },
      contents: [{ role: "user", parts: [{ text: options.user }] }],
      generationConfig: {
        temperature: 0.5,
        ...(apiVersion === "v1beta"
          ? { responseMimeType: "application/json" }
          : {}),
      },
    }),
  }).then(async (response) => {
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(
        `Gemini ${model} failed (${response.status}): ${detail.slice(0, 240)}`
      );
    }
    const payload = (await response.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
    };
    const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error(`Gemini ${model} returned empty content`);
    return parseJsonObjectFromText(text) as T;
  });

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`Gemini ${model} timed out`)),
      controllerTimeout
    );
  });
  try {
    return await Promise.race([request, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function completeJsonPreferringGateway<T>(
  options: GatewayChatOptions
): Promise<{ value: T; source: "heuristics" | "gemini" }> {
  if (isGatewayConfigured(options.apiKey ?? process.env.HEURISTICS_API_KEY)) {
    try {
      return { value: await completeJson<T>(options), source: "heuristics" };
    } catch {
      // Prod often has Gemini and no public Heuristics URL.
    }
  }
  if (hasGeminiKey()) {
    return {
      value: await completeGeminiJson<T>(options),
      source: "gemini",
    };
  }
  throw new Error("No Heuristics gateway or Gemini key is configured");
}
