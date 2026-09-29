/**
 * The Keeper of the Passport. Elsewhere's own character: the dry, kind border
 * clerk who stamps you into other people's evenings. Headphones on, a little
 * wry, delighted by everything, never in a hurry. Passport words (landed,
 * stamped, gate, papers) are seasoning, not every line. Every string the
 * keeper puts on screen that is not built from data lives here, so the
 * character can be tuned in one place.
 *
 * Honesty rule that never bends: anything the station did not say is marked
 * as the keeper's own notebook, and nothing is claimed to be on air unless the
 * stream sent it.
 */
export const VOICE = {
  /** Marks a line that came from general knowledge, not the station. */
  notebook: "Out of my notebook · not the station’s word",
  postcards: (place: string) => `Postcards from ${place}`,
  reading: (place: string) => `Reading up on ${place}…`,
  askPlaceholder: "Ask the desk: where, when, who…",
  askOff: "The desk is closed to questions for now. Try one of the lines above.",
  rateLimited: "That’s enough questions for one hour. The desk shuts for a bit; the radio’s still on.",
  unknownTopic: (topic: string) => `I haven’t got ${topic} in my notebook. Not from this desk, anyway.`,
  hushOn: "Quiet, please",
  hushOff: "Speak up again",
  share: "Send a friend a ticket",
  shareText: (place: string, spoken?: string | null) =>
    spoken ? `It’s ${spoken} in ${place} right now. Come and land here with me.` : `Come and land in ${place} with me.`,
  shared: "Ticket copied. Pass it along.",
  arrive: (place: string) => `Landed in ${place}. Papers in order.`,
  stamped: (place: string) => `Stamped. ${place} is in your passport now.`,
  hop: (word: string) => `Off we go: somewhere it’s ${word}.`,
  askAbout: (name: string) => `Tell me about ${name}`,
  friendCard: "A friend sent you a ticket",
  listenLive: "Land here",
  notNow: "Not now",
} as const;

/** "Dawn" → "morning", for the lines that say where the sun is. */
export function hourWord(hour: string) {
  return hour === "Dawn" ? "morning" : hour.toLowerCase();
}
