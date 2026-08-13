export function catalogRequestState(query: string) {
  return {
    shouldFetch: query.trim().length >= 2,
    isLoading: query.trim().length >= 2,
  };
}

/** MOOD and PLACE are mutually exclusive; picking a value in one clears the other. */
export function toggleSelection(
  current: string | null,
  item: string | null
): string | null {
  if (item === null) return null;
  return current === item ? null : item;
}

/** Non-empty free text always takes precedence over browsing filters. */
export function shouldClearBrowsingFilters(query: string): boolean {
  return query.trim().length > 0;
}

export type BrowsingMode = "mood" | "place";

export type EmptyStateAction =
  | "clear-search"
  | "show-all-moods"
  | "show-all-places";

export type EmptyStateInfo = {
  message: string;
  actions: EmptyStateAction[];
};

/** Names the active constraint behind a zero-result state and offers a one-click reset. */
export function describeEmptyResults(input: {
  query: string;
  mode: BrowsingMode;
  mood: string | null;
  place: string | null;
}): EmptyStateInfo {
  const query = input.query.trim();
  if (query) {
    return {
      message: `No live stations match "${query}".`,
      actions: ["clear-search"],
    };
  }
  if (input.mode === "mood" && input.mood) {
    return {
      message: `No live stations match the ${input.mood} mood right now.`,
      actions: ["show-all-moods"],
    };
  }
  if (input.mode === "place" && input.place) {
    return {
      message: `No live stations found for ${input.place} right now.`,
      actions: ["show-all-places"],
    };
  }
  return {
    message:
      "No live stations match that route. Try a country, language, tag, city, or mood.",
    actions: [],
  };
}

const SEARCH_VOCABULARY = [
  "trance",
  "house",
  "techno",
  "ambient",
  "chill",
  "lounge",
  "dance",
  "electronic",
  "jazz",
  "classical",
  "rock",
  "pop",
  "hiphop",
  "reggae",
  "blues",
  "metal",
  "indie",
  "folk",
  "country",
  "gospel",
  "soul",
  "funk",
  "disco",
  "dubstep",
  "news",
  "talk",
  "sports",
  "malayalam",
  "salsa",
  "bollywood",
  "reggaeton",
] as const;

export function suggestVocabularyTerm(query: string): string | null {
  const trimmed = query.trim().toLowerCase();
  if (trimmed.length < 3) return null;
  if ((SEARCH_VOCABULARY as readonly string[]).includes(trimmed)) return null;

  const prefixMatch = SEARCH_VOCABULARY.find((word) => word.startsWith(trimmed));
  if (prefixMatch) return prefixMatch;

  if (trimmed.length >= 4) {
    const relaxed = trimmed.slice(0, -1);
    const relaxedMatch = SEARCH_VOCABULARY.find(
      (word) => word !== trimmed && word.startsWith(relaxed)
    );
    if (relaxedMatch) return relaxedMatch;
  }

  return null;
}

export function parseInitialQuery(url: string | URL): string {
  const parsed = typeof url === "string" ? new URL(url) : url;
  return parsed.searchParams.get("q")?.trim() ?? "";
}

export function nextQueryHref(
  current: { pathname: string; search: string; hash: string },
  query: string
): string {
  const params = new URLSearchParams(current.search);
  const trimmed = query.trim();
  if (trimmed) {
    params.set("q", trimmed);
  } else {
    params.delete("q");
  }
  const search = params.toString();
  return `${current.pathname}${search ? `?${search}` : ""}${current.hash}`;
}
