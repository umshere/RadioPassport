import { create } from "~/utils/zustand-lite";
import { toSlimStation, type SlimStation, type SlimStationSource } from "./favoriteSnapshot";

/**
 * Trips: optional, named groups of stations ("Rainy Tuesdays"), kept in this
 * browser like the hearts are. Nobody has to make one. Each entry keeps a
 * slim snapshot so a trip still plays after the catalog has moved on.
 */
export type Trip = {
  id: string;
  name: string;
  createdAt: number;
  stations: SlimStation[];
};

export const TRIPS_STORAGE_KEY = "elsewhere-trips";
export const TRIP_CAP = 12;
export const TRIP_STATION_CAP = 40;
export const TRIP_NAME_MAX = 40;

export function cleanTripName(name: string): string {
  return name.replace(/\s+/g, " ").trim().slice(0, TRIP_NAME_MAX);
}

/** Trips from storage, keeping only well-formed ones. */
export function parseTrips(raw: unknown): Trip[] {
  if (!Array.isArray(raw)) return [];
  const out: Trip[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const entry = item as Record<string, unknown>;
    const id = typeof entry.id === "string" ? entry.id : "";
    const name = typeof entry.name === "string" ? cleanTripName(entry.name) : "";
    if (!id || !name || out.some((trip) => trip.id === id)) continue;
    const stations = Array.isArray(entry.stations)
      ? entry.stations
          .map((station) => toSlimStation((station ?? {}) as SlimStationSource))
          .filter((station): station is SlimStation => Boolean(station))
      : [];
    out.push({
      id,
      name,
      createdAt: typeof entry.createdAt === "number" ? entry.createdAt : 0,
      stations: stations.slice(0, TRIP_STATION_CAP),
    });
  }
  return out.slice(0, TRIP_CAP);
}

/** A new trip at the end; an empty name or a full shelf of trips adds nothing. */
export function addTrip(trips: Trip[], name: string, id: string, now: number): Trip[] {
  const clean = cleanTripName(name);
  if (!clean || trips.length >= TRIP_CAP) return trips;
  return [...trips, { id, name: clean, createdAt: now, stations: [] }];
}

export function removeTrip(trips: Trip[], id: string): Trip[] {
  return trips.filter((trip) => trip.id !== id);
}

export function tripHas(trip: Trip, uuid: string): boolean {
  return trip.stations.some((station) => station.uuid === uuid);
}

/** In goes the station (newest first), or out if it was already there. */
export function toggleInTrip(trips: Trip[], tripId: string, station: SlimStationSource): Trip[] {
  const slim = toSlimStation(station);
  if (!slim) return trips;
  return trips.map((trip) => {
    if (trip.id !== tripId) return trip;
    if (tripHas(trip, slim.uuid)) {
      return { ...trip, stations: trip.stations.filter((s) => s.uuid !== slim.uuid) };
    }
    return { ...trip, stations: [slim, ...trip.stations].slice(0, TRIP_STATION_CAP) };
  });
}

function newTripId(now: number): string {
  return `trip-${now.toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

type TripsState = {
  hydrated: boolean;
  trips: Trip[];
  hydrate: () => void;
  /** Returns the new trip's id, or null when nothing was made. */
  createTrip: (name: string) => string | null;
  deleteTrip: (id: string) => void;
  toggleStation: (tripId: string, station: SlimStationSource) => void;
};

function persist(trips: Trip[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TRIPS_STORAGE_KEY, JSON.stringify(trips));
  } catch {
    // Private mode or a full disk: trips live for this visit only.
  }
}

function readStored(): Trip[] {
  if (typeof window === "undefined") return [];
  try {
    return parseTrips(JSON.parse(window.localStorage.getItem(TRIPS_STORAGE_KEY) ?? "[]"));
  } catch {
    return [];
  }
}

export const useTripsStore = create<TripsState>((set, get) => ({
  hydrated: false,
  trips: [],
  hydrate: () => {
    if (get().hydrated || typeof window === "undefined") return;
    set({ hydrated: true, trips: readStored() });
  },
  createTrip: (name) => {
    const now = Date.now();
    const id = newTripId(now);
    const before = get().trips;
    const trips = addTrip(before, name, id, now);
    if (trips === before) return null;
    set({ trips });
    persist(trips);
    return id;
  },
  deleteTrip: (id) => {
    const trips = removeTrip(get().trips, id);
    set({ trips });
    persist(trips);
  },
  toggleStation: (tripId, station) => {
    const trips = toggleInTrip(get().trips, tripId, station);
    set({ trips });
    persist(trips);
  },
}));
