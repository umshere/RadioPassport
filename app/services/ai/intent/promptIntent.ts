import { GENERATED_INTENT_VOCAB } from "./generatedVocabulary";

const FALLBACK_COUNTRY_KEYWORDS: Record<string, string[]> = {
  India: [
    "india",
    "indian",
    "bharat",
    "hindustan",
    "delhi",
    "mumbai",
    "bombay",
    "kolkata",
    "calcutta",
    "kerala",
    "goa",
    "punjab",
    "bangalore",
    "bengaluru",
    "tamil nadu",
    "hindi",
    "bollywood",
  ],
  Japan: ["japan", "tokyo", "osaka", "kyoto", "japanese"],
  Brazil: ["brazil", "rio", "sao paulo", "brazilian"],
  Mexico: ["mexico", "mexican", "cdmx", "guadalajara"],
  France: ["france", "french", "paris"],
  Spain: ["spain", "spanish", "madrid", "barcelona", "ibiza"],
  "United States": ["usa", "america", "american", "california", "nyc", "new york"],
  "United Kingdom": ["uk", "british", "london", "england", "scotland"],
  Nigeria: ["nigeria", "lagos", "naija"],
  "South Africa": ["south africa", "cape town", "joburg", "johannesburg"],
};

const FALLBACK_LANGUAGE_KEYWORDS: Record<string, string[]> = {
  Hindi: ["hindi", "bollywood", "hindustani"],
  Tamil: ["tamil", "tamizh"],
  Telugu: ["telugu", "telegu"],
  Malayalam: ["malayalam", "malayalee"],
  Punjabi: ["punjabi", "punjab"],
  Bengali: ["bengali", "bangla"],
  Marathi: ["marathi"],
  Gujarati: ["gujarati"],
  Kannada: ["kannada"],
  Urdu: ["urdu"],
  Japanese: ["japanese", "nihongo"],
  Portuguese: ["portuguese", "portugues", "lusophone"],
  Spanish: ["spanish", "espanol", "latino"],
  French: ["french", "francais"],
};

const FALLBACK_TAG_KEYWORDS: Record<string, string[]> = {
  Bollywood: ["bollywood", "hindipop", "indipop"],
  Classical: ["classical", "rag", "raag", "ghazal"],
  Lofi: ["lofi", "lo-fi", "lo fi", "study", "focus"],
  Jazz: ["jazz", "swing"],
  Rock: ["rock", "guitar", "indie rock"],
};

type KeywordMap = Record<string, string[]>;

function mergeKeywordMaps(
  ...maps: Array<KeywordMap | undefined>
): KeywordMap {
  const merged = new Map<string, Set<string>>();

  for (const map of maps) {
    if (!map) continue;
    for (const [canonical, keywords] of Object.entries(map)) {
      if (!merged.has(canonical)) {
        merged.set(canonical, new Set());
      }
      const bucket = merged.get(canonical)!;
      for (const keyword of keywords) {
        if (!keyword) continue;
        bucket.add(keyword.toLowerCase().trim());
      }
    }
  }

  const result: KeywordMap = {};
  for (const [canonical, bucket] of merged.entries()) {
    result[canonical] = Array.from(bucket).filter(Boolean);
  }
  return result;
}

const COUNTRY_KEYWORDS = mergeKeywordMaps(
  GENERATED_INTENT_VOCAB?.countries,
  FALLBACK_COUNTRY_KEYWORDS
);

const LANGUAGE_KEYWORDS = mergeKeywordMaps(
  GENERATED_INTENT_VOCAB?.languages,
  FALLBACK_LANGUAGE_KEYWORDS
);

const TAG_KEYWORDS = mergeKeywordMaps(
  GENERATED_INTENT_VOCAB?.tags,
  FALLBACK_TAG_KEYWORDS
);

export type PromptIntent = {
  countries: string[];
  languages: string[];
  tags: string[];
  confidence: "none" | "low" | "medium" | "high";
};

function normalize(text: string | null | undefined) {
  return (text ?? "").toLowerCase();
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9+]+/g)
    .map((token) => token.trim())
    .filter(Boolean);
}

function collectMatches(
  tokens: string[],
  keywordMap: Record<string, string[]>,
  sourceText: string
): string[] {
  const matches = new Set<string>();
  const lowerSource = sourceText.toLowerCase();
  for (const [canonical, keywords] of Object.entries(keywordMap)) {
    const hasMatch = keywords.some((keyword) => {
      const normalized = keyword.toLowerCase();
      if (/[\s/-]/.test(normalized)) {
        return lowerSource.includes(normalized);
      }
      return tokens.some((token) => token === normalized);
    });
    if (hasMatch) {
      matches.add(canonical);
    }
  }
  return Array.from(matches);
}

export function extractPromptIntent(prompt: string | null | undefined): PromptIntent {
  const normalized = normalize(prompt);
  if (!normalized) {
    return { countries: [], languages: [], tags: [], confidence: "none" };
  }

  const tokens = tokenize(normalized);
  if (tokens.length === 0) {
    return { countries: [], languages: [], tags: [], confidence: "none" };
  }

  const countries = collectMatches(tokens, COUNTRY_KEYWORDS, normalized);

  const languages = collectMatches(tokens, LANGUAGE_KEYWORDS, normalized);

  const tags = collectMatches(tokens, TAG_KEYWORDS, normalized);

  const signalStrength = countries.length + languages.length + tags.length;
  const confidence = signalStrength >= 3 ? "high" : signalStrength >= 1 ? "medium" : "low";

  return { countries, languages, tags, confidence };
}
