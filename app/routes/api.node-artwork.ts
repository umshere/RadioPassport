import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { fetchWikipediaImage } from "~/utils/imageSearch";

/**
 * Portraits for tide nodes — artists, films, places. Wikipedia PageImages
 * only: freely licensed, hotlink-stable, and returned by a real API, never
 * guessed. No image, no node art; the monogram disc holds.
 */

const KINDS = new Set(["artist", "film", "place"]);
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

const portraitCache = new Map<string, { expiresAt: number; url: string | null }>();

function cacheGet(key: string): string | null | undefined {
  const entry = portraitCache.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt <= Date.now()) {
    portraitCache.delete(key);
    return undefined;
  }
  return entry.url;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const kind = (url.searchParams.get("kind") ?? "").trim();
  const query = (url.searchParams.get("q") ?? "").trim();
  if (!KINDS.has(kind) || !query || query.length > 120) {
    return json({ status: "error", reason: "kind and q required." }, { status: 400 });
  }
  const key = `${kind}:${query.toLowerCase()}`;
  const cached = cacheGet(key);
  if (cached !== undefined) return json({ status: "ok", url: cached });
  const portrait = await fetchWikipediaImage(query);
  portraitCache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, url: portrait });
  if (portraitCache.size > 256) {
    const oldest = portraitCache.keys().next().value;
    if (oldest !== undefined) portraitCache.delete(oldest);
  }
  return json({ status: "ok", url: portrait });
}
