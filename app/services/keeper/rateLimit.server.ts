/**
 * A small in-memory token bucket per client key (IP). Per server instance,
 * so on serverless it is a soft ceiling, not a hard one — enough to keep a
 * single listener (or a script) from spending the model budget.
 */
export type TokenBucket = {
  take: (key: string, nowMs?: number) => { ok: boolean; retryAfterMs: number };
  size: () => number;
};

export function createTokenBucket({
  capacity,
  refillPerHour,
  maxKeys = 5000,
}: {
  capacity: number;
  refillPerHour: number;
  maxKeys?: number;
}): TokenBucket {
  const perMs = refillPerHour / 3_600_000;
  const buckets = new Map<string, { tokens: number; at: number }>();
  return {
    take(key, nowMs = Date.now()) {
      const held = buckets.get(key);
      const tokens = held
        ? Math.min(capacity, held.tokens + (nowMs - held.at) * perMs)
        : capacity;
      if (tokens < 1) {
        buckets.set(key, { tokens, at: nowMs });
        return { ok: false, retryAfterMs: Math.ceil((1 - tokens) / perMs) };
      }
      if (!held && buckets.size >= maxKeys) {
        // Forget the oldest listener rather than grow without bound.
        const oldest = buckets.keys().next().value;
        if (oldest !== undefined) buckets.delete(oldest);
      }
      buckets.delete(key);
      buckets.set(key, { tokens: tokens - 1, at: nowMs });
      return { ok: true, retryAfterMs: 0 };
    },
    size: () => buckets.size,
  };
}

/** ~20 questions an hour per listener, shared by both keeper routes. */
export const KEEPER_QUESTIONS_PER_HOUR = 20;
export const keeperBucket = createTokenBucket({
  capacity: KEEPER_QUESTIONS_PER_HOUR,
  refillPerHour: KEEPER_QUESTIONS_PER_HOUR,
});

export function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  return first || request.headers.get("x-real-ip")?.trim() || "anon";
}
