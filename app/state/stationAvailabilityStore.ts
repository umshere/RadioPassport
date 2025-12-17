import { create, persist } from "~/utils/zustand-lite";

export type StationFailureReason =
  | "audio_error"
  | "play_rejected"
  | "mixed_content"
  | "hls_stream"
  | "timeout"
  | "unknown";

export type StationFailure = {
  failures: number;
  firstFailedAt: number;
  lastFailedAt: number;
  lastReason: StationFailureReason;
};

type StationAvailabilityState = {
  failuresById: Record<string, StationFailure>;
  markFailed: (stationId: string, reason: StationFailureReason) => void;
  clearFailure: (stationId: string) => void;
};

const FAILURE_TTL_MS = 2 * 60 * 60 * 1000;

const availabilityStorage = {
  getItem: (name: string) => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(name);
  },
  setItem: (name: string, value: string) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(name, value);
  },
  removeItem: (name: string) => {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(name);
  },
};

function pruneFailures(
  failuresById: Record<string, StationFailure>,
  now = Date.now()
): Record<string, StationFailure> {
  const entries = Object.entries(failuresById);
  if (!entries.length) return failuresById;

  let changed = false;
  const next: Record<string, StationFailure> = {};
  for (const [id, failure] of entries) {
    if (!failure || typeof failure.lastFailedAt !== "number") {
      changed = true;
      continue;
    }
    if (now - failure.lastFailedAt > FAILURE_TTL_MS) {
      changed = true;
      continue;
    }
    next[id] = failure;
  }
  return changed ? next : failuresById;
}

export function isStationTemporarilyUnavailable(
  failure: StationFailure | null | undefined,
  now = Date.now()
): boolean {
  if (!failure) return false;
  return now - failure.lastFailedAt <= FAILURE_TTL_MS;
}

export const useStationAvailabilityStore = create<StationAvailabilityState>(
  persist(
    (set, get) => ({
      failuresById: {},
      markFailed: (stationId, reason) => {
        if (!stationId) return;
        const now = Date.now();
        const current = pruneFailures(get().failuresById, now);
        const existing = current[stationId];
        const nextFailure: StationFailure = existing
          ? {
              ...existing,
              failures: existing.failures + 1,
              lastFailedAt: now,
              lastReason: reason,
            }
          : {
              failures: 1,
              firstFailedAt: now,
              lastFailedAt: now,
              lastReason: reason,
            };

        set({
          failuresById: {
            ...current,
            [stationId]: nextFailure,
          },
        });
      },
      clearFailure: (stationId) => {
        if (!stationId) return;
        const now = Date.now();
        const current = pruneFailures(get().failuresById, now);
        if (!(stationId in current)) return;
        const next = { ...current };
        delete next[stationId];
        set({ failuresById: next });
      },
    }),
    {
      name: "station-availability",
      storage: availabilityStorage,
      merge: (persisted, current) => {
        if (!persisted || typeof persisted !== "object") return current;
        const obj = persisted as Record<string, unknown>;
        const failuresByIdRaw = obj.failuresById;
        const failuresById =
          failuresByIdRaw && typeof failuresByIdRaw === "object"
            ? pruneFailures(failuresByIdRaw as Record<string, StationFailure>)
            : {};
        return { ...current, failuresById };
      },
      partialize: (state) => ({
        failuresById: pruneFailures(state.failuresById),
      }),
    }
  )
);

