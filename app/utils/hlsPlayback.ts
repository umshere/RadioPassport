/**
 * HLS is detected from the URL, not the Radio Browser `hls` flag: the flag is
 * unreliable (the directory ignores `hls=true` in search) and some curated
 * demo stations set it without a playlist URL. Playback support is decided by
 * the element, so iOS Safari can use its native HLS stack.
 */
export function isHlsStreamUrl(url: string): boolean {
  if (!url) return false;
  try {
    const path = new URL(url, "https://placeholder.local").pathname;
    return path.toLowerCase().endsWith(".m3u8");
  } catch {
    return false;
  }
}

type CanPlayType = { canPlayType: (type: string) => string };

export function canPlayNativeHls(audio: CanPlayType): boolean {
  try {
    return audio.canPlayType("application/vnd.apple.mpegurl") !== "";
  } catch {
    return false;
  }
}

export type HlsFailureReason = "hls_native_error" | "hls_unsupported";

export function hlsFailureReason(input: {
  isHls: boolean;
  nativeHls: boolean;
}): HlsFailureReason | null {
  if (!input.isHls) return null;
  return input.nativeHls ? "hls_native_error" : "hls_unsupported";
}
