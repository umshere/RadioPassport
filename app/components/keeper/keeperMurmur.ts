import { spokenHour, titleCase, type KeeperFacts } from "./keeperFacts";

/**
 * What the keeper says unasked. A plan, not a script: local lines are built
 * from the station record and the clocks (always true, instant), fact steps
 * ask the server for one grounded, surprising fact about a place, country,
 * language, genre or artist. They alternate so the keeper is never quiet for
 * long and never repeats.
 */
export type FactKind = "place" | "country" | "language" | "genre" | "artist";

export type MurmurStep =
  | { type: "local"; id: "hour" | "offset" | "language" | "stay" }
  | { type: "fact"; kind: FactKind; name: string };

export const MURMUR_FIRST_MS = 7000;
export const MURMUR_EVERY_MS = 34000;
export const MURMUR_SHOW_MS = 10000;
export const MURMUR_MAX_PER_STATION = 8;

function firstOf(list: string | null | undefined): string | null {
  const item = list?.split(/\s*,\s*/).find(Boolean);
  return item ? titleCase(item) : null;
}

/** The order of the steps for a station; artist facts are slipped in live. */
export function planMurmurs(facts: KeeperFacts): MurmurStep[] {
  const steps: MurmurStep[] = [];
  const place = facts.city || "";
  const country = facts.station.country || "";
  const language = firstOf(facts.station.language);
  const genre = facts.station.tags.find((tag) => tag.length > 2 && tag.length < 30) ?? null;
  if (facts.hour) steps.push({ type: "local", id: "hour" });
  if (place) steps.push({ type: "fact", kind: "place", name: place });
  if (facts.hour) steps.push({ type: "local", id: "offset" });
  if (country && country !== place) steps.push({ type: "fact", kind: "country", name: country });
  if (language) steps.push({ type: "fact", kind: "language", name: language });
  steps.push({ type: "local", id: "stay" });
  if (genre) steps.push({ type: "fact", kind: "genre", name: genre });
  if (language) steps.push({ type: "local", id: "language" });
  return steps;
}

/** Hours the station's sun is ahead of (+) or behind (−) the listener's own. */
export function hourOffsetFromListener(facts: KeeperFacts, listenerHour: number): number | null {
  if (!facts.hour) return null;
  let diff = facts.hour.localHour - listenerHour;
  if (diff > 12) diff -= 24;
  if (diff < -12) diff += 24;
  return diff;
}

export function labelFor(step: MurmurStep, facts: KeeperFacts): string {
  if (step.type === "fact") return step.name;
  return facts.city || facts.station.country || facts.station.name;
}

/** A line that needs no network. Null when the step has nothing true to say. */
export function localMurmur(
  step: Extract<MurmurStep, { type: "local" }>,
  facts: KeeperFacts,
  input: { listenerHour: number; minutesHere: number },
): string | null {
  const place = facts.city || facts.station.country || "there";
  switch (step.id) {
    case "hour": {
      if (!facts.hour) return null;
      const spoken = spokenHour(facts.hour.clock, facts.hour.localHour);
      const late = facts.hour.localHour < 5 ? " Someone is still up." : "";
      return `It’s ${spoken} in ${place}.${late}`;
    }
    case "offset": {
      const diff = hourOffsetFromListener(facts, input.listenerHour);
      if (diff === null) return null;
      if (diff === 0) return `${place} keeps your hour, by the sun. Same light as yours.`;
      const n = Math.abs(diff);
      return `${place} is ${n} hour${n === 1 ? "" : "s"} ${diff > 0 ? "ahead of" : "behind"} you, by the sun. Strange to share a radio.`;
    }
    case "language": {
      const list = facts.station.language ? titleCase(facts.station.language) : null;
      return list ? `${list} on the air. Listen for the rhythm before the words.` : null;
    }
    case "stay": {
      if (input.minutesHere < 2) return `You’ve only just landed in ${place}. Stay a minute; it opens up.`;
      return `${input.minutesHere} minutes in ${place} now. You’re practically local.`;
    }
  }
}
