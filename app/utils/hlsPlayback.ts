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

/** One-line kill switch for the Android/Chromium hls.js path. */
export const HLS_JS_ENABLED = true;

export type HlsHandle = {
  destroy: () => void;
  startLoad: () => void;
  loadSource: (url: string) => void;
};

const instances = new WeakMap<object, HlsHandle>();
const pending = new WeakSet<object>();

/** hls.js is imported and loading a manifest; play() must wait for it. */
export function setHlsPending(target: object, value: boolean): void {
  if (value) pending.add(target);
  else pending.delete(target);
}

export function isHlsPending(target: object): boolean {
  return pending.has(target);
}

export function rememberHls(target: object, hls: HlsHandle): void {
  instances.get(target)?.destroy();
  instances.set(target, hls);
}

export function hlsFor(target: object): HlsHandle | null {
  return instances.get(target) ?? null;
}

export function destroyHlsFor(target: object): void {
  pending.delete(target);
  const hls = instances.get(target);
  if (!hls) return;
  instances.delete(target);
  try {
    hls.destroy();
  } catch {
    // Already torn down by hls.js.
  }
}

export function hlsFailureReason(input: {
  isHls: boolean;
  nativeHls: boolean;
}): HlsFailureReason | null {
  if (!input.isHls) return null;
  return input.nativeHls ? "hls_native_error" : "hls_unsupported";
}
