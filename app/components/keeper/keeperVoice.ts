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
  share: "Send a friend a ticket",
  tabPostcards: "Postcards",
  tabOnAir: "On air",
  tabStation: "Station",
  /** Said once, on the second stamp: the one ask to carry the radio further. */
  spread: "Music is for everyone, and there’s more of it than one life can hear. If this moved you, send a friend a ticket.",
  spreadSheet: "More music than one life can hear, and all of it free. Send one to somebody.",
  followLabel: "Follow on Instagram",
  tabMore: "More",
  similarLanguage: (language: string) => `More in ${language}`,
  similarTag: (tag: string) => `More ${tag}`,
  similarHour: (word: string) => `Also ${word}, elsewhere`,
  similarNone: "Nothing close to this one on my board yet.",
  threadOffer: (label: string) => `${label}? Open my desk and I’ll show you.`,
  noPostcards: (place: string) => `No postcards from ${place} yet. Ask me something and I’ll go looking.`,
  actShare: "Ticket",
  actShareSub: "Share station",
  actChatterOn: "Chatter on",
  actChatterOnSub: "Tap for quiet",
  actChatterOff: "Chatter off",
  actChatterOffSub: "Tap to speak up",
  actDesk: "The desk",
  actDeskSub: "Full page",
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

  /* ---- The desk (/listen): the keeper's own page. ---- */
  deskTitle: "The desk",
  deskLive: "On air",
  deskPaused: "Paused. I’ll keep your place.",
  /** The sky, when the station has not said where it is. */
  hourUnknown: "They haven’t told me where they are, so I won’t guess the hour.",
  hourUnknownShort: "Hour unknown",
  clockSpoken: (spoken: string, place: string) => `It’s ${spoken} in ${place}.`,
  offset: (hours: number | null) =>
    hours === null
      ? null
      : hours === 0
        ? "Your hour, by the sun"
        : `${Math.abs(hours)} hour${Math.abs(hours) === 1 ? "" : "s"} ${hours > 0 ? "ahead of" : "behind"} you`,
  /** Short form for the home sky: "5h ahead". */
  offsetShort: (hours: number | null) =>
    hours === null
      ? null
      : hours === 0
        ? "Same hour as you"
        : `${Math.abs(hours)}h ${hours > 0 ? "ahead" : "behind"}`,
  homeThere: (word: string) => `${word[0]!.toUpperCase()}${word.slice(1)} there`,
  guideHow: "How it works",
  askSteps:
    "Three steps. Land: tap Land here. Listen: stay a minute and I’ll stamp the city. Send: pass a friend a ticket.",
  askThinking: "Let me check the board…",
  guideAskChip: "Ask me anything",
  guideAskPlaceholder: "Ask me: where, when, how…",
  guideAskSend: "Ask",
  askHelp:
    "Pick a city and press play: it’s a real station, live there right now. Stay a minute and I’ll stamp it in your passport.",
  askPassport:
    "Listen to a station for a minute and I stamp its city in your passport. No scores. Just a record of where you’ve been.",
  askFree: "Hearing radio is always free. Always.",
  askSurprise: "Leave it with me. Dealing you somewhere.",
  guideSurprise: "Surprise me",
  guideAsk: (place: string) => `Ask me about ${place}`,
  guideElsewhere: (word: string) => `Where it’s ${word}`,
  guideLate: "It’s late for you. Somewhere the day is just starting.",
  guideDay: "Daylight where you are. Somewhere it’s evening.",
  passLabel: "Boarding pass",
  passFrom: "From",
  passTo: "To",
  passLocal: "Local",
  passSpoken: "Spoken",
  passSignal: "Signal",
  passAboard: "Aboard",
  passHere: "Here",
  notInNotebook: "Not in my notebook yet",
  aboard: (minutes: number) => (minutes < 1 ? "Just landed" : `${minutes} min`),
  stampedHere: "Stamped",
  stampPending: "Stay a minute and I’ll stamp it.",
  stampCount: (count: number) => `Passport · ${String(count).padStart(2, "0")}`,
  onAirWaiting: "Ears up. Waiting for a name…",
  onAirIdent: "Their own name, between songs. A station ident.",
  onAirAd: "An advert. Even here, somebody pays the bills.",
  onAirTalk: "Words, not songs, for now. Talk or news.",
  onAirProgramme: "That’s the name of the show, not the song.",
  onAirSent: "Sent by the station",
  askTitle: "Ask the desk",
  askLead: "Where, when, who. I’ll tell you what I know and say when I don’t.",
  postcardsOff: "The notebook is shut for now. The radio’s still on.",
  fileTitle: "The station’s file",
  departures: "Next departures",
  departuresNone: "No more departures from this gate. Change gate and I’ll find you another.",
  board: "Board",
  changeGate: "Change gate",
  deskEmptyTitle: "Nobody at the desk yet.",
  deskEmptyLine: "Pick a city, press play, and I’ll stamp you in.",

  /* ---- The departures hall (home): one line per state, no chatter. ---- */
  homeWelcome: "New here? Tap Land here. It’s a real station, live in another city. Stay a minute and I’ll stamp it in your passport.",
  homeSomewhere: (word: string) => `Somewhere it’s ${word}.`,
  homeSeeking: (query: string) => `Looking for ${query}.`,
  homeHourGate: (word: string) => `This gate: everywhere it’s ${word}.`,
  homeEmpty: "Nothing at that gate tonight.",
  homeLanded: (place: string) => `Landed in ${place}.`,
  homeAsleep: "Quiet hours here. Land anywhere and I’ll wake up.",
  homeAtDesk: "At the desk",
  homeGates: "Gates",
  homeHourHint: "Hear a place by its hour",
  homeBoard: "Departures",
  homeBoardAboard: "Other departures",
  homeBoardHour: (hour: string) => `Live where it is ${hour.toLowerCase()}`,
  homeNoDepartures: "NO DEPARTURES",
  homeMore: "More departures",
  homeFresh: "Fresh board",
  homeRecent: "Recent stamps",
  homeRecentOpen: "Open the passport",
  homeLeaving: "Ready",
} as const;

/** "Dawn" → "morning", for the lines that say where the sun is. */
export function hourWord(hour: string) {
  return hour === "Dawn" ? "morning" : hour.toLowerCase();
}
