import type { Station } from "~/types/radio";
import type { TriviaGraph } from "~/types/trivia";
import { EMPTY_GRAPH } from "~/types/trivia";
import { stationLocation } from "./StationRow";

/**
 * Elsewhere is one loop. Every control on screen belongs to a step
 * and names the next move. Features without a step are dead icons.
 */
export const ELSEWHERE_LOOP = [
  "land",
  "intent",
  "tune",
  "inhabit",
  "stamp",
  "next",
] as const;

export type LoopStep = (typeof ELSEWHERE_LOOP)[number];

export type FlowAction =
  | "land"
  | "continue"
  | "intent-catalog"
  | "intent-interpret"
  | "surprise"
  | "voice"
  | "solar-hour"
  | "atmosphere"
  | "same-hour"
  | "atlas"
  | "country"
  | "play-station"
  | "favorite"
  | "passport"
  | "replay-stamp"
  | "find-city"
  | "theater"
  | "issue"
  | "home"
  | "retry-mix"
  | "retry-catalog"
  | "clear-search"
  | "clear-hour"
  | "clear-place"
  | "prev-station"
  | "next-station"
  | "toggle-play"
  | "close-overlay";

export type FlowSurface =
  | "cover"
  | "header"
  | "dock"
  | "globe"
  | "atlas"
  | "country"
  | "passport"
  | "theater"
  | "about"
  | "empty"
  | "error";

export type SurfaceConnection = {
  id: string;
  surface: FlowSurface;
  label: string;
  step: LoopStep;
  action: FlowAction;
  keepsPlayback: boolean;
  optional?: boolean;
};

export const OPEN_PASSPORT_EVENT = "elsewhere:open-passport";

export function requestOpenPassport() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_PASSPORT_EVENT));
}

export function passportRequested(search: string) {
  const params = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search,
  );
  const value = params.get("passport");
  return value === null ? false : value !== "0";
}

export function homeWithPassportHref() {
  return "/?passport=1";
}

export function openPassportNow(
  pathname: string,
  goHomeWithPassport: () => void,
) {
  if (pathname === "/") {
    requestOpenPassport();
    return "event";
  }
  goHomeWithPassport();
  return "route";
}

/** The live product surface. If it is shown, it must do this. */
export const SURFACE_CONNECTIONS: SurfaceConnection[] = [
  {
    id: "wordmark",
    surface: "header",
    label: "Elsewhere wordmark",
    step: "land",
    action: "home",
    keepsPlayback: true,
  },
  {
    id: "issue",
    surface: "header",
    label: "Room",
    step: "next",
    action: "issue",
    keepsPlayback: true,
  },
  {
    id: "passport",
    surface: "header",
    label: "Passport",
    step: "stamp",
    action: "passport",
    keepsPlayback: true,
  },
  {
    id: "intent",
    surface: "header",
    label: "Intent field",
    step: "intent",
    action: "intent-catalog",
    keepsPlayback: true,
  },
  {
    id: "voice",
    surface: "header",
    label: "Speak a destination",
    step: "intent",
    action: "voice",
    keepsPlayback: true,
    optional: true,
  },
  {
    id: "surprise",
    surface: "header",
    label: "Surprise",
    step: "intent",
    action: "surprise",
    keepsPlayback: true,
  },
  {
    id: "land-here",
    surface: "cover",
    label: "Land here",
    step: "land",
    action: "land",
    keepsPlayback: false,
  },
  {
    id: "continue",
    surface: "cover",
    label: "Continue in this city",
    step: "land",
    action: "continue",
    keepsPlayback: false,
  },
  {
    id: "solar-hour",
    surface: "cover",
    label: "Solar hour chip",
    step: "tune",
    action: "solar-hour",
    keepsPlayback: true,
  },
  {
    id: "atmosphere",
    surface: "cover",
    label: "Day or night",
    step: "inhabit",
    action: "atmosphere",
    keepsPlayback: true,
  },
  {
    id: "atlas",
    surface: "cover",
    label: "Atlas",
    step: "tune",
    action: "atlas",
    keepsPlayback: true,
  },
  {
    id: "same-hour",
    surface: "cover",
    label: "Same-hour city",
    step: "tune",
    action: "same-hour",
    keepsPlayback: false,
  },
  {
    id: "station-row",
    surface: "cover",
    label: "Station row play",
    step: "tune",
    action: "play-station",
    keepsPlayback: false,
  },
  {
    id: "station-heart",
    surface: "cover",
    label: "Keep this signal",
    step: "stamp",
    action: "favorite",
    keepsPlayback: true,
  },
  {
    id: "cover-empty",
    surface: "cover",
    label: "Quiet-board quick actions",
    step: "tune",
    action: "atlas",
    keepsPlayback: true,
  },
  {
    id: "globe-dot",
    surface: "globe",
    label: "Globe city",
    step: "land",
    action: "play-station",
    keepsPlayback: false,
  },
  {
    id: "atlas-country",
    surface: "atlas",
    label: "Country in atlas",
    step: "tune",
    action: "country",
    keepsPlayback: true,
  },
  {
    id: "atlas-query",
    surface: "atlas",
    label: "Search countries or languages",
    step: "tune",
    action: "atlas",
    keepsPlayback: true,
  },
  {
    id: "atlas-close",
    surface: "atlas",
    label: "Close atlas",
    step: "next",
    action: "close-overlay",
    keepsPlayback: true,
  },
  {
    id: "country-back",
    surface: "country",
    label: "Back to atlas",
    step: "tune",
    action: "atlas",
    keepsPlayback: true,
  },
  {
    id: "country-play",
    surface: "country",
    label: "Play country station",
    step: "tune",
    action: "play-station",
    keepsPlayback: false,
  },
  {
    id: "country-retry",
    surface: "country",
    label: "Retry live catalog",
    step: "tune",
    action: "retry-catalog",
    keepsPlayback: true,
  },
  {
    id: "country-close",
    surface: "country",
    label: "Close country stations",
    step: "next",
    action: "close-overlay",
    keepsPlayback: true,
  },
  {
    id: "passport-stamp",
    surface: "passport",
    label: "Replay a stamped city",
    step: "next",
    action: "replay-stamp",
    keepsPlayback: false,
  },
  {
    id: "passport-empty",
    surface: "passport",
    label: "Empty stamp slot",
    step: "land",
    action: "find-city",
    keepsPlayback: true,
  },
  {
    id: "passport-favorite",
    surface: "passport",
    label: "Play a kept signal",
    step: "tune",
    action: "play-station",
    keepsPlayback: false,
  },
  {
    id: "passport-close",
    surface: "passport",
    label: "Close your passport",
    step: "next",
    action: "close-overlay",
    keepsPlayback: true,
  },
  {
    id: "dock-art",
    surface: "dock",
    label: "Dock artwork",
    step: "inhabit",
    action: "theater",
    keepsPlayback: true,
  },
  {
    id: "dock-theater",
    surface: "dock",
    label: "Theater",
    step: "inhabit",
    action: "theater",
    keepsPlayback: true,
  },
  {
    id: "dock-stamp",
    surface: "dock",
    label: "Stamp ring",
    step: "stamp",
    action: "passport",
    keepsPlayback: true,
  },
  {
    id: "dock-heart",
    surface: "dock",
    label: "Dock favorite",
    step: "stamp",
    action: "favorite",
    keepsPlayback: true,
  },
  {
    id: "dock-play",
    surface: "dock",
    label: "Play or pause",
    step: "inhabit",
    action: "toggle-play",
    keepsPlayback: true,
  },
  {
    id: "dock-prev",
    surface: "dock",
    label: "Previous station",
    step: "next",
    action: "prev-station",
    keepsPlayback: false,
  },
  {
    id: "dock-next",
    surface: "dock",
    label: "Next station",
    step: "next",
    action: "next-station",
    keepsPlayback: false,
  },
  {
    id: "theater-back",
    surface: "theater",
    label: "Back to Elsewhere",
    step: "next",
    action: "home",
    keepsPlayback: true,
    optional: true,
  },
  {
    id: "theater-seek",
    surface: "theater",
    label: "Seek",
    step: "intent",
    action: "intent-catalog",
    keepsPlayback: true,
  },
  {
    id: "theater-empty",
    surface: "theater",
    label: "Empty theater",
    step: "land",
    action: "home",
    keepsPlayback: true,
  },
  {
    id: "about-land",
    surface: "about",
    label: "Land from the room",
    step: "land",
    action: "home",
    keepsPlayback: true,
  },
  {
    id: "retry-mix",
    surface: "error",
    label: "Try the mix again",
    step: "intent",
    action: "retry-mix",
    keepsPlayback: true,
  },
];

export function connectionById(id: string) {
  return SURFACE_CONNECTIONS.find((item) => item.id === id) ?? null;
}

export function connectionsForStep(step: LoopStep) {
  return SURFACE_CONNECTIONS.filter((item) => item.step === step);
}

export function nextLoopStep(step: LoopStep): LoopStep {
  const index = ELSEWHERE_LOOP.indexOf(step);
  return ELSEWHERE_LOOP[(index + 1) % ELSEWHERE_LOOP.length]!;
}

export function looksLikeIntentSentence(value: string) {
  const words = value.trim().split(/\s+/).filter(Boolean);
  return (
    words.length >= 3 ||
    /\b(mix|surprise|take me|anywhere|night|tonight|rainy|dusk|dawn|somewhere|wander|random)\b/i.test(
      value,
    )
  );
}

export function intentPath(value: string): "idle" | "catalog" | "interpret" {
  const prompt = value.trim();
  if (!prompt) return "idle";
  return looksLikeIntentSentence(prompt) ? "interpret" : "catalog";
}

export type CoverEmptyKind = "search" | "hour" | "place" | "catalog";

export type CoverEmptyAction = {
  id: Extract<
    FlowAction,
    | "surprise"
    | "atlas"
    | "clear-search"
    | "clear-hour"
    | "clear-place"
    | "retry-catalog"
  >;
  label: string;
};

export type CoverEmptyState = {
  kind: CoverEmptyKind;
  message: string;
  actions: CoverEmptyAction[];
};

export function seekingStatus(input: {
  query: string;
  loading: boolean;
  count: number;
  unreachable?: boolean;
}) {
  const query = input.query.trim();
  if (!query) {
    return { tone: "idle" as const, label: "", spoken: "" };
  }
  // An outage is not an empty catalog: only claim "No signal" once the
  // catalog actually answered with nothing.
  if (input.unreachable && !input.loading) {
    return {
      tone: "unreachable" as const,
      label: "Signal lost",
      spoken: `Signal lost for ${query}`,
    };
  }
  if (input.loading) {
    return {
      tone: "searching" as const,
      label: "Searching",
      spoken: `Searching for ${query}`,
    };
  }
  if (input.count === 0) {
    return {
      tone: "empty" as const,
      label: "No signal",
      spoken: `No live stations for ${query}`,
    };
  }
  return {
    tone: "ready" as const,
    label: `${input.count} live`,
    spoken: `${input.count} live for ${query}`,
  };
}

/**
 * What the interpreter understood differently: the rewrite worth whispering
 * back through the seek status line. Language rewrites win (mirroring the
 * route's precedence); an identical or whitespace-equal query whispers nothing.
 */
export function intentEchoFromInterpret(
  prompt: string,
  intent: { language?: string | null; query?: string | null },
): string | null {
  const language = intent.language?.trim();
  if (language) return language;
  const query = intent.query?.trim();
  if (!query) return null;
  return query.toLowerCase() === prompt.trim().toLowerCase() ? null : query;
}

export function seekingBoardLabel(
  query: string,
  loading: boolean,
  count: number,
  unreachable = false
) {
  const trimmed = query.trim();
  if (!trimmed) return null;
  const name = trimmed.toUpperCase();
  if (unreachable && !loading) return `SIGNAL LOST · ${name}`;
  if (loading) return `SEARCHING · ${name}`;
  if (count === 0) return `NO SIGNAL · ${name}`;
  return `${count} LIVE · ${name}`;
}

export function hourBoardLabel(
  hour: string | null,
  loading: boolean,
  count: number,
) {
  if (!hour) return null;
  const name = hour.toUpperCase();
  if (loading) return `SEEKING · ${name}`;
  if (count === 0) return `NO SIGNAL · ${name}`;
  return `${count} LIVE · ${name}`;
}

export function describeCoverEmpty(input: {
  query: string;
  hour: string | null;
  place: string | null;
  unreachable?: boolean;
}): CoverEmptyState {
  const query = input.query.trim();
  if (query) {
    // An outage gets its own truth and a way back in, not a verdict on the
    // catalog itself.
    if (input.unreachable) {
      return {
        kind: "search",
        message: `Signal lost for “${query}”.`,
        actions: [
          { id: "retry-catalog", label: "Try again" },
          { id: "atlas", label: "Atlas" },
        ],
      };
    }
    return {
      kind: "search",
      message: `No live signal for “${query}”.`,
      actions: [
        { id: "surprise", label: "Surprise" },
        { id: "atlas", label: "Atlas" },
        { id: "clear-search", label: "Clear search" },
      ],
    };
  }
  if (input.hour) {
    return {
      kind: "hour",
      message: `No city at ${input.hour} in this catalog.`,
      actions: [
        { id: "clear-hour", label: `Clear ${input.hour}` },
        { id: "atlas", label: "Atlas" },
        { id: "surprise", label: "Surprise" },
      ],
    };
  }
  if (input.place) {
    return {
      kind: "place",
      message: `No signal left in ${input.place}.`,
      actions: [
        { id: "clear-place", label: "Show every city" },
        { id: "atlas", label: "Atlas" },
      ],
    };
  }
  return {
    kind: "catalog",
    message: "The catalog is quiet. Surprise yourself, or open the atlas.",
    actions: [
      { id: "surprise", label: "Surprise" },
      { id: "atlas", label: "Atlas" },
    ],
  };
}

export function describeAtlasEmpty(query: string) {
  const trimmed = query.trim();
  return {
    message: trimmed
      ? `No country matches “${trimmed}”.`
      : "No countries in the live catalog.",
    actions: trimmed
      ? ([{ id: "clear-search" as const, label: "Clear search" }] as const)
      : [],
  };
}

export type StampReplay = {
  station: Station | null;
  fallback: "country" | "atlas";
};

export function resolveStampReplay(
  stamp: { stationId: string; city: string; country: string },
  pools: Station[],
): StampReplay {
  const byId = pools.find((station) => station.uuid === stamp.stationId);
  if (byId) return { station: byId, fallback: "country" };

  const city = stamp.city.trim().toLowerCase();
  const country = stamp.country.trim().toLowerCase();
  const byPlace = pools.find((station) => {
    if (stationLocation(station).toLowerCase() !== city) return false;
    return (station.country || "").toLowerCase() === country;
  });
  if (byPlace) return { station: byPlace, fallback: "country" };

  return {
    station: null,
    fallback: country ? "country" : "atlas",
  };
}

export function theaterWithoutStation() {
  return {
    route: "/",
    label: "Back to Elsewhere",
    message: "Land somewhere first. Then come back.",
  };
}

/** Wait until client hydration before declaring the room empty. */
export function theaterRoomGate(
  hydrated: boolean,
  nowPlaying: Station | null,
): "wait" | "empty" | "room" {
  if (!hydrated) return "wait";
  if (!nowPlaying) return "empty";
  return "room";
}

export type TheaterFact = { label: string; value: string };

export type TheaterLink = { label: string; url: string };

export type MeridianKind = "youtube" | "wiki" | "disc" | "link";

const HOLLOW_FACT = /^(yes|no|true|false|n\/?a|none|unknown|tbd|n\.?a\.?)$/i;
const ECHO_FACT = /^(artist|title)$/i;
const MERIDIAN_RANK: Record<MeridianKind, number> = {
  youtube: 0,
  wiki: 1,
  disc: 2,
  link: 3,
};

export function meridianKind(url: string, label = ""): MeridianKind {
  const href = url.toLowerCase();
  const name = label.toLowerCase();
  if (
    href.includes("youtube.com") ||
    href.includes("youtu.be") ||
    name.includes("youtube")
  ) {
    return "youtube";
  }
  if (
    href.includes("wikipedia.org") ||
    name === "wiki" ||
    name.includes("wikipedia")
  ) {
    return "wiki";
  }
  if (
    href.includes("musicbrainz.org") ||
    name === "track" ||
    name === "release" ||
    name === "artist"
  ) {
    return "disc";
  }
  return "link";
}

/** Drops Yes/No and artist/title echoes. The cover already named those. */
export function theaterDossierFacts(
  facts: TheaterFact[],
  track?: string | null,
): TheaterFact[] {
  const cover = (track ?? "").toLowerCase();
  return facts
    .filter((fact) => {
      const label = fact.label.trim();
      const value = fact.value.trim();
      if (!label || !value) return false;
      if (HOLLOW_FACT.test(value)) return false;
      if (ECHO_FACT.test(label)) {
        if (!cover) return false;
        return !cover.includes(value.toLowerCase());
      }
      return true;
    })
    .slice(0, 6);
}

export function theaterMeridians(links: TheaterLink[]): TheaterLink[] {
  return links
    .filter((link) => link.label.trim() && link.url.trim())
    .sort(
      (left, right) =>
        MERIDIAN_RANK[meridianKind(left.url, left.label)] -
        MERIDIAN_RANK[meridianKind(right.url, right.label)],
    )
    .slice(0, 3);
}

export function theaterIntelligenceFromRoom(input: {
  hasTrack: boolean;
  captionBody?: string | null;
  summary?: string | null;
  facts?: TheaterFact[];
  imageUrl?: string | null;
  links?: TheaterLink[];
  track?: string | null;
  graph?: TriviaGraph | null;
}) {
  return theaterIntelligence({
    hasTrack: input.hasTrack,
    dispatchBody: input.captionBody,
    summary: input.summary,
    facts: input.facts,
    imageUrl: input.imageUrl,
    links: input.links,
    track: input.track,
    graph: input.graph,
  });
}

export function theaterIntelligence(input: {
  hasTrack: boolean;
  dispatchBody?: string | null;
  summary?: string | null;
  facts?: TheaterFact[];
  imageUrl?: string | null;
  links?: TheaterLink[];
  track?: string | null;
  graph?: TriviaGraph | null;
}) {
  const dispatchBody = input.dispatchBody?.trim() || null;
  if (!input.hasTrack) {
    return {
      dispatchBody,
      summary: null,
      facts: [] as TheaterFact[],
      imageUrl: null,
      links: [] as TheaterLink[],
      graph: EMPTY_GRAPH,
    };
  }
  const summary = input.summary?.trim() || null;
  const same =
    summary &&
    dispatchBody &&
    summary.toLowerCase() === dispatchBody.toLowerCase();
  return {
    dispatchBody,
    summary: same ? null : summary,
    facts: theaterDossierFacts(input.facts ?? [], input.track),
    imageUrl: input.imageUrl?.trim() || null,
    links: theaterMeridians(input.links ?? []),
    graph: input.graph ?? EMPTY_GRAPH,
  };
}

export function overlayBackFromCountry(): Extract<FlowAction, "atlas"> {
  return "atlas";
}

/** Close the book and open Atlas so an empty stamp slot has a next land. */
export function findCityFromPassport() {
  return { passport: false, atlas: true };
}

export function searchKeepsPlayback() {
  return true;
}

export type CoverArrival = {
  headline: string;
  cta: string;
  ctaKind: "none" | "land" | "continue";
  live: boolean;
};

/** Same-hour foil pills play immediately; they do not set hour or place. */
export function sameHourPillLabel(city: string): {
  label: string;
  spoken: string;
} {
  const name = city.trim() || "this city";
  return { label: name, spoken: `Land in ${name}` };
}

/** On air / LIVE only while audio is actually playing. */
export function coverArrival(input: {
  isPlaying: boolean;
  hasNowPlaying: boolean;
  hasContinue: boolean;
  city: string;
}): CoverArrival {
  const city = input.city.trim() || "the world";
  if (input.isPlaying) {
    return {
      headline: `${city} is on air.`,
      cta: "",
      ctaKind: "none",
      live: true,
    };
  }
  if (input.hasNowPlaying || input.hasContinue) {
    return {
      headline: `Continue in ${city}.`,
      cta: `Continue in ${city}`,
      ctaKind: "continue",
      live: false,
    };
  }
  return {
    headline: `Land in ${city}.`,
    cta: "Land here",
    ctaKind: "land",
    live: false,
  };
}

/**
 * Seeking names the search, not the leftover featured city.
 * "{query} is live" would be a lie while nothing is playing.
 */
export function coverWhileSeeking(input: {
  query: string;
  count: number;
  loading: boolean;
  unreachable?: boolean;
}): CoverArrival {
  const query = input.query.trim();
  const status = seekingStatus({
    query,
    loading: input.loading,
    count: input.count,
    unreachable: input.unreachable,
  });
  if (status.tone === "searching") {
    return {
      headline: `Searching ${query}.`,
      cta: "",
      ctaKind: "none",
      live: false,
    };
  }
  if (status.tone === "unreachable") {
    return {
      headline: `Signal lost for ${query}.`,
      cta: "",
      ctaKind: "none",
      live: false,
    };
  }
  if (status.tone === "empty") {
    return {
      headline: `No signal for ${query}.`,
      cta: "",
      ctaKind: "none",
      live: false,
    };
  }
  return {
    headline: `${input.count} live for ${query}.`,
    cta: "",
    ctaKind: "none",
    live: false,
  };
}

/** Playing keeps the inhabited city. Seeking only owns the cover when idle. */
export function resolveCoverArrival(input: {
  isPlaying: boolean;
  hasNowPlaying: boolean;
  hasContinue: boolean;
  city: string;
  query: string;
  count: number;
  loading: boolean;
  unreachable?: boolean;
}): CoverArrival {
  if (input.isPlaying) {
    return coverArrival({
      isPlaying: true,
      hasNowPlaying: input.hasNowPlaying,
      hasContinue: input.hasContinue,
      city: input.city,
    });
  }
  if (input.query.trim().length >= 2) {
    return coverWhileSeeking({
      query: input.query,
      count: input.count,
      loading: input.loading,
      unreachable: input.unreachable,
    });
  }
  return coverArrival({
    isPlaying: false,
    hasNowPlaying: input.hasNowPlaying,
    hasContinue: input.hasContinue,
    city: input.city,
  });
}
