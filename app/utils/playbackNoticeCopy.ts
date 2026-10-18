import { MAX_PLAYBACK_RECOVERY_ATTEMPTS } from "./playbackRecovery";

export type PlaybackNoticeKind =
  | "retrying"
  | "skip"
  | "queue-empty"
  | "too-many-failures"
  | "tap-play"
  | "http-only"
  | "silent-switch";

export function playbackNoticeCopy(
  kind: PlaybackNoticeKind,
  input: { attempt?: number; maxAttempts?: number } = {}
) {
  if (kind === "retrying") {
    const attempt = Math.max(1, input.attempt ?? 1);
    const maxAttempts = Math.max(
      attempt,
      input.maxAttempts ?? MAX_PLAYBACK_RECOVERY_ATTEMPTS
    );
    return `Signal unstable. Retrying (${attempt}/${maxAttempts}).`;
  }
  if (kind === "skip") return "This signal failed. Next station.";
  if (kind === "queue-empty") return "No other live signal in this line.";
  if (kind === "tap-play") return "Tap play to start the signal.";
  if (kind === "http-only")
    return "This signal only speaks HTTP; the browser won't allow it.";
  if (kind === "silent-switch") return "No sound? Check the silent switch.";
  return "Playback paused. Try another station.";
}
