import { getProvider } from "~/services/ai/providers";

type ShelfReasonInput = {
  shelfId: string;
  title: string;
  description: string;
  topCountries: string[];
  topTags: string[];
  likelyUpCount: number;
  stationCount: number;
};

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const reasonCache = new Map<string, { value: string; expiresAt: number }>();

function buildCacheKey(input: ShelfReasonInput) {
  return [
    input.shelfId,
    input.topCountries.join(","),
    input.topTags.join(","),
    input.likelyUpCount,
    input.stationCount,
  ].join("|");
}

export async function buildAiShelfReason(
  input: ShelfReasonInput,
): Promise<string | null> {
  const cacheKey = buildCacheKey(input);
  const now = Date.now();
  const cached = reasonCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  try {
    const provider = getProvider();
    const descriptor = await provider.getSceneDescriptor(
      `Create a compact home-page radio mix reason for a shelf titled "${
        input.title
      }". ${
        input.description
      } Use plain language, not poetry. Mention why it fits right now using countries ${input.topCountries.join(
        ", ",
      )} and tags ${input.topTags.join(", ")}. Keep it under 220 characters.`,
      {
        intent: {
          preferredCountries: input.topCountries,
          preferredTags: input.topTags,
        },
      },
    );

    const reason = descriptor.reason?.trim();
    if (!reason) return null;

    const compactReason = reason.replace(/\s+/g, " ").trim();
    reasonCache.set(cacheKey, {
      value: compactReason,
      expiresAt: now + CACHE_TTL_MS,
    });
    return compactReason;
  } catch {
    return null;
  }
}
