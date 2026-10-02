import { stationLocation } from "~/components/radio-passport/StationRow";
import { stationTags } from "~/components/radio-passport/stationInsights";
import { solarHourAtLongitude } from "~/utils/localTime";
import type { Station } from "~/types/radio";
import { foldName } from "./keeperAliases";
import { tidyStationName, titleCase } from "./keeperFacts";
import { hourWord, VOICE } from "./keeperVoice";

/**
 * Stations that share something real with the one on air, and the keeper says
 * which thing. Language first, then a genre tag, then the hour there. Never
 * "sounds like": he cannot hear it. One reason at a time, three rows at most.
 */
export type SimilarReason = "language" | "tag" | "hour";
export type Similar = { reason: SimilarReason; label: string; stations: Station[] };

export const SIMILAR_MAX = 3;

function languages(station: Station): string[] {
  return (station.language ?? "")
    .split(/[,/;]/)
    .map((part) => foldName(part))
    .filter(Boolean);
}

export function primaryLanguage(station: Station): string | null {
  const first = (station.language ?? "").split(/[,/;]/)[0]?.trim();
  return first ? first : null;
}

function usable(station: Station): boolean {
  if (station.lastCheckOk === false || station.probeStatus === "down") return false;
  if (station.isLikelyUp === false) return false;
  return Boolean(station.streamUrl || station.url);
}

/** Different places first (this is Elsewhere), then the better liked. */
function ranked(current: Station, list: Station[]): Station[] {
  const seen = new Set<string>([foldName(tidyStationName(current.name))]);
  return list
    .filter((station) => {
      const key = foldName(tidyStationName(station.name));
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => {
      const otherA = a.countryCode && a.countryCode === current.countryCode ? 1 : 0;
      const otherB = b.countryCode && b.countryCode === current.countryCode ? 1 : 0;
      if (otherA !== otherB) return otherA - otherB;
      return (b.votes ?? 0) + (b.clickCount ?? 0) - ((a.votes ?? 0) + (a.clickCount ?? 0));
    });
}

function genericTag(tag: string, current: Station): boolean {
  const key = foldName(tag);
  const known = new Set(
    [current.country, current.city ?? "", current.language ?? "", ...current.name.split(/\s+/)].map(foldName),
  );
  return key.length < 3 || key.length > 30 || known.has(key) || /^(radio|music|fm|am|live|online)$/.test(key);
}

export function similarStations(
  current: Station,
  pool: Station[],
  now = new Date(),
  limit = SIMILAR_MAX,
): Similar | null {
  const others = pool.filter((station) => station.uuid !== current.uuid && usable(station));

  const lang = languages(current)[0];
  if (lang) {
    const hits = ranked(current, others.filter((station) => languages(station).includes(lang)));
    if (hits.length) {
      return {
        reason: "language",
        label: VOICE.similarLanguage(titleCase(primaryLanguage(current) ?? lang)),
        stations: hits.slice(0, limit),
      };
    }
  }

  const tag = stationTags(current).find((value) => !genericTag(value, current));
  if (tag) {
    const key = foldName(tag);
    const hits = ranked(
      current,
      others.filter((station) => stationTags(station).some((value) => foldName(value) === key)),
    );
    if (hits.length) {
      return { reason: "tag", label: VOICE.similarTag(titleCase(tag)), stations: hits.slice(0, limit) };
    }
  }

  if (typeof current.longitude === "number") {
    const hour = solarHourAtLongitude(current.longitude, now);
    const hits = ranked(
      current,
      others.filter(
        (station) =>
          typeof station.longitude === "number" &&
          station.countryCode !== current.countryCode &&
          solarHourAtLongitude(station.longitude, now) === hour,
      ),
    );
    if (hits.length) {
      return { reason: "hour", label: VOICE.similarHour(hourWord(hour)), stations: hits.slice(0, limit) };
    }
  }
  return null;
}

export function similarWhere(station: Station): string {
  return stationLocation(station);
}
