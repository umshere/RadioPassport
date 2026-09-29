import type { Station } from "~/types/radio";
import { stationLocation } from "~/components/radio-passport/StationRow";
import { hourWord } from "~/components/keeper/keeperVoice";
import { formatClock, localDateAtLongitude, solarHourAtLongitude } from "~/utils/localTime";

/**
 * The ticket a listener sends: a boarding pass printed from the station's own
 * record. Every field here is data the directory gave us or the clock at the
 * station's longitude; a field we do not have is left off the ticket, never
 * filled in. Pure, so the server image, the share sheet and the tests agree.
 */

export type TicketFormat = "card" | "story";

export const TICKET_SIZE: Record<TicketFormat, { width: number; height: number }> = {
  card: { width: 1200, height: 630 },
  story: { width: 1080, height: 1350 },
};

export function parseTicketFormat(value: string | null | undefined): TicketFormat {
  return value === "story" ? "story" : "card";
}

/** The ticket page a friend opens: real per-station link previews, then the tune card. */
export function ticketPagePath(uuid: string) {
  return `/t/${encodeURIComponent(uuid)}`;
}

/** The ticket image. `.png` so chat apps and file pickers know what it is. */
export function ticketImagePath(uuid: string, format: TicketFormat = "card") {
  return `/ticket/${encodeURIComponent(uuid)}.png${format === "story" ? "?format=story" : ""}`;
}

/** Route param → bare uuid (the `.png` suffix is optional on the image route). */
export function ticketParamUuid(param: string | undefined) {
  return (param ?? "").trim().replace(/\.png$/i, "");
}

/**
 * Where the ticket goes: the city, else the region the directory gives
 * ("Lagos"), else the country. Never a guess.
 */
export function ticketPlace(station: Pick<Station, "city" | "country"> & Partial<Pick<Station, "state">>) {
  const place = stationLocation({ ...station, state: station.state ?? null } as Station);
  return place === "Unknown location" ? (station.country || "").trim() || "somewhere else" : place;
}

export type TicketHour = { clock: string; word: string };

/** The hour at the station, by the sun at its longitude. Null when it has not said where it is. */
export function ticketLocalHour(longitude: number | null | undefined, now = new Date()): TicketHour | null {
  if (typeof longitude !== "number" || !Number.isFinite(longitude)) return null;
  return {
    clock: formatClock(localDateAtLongitude(longitude, now)),
    word: hourWord(solarHourAtLongitude(longitude, now)),
  };
}

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

export type TicketFields = {
  uuid: string;
  /** "Nº 8A1B2C3D": the station's own directory id, shortened. */
  serial: string;
  name: string;
  place: string;
  /** Shown under the city only when it adds something. */
  country: string | null;
  local: TicketHour | null;
  spoken: string | null;
  signal: string | null;
  /** The postmark: the date where the station is (UTC when we do not know where). */
  postmarkDay: string;
  postmarkYear: string;
};

function clip(value: string, max: number) {
  const trimmed = value.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max - 1).trimEnd()}…` : trimmed;
}

export function ticketFields(
  station: Pick<
    Station,
    "uuid" | "name" | "city" | "state" | "country" | "longitude" | "language" | "bitrate" | "codec"
  >,
  now = new Date(),
): TicketFields {
  const place = ticketPlace(station);
  const country = (station.country || "").trim();
  const there = typeof station.longitude === "number" ? localDateAtLongitude(station.longitude, now) : now;
  const languages = (station.language || "")
    .split(/\s*,\s*/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toLocaleUpperCase() + part.slice(1));
  const signal = [station.bitrate ? `${station.bitrate}K` : null, station.codec ? station.codec.toUpperCase() : null]
    .filter(Boolean)
    .join(" ");
  return {
    uuid: station.uuid,
    serial: `Nº ${station.uuid.replace(/-/g, "").slice(0, 8).toUpperCase()}`,
    name: clip(station.name || "A station", 54),
    place: clip(place, 28),
    country: country && country.toLowerCase() !== place.toLowerCase() ? clip(country, 34) : null,
    local: ticketLocalHour(station.longitude, now),
    spoken: languages.length ? clip(languages.join(", "), 24) : null,
    signal: signal || null,
    postmarkDay: `${String(there.getUTCDate()).padStart(2, "0")} ${MONTHS[there.getUTCMonth()]}`,
    postmarkYear: String(there.getUTCFullYear()),
  };
}
