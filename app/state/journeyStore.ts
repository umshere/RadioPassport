import { create } from "~/utils/zustand-lite";
import {
  dropFavoriteSnapshot,
  parseFavoriteSnapshots,
  toSlimStation,
  upsertFavoriteSnapshot,
  type SlimStation,
  type SlimStationSource,
} from "./favoriteSnapshot";

export type { SlimStation } from "./favoriteSnapshot";

export type PassportStamp = {
  id: string;
  stationId: string;
  stationName: string;
  city: string;
  country: string;
  countryCode: string | null;
  language: string | null;
  telemetry: string;
  stampedAt: number;
};

type JourneyState = {
  hydrated: boolean;
  travelerNumber: string;
  memberSince: number;
  favoriteStationIds: string[];
  favoriteStations: SlimStation[];
  playedStationIds: string[];
  stamps: PassportStamp[];
  hydrate: () => void;
  toggleFavorite: (stationId: string, snapshot?: SlimStationSource | null) => void;
  recordPlayed: (stationId: string) => void;
  addStamp: (stamp: PassportStamp) => void;
};

const STORAGE_KEY = "radio-passport-journey";

function safeParse(value: string | null): Partial<JourneyState> | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as Partial<JourneyState>;
  } catch {
    return null;
  }
}

function persistJourney(state: JourneyState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      travelerNumber: state.travelerNumber,
      memberSince: state.memberSince,
      favoriteStationIds: state.favoriteStationIds,
      favoriteStations: state.favoriteStations,
      playedStationIds: state.playedStationIds,
      stamps: state.stamps,
    })
  );
}

export function stationStampId(
  _stationId: string,
  location: string,
  country = ""
) {
  return `${country.trim().toLowerCase()}:${location.trim().toLowerCase()}`;
}

export function isStampReady(
  startedAt: number,
  now: number,
  isContinuous: boolean
) {
  return isContinuous && now - startedAt >= 60_000;
}

export function canMutateJourney(hydrated: boolean) {
  return hydrated;
}

export const useJourneyStore = create<JourneyState>((set, get) => ({
  hydrated: false,
  travelerNumber: "000 001",
  memberSince: Date.now(),
  favoriteStationIds: [],
  favoriteStations: [],
  playedStationIds: [],
  stamps: [],
  hydrate: () => {
    if (get().hydrated || typeof window === "undefined") return;
    const saved = safeParse(window.localStorage.getItem(STORAGE_KEY));
    const oldFavorites = safeParse(
      window.localStorage.getItem("radio-passport-favorites")
    );
    const legacyPassport = safeParse(
      window.localStorage.getItem("radio_passport")
    );
    const legacyStamps = Array.isArray(legacyPassport)
      ? legacyPassport.map((entry) => {
          const item = entry as Record<string, unknown>;
          const country =
            typeof item.country === "string" ? item.country : "Unknown";
          const stationName =
            typeof item.stationName === "string"
              ? item.stationName
              : "A saved signal";
          const stationId = typeof item.id === "string" ? item.id : stationName;
          const city = country;
          return {
            id: stationStampId(stationId, city, country),
            stationId,
            stationName,
            city,
            country,
            countryCode:
              typeof item.countryCode === "string" ? item.countryCode : null,
            language: null,
            telemetry: "LIVE",
            stampedAt:
              typeof item.timestamp === "number" ? item.timestamp : Date.now(),
          } satisfies PassportStamp;
        })
      : [];
    const favoriteStationIds = Array.isArray(saved?.favoriteStationIds)
      ? saved.favoriteStationIds.filter(
          (id): id is string => typeof id === "string"
        )
      : Array.isArray(oldFavorites)
      ? oldFavorites.filter((id): id is string => typeof id === "string")
      : [];
    set({
      hydrated: true,
      travelerNumber:
        typeof saved?.travelerNumber === "string"
          ? saved.travelerNumber
          : "000 001",
      memberSince:
        typeof saved?.memberSince === "number" ? saved.memberSince : Date.now(),
      favoriteStationIds,
      favoriteStations: parseFavoriteSnapshots(saved?.favoriteStations),
      playedStationIds: Array.isArray(saved?.playedStationIds)
        ? saved.playedStationIds.filter(
            (id): id is string => typeof id === "string"
          )
        : [],
      stamps: Array.isArray(saved?.stamps)
        ? (saved.stamps as PassportStamp[])
        : legacyStamps,
    });
    persistJourney(get());
  },
  toggleFavorite: (stationId, snapshot) =>
    set((state) => {
      const removing = state.favoriteStationIds.includes(stationId);
      const favoriteStationIds = removing
        ? state.favoriteStationIds.filter((id) => id !== stationId)
        : [...state.favoriteStationIds, stationId];
      let favoriteStations = removing
        ? dropFavoriteSnapshot(state.favoriteStations, stationId)
        : state.favoriteStations;
      if (!removing) {
        const slim = snapshot ? toSlimStation(snapshot) : null;
        if (slim) favoriteStations = upsertFavoriteSnapshot(favoriteStations, slim);
      }
      queueMicrotask(() => persistJourney(get()));
      return { favoriteStationIds, favoriteStations };
    }),
  recordPlayed: (stationId) =>
    set((state) => {
      const playedStationIds = [
        stationId,
        ...state.playedStationIds.filter((id) => id !== stationId),
      ].slice(0, 250);
      queueMicrotask(() => persistJourney(get()));
      return { playedStationIds };
    }),
  addStamp: (stamp) =>
    set((state) => {
      if (state.stamps.some((entry) => entry.id === stamp.id)) return state;
      const stamps = [stamp, ...state.stamps].slice(0, 100);
      queueMicrotask(() => persistJourney(get()));
      return { stamps };
    }),
}));
