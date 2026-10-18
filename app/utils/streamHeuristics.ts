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

export function upgradeHttpToHttps(url: string): string {
  if (!/^http:\/\//i.test(url)) return url;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:") return url;
    parsed.protocol = "https:";
    return parsed.href;
  } catch {
    return url;
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


/** Honour Data Saver and very slow connections by preferring small streams. */
export function prefersLowBitrate(
  connection?: { saveData?: boolean; effectiveType?: string } | null
): boolean {
  if (!connection) return false;
  return (
    Boolean(connection.saveData) ||
    connection.effectiveType === "slow-2g" ||
    connection.effectiveType === "2g"
  );
}
