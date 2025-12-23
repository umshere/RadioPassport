
/**
 * Utility to fetch images from external APIs as fallbacks for MusicBrainz/CoverArtArchive
 */

const USER_AGENT = "radio-passport/1.0 (https://github.com/umshere/RadioPassport)";

/**
 * Fetches an artist portrait from Wikipedia using the PageImages API
 */
export async function fetchWikipediaImage(query: string): Promise<string | null> {
    try {
        // 1. Search for the most relevant page
        const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*`;
        const searchRes = await fetch(searchUrl, { headers: { "User-Agent": USER_AGENT } });
        const searchData = await searchRes.json();
        
        const pageTitle = searchData?.query?.search?.[0]?.title;
        if (!pageTitle) return null;

        // 2. Get the thumbnail for that page
        const thumbUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(pageTitle)}&prop=pageimages&format=json&pithumbsize=600&origin=*`;
        const thumbRes = await fetch(thumbUrl, { headers: { "User-Agent": USER_AGENT } });
        const thumbData = await thumbRes.json();

        const pages = thumbData?.query?.pages;
        if (!pages) return null;

        const pageId = Object.keys(pages)[0];
        if (!pageId) return null;
        const source = (pages as any)[pageId]?.thumbnail?.source;
        
        return source || null;
    } catch (err) {
        console.error("Wikipedia image fetch failed:", err);
        return null;
    }
}

/**
 * Fetches album artwork from the iTunes Search API
 */
export async function fetchItunesImage(title: string, artist: string): Promise<string | null> {
    try {
        const query = `${artist} ${title}`;
        const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=1`;
        const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
        const data = await res.json();

        const result = data?.results?.[0];
        if (!result) return null;

        // Return a higher resolution version of the artwork (standard is 100x100)
        return result.artworkUrl100?.replace("100x100bb", "600x600bb") || null;
    } catch (err) {
        console.error("iTunes image fetch failed:", err);
        return null;
    }
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
