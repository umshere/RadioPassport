export function normalizeCandidateUrl(url?: string | null): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  const lower = trimmed.toLowerCase();
  if (!trimmed || ["null", "undefined", "n/a", "na", "-", "0"].includes(lower)) return null;

  try {
    if (typeof window !== "undefined" && trimmed.startsWith("//")) {
      return `${window.location.protocol}${trimmed}`;
    }
    const parsed = new URL(trimmed, typeof window !== "undefined" ? window.location.origin : "http://localhost");
    if (parsed.protocol === "http:" || parsed.protocol === "https:") return parsed.href;
    return null;
  } catch {
    return null;
  }
}

export function getUrlProtocol(url?: string | null): "http:" | "https:" | null {
  const normalized = normalizeCandidateUrl(url);
  if (!normalized) return null;
  try {
    return new URL(normalized).protocol as "http:" | "https:";
  } catch {
    return null;
  }
}

export function isMixedContentStream(
  streamUrl?: string | null,
  pageProtocol?: string | null
): boolean {
  const protocol = getUrlProtocol(streamUrl);
  const page = pageProtocol ?? (typeof window !== "undefined" ? window.location.protocol : null);
  return page === "https:" && protocol === "http:";
}

export function isSafariBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isSafari = /Safari\//.test(ua) && !/Chrome\//.test(ua) && !/Chromium\//.test(ua);
  return isSafari;
}

