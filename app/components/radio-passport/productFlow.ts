import type { Station } from "~/types/radio";
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
    search.startsWith("?") ? search.slice(1) : search
  );
  const value = params.get("passport");
  return value === null ? false : value !== "0";
}

export function homeWithPassportHref() {
  return "/?passport=1";
}

export function openPassportNow(
  pathname: string,
  goHomeWithPassport: () => void
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
    label: "Issue",
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
    label: "Land from Issue 01",
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
    /\b(mix|surprise|take me|anywhere|night|rainy|dusk|dawn|somewhere)\b/i.test(
      value
    )
  );
}

export function intentPath(
  value: string
): "idle" | "catalog" | "interpret" {
  const prompt = value.trim();
  if (!prompt) return "idle";
  return looksLikeIntentSentence(prompt) ? "interpret" : "catalog";
}

export type CoverEmptyKind = "search" | "hour" | "place" | "catalog";

export type CoverEmptyAction = {
  id: Extract<
    FlowAction,
    "surprise" | "atlas" | "clear-search" | "clear-hour" | "clear-place"
  >;
  label: string;
};

export type CoverEmptyState = {
  kind: CoverEmptyKind;
  message: string;
  actions: CoverEmptyAction[];
};

export function describeCoverEmpty(input: {
  query: string;
  hour: string | null;
  place: string | null;
}): CoverEmptyState {
  const query = input.query.trim();
  if (query) {
    return {
      kind: "search",
      message: "No signal for that.",
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
  pools: Station[]
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

export function overlayBackFromCountry(): Extract<FlowAction, "atlas"> {
  return "atlas";
}

export function searchKeepsPlayback() {
  return true;
}
