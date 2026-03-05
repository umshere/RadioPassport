import type { StationFailureReason } from "~/state/stationAvailabilityStore";

const RECOVERABLE_REASONS: ReadonlySet<StationFailureReason> = new Set([
  "audio_error",
  "play_rejected",
  "timeout",
  "unknown",
]);

const RETRY_DELAYS_MS = [700, 1600] as const;

export function canRetryPlayback(reason: StationFailureReason): boolean {
  return RECOVERABLE_REASONS.has(reason);
}

export function getRetryDelayMs(attempt: number): number {
  const idx = attempt <= 0 ? 0 : Math.min(attempt - 1, RETRY_DELAYS_MS.length - 1);
  return RETRY_DELAYS_MS[idx] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1] ?? 1600;
}

export function withRetryToken(url: string, token: string): string {
  if (!url) return url;
  try {
    const parsed = new URL(url, "https://placeholder.local");
    parsed.searchParams.set("rp_retry", token);

    if (/^https?:\/\//i.test(url)) {
      return parsed.toString();
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return url;
  }
}

export const MAX_PLAYBACK_RECOVERY_ATTEMPTS = RETRY_DELAYS_MS.length;
