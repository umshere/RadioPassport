import { trimEnv } from "~/services/ai/completeFallback";
import { GENERATED_INTENT_VOCAB } from "./generatedVocabulary";
import {
  extractPromptIntent,
  resolveTypedIntent,
  solarHourFromPrompt,
} from "./promptIntent";
import { JEV_MODEL, JEV_URL } from "~/services/keeper/jev.server";
import type { InterpretedIntent } from "~/types/ai";

/**
 * "Select instead of generate": code builds candidate countries, languages and
 * tags from the generated vocabulary; Jev only picks among them (or `none`).
 * It can never invent a place or language. One request, independent Choice
 * questions. Any miss, timeout or low confidence falls back to the extractor.
 */
export const JEV_INTERPRET_TIMEOUT_MS = 1500;
/** Jev confidence on the action question → InterpretedIntent.confidence. */
export const JEV_HIGH_CONFIDENCE = 0.7;
export const JEV_MEDIUM_CONFIDENCE = 0.45;
/** Below this the whole Jev read is discarded for the extractor. */
export const JEV_INTERPRET_MIN_CONFIDENCE = 0.3;
/** A field is only taken when its own answer is at least this sure. */
export const JEV_FIELD_MIN_CONFIDENCE = 0.4;
/** A country is only taken at this confidence: a language alone ("korean pop") is not a place. */
export const JEV_COUNTRY_MIN_CONFIDENCE = 0.6;
export const MAX_CANDIDATES_PER_FIELD = 6;

export const INTERPRET_ACTIONS = {
  search: "Names a place, language, genre, mood or station to look for",
  mix_surprise: "Wants a surprise, random pick, a mix, or to be taken anywhere",
  hour_hop: "Wants to hear somewhere at a time of day with no place, language or genre named",
} as const;
export type InterpretAction = keyof typeof INTERPRET_ACTIONS;
export const INTERPRET_HOURS = ["Dawn", "Midday", "Dusk", "Night"] as const;
type Hour = (typeof INTERPRET_HOURS)[number];

export type InterpretCandidates = {
  countries: string[];
  languages: string[];
  tags: string[];
};

const MOOD_ALIASES: Record<string, string[]> = {
  calm: ["ambient", "chillout", "relaxing", "easy listening", "lounge"],
  chill: ["chillout", "ambient", "lounge", "lofi"],
  relax: ["relaxing", "ambient", "chillout"],
  sleepy: ["ambient", "relaxing", "classical"],
  upbeat: ["dance", "pop", "hits"],
  party: ["dance", "club", "pop"],
  energetic: ["dance", "rock", "electronic"],
  sad: ["ballads", "blues", "acoustic"],
  melancholy: ["blues", "acoustic", "classical"],
  focus: ["lofi", "classical", "ambient"],
  study: ["lofi", "classical", "ambient"],
  rainy: ["jazz", "ambient", "lofi"],
  devotional: ["religious", "bhajan", "spiritual"],
  old: ["oldies", "retro", "classic"],
  oldies: ["oldies", "retro"],
  retro: ["oldies", "retro"],
  news: ["news", "talk"],
  talk: ["talk", "news"],
  folk: ["folk", "traditional"],
};

/** Cities and demonyms the vocabulary does not carry; values are vocabulary country names. */
const PLACE_ALIASES: Record<string, string> = {
  rome: "Italy", milan: "Italy", italian: "Italy",
  cairo: "Egypt", egyptian: "Egypt",
  turkish: "Turkey", istanbul: "Turkey", ankara: "Turkey",
  nigerian: "Nigeria", lagos: "Nigeria",
  berlin: "Germany", german: "Germany", munich: "Germany",
  korean: "South Korea", seoul: "South Korea",
  lisbon: "Portugal", portuguese: "Portugal",
  dubai: "United Arab Emirates", nairobi: "Kenya", accra: "Ghana",
  moscow: "Russia", russian: "Russia", sydney: "Australia", toronto: "Canada",
  havana: "Cuba", cuban: "Cuba", athens: "Greece", greek: "Greece",
  dublin: "Ireland", irish: "Ireland", amsterdam: "Netherlands", dutch: "Netherlands",
};

function stripAccents(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function norm(s: string) {
  return stripAccents(s.toLowerCase()).replace(/[^a-z0-9+ ]+/g, " ").replace(/\s+/g, " ").trim();
}

/** Edit distance, bailing once it exceeds `max`. */
function within(a: string, b: string, max: number): boolean {
  if (Math.abs(a.length - b.length) > max) return false;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const v = Math.min(
        (prev[j] ?? 0) + 1,
        (cur[j - 1] ?? 0) + 1,
        (prev[j - 1] ?? 0) + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      cur[j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return false;
    prev = cur;
  }
  return (prev[b.length] ?? max + 1) <= max;
}

type VocabMap = Record<string, string[]>;
const VOCAB = GENERATED_INTENT_VOCAB as unknown as {
  countries: VocabMap;
  languages: VocabMap;
  tags: VocabMap;
};

/** Typo tolerance: 1 edit from 5 letters, 2 from 9. Short words must match exactly. */
function fuzzyHit(token: string, keyword: string): boolean {
  if (token === keyword) return true;
  if (token.length < 5 || keyword.length < 5) return false;
  return within(token, keyword, token.length >= 9 ? 2 : 1);
}

function fuzzyMatches(
  map: VocabMap,
  tokens: string[],
  phrase: string,
  skip: (name: string) => boolean = () => false,
): string[] {
  const hits: Array<{ name: string; score: number }> = [];
  for (const [name, keywords] of Object.entries(map)) {
    if (skip(name)) continue;
    let score = 0;
    for (const raw of keywords.length ? keywords : [name]) {
      const kw = norm(raw);
      if (!kw) continue;
      if (kw.includes(" ")) {
        if (phrase.includes(kw)) score = Math.max(score, 3);
      } else if (tokens.some((t) => t === kw)) {
        score = Math.max(score, 3);
      } else if (tokens.some((t) => fuzzyHit(t, kw))) {
        score = Math.max(score, 2);
      }
    }
    if (score) hits.push({ name, score });
  }
  return hits.sort((a, b) => b.score - a.score).map((h) => h.name);
}

function uniq(items: string[], cap: number) {
  return [...new Set(items)].slice(0, cap);
}

const NOISE_TAG = /^[#\d]|^\W/;
/** Words that name the medium, not a genre: offering them makes Jev pick them. */
const GENERIC_TAGS = new Set([
  "radio", "music", "musica", "mix", "fm", "am", "station", "stations", "songs",
  "song", "online", "live", "hits", "best", "estacion", "radios", "world",
]);
const isGenericTag = (t: string) => GENERIC_TAGS.has(norm(t));

export function buildCandidates(prompt: string): InterpretCandidates {
  const phrase = norm(prompt);
  const tokens = phrase.split(" ").filter(Boolean);
  const exact = extractPromptIntent(prompt);

  const countries = uniq(
    [...exact.countries, ...fuzzyMatches(VOCAB.countries, tokens, phrase)],
    MAX_CANDIDATES_PER_FIELD,
  );
  const aliased = tokens.flatMap((t) => PLACE_ALIASES[t] ?? []).filter((n) => n in VOCAB.countries);
  countries.push(...aliased.filter((n) => !countries.includes(n)));
  countries.splice(MAX_CANDIDATES_PER_FIELD);
  const languages = uniq(
    [
      ...exact.languages,
      ...fuzzyMatches(VOCAB.languages, tokens, phrase, (n) => NOISE_TAG.test(n)),
    ],
    MAX_CANDIDATES_PER_FIELD,
  );

  const moodTags: string[] = [];
  for (const token of tokens) {
    for (const alias of MOOD_ALIASES[token] ?? []) {
      const match = Object.keys(VOCAB.tags).find((k) => norm(k) === alias);
      moodTags.push(match ?? alias);
    }
  }
  const tagPool = [
    ...exact.tags,
    ...fuzzyMatches(VOCAB.tags, tokens, phrase, (n) => NOISE_TAG.test(n)),
    ...moodTags,
  ].filter((t) => !isGenericTag(t));
  const seenTags = new Set<string>();
  const tags = uniq(
    tagPool.filter((t) => !seenTags.has(norm(t)) && !!seenTags.add(norm(t))),
    MAX_CANDIDATES_PER_FIELD,
  );
  return { countries, languages, tags };
}

function choices(list: string[], noneText: string) {
  const criteria: Record<string, string> = {};
  for (const item of list) criteria[item] = `The listener means ${item}`;
  criteria.none = noneText;
  return criteria;
}

export function jevInterpretRequestBody(prompt: string, c: InterpretCandidates) {
  const questions: Record<string, unknown> = {
    action: {
      type: "choice",
      instructions: "What does the listener want? Pick the closest option.",
      criteria: INTERPRET_ACTIONS,
    },
    hour: {
      type: "choice",
      instructions:
        "Which time of day do they ask for (Dawn is morning, Dusk is evening)? none if no time of day is asked.",
      criteria: {
        Dawn: "Morning, sunrise, early",
        Midday: "Afternoon, noon, daytime",
        Dusk: "Evening, sunset",
        Night: "Night, tonight, late, midnight",
        none: "No time of day asked",
      },
    },
  };
  if (c.countries.length) {
    questions.country = {
      type: "choice",
      instructions: "Which country does the listener ask for, by name, city or nationality? none if unsure.",
      criteria: choices(c.countries, "No country asked, or none of these"),
    };
  }
  if (c.languages.length) {
    questions.language = {
      type: "choice",
      instructions: "Which language does the listener want to hear? none if unsure.",
      criteria: choices(c.languages, "No language asked, or none of these"),
    };
  }
  if (c.tags.length) {
    questions.tag = {
      type: "choice",
      instructions: "Which genre or mood fits what the listener asks for? none if unsure.",
      criteria: choices(c.tags, "No genre or mood asked, or none of these"),
    };
  }
  return {
    model: JEV_MODEL,
    state: {
      setting:
        "A listener types what they want to hear into a live radio travel site. Pick only from the options given.",
      request: prompt,
    },
    questions,
  };
}

type Answer = { choice?: unknown; confidence?: unknown } | undefined;

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** Map Jev's answers back to an intent. Returns null when unusable or too unsure. */
export function intentFromJevAnswers(
  prompt: string,
  c: InterpretCandidates,
  answers: Record<string, Answer> | undefined,
): InterpretedIntent | null {
  const action = answers?.action;
  if (!action || typeof action.choice !== "string" || !(action.choice in INTERPRET_ACTIONS)) {
    return null;
  }
  const actionConfidence = num(action.confidence);
  if (actionConfidence !== null && actionConfidence < JEV_INTERPRET_MIN_CONFIDENCE) return null;

  // Only ever a value from the candidate list; `none`, junk and unsure picks drop to null.
  const pick = (answer: Answer, allowed: string[], min = JEV_FIELD_MIN_CONFIDENCE): string | null => {
    if (!answer || typeof answer.choice !== "string") return null;
    if (!allowed.includes(answer.choice)) return null;
    const conf = num(answer.confidence);
    if (conf !== null && conf < min) return null;
    return answer.choice;
  };

  const country = pick(answers?.country, c.countries, JEV_COUNTRY_MIN_CONFIDENCE);
  const language = pick(answers?.language, c.languages);
  const tag = pick(answers?.tag, c.tags);
  const hourChoice = answers?.hour?.choice;
  const hourConf = num(answers?.hour?.confidence);
  const hour: Hour | null =
    (INTERPRET_HOURS as readonly string[]).includes(hourChoice as string) &&
    (hourConf === null || hourConf >= JEV_FIELD_MIN_CONFIDENCE)
      ? (hourChoice as Hour)
      : null;

  const typed = resolveTypedIntent(prompt);
  const wantsMix = action.choice === "mix_surprise";
  const query = language
    ? language.toLowerCase()
    : country && !typed.query
      ? country
      : typed.query || prompt.trim();

  return {
    query,
    mood: tag ?? hour,
    place: null,
    country,
    language,
    tags: tag ? [tag] : [],
    wantsMix,
    confidence: confidenceFrom(actionConfidence),
  };
}

export function confidenceFrom(c: number | null): "high" | "medium" | "low" {
  if (c === null) return "medium";
  if (c >= JEV_HIGH_CONFIDENCE) return "high";
  if (c >= JEV_MEDIUM_CONFIDENCE) return "medium";
  return "low";
}

/** Which hour the prompt names by keyword; exposed for evals. */
export const keywordHour = solarHourFromPrompt;

/**
 * Interpret via Jev. Returns null on a missing key, timeout, HTTP error, a
 * malformed answer or low confidence; the caller then uses the extractor.
 * Raced, never aborted (a Remix fetch must not be aborted).
 */
export async function interpretWithJev(
  prompt: string,
  options: { env?: NodeJS.ProcessEnv; fetchImpl?: typeof fetch; timeoutMs?: number } = {},
): Promise<InterpretedIntent | null> {
  const apiKey = trimEnv((options.env ?? process.env).TYPESAFE_API_KEY);
  if (!apiKey) return null;
  const fetchImpl = options.fetchImpl ?? fetch;
  const candidates = buildCandidates(prompt);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), options.timeoutMs ?? JEV_INTERPRET_TIMEOUT_MS);
  });
  const call = (async () => {
    const response = await fetchImpl(JEV_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(jevInterpretRequestBody(prompt, candidates)),
    });
    if (!response.ok) throw new Error(`jev ${response.status}`);
    const payload = (await response.json()) as { answers?: Record<string, Answer> };
    return intentFromJevAnswers(prompt, candidates, payload.answers);
  })().catch(() => null);
  try {
    return await Promise.race([call, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
