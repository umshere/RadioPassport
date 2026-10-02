import type { SolarHour } from "~/utils/localTime";
import { foldName } from "./keeperAliases";
import { HOP_LABEL, hopHour, type KeeperFacts } from "./keeperFacts";
import type { KeeperIntent } from "./keeperIntent";
import { VOICE } from "./keeperVoice";

/**
 * The counter offers at most three next moves, chosen for what was just said.
 * Pure: the sheet, the desk card and the tests all read this one function.
 * Nothing here talks to the network; a move that needs the notebook is simply
 * not offered when the notebook is shut or unreachable.
 */
export type MoveRole =
  | "subject"
  | "facts"
  | "topic"
  | "artist"
  | "playing"
  | "language"
  | "city"
  | "station"
  | "hop"
  | "similar"
  | "ticket"
  | "hush";

export type Move = {
  /** Stable per station: a used move is not offered again. */
  id: string;
  role: MoveRole;
  label: string;
  /** Moves that go through the ask (and may be answered from the notebook log). */
  question?: string;
  topic?: string;
  /** Moves the grounded local answers handle without a network call. */
  intent?: KeeperIntent;
  hour?: SolarHour;
};

/** What the counter last said, as far as choosing the next moves goes. */
export type Last = { role: MoveRole | "opening" | "murmur" | "deadend" | "typed"; topic?: string };

export type MoveContext = {
  facts: KeeperFacts;
  askEnabled: boolean;
  /** The notebook cannot be reached right now. */
  offline: boolean;
  /** The person or group the station is named for, once Wikipedia confirmed one. */
  subject: string | null;
  /** Place, country, language, genre: the topics the notebook can tell about. */
  topics: string[];
  hasSimilar: boolean;
  canShare: boolean;
  hushed: boolean;
  surface: "sheet" | "desk";
  last: Last | null;
  asked: ReadonlySet<string>;
};

function catalog(ctx: MoveContext) {
  const { facts } = ctx;
  const notebook = ctx.askEnabled && !ctx.offline;
  const sent = Boolean(facts.track) || facts.titles === "waiting";
  const subject: Move | null =
    notebook && ctx.subject
      ? { id: "subject", role: "subject", label: VOICE.askAbout(ctx.subject), question: VOICE.askAbout(ctx.subject), topic: ctx.subject }
      : null;
  const topicMove = (name: string): Move => ({
    id: `topic:${foldName(name)}`,
    role: "topic",
    label: VOICE.askAbout(name),
    question: VOICE.askAbout(name),
    topic: name,
  });
  const topics = notebook
    ? ctx.topics
        .filter((name) => !ctx.subject || foldName(name) !== foldName(ctx.subject))
        .map(topicMove)
    : [];
  const artist: Move | null = facts.track?.artist ? { id: "artist", role: "artist", label: "Who is this artist?", intent: "artist" } : null;
  const playing: Move | null =
    ctx.surface === "desk" || !sent ? null : { id: "playing", role: "playing", label: "What’s playing?", intent: "track" };
  const language: Move | null = facts.station.language
    ? { id: "language", role: "language", label: "What language is this?", intent: "language" }
    : null;
  const city: Move | null = facts.hour ? { id: "city", role: "city", label: "What’s the hour there?", intent: "city" } : null;
  const station: Move | null =
    ctx.surface === "desk" ? null : { id: "station", role: "station", label: "Who’s this station?", intent: "station" };
  const hour = hopHour(facts);
  const hop: Move = { id: "hop", role: "hop", label: HOP_LABEL[hour], intent: "hour_hop", hour };
  const similar: Move | null =
    ctx.surface === "desk" || !ctx.hasSimilar ? null : { id: "similar", role: "similar", label: VOICE.moveSimilar };
  const ticket: Move | null = ctx.canShare ? { id: "ticket", role: "ticket", label: VOICE.moveTicket } : null;
  const hush: Move = {
    id: "hush",
    role: "hush",
    label: ctx.hushed ? VOICE.moveSpeak : VOICE.moveHush,
  };
  const factsMove = (topic: string): Move | null =>
    notebook ? { id: `facts:${foldName(topic)}`, role: "facts", label: VOICE.moreFacts(topic), question: VOICE.askFacts(topic), topic } : null;
  return { subject, topics, artist, playing, language, city, station, hop, similar, ticket, hush, factsMove };
}

/** Every move the opening could offer, in priority order (the counter shows the first three). */
export function keeperOpeningMoves(ctx: MoveContext): Move[] {
  const c = catalog(ctx);
  return [c.subject, c.artist ?? c.playing, c.topics[0] ?? null, c.language, c.hop, c.station, c.city].filter(
    (move): move is Move => move !== null && !ctx.asked.has(move.id),
  );
}

/** At most three moves for this moment, never one already used. */
export function keeperMoves(ctx: MoveContext): Move[] {
  const c = catalog(ctx);
  const [place, nextPlace] = [c.topics[0] ?? null, c.topics[1] ?? null];
  const free = (move: Move | null): move is Move => move !== null && !ctx.asked.has(move.id);
  const nextTopic = c.topics.find((move) => !ctx.asked.has(move.id)) ?? null;

  const opening = [c.subject, c.artist ?? c.playing, place, c.language, c.hop, c.station, c.city];
  const last = ctx.last;
  let lists: Array<Move | null>;
  if (!last || last.role === "opening" || last.role === "hush") {
    lists = ctx.hushed ? [c.hush, ...opening] : opening;
  } else if (last.role === "murmur") {
    const asked = last.topic ? c.topics.find((move) => foldName(move.topic ?? "") === foldName(last.topic ?? "")) ?? null : null;
    lists = [asked, c.hush, c.hop, ...opening];
  } else if (last.role === "subject") {
    lists = [last.topic ? c.factsMove(last.topic) : null, nextTopic, c.similar, c.hop, c.ticket];
  } else if (last.role === "facts") {
    lists = [nextTopic, c.hop, c.ticket, c.similar];
  } else if (last.role === "topic") {
    lists = [nextTopic, c.hop, c.similar, c.ticket];
  } else if (last.role === "artist" || last.role === "playing") {
    lists = [c.artist, nextTopic, c.ticket, c.hop, c.similar];
  } else if (last.role === "deadend") {
    lists = [nextTopic, c.similar, c.hop, c.language];
  } else if (last.role === "station") {
    lists = [c.similar, c.ticket, c.hop, nextTopic];
  } else if (last.role === "similar") {
    lists = [c.hop, c.ticket, nextTopic];
  } else {
    lists = [nextTopic ?? nextPlace, c.hop, c.similar, c.ticket];
  }
  const out: Move[] = [];
  for (const move of [...lists, ...opening]) {
    if (!free(move) || out.some((m) => m.id === move.id)) continue;
    // The hush switch is only ever offered when it fits: opened from a murmur, or already hushed.
    if (move.role === "hush" && !(ctx.hushed || last?.role === "murmur")) continue;
    out.push(move);
    if (out.length === 3) break;
  }
  return out;
}
