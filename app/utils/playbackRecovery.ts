import type { StationFailureReason } from "~/state/stationAvailabilityStore";
import { isHlsStreamUrl } from "~/utils/hlsPlayback";

const RECOVERABLE_REASONS: ReadonlySet<StationFailureReason> = new Set([
  "audio_error",
  "play_rejected",
  "timeout",
  "unknown",
  "hls_native_error",
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

/**
 * HLS playlists can be signed or reject unknown query params, so a retry
 * reloads the same URL instead of adding `rp_retry`.
 */
export function retryStreamUrl(url: string, token: string): string {
  return isHlsStreamUrl(url) ? url : withRetryToken(url, token);
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

/**
 * Hidden pages throttle and freeze timers, so wall-clock silence alone is not
 * a stall there. The element's own clock is: if `currentTime` has not moved
 * for the stall window while playback intent is on, the stream has drained
 * (an hls.js live buffer running dry behind a locked screen, or a plain
 * stream the OS cut off). This reads the media clock, never timer cadence.
 */
export function isMediaClockStalled(input: {
  isPlaying: boolean;
  currentTime: number;
  lastCurrentTime: number;
  lastAdvanceAt: number;
  now: number;
  timeoutMs?: number;
}): boolean {
  if (!input.isPlaying || !input.lastAdvanceAt) return false;
  if (input.currentTime !== input.lastCurrentTime) return false;
  return input.now - input.lastAdvanceAt >= (input.timeoutMs ?? STALL_TIMEOUT_MS);
}

/**
 * The OS (screen lock on Android, battery saver, a call) stopped the stream
 * while the page was away. When the listener comes back, start it again,
 * unless they changed station or pressed Play/Pause themselves since.
 */
export function shouldResumeOnReturn(input: {
  parkedStationId: string | null;
  stationNow: string | null;
  playbackIntent: boolean;
}): boolean {
  if (!input.parkedStationId) return false;
  if (input.playbackIntent) return false;
  return input.parkedStationId === input.stationNow;
}

/** How long after the page returns to check that the stream is really moving. */
export const RETURN_CHECK_DELAY_MS = 1_500;
