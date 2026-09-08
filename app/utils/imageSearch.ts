
/**
 * Utility to fetch images from external APIs as fallbacks for MusicBrainz/CoverArtArchive
 */

const USER_AGENT = "radio-passport/1.0 (https://github.com/umshere/RadioPassport)";
const FETCH_TIMEOUT_MS = 6000;
const COVER_ART_BASE = "https://coverartarchive.org";

/** Small fetches fail fast: a slow image source must never stall the room. */
async function fetchWithTimeout(
  url: string,
  init?: RequestInit,
): Promise<Response> {
  const fetchPromise = fetch(url, init);
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("image fetch timed out")), FETCH_TIMEOUT_MS),
  );
  return Promise.race([fetchPromise, timeoutPromise]);
}

/**
 * A face needs a verified owner: the top search hit only counts when its
 * page title names our query in full. Without this, "Wellental" serves a
 * philosopher's portrait as a dance track's plate.
 */
export function wikipediaTitleMatch(pageTitle: string, query: string): boolean {
  const want = searchTokens(query);
  if (want.length === 0) return false;
  const hay = searchTokens(pageTitle);
  return want.every((token) => hay.includes(token));
}

type WikipediaPage = {
  title: string;
  url: string;
  image: string | null;
};

/**
 * One gated Wikipedia lookup: top search hit, title-matched, resolved to
 * its canonical URL with a 600px thumbnail. A miss is a miss — the caller
 * falls back to the monogram, never to a stranger's face.
 */
async function fetchWikipediaPage(query: string): Promise<WikipediaPage | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;
  try {
    // 1. Search for the most relevant page
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(trimmed)}&format=json&origin=*`;
    const searchRes = await fetchWithTimeout(searchUrl, {
      headers: { "User-Agent": USER_AGENT },
    });
    const searchData = await searchRes.json();

    const pageTitle = searchData?.query?.search?.[0]?.title;
    if (typeof pageTitle !== "string" || !wikipediaTitleMatch(pageTitle, trimmed)) {
      return null;
    }

    // 2. Resolve the canonical URL and thumbnail for that page
    const detailUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(pageTitle)}&prop=pageimages|info&inprop=url&format=json&pithumbsize=600&origin=*`;
    const detailRes = await fetchWithTimeout(detailUrl, {
      headers: { "User-Agent": USER_AGENT },
    });
    const detailData = await detailRes.json();

    const pages = detailData?.query?.pages;
    if (!pages) return null;

    const pageId = Object.keys(pages)[0];
    if (!pageId) return null;
    const page = pages[pageId] as
      | {
          title?: unknown;
          canonicalurl?: unknown;
          missing?: unknown;
          thumbnail?: { source?: unknown };
        }
      | undefined;
    if (!page || page.missing) return null;
    const resolvedTitle =
      typeof page.title === "string" ? page.title : pageTitle;
    // Redirects can land elsewhere — verify the destination too.
    if (!wikipediaTitleMatch(resolvedTitle, trimmed)) return null;
    const url = typeof page.canonicalurl === "string" ? page.canonicalurl : null;
    if (!url) return null;
    const image =
      typeof page.thumbnail?.source === "string" ? page.thumbnail.source : null;
    return { title: resolvedTitle, url, image };
  } catch (err) {
    console.error("Wikipedia lookup failed:", err);
    return null;
  }
}

/**
 * Fetches an artist portrait from Wikipedia using the PageImages API
 */
export async function fetchWikipediaImage(query: string): Promise<string | null> {
  return (await fetchWikipediaPage(query))?.image ?? null;
}

/**
 * Resolves a Wikipedia article for a pill that lands on a real page.
 * Artist first, then title — a song search rarely names an article, a
 * name usually does.
 */
export async function fetchWikipediaArticle(
  query: string,
): Promise<{ title: string; url: string } | null> {
  const page = await fetchWikipediaPage(query);
  return page ? { title: page.title, url: page.url } : null;
}

/** ICY titles carry film suffixes and joiners — strip them before matching. */
const MATCH_STOPWORDS = new Set([
  "and",
  "the",
  "a",
  "an",
  "of",
  "vs",
  "feat",
  "ft",
  "featuring",
]);

function searchTokens(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/\[[^\]]*\]|\([^)]*\)/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1 && !MATCH_STOPWORDS.has(token));
}

/**
 * Searchable cuts both ways: accept the top iTunes hit only when it names
 * our track in full or our artist in full. A confident wrong cover is
 * worse than the monogram disc.
 */
export function itunesArtworkMatch(
  result: { trackName?: unknown; artistName?: unknown; collectionName?: unknown },
  title: string,
  artist: string,
): boolean {
  const hay = searchTokens(
    [result?.trackName, result?.artistName, result?.collectionName]
      .filter((part) => typeof part === "string")
      .join(" "),
  );
  if (hay.length === 0) return false;
  const fullHit = (want: string) => {
    const tokens = searchTokens(want);
    return tokens.length > 0 && tokens.every((token) => hay.includes(token));
  };
  return fullHit(title) || fullHit(artist);
}

/**
 * Fetches album artwork from the iTunes Search API
 */
export async function fetchItunesImage(title: string, artist: string): Promise<string | null> {
    try {
        const query = `${artist} ${title}`;
        const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=1`;
        const res = await fetchWithTimeout(url, { headers: { "User-Agent": USER_AGENT } });
        const data = await res.json();

        const result = data?.results?.[0];
        if (!result || !itunesArtworkMatch(result, title, artist)) return null;

        // Return a higher resolution version of the artwork (standard is 100x100)
        return result.artworkUrl100?.replace("100x100bb", "600x600bb") || null;
    } catch (err) {
        console.error("iTunes image fetch failed:", err);
        return null;
    }
}

/**
 * Verify Cover Art Archive art exists before serving the URL. A guessed
 * front-250 that 404s hides the plate and blocks every fallback, so the
 * small index JSON answers existence without downloading the image.
 */
export async function fetchVerifiedCoverArt(
  kind: "release" | "release-group",
  mbid?: string | null,
): Promise<string | null> {
  if (!mbid || !mbid.trim()) return null;
  try {
    const res = await fetchWithTimeout(`${COVER_ART_BASE}/${kind}/${mbid.trim()}/`, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const images = Array.isArray(data?.images) ? data.images : [];
    if (images.length === 0) return null;
    return `${COVER_ART_BASE}/${kind}/${mbid.trim()}/front-250`;
  } catch (err) {
    console.error("Cover Art Archive check failed:", err);
    return null;
  }
}

/**
 * Release-group art rides wider than any single pressing: a single with no
 * cover of its own still shows the album's front.
 */
export async function resolveCoverArt(input: {
  releaseId?: string | null;
  releaseGroupId?: string | null;
}): Promise<string | null> {
  return (
    (await fetchVerifiedCoverArt("release", input.releaseId)) ??
    (await fetchVerifiedCoverArt("release-group", input.releaseGroupId)) ??
    null
  );
}

/**
 * Orchestrates image search across fallbacks
 */
export async function resolveTrackImage(title: string, artist: string): Promise<string | null> {
    // 1. Try iTunes first for specific track/album art
    const itunesArt = await fetchItunesImage(title, artist);
    if (itunesArt) return itunesArt;

    // 2. Fallback to Wikipedia for artist portraits if it's a popular artist
    // We only do this if we have a clear artist name
    if (artist && artist !== "Unknown artist") {
        const wikiArt = await fetchWikipediaImage(artist);
        if (wikiArt) return wikiArt;
    }

    return null;
}
