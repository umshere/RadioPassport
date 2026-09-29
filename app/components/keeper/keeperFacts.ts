import { stationLocation } from "~/components/radio-passport/StationRow";
import { cleanTrack } from "~/services/keeper/cleanTitle";
import { stationTags } from "~/components/radio-passport/stationInsights";
import type { Room } from "~/state/roomStore";
import type { Station } from "~/types/radio";
import {
  formatClock,
  localDateAtLongitude,
  solarHourAtLongitude,
  type SolarHour,
} from "~/utils/localTime";
import type { KeeperIntent } from "./keeperIntent";

/**
 * Everything the keeper is allowed to say, assembled from data the app
 * already holds: the station record, the clock at its longitude, the ICY
 * title the stream actually sent, and the Room's dossier. Nothing here is
 * written by a model and nothing is guessed — an empty field stays empty,
 * and the keeper says so.
 */
export type KeeperFacts = {
  station: {
    name: string;
    country: string;
    language: string | null;
    bitrate: number | null;
    codec: string | null;
    tags: string[];
  };
  city: string;
  /** Null when the station has no coordinates: no hour is ever guessed. */
  hour: {
    clock: string;
    localHour: number;
    solar: SolarHour;
  } | null;
  /** How the stream's title feed stands. */
  titles: "sent" | "none" | "waiting";
  /** Exactly what the ICY feed sent; null unless `titles` is "sent". */
  track: { artist: string | null; title: string | null } | null;
  dossier: {
    summary: string | null;
    facts: Array<{ label: string; value: string }>;
  } | null;
};

export type KeeperAnswer = {
  text: string;
  action?: { kind: "hour_hop"; hour: SolarHour };
};

export type KeeperQuestion = {
  intent: KeeperIntent;
  label: string;
  /** The hour a hop chip lands on. */
  hour?: SolarHour;
};

const LIMITS = {
  text: 120,
  summary: 480,
  tags: 8,
  tag: 40,
  dossierFacts: 6,
  factLabel: 40,
  factValue: 160,
  /** Whole facts object, serialized, as the server accepts it. */
  bytes: 4096,
} as const;

function clip(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.replace(/\s+/g, " ").trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

export function buildKeeperFacts(
  station: Station,
  room: Pick<Room, "signal" | "dossier"> | null,
  now = new Date(),
  /** The title feed has already answered once for this station (sent,
   *  none, or failed): a later re-poll is not "waiting" again. */
  titlesSettled = false,
): KeeperFacts {
  const longitude =
    typeof station.longitude === "number" && Number.isFinite(station.longitude)
      ? station.longitude
      : null;
  const local = longitude === null ? null : localDateAtLongitude(longitude, now);
  const rawTrack = room?.signal.track ?? null;
  // What the feed sent, cleaned; only a line that is really a track counts
  // as a title (a jingle, an ad or a URL is not a song).
  const cleaned = cleanTrack(
    clip(rawTrack?.artist, LIMITS.text),
    clip(rawTrack?.title, LIMITS.text),
    station.name,
  );
  const isTrack = cleaned.kind === "track" && cleaned.confidence >= 0.6;
  const artist = isTrack ? clip(cleaned.artist, LIMITS.text) : null;
  const title = isTrack ? clip(cleaned.title, LIMITS.text) : null;
  const sent = Boolean(artist || title);
  const waiting =
    !sent &&
    !titlesSettled &&
    (!room || room.signal.status === "loading" || room.signal.status === "idle");
  const dossier =
    sent && room && room.dossier.status === "ready"
      ? {
          summary: clip(room.dossier.summary, LIMITS.summary),
          facts: room.dossier.facts
            .slice(0, LIMITS.dossierFacts)
            .map((fact) => ({
              label: clip(fact.label, LIMITS.factLabel) ?? "",
              value: clip(fact.value, LIMITS.factValue) ?? "",
            }))
            .filter((fact) => fact.label && fact.value),
        }
      : null;
  return {
    station: {
      name: clip(station.name, LIMITS.text) ?? "This station",
      country: clip(station.country, LIMITS.text) ?? "",
      language: clip(station.language, LIMITS.text),
      bitrate: station.bitrate > 0 ? station.bitrate : null,
      codec: clip(station.codec, 16),
      tags: stationTags(station)
        .slice(0, LIMITS.tags)
        .map((tag) => tag.slice(0, LIMITS.tag)),
    },
    city: clip(stationLocation(station), LIMITS.text) ?? "",
    hour:
      local && longitude !== null
        ? {
            clock: formatClock(local),
            localHour: local.getUTCHours(),
            solar: solarHourAtLongitude(longitude, now),
          }
        : null,
    titles: sent ? "sent" : waiting ? "waiting" : "none",
    track: sent ? { artist, title } : null,
    dossier: dossier && (dossier.summary || dossier.facts.length) ? dossier : null,
  };
}

/**
 * The server's copy of the facts, re-read field by field: unknown keys drop,
 * strings are trimmed and capped, and anything oversized is refused. The
 * client's word is taken only for the shape the keeper already knows.
 */
export function sanitizeKeeperFacts(raw: unknown): KeeperFacts | null {
  if (!raw || typeof raw !== "object") return null;
  try {
    if (JSON.stringify(raw).length > LIMITS.bytes) return null;
  } catch {
    return null;
  }
  const input = raw as Record<string, unknown>;
  const station = (input.station ?? {}) as Record<string, unknown>;
  const name = clip(station.name, LIMITS.text);
  if (!name) return null;
  const hourIn = input.hour as Record<string, unknown> | null | undefined;
  const solar = hourIn?.solar;
  const localHour = Number(hourIn?.localHour);
  const clock = clip(hourIn?.clock, 5);
  const hour =
    hourIn &&
    clock &&
    /^\d{2}:\d{2}$/.test(clock) &&
    Number.isInteger(localHour) &&
    localHour >= 0 &&
    localHour < 24 &&
    (solar === "Dawn" || solar === "Midday" || solar === "Dusk" || solar === "Night")
      ? { clock, localHour, solar: solar as SolarHour }
      : null;
  const trackIn = input.track as Record<string, unknown> | null | undefined;
  // Never trust the client's split: recompute from what it sent.
  const cleaned = cleanTrack(
    clip(trackIn?.artist, LIMITS.text),
    clip(trackIn?.title, LIMITS.text),
    name,
  );
  const isTrack = cleaned.kind === "track" && cleaned.confidence >= 0.6;
  const artist = isTrack ? clip(cleaned.artist, LIMITS.text) : null;
  const title = isTrack ? clip(cleaned.title, LIMITS.text) : null;
  const sent = input.titles === "sent" && Boolean(artist || title);
  const dossierIn = input.dossier as Record<string, unknown> | null | undefined;
  const dossierFacts = Array.isArray(dossierIn?.facts)
    ? (dossierIn!.facts as unknown[])
        .slice(0, LIMITS.dossierFacts)
        .map((fact) => {
          const entry = (fact ?? {}) as Record<string, unknown>;
          return {
            label: clip(entry.label, LIMITS.factLabel) ?? "",
            value: clip(entry.value, LIMITS.factValue) ?? "",
          };
        })
        .filter((fact) => fact.label && fact.value)
    : [];
  const summary = clip(dossierIn?.summary, LIMITS.summary);
  const bitrate = Number(station.bitrate);
  return {
    station: {
      name,
      country: clip(station.country, LIMITS.text) ?? "",
      language: clip(station.language, LIMITS.text),
      bitrate: Number.isFinite(bitrate) && bitrate > 0 ? Math.round(bitrate) : null,
      codec: clip(station.codec, 16),
      tags: Array.isArray(station.tags)
        ? (station.tags as unknown[])
            .map((tag) => clip(tag, LIMITS.tag))
            .filter((tag): tag is string => Boolean(tag))
            .slice(0, LIMITS.tags)
        : [],
    },
    city: clip(input.city, LIMITS.text) ?? "",
    hour,
    titles: sent ? "sent" : input.titles === "waiting" ? "waiting" : "none",
    track: sent ? { artist, title } : null,
    dossier: sent && (summary || dossierFacts.length) ? { summary, facts: dossierFacts } : null,
  };
}

/**
 * The keeper's voice: a night clerk with headphones on, who has heard a lot of
 * radio. Short, warm, a little wry; first person; never reads out a record.
 * Each line has a few ways to be said, chosen by station so the same desk
 * always sounds like itself but two desks do not sound alike.
 */
function say(pool: readonly string[], seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return pool[h % pool.length]!;
}

const DAYPART: Record<SolarHour, string> = {
  Dawn: "The day is only just getting started there.",
  Midday: "Full daylight there.",
  Dusk: "The light is going there.",
  Night: "Lamps on there.",
};

/** "9:40 at night" from a 24h clock. */
export function spokenHour(clock: string, localHour: number): string {
  const minutes = clock.slice(3, 5);
  const twelve = localHour % 12 === 0 ? 12 : localHour % 12;
  const part =
    localHour < 5
      ? "at night"
      : localHour < 12
        ? "in the morning"
        : localHour < 17
          ? "in the afternoon"
          : localHour < 21
            ? "in the evening"
            : "at night";
  return `${twelve}:${minutes} ${part}`;
}

/** The first thing the keeper says when the sheet opens. Serif, human. */
export function keeperOpeningLine(facts: KeeperFacts): string {
  const place = facts.city || facts.station.country;
  if (facts.hour && place) {
    return `It’s ${spokenHour(facts.hour.clock, facts.hour.localHour)} in ${place}. This is ${facts.station.name}.`;
  }
  if (place) return `This is ${facts.station.name}, live from ${place}.`;
  return `This is ${facts.station.name}, live now.`;
}

/** The plain line about titles: what the stream sent, or that it sends none. */
export function keeperTrackLine(facts: KeeperFacts): string {
  if (facts.track) {
    return [facts.track.artist, facts.track.title].filter(Boolean).join(" — ");
  }
  if (facts.titles === "waiting") return "Ears up. Waiting for a name…";
  return say(
    [
      "They’re keeping the names to themselves on this one.",
      "No names here, just the sound.",
      "This one never says what it’s playing. Just listen.",
    ],
    facts.station.name,
  );
}

/** Somewhere it is another hour: morning, unless it is already morning there. */
export function hopHour(facts: KeeperFacts): SolarHour {
  return facts.hour?.solar === "Dawn" ? "Night" : "Dawn";
}

const HOP_LABEL: Record<SolarHour, string> = {
  Dawn: "Somewhere it’s morning →",
  Midday: "Somewhere it’s midday →",
  Dusk: "Somewhere it’s dusk →",
  Night: "Somewhere it’s night →",
};

/** Chips for this moment. "Who is this artist?" only when an artist was sent. */
export function suggestedQuestions(facts: KeeperFacts): KeeperQuestion[] {
  const chips: KeeperQuestion[] = [];
  if (facts.track?.artist) {
    chips.push({ intent: "artist", label: "Who is this artist?" });
  }
  if (facts.track) {
    chips.push({ intent: "track", label: "What’s playing?" });
  }
  chips.push({ intent: "language", label: "What language is this?" });
  if (facts.hour) {
    chips.push({ intent: "city", label: "What’s the hour there?" });
  }
  chips.push({ intent: "station", label: "About this station" });
  const hour = hopHour(facts);
  chips.push({ intent: "hour_hop", label: HOP_LABEL[hour], hour });
  return chips;
}

/** "english,spanish" → "English, Spanish". */
export function titleCase(value: string) {
  return value
    .split(/\s*,\s*/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toLocaleUpperCase() + part.slice(1))
    .join(", ");
}

/**
 * The keeper's grounded answers, no model involved. Every sentence is
 * built from a field in `facts`; a missing field becomes "I can't say".
 */
export function answerLocally(intent: KeeperIntent, facts: KeeperFacts): KeeperAnswer {
  const place = facts.city || facts.station.country || "there";
  switch (intent) {
    case "artist": {
      if (!facts.track) {
        return {
          text:
            facts.titles === "waiting"
              ? "Hold on, I’m still catching it…"
              : say(
                  [
                    `I couldn’t tell you. This one never says who’s singing. Ask me about ${place}, though. I’ve got stories.`,
                    `They don’t name anyone on this stream, so I’d only be guessing. ${place}, on the other hand: ask away.`,
                  ],
                  facts.station.name,
                ),
        };
      }
      if (!facts.track.artist) {
        return {
          text: `I’m getting “${facts.track.title}” and no name to go with it. A little mysterious.`,
        };
      }
      const detail = facts.dossier?.summary ?? facts.dossier?.facts[0]?.value ?? null;
      return {
        text: detail
          ? `That’s ${facts.track.artist}. ${detail}`
          : `${facts.track.artist}, is what comes through. Past that I’d be making it up.`,
      };
    }
    case "track":
      if (!facts.track) {
        return {
          text:
            facts.titles === "waiting"
              ? "Ears up. Waiting for a name…"
              : keeperTrackLine(facts),
        };
      }
      return { text: `Coming through right now: “${keeperTrackLine(facts)}”.` };
    case "language":
      return facts.station.language
        ? { text: `That’s ${titleCase(facts.station.language)} in your ears. Listen for the rhythm before the words.` }
        : { text: "I couldn’t swear to the language yet. Stay a while and let your ear decide." };
    case "city":
      return facts.hour
        ? {
            text: `It’s ${spokenHour(facts.hour.clock, facts.hour.localHour)} in ${place}. ${DAYPART[facts.hour.solar]}${facts.station.country && facts.station.country !== place ? ` ${place} is in ${facts.station.country}.` : ""}`,
          }
        : {
            text: `${facts.station.name} comes out of ${place}. Where exactly, it won’t say, so I can’t tell you the hour.`,
          };
    case "station": {
      const parts = [`That’s ${facts.station.name}${facts.station.country ? `, out of ${facts.station.country}` : ""}.`];
      if (facts.station.bitrate) {
        parts.push(
          `The signal is ${facts.station.bitrate} kbps${facts.station.codec ? ` ${facts.station.codec.toUpperCase()}` : ""}.`,
        );
      }
      if (facts.station.tags.length) {
        parts.push(`They call themselves ${facts.station.tags.slice(0, 4).join(", ")}.`);
      }
      return { text: parts.join(" ") };
    }
    case "hour_hop": {
      const hour = hopHour(facts);
      return {
        text: `Somewhere it’s ${hour === "Dawn" ? "morning" : hour.toLowerCase()} right now. I’ll open that board.`,
        action: { kind: "hour_hop", hour },
      };
    }
    case "off_topic":
      return {
        text: "That’s past my desk, I’m afraid. Station, place, hour: those I can do.",
      };
    default:
      return { text: "I can’t make that one out from here." };
  }
}
