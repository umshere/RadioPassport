import { MAX_PLAYBACK_RECOVERY_ATTEMPTS } from "./playbackRecovery";

export type PlaybackNoticeKind =
  | "retrying"
  | "skip"
  | "queue-empty"
  | "too-many-failures";

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
  return "Playback paused. Try another station.";
}
