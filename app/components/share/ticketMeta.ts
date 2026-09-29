import type { Station } from "~/types/radio";
import { SITE_ORIGIN } from "./shareStation";
import { TICKET_SIZE, ticketImagePath, ticketPagePath, ticketPlace } from "./ticketModel";
import { TICKET_VOICE } from "./ticketVoice";

export type TicketPageStation = Pick<Station, "uuid" | "name" | "city" | "country"> &
  Partial<Pick<Station, "state" | "longitude">>;

type MetaTag =
  | { title: string }
  | { name: string; content: string }
  | { property: string; content: string }
  | { tagName: "link"; rel: string; href: string };

/**
 * The link preview for a ticket page. Crawlers do not run scripts, so this is
 * the whole of what a chat app shows: the station, the place, the ticket
 * image. Timeless on purpose (previews are cached for days), and it never
 * claims anything is on air.
 */
export function ticketMeta(input: { origin?: string | null; uuid: string; station: TicketPageStation | null }): MetaTag[] {
  const origin = input.origin || SITE_ORIGIN;
  const url = `${origin}${ticketPagePath(input.uuid)}`;
  if (!input.station) {
    const title = "A ticket to elsewhere";
    const description = "Live radio from someone else’s now. Land in a city, stay long enough to be stamped.";
    return [
      { title: `${title} | Elsewhere` },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: url },
      { property: "og:image", content: `${origin}/elsewhere-og.jpg` },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: `${origin}/elsewhere-og.jpg` },
    ];
  }
  const { station } = input;
  const place = ticketPlace(station);
  const title = `${station.name} · ${place}`;
  const description = TICKET_VOICE.description(station.name, place);
  const image = `${origin}${ticketImagePath(input.uuid)}`;
  const alt = TICKET_VOICE.alt(station.name, place);
  return [
    { title: `${title} | Elsewhere` },
    { name: "description", content: description },
    { tagName: "link", rel: "canonical", href: url },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:url", content: url },
    { property: "og:image", content: image },
    { property: "og:image:type", content: "image/png" },
    { property: "og:image:width", content: String(TICKET_SIZE.card.width) },
    { property: "og:image:height", content: String(TICKET_SIZE.card.height) },
    { property: "og:image:alt", content: alt },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: image },
    { name: "twitter:image:alt", content: alt },
  ];
}
