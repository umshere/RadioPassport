// Minimal Radio Browser client with mirror fallback and simple JSON fetch helper
// Docs: https://api.radio-browser.info

type Json = unknown;

type RbFetchOptions = {
  softFail?: boolean;
  timeoutMs?: number;
};

// Prefer a few known mirrors; order loosely by reliability/geo spread.
const MIRRORS = [
  "https://de1.api.radio-browser.info",
  "https://nl1.api.radio-browser.info",
  "https://at1.api.radio-browser.info",
  "https://de2.api.radio-browser.info",
  "https://fi1.api.radio-browser.info",
  "https://fr1.api.radio-browser.info",
  "https://gb1.api.radio-browser.info",
  "https://us1.api.radio-browser.info",
  "https://all.api.radio-browser.info"
] as const;

const DEFAULT_TIMEOUT_MS = 5000;
const CACHED_TIMEOUT_MS = 2500;

let cachedBase: string | null = null;

function isServer(): boolean {
  return typeof window === "undefined";
}

function withHeaders(init?: RequestInit): RequestInit {
  if (!isServer()) return init ?? {};
  // User-Agent cannot be set in the browser; only add on server-side fetch.
  const headers = new Headers(init?.headers);
  if (!headers.has("User-Agent")) {
    headers.set("User-Agent", "radio-passport/1.0 (+dev)");
  }
  return { ...init, headers };
}

function buildSignal(init: RequestInit | undefined, timeoutMs: number) {
  if (!timeoutMs) return { signal: init?.signal, cleanup: () => undefined };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const timeoutSignal = controller.signal;

  if (init?.signal) {
    if (typeof AbortSignal !== "undefined" && "any" in AbortSignal) {
      return {
        signal: AbortSignal.any([init.signal, timeoutSignal]),
        cleanup: () => clearTimeout(timeoutId),
      };
    }
    clearTimeout(timeoutId);
    return { signal: init.signal, cleanup: () => undefined };
  }

  return { signal: timeoutSignal, cleanup: () => clearTimeout(timeoutId) };
}

async function tryFetchJson<T extends Json>(
  base: string,
  path: string,
  init: RequestInit | undefined,
  timeoutMs: number
): Promise<T | null> {
  const { signal, cleanup } = buildSignal(init, timeoutMs);
  try {
    const url = `${base}${path}`;
    const res = await fetch(url, withHeaders({ ...init, signal }));
    if (!res.ok) {
      console.warn(`[RadioBrowser] Fetch failed: ${url} (${res.status})`);
      return null;
    }
    const ct = res.headers.get("content-type") ?? "";
    // Relaxed check: just ensure it's not HTML error page
    if (ct.includes("text/html")) {
      console.warn(`[RadioBrowser] Unexpected content-type: ${ct} for ${url}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.warn(`[RadioBrowser] Connection error for ${base}:`, err);
    return null;
  } finally {
    cleanup();
  }
}

/**
 * Fetch JSON from Radio Browser mirrors with fallback and in-process base URL cache.
 * @param path Path beginning with '/' such as '/json/countries'
 */
export async function rbFetchJson<T extends Json>(
  path: string,
  init?: RequestInit
): Promise<T>;
export async function rbFetchJson<T extends Json>(
  path: string,
  init: RequestInit | undefined,
  options: { softFail: true; timeoutMs?: number }
): Promise<T | null>;
export async function rbFetchJson<T extends Json>(
  path: string,
  init?: RequestInit,
  options?: RbFetchOptions
): Promise<T | null> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  // Try cached mirror first for speed.
  if (cachedBase) {
    const hit = await tryFetchJson<T>(cachedBase, path, init, CACHED_TIMEOUT_MS);
    if (hit) return hit;
    cachedBase = null;
  }

  for (const base of MIRRORS) {
    if (base === cachedBase) continue; // already tried
    const data = await tryFetchJson<T>(base, path, init, timeoutMs);
    if (data) {
      cachedBase = base;
      return data;
    }
  }

  // As a very last resort, try the generic domain (may be slower/less reliable).
  const fallback = await tryFetchJson<T>(
    "https://api.radio-browser.info",
    path,
    init,
    timeoutMs
  );
  if (fallback) return fallback;

  if (options?.softFail) return null;

  throw new Error(`RadioBrowser fetch failed for path: ${path}`);
}
