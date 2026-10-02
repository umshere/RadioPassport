import { foldName } from "./keeperAliases";

/**
 * A station named for someone ("Mohanlal Hits", "Yesudas Songs Radio"): the
 * words left once the usual radio words are taken away. Pure and isomorphic.
 * This only proposes a name; the server checks it is a real person or group
 * before the desk offers anything.
 */
const GENERIC = new Set(
  (
    "hits hit songs song music radio fm am live online best top evergreen melodies melody collection jukebox official " +
    "channel stream streaming hd mix remix beats golden old new classics classic tunes tune love super mega nonstop " +
    "non-stop special only tv web station network the and of for in on by vol volume non stop 24x7 24/7 24 7 sound " +
    "sounds nostalgia nostalgic romantic filmy film movie movies cinema latest superhit superhits all time forever " +
    "malayalam tamil telugu kannada hindi bengali punjabi marathi gujarati urdu english spanish french german " +
    "kerala india indian tamilnadu karnataka mix play player digital wave waves vibes vibe"
  ).split(/\s+/),
);

export type SubjectCandidate = string;

export function subjectCandidate(stationName: string, avoid: Array<string | null | undefined> = []): SubjectCandidate | null {
  const folded = new Set(avoid.filter(Boolean).map((value) => foldName(String(value))));
  const words = stationName
    .replace(/[()[\]{}|•·_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
  const kept: string[] = [];
  for (const word of words) {
    if (/\d/.test(word)) continue;
    const bare = word.replace(/^[^\p{L}]+|[^\p{L}\p{N}]+$/gu, "");
    if (!bare) continue;
    if (GENERIC.has(bare.toLowerCase()) || folded.has(foldName(bare))) continue;
    kept.push(bare);
  }
  if (kept.length === 0 || kept.length > 3) return null;
  const name = kept.join(" ");
  if (name.length < 3 || name.length > 28 || /\d/.test(name)) return null;
  // A lone short all-caps token is an acronym ("BBC", "KFM"), not a person.
  if (kept.length === 1 && /^[A-Z]{2,4}$/.test(kept[0]!)) return null;
  return name;
}

export type StationSubject = {
  title: string;
  description: string;
  image: string | null;
  pageUrl: string | null;
};
