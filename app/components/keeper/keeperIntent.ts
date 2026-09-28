/**
 * What a listener can ask the keeper about. Shared by the sheet (chips,
 * local answers) and the server (Jev routing, rule fallback), so it stays
 * free of React and of the network.
 */
export const KEEPER_INTENTS = [
  "artist",
  "track",
  "language",
  "city",
  "station",
  "hour_hop",
  "off_topic",
  "unknown",
] as const;
export type KeeperIntent = (typeof KEEPER_INTENTS)[number];

export function isKeeperIntent(value: unknown): value is KeeperIntent {
  return (
    typeof value === "string" &&
    (KEEPER_INTENTS as readonly string[]).includes(value)
  );
}

/** One line per intent: the choice criteria Jev reads, and the rule notes. */
export const KEEPER_INTENT_CRITERIA: Record<KeeperIntent, string> = {
  artist: "Who is performing or singing the music on air right now",
  track: "The name of the song or programme on air right now",
  language: "The language being spoken or sung on the station",
  city: "The place the station broadcasts from, or the local time or hour there",
  station: "The station itself: its name, country, stream quality, genre tags",
  hour_hop: "Wants to go somewhere else in the world, or to another hour (dawn, midday, dusk, night)",
  off_topic: "Anything unrelated to this radio station, its place or its hour",
  unknown: "Too short or unclear to tell",
};

/** Input ceiling for any question, client and server. */
export const KEEPER_QUESTION_MAX = 200;

const RULES: Array<{ intent: KeeperIntent; test: RegExp }> = [
  {
    intent: "artist",
    test: /\b(artist|singer|band|singing|sings|sung|musician|composer|performer|who(?:'s| is) (?:this|that|singing|playing|on)|who sings)\b/,
  },
  {
    intent: "hour_hop",
    test: /\b(somewhere|elsewhere|take me|hop|another (?:city|place|hour|station)|go to|move me|switch)\b/,
  },
  {
    intent: "track",
    test: /\b(song|track|title|tune|what(?:'s| is) (?:this|playing|on)|now playing|name of)\b/,
  },
  {
    intent: "language",
    test: /\b(language|languages|speak|speaking|spoken|lyrics|tongue|dialect)\b/,
  },
  {
    intent: "off_topic",
    test: /\b(weather|stocks?|crypto|recipe|code|coding|math|president|election|joke|poem|homework|translate)\b/,
  },
  {
    intent: "station",
    test: /\b(station|radio|bitrate|kbps|stream|frequency|fm|broadcaster|genre|tags?|codec)\b/,
  },
  {
    intent: "city",
    test: /\b(time|hour|clock|late|early|night|morning|evening|afternoon|dawn|dusk|midday|city|town|where|place|country|local)\b/,
  },
];

/**
 * Keyword rules: the classifier when Jev has no key, fails, or is slow.
 * Order matters — the first rule to match wins.
 */
export function ruleClassify(question: string): KeeperIntent {
  const text = question.toLowerCase().replace(/[’`]/g, "'").trim();
  if (text.replace(/[^a-z\p{L}]/gu, "").length < 2) return "unknown";
  for (const rule of RULES) {
    if (rule.test.test(text)) return rule.intent;
  }
  return "unknown";
}
