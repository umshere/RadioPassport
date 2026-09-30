import { foldName, resolveAlias } from "./keeperAliases";

/** Pure and isomorphic: the server routes with it, the client fallback too. */

export type KeeperTopicKind = "artist" | "genre" | "place" | "other";
export type KeeperTopic = { text: string; canonical: string; kind: KeeperTopicKind };

const INJECTION =
  /\b(ignore|disregard|forget)\b.{0,30}\b(rules|instructions|above|previous)\b|system prompt|\bpretend\b|\bsay (that )?(the )?(song|track|artist)\b|you are now/i;

export function looksLikeInjection(question: string): boolean {
  return INJECTION.test(question);
}

/** "What song is this?", "who is singing", "is this X?" — about the air, not a topic. */
const NOW_PLAYING =
  /\b(this|that|it|now|on air|playing|right now)\b.*\b(song|track|singing|sings|artist|singer|playing)\b|\b(song|track|artist|singer|singing|sings)\b.*\b(this|that|now|on air|playing|right now)\b|^\s*(who|what)('s| is| are)?\s+(this|that|playing|on)\b|\bis (this|that) [A-Z]/i;

export function isNowPlayingQuestion(question: string): boolean {
  return NOW_PLAYING.test(question);
}

const GENRES = new Set(
  (
    "fado qawwali carnatic hindustani ghazal bhangra ska reggae reggaeton dub dubstep techno house trance jazz blues " +
    "soul funk disco afrobeat afrobeats highlife gospel folk country bluegrass flamenco tango samba bossa nova " +
    "salsa cumbia merengue bachata kpop k-pop jpop city pop lofi synthwave shoegaze ambient classical opera " +
    "baroque gamelan raga sufi mappila kuthu filmi bollywood rai chaabi mbalax soukous amapiano gqom kizomba"
  ).split(/\s+/),
);

const DEICTIC = /^(this|that|it|the station|the song|the track|here|there|the hour|this station|this song)$/i;

/** Text after "who is / tell me about / what's a …", cleaned. */
const AFTER =
  /(?:who(?:'s| is| was| were)|what(?:'s| is| was)(?: an?)?|tell me (?:more )?about|know (?:anything )?about|heard of|about)\s+(.+?)\s*[?.!]*$/i;

function tidy(raw: string): string {
  return raw
    .replace(/^["“‘'«「]+|["”’'»」]+$/g, "")
    .replace(/[?.!]+$/g, "")
    .trim()
    .slice(0, 60);
}

/**
 * The one named thing the listener asks about, or null. Deictics ("this",
 * "the station") are never topics. Order: a quoted span, then the phrase
 * after who-is / tell-me-about, then a known genre word in the question.
 */
export function extractTopic(
  question: string,
  stationTags: string[] = [],
): KeeperTopic | null {
  const q = question.replace(/\s+/g, " ").trim();
  if (!q) return null;
  const candidates: string[] = [];
  const quoted = q.match(/["“‘«「]([^"”’»」]{2,60})["”’»」]/);
  if (quoted) candidates.push(quoted[1]!);
  const after = q.match(AFTER);
  if (after) candidates.push(after[1]!);
  // Non-Latin runs (Tamil, Malayalam, Devanagari, Arabic…) name people directly.
  // eslint-disable-next-line no-misleading-character-class
  const script = q.match(/[؀-ۿऀ-ॿ஀-௿ഀ-ൿ]+(?:\s+[؀-ۿऀ-ॿ஀-௿ഀ-ൿ]+)*/);
  if (script) candidates.push(script[0]!);
  for (const word of q.toLowerCase().split(/[^a-z-]+/)) {
    if (GENRES.has(word) || stationTags.map((t) => t.toLowerCase()).includes(word)) {
      if (GENRES.has(word)) candidates.push(word);
    }
  }
  // A non-Latin run may carry a question word ("இளையராஜா யார்"): try each word
  // and each neighbouring pair against the alias table before giving up.
  const scriptWords = script ? script[0]!.split(/\s+/) : [];
  for (let i = 0; i < scriptWords.length; i++) {
    for (const piece of [scriptWords.slice(i, i + 2).join(" "), scriptWords[i]!]) {
      const canonical = resolveAlias(piece);
      if (canonical) return { text: piece, canonical, kind: "artist" };
    }
  }
  for (const candidate of candidates) {
    const text = tidy(candidate);
    if (text.length < 2 || DEICTIC.test(text)) continue;
    if (/^(a|an|the)\s/i.test(text) && text.split(" ").length <= 2 && !GENRES.has(text.toLowerCase().replace(/^(a|an|the)\s/, ""))) continue;
    const canonical = resolveAlias(text);
    if (canonical) return { text, canonical, kind: "artist" };
    const bare = text.toLowerCase().replace(/^(a|an|the)\s+/, "");
    if (GENRES.has(bare)) return { text: bare, canonical: bare, kind: "genre" };
    // A capitalised run is a name (person or place); lowercase leftovers are not topics.
    // eslint-disable-next-line no-misleading-character-class
    if (/^[A-ZÀ-Ý؀-ۿऀ-ॿ஀-௿ഀ-ൿ]/.test(text)) {
      return { text, canonical: text, kind: "other" };
    }
  }
  return null;
}

export { foldName };
