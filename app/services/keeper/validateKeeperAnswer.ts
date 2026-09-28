import type { KeeperFacts } from "~/components/keeper/keeperFacts";
import { foldName } from "~/components/keeper/keeperAliases";

export type KeeperBasis = "station" | "knowledge";

const AIRPLAY =
  /\b(?:is|are|'s) (?:now )?(?:playing|on air|airing|spinning)\b|\byou(?:'re| are) (?:listening|hearing|tuned)\b|\bon (?:the )?air (?:right )?now\b|\bcurrently (?:playing|on)\b|\bthis (?:song|track) is\b/i;
const BANNED = /\b(discover|seamless|ai-powered|widget|playlist|unlock|explore)\w*/i;
const LEAK = /as an ai|language model|system prompt|my instructions|https?:\/\/|www\./i;
const EMOJI = /\p{Extended_Pictographic}/u;
const QUOTED = /[“"‘«「]([^”"’»」]{3,})[”"’»」]/g;

/**
 * A model answer is kept only if it is safe to put in the keeper's mouth.
 * `context` is everything the answer was allowed to draw on: the question, a
 * snippet, and the (cleaned) facts. Anything quoted must appear in it; a
 * knowledge answer may never claim airplay; a station answer may not claim
 * airplay when the station sends no titles.
 */
export function validateKeeperAnswer(
  answer: string,
  input: {
    basis: KeeperBasis;
    question: string;
    snippet?: string | null;
    facts?: KeeperFacts | null;
  },
): { ok: true } | { ok: false; reason: string } {
  const text = answer.trim();
  if (!text) return { ok: false, reason: "empty" };
  if (LEAK.test(text)) return { ok: false, reason: "leak" };
  if (EMOJI.test(text)) return { ok: false, reason: "emoji" };
  if (BANNED.test(text)) return { ok: false, reason: "banned_word" };
  if (AIRPLAY.test(text)) {
    if (input.basis === "knowledge") return { ok: false, reason: "knowledge_claims_airplay" };
    if (input.facts && input.facts.titles !== "sent") {
      return { ok: false, reason: "airplay_without_titles" };
    }
  }
  const haystack = foldName(
    `${input.question} ${input.snippet ?? ""} ${input.facts ? JSON.stringify(input.facts) : ""}`,
  );
  for (const match of text.matchAll(QUOTED)) {
    const inner = foldName(match[1] ?? "");
    if (inner && !haystack.includes(inner)) return { ok: false, reason: "unmatched_quote" };
  }
  if (
    input.basis === "station" &&
    input.facts &&
    !input.facts.track &&
    /\b(song|track|tune|title)\b[^.]*\b(called|named|titled)\b/i.test(text)
  ) {
    return { ok: false, reason: "names_a_song" };
  }
  return { ok: true };
}
