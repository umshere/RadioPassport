type AudioSession = { type: string };

type NavigatorWithAudioSession = Navigator & {
  audioSession?: AudioSession;
};

let applied = false;

export function setPlaybackAudioSession(): void {
  if (applied) return;
  if (typeof navigator === "undefined") return;
  applied = true;
  if (!("audioSession" in navigator)) return;
  try {
    (navigator as NavigatorWithAudioSession).audioSession!.type = "playback";
  } catch {
    // Older WebKit exposes the slot but rejects the assignment.
  }
}

export function isIosDevice(userAgent?: string): boolean {
  const ua =
    userAgent ?? (typeof navigator !== "undefined" ? navigator.userAgent : "");
  if (!ua) return false;
  if (/iPhone|iPad|iPod/i.test(ua)) return true;
  const maxTouchPoints =
    typeof navigator !== "undefined" ? navigator.maxTouchPoints ?? 0 : 0;
  return /Macintosh/i.test(ua) && maxTouchPoints > 1;
}
