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

/**
 * A stalled live stream fires no `error`, so the bridge watches progress.
 * Ten seconds without a byte is long enough to ride out a mobile re-buffer
 * and short enough that the listener is not left in silence.
 */
export const STALL_TIMEOUT_MS = 10_000;
export const STALL_CHECK_INTERVAL_MS = 2_500;

/** `play()` rejects for reasons that are not the station's fault. */
export type PlayRejection = "blocked" | "aborted" | "stream";

/**
 * Autoplay policy (`NotAllowedError`) is a gesture problem, not a dead
 * station; `AbortError` means we paused or swapped the source ourselves.
 * Neither should mark the station failed or trigger a skip.
 */
export function classifyPlayRejection(error: unknown): PlayRejection {
  const name =
    error && typeof error === "object"
      ? (error as { name?: unknown }).name
      : null;
  if (name === "NotAllowedError") return "blocked";
  if (name === "AbortError") return "aborted";
  return "stream";
}

export function isPlaybackStalled(input: {
  isPlaying: boolean;
  paused: boolean;
  hidden: boolean;
  lastProgressAt: number;
  now: number;
  timeoutMs?: number;
}): boolean {
  if (!input.isPlaying || input.paused || input.hidden) return false;
  if (!input.lastProgressAt) return false;
  return input.now - input.lastProgressAt >= (input.timeoutMs ?? STALL_TIMEOUT_MS);
}
