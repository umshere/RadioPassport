import { stationLocation } from "~/components/radio-passport/StationRow";
import { trackKey } from "~/components/radio-passport/stationInsights";
import { theaterPhase, type TheaterPhase } from "~/components/radio-passport/theaterLock";
import type { PlaceDispatch } from "~/types/ai";
import type { NowPlayingTrack } from "~/types/nowPlaying";
import type { Station } from "~/types/radio";
import { localDateAtLongitude } from "~/utils/localTime";
import { templateDispatch } from "~/utils/placeDispatch";
import { create } from "~/utils/zustand-lite";

export type RoomSignalStatus = "idle" | "loading" | "ready" | "empty" | "error";
export type RoomDossierStatus = "idle" | "loading" | "ready" | "empty" | "error";
export type RoomCaptionSource = "template" | "ai";
export type RoomDossierSource = "free" | "ai" | null;

export type RoomSignal = {
  status: RoomSignalStatus;
  track: NowPlayingTrack | null;
  message: string | null;
};

export type RoomDossier = {
  status: RoomDossierStatus;
  summary: string | null;
  facts: Array<{ label: string; value: string }>;
  links: Array<{ label: string; url: string }>;
  imageUrl: string | null;
  source: RoomDossierSource;
};

export type Room = {
  stationId: string | null;
  station: Station | null;
  city: string;
  caption: PlaceDispatch | null;
  captionSource: RoomCaptionSource | null;
  signal: RoomSignal;
  plate: string | null;
  dossier: RoomDossier;
  phase: TheaterPhase;
  isPlaying: boolean;
};

const IDLE_SIGNAL: RoomSignal = {
  status: "idle",
  track: null,
  message: null,
};

const IDLE_DOSSIER: RoomDossier = {
  status: "idle",
  summary: null,
  facts: [],
  links: [],
  imageUrl: null,
  source: null,
};

export const EMPTY_ROOM: Room = {
  stationId: null,
  station: null,
  city: "",
  caption: null,
  captionSource: null,
  signal: IDLE_SIGNAL,
  plate: null,
  dossier: IDLE_DOSSIER,
  phase: "quiet",
  isPlaying: false,
};

export function emptyRoom(): Room {
  return EMPTY_ROOM;
}

export function dispatchRequestFor(
  station: Station,
  track: NowPlayingTrack | null,
) {
  const longitude =
    typeof station.longitude === "number" ? station.longitude : 0;
  const local = localDateAtLongitude(longitude);
  return {
    stationId: station.uuid,
    stationName: station.name,
    city: stationLocation(station),
    country: station.country,
    countryCode: station.countryCode ?? null,
    language: station.language,
    tags: station.tagList ?? [],
    localTimeISO: local.toISOString(),
    track: track
      ? {
          title: track.title,
          artist: track.artist,
          raw: track.raw,
        }
      : null,
  };
}

export function captionForStation(
  station: Station,
  track: NowPlayingTrack | null,
): PlaceDispatch {
  return templateDispatch(dispatchRequestFor(station, track));
}

export function deriveRoomPhase(room: Pick<Room, "isPlaying" | "signal" | "dossier">): TheaterPhase {
  const hasTrack = Boolean(
    room.signal.track && (room.signal.track.title || room.signal.track.artist),
  );
  return theaterPhase({
    isPlaying: room.isPlaying,
    hasTrack,
    metadataStatus: room.signal.status,
    triviaStatus: room.dossier.status,
  });
}

function withPhase(room: Room): Room {
  return { ...room, phase: deriveRoomPhase(room) };
}

export function createRoom(station: Station, isPlaying = true): Room {
  return withPhase({
    stationId: station.uuid,
    station,
    city: stationLocation(station),
    caption: captionForStation(station, null),
    captionSource: "template",
    signal: { status: "loading", track: null, message: null },
    plate: null,
    dossier: IDLE_DOSSIER,
    phase: "quiet",
    isPlaying,
  });
}

export function roomAfterOpen(
  current: Room,
  station: Station | null,
  isPlaying: boolean,
): Room {
  if (!station) return EMPTY_ROOM;
  if (current.stationId === station.uuid) {
    if (current.isPlaying === isPlaying && current.station === station) {
      return current;
    }
    return withPhase({ ...current, station, isPlaying });
  }
  return createRoom(station, isPlaying);
}

export function roomAfterSignal(
  room: Room,
  stationId: string,
  signal: RoomSignal,
): Room {
  if (room.stationId !== stationId || !room.station) return room;
  if (
    room.signal.status === signal.status &&
    room.signal.track === signal.track &&
    room.signal.message === signal.message
  ) {
    return room;
  }
  const next: Room = { ...room, signal };
  const trackChanged = trackKey(room.signal.track) !== trackKey(signal.track);
  const hasTrack = Boolean(
    signal.track && (signal.track.title || signal.track.artist),
  );
  if (trackChanged || room.captionSource === "template") {
    next.caption = captionForStation(room.station, signal.track);
    next.captionSource = "template";
  }
  if (!hasTrack) {
    if (signal.status !== "loading" && signal.status !== "idle") {
      next.dossier = IDLE_DOSSIER;
      next.plate = null;
    }
  } else if (trackChanged || room.dossier.status === "idle") {
    next.dossier = { ...IDLE_DOSSIER, status: "loading" };
    next.plate = null;
  }
  return withPhase(next);
}

export function roomAfterCaption(
  room: Room,
  stationId: string,
  caption: PlaceDispatch,
  source: RoomCaptionSource,
): Room {
  if (room.stationId !== stationId) return room;
  if (room.caption === caption && room.captionSource === source) return room;
  return withPhase({
    ...room,
    caption,
    captionSource: source,
  });
}

export function roomAfterDossier(
  room: Room,
  stationId: string,
  incoming: RoomDossier,
): Room {
  if (room.stationId !== stationId) return room;
  const current = room.dossier;
  const merged: RoomDossier = {
    status:
      incoming.status === "ready" || current.status !== "ready"
        ? incoming.status
        : current.status,
    summary: incoming.summary || current.summary,
    facts: incoming.facts.length ? incoming.facts : current.facts,
    links: incoming.links.length ? incoming.links : current.links,
    imageUrl: incoming.imageUrl || current.imageUrl,
    source: incoming.source ?? current.source,
  };
  return withPhase({
    ...room,
    dossier: merged,
    plate: merged.imageUrl,
  });
}

export function roomAfterPlay(room: Room, isPlaying: boolean): Room {
  if (room.isPlaying === isPlaying) return room;
  return withPhase({ ...room, isPlaying });
}

export function roomForStation(
  room: Room,
  stationId: string | null | undefined,
): Room {
  if (!stationId || room.stationId !== stationId) return EMPTY_ROOM;
  return room;
}

type RoomStoreState = {
  room: Room;
  openRoom: (station: Station | null, isPlaying?: boolean) => void;
  setPlaying: (isPlaying: boolean) => void;
  setSignal: (stationId: string, signal: RoomSignal) => void;
  setCaption: (
    stationId: string,
    caption: PlaceDispatch,
    source?: RoomCaptionSource,
  ) => void;
  setDossier: (stationId: string, dossier: RoomDossier) => void;
};

export const useRoomStore = create<RoomStoreState>((set, get) => ({
  room: EMPTY_ROOM,
  openRoom: (station, isPlaying = true) => {
    const next = roomAfterOpen(get().room, station, isPlaying);
    if (next === get().room) return;
    set({ room: next });
  },
  setPlaying: (isPlaying) => {
    const next = roomAfterPlay(get().room, isPlaying);
    if (next === get().room) return;
    set({ room: next });
  },
  setSignal: (stationId, signal) => {
    const next = roomAfterSignal(get().room, stationId, signal);
    if (next === get().room) return;
    set({ room: next });
  },
  setCaption: (stationId, caption, source = "ai") => {
    const next = roomAfterCaption(get().room, stationId, caption, source);
    if (next === get().room) return;
    set({ room: next });
  },
  setDossier: (stationId, dossier) => {
    const next = roomAfterDossier(get().room, stationId, dossier);
    if (next === get().room) return;
    set({ room: next });
  },
}));
