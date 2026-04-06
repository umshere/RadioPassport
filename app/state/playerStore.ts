import { create, persist } from "~/utils/zustand-lite";
import type { SceneDescriptor } from "~/scenes/types";
import type {
  QueueSession,
  QueueSourceContext,
  QueueSourceType,
  Station,
} from "~/types/radio";

const INVALID_STREAM_TOKENS = new Set([
  "",
  "null",
  "undefined",
  "n/a",
  "na",
  "-",
  "0",
]);

function hasValidStreamUrl(url?: string | null): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  if (INVALID_STREAM_TOKENS.has(trimmed.toLowerCase())) return false;
  return /^https?:\/\//i.test(trimmed) || /^\/\//.test(trimmed);
}

function resolveQueueIndex(
  stations: Station[],
  station: Station,
  queueIndex?: number
) {
  if (
    typeof queueIndex === "number" &&
    queueIndex >= 0 &&
    queueIndex < stations.length
  ) {
    return queueIndex;
  }

  const existingIndex = stations.findIndex((entry) => entry.uuid === station.uuid);
  return existingIndex >= 0 ? existingIndex : 0;
}

type StartStationOptions = {
  autoPlay?: boolean;
  preserveQueue?: boolean;
  queueSession?: QueueSession | null;
  queueIndex?: number;
};

type PlayerState = {
  audioElement: HTMLAudioElement | null;
  nowPlaying: Station | null;
  queue: Station[];
  queueId: string | null;
  queueSourceType: QueueSourceType;
  queueSourceLabel: string;
  queueSourceContext: QueueSourceContext | null;
  crossfadeMs: number;
  isPlaying: boolean;
  audioLevel: number;
  shuffleMode: boolean;
  currentStationIndex: number;
  volume: number;
  setAudioElement: (element: HTMLAudioElement | null) => void;
  setAudioLevel: (level: number) => void;
  setShuffleMode: (value: boolean | ((prev: boolean) => boolean)) => void;
  setCurrentStationIndex: (index: number) => void;
  setIsPlaying: (value: boolean) => void;
  setNowPlaying: (station: Station | null) => void;
  setQueue: (
    stations: Station[],
    metadata?: {
      queueId?: string | null;
      queueSourceType?: QueueSourceType;
      queueSourceLabel?: string;
      queueSourceContext?: QueueSourceContext | null;
    }
  ) => void;
  setQueueSession: (session: QueueSession, currentIndex?: number) => void;
  enqueueStations: (stations: Station[]) => void;
  clearQueue: () => void;
  setCrossfadeMs: (value: number) => void;
  setVolume: (volume: number) => void;
  applySceneDescriptor: (descriptor: SceneDescriptor) => Station | null;
  startStation: (station: Station, options?: StartStationOptions) => void;
  togglePlay: () => void;
  playPause: () => void;
  stop: () => void;
};

const playerStorage = {
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
} satisfies {
  getItem: (name: string) => string | null;
  setItem: (name: string, value: string) => void;
  removeItem: (name: string) => void;
};

const mergePersistedState = (
  persisted: unknown,
  current: PlayerState
): PlayerState => {
  if (!persisted || typeof persisted !== "object") {
    return current;
  }

  const persistedObj = persisted as Record<string, unknown>;

  // Build the merged state only if there are actual differences
  const next: Record<string, unknown> = { ...current };
  let hasChanges = false;

  for (const [key, value] of Object.entries(persistedObj)) {
    // Skip functions and non-existent keys
    if (typeof value === "function" || !(key in next)) continue;

    // Only update if the value actually changed
    const currentValue = next[key];
    if (!Object.is(currentValue, value)) {
      // For objects, do a shallow comparison
      if (
        typeof currentValue === "object" &&
        currentValue !== null &&
        typeof value === "object" &&
        value !== null
      ) {
        const currentStr = JSON.stringify(currentValue);
        const valueStr = JSON.stringify(value);
        if (currentStr !== valueStr) {
          next[key] = value;
          hasChanges = true;
        }
      } else {
        next[key] = value;
        hasChanges = true;
      }
    }
  }

  // Return the same object reference if nothing changed
  return hasChanges ? (next as PlayerState) : current;
};

export const usePlayerStore = create<PlayerState>(
  persist(
    (set, get) => ({
      audioElement: null,
      nowPlaying: null,
      queue: [],
      queueId: null,
      queueSourceType: "direct",
      queueSourceLabel: "Direct Tune",
      queueSourceContext: null,
      crossfadeMs: 0,
      isPlaying: false,
      audioLevel: 0,
      shuffleMode: false,
      currentStationIndex: 0,
      volume: 1,
      setAudioElement: (element: HTMLAudioElement | null) => {
        set({ audioElement: element });
      },
      setAudioLevel: (level: number) => {
        if (get().audioLevel === level) return;
        set({ audioLevel: level });
      },
      setShuffleMode: (value: boolean | ((prev: boolean) => boolean)) =>
        set((state) => ({
          shuffleMode:
            typeof value === "function" ? value(state.shuffleMode) : value,
        })),
      setCurrentStationIndex: (index: number) =>
        set({ currentStationIndex: index }),
      setIsPlaying: (value: boolean) => set({ isPlaying: value }),
      setNowPlaying: (station: Station | null) => {
        set({ nowPlaying: station });
        if (!station) {
          const audio = get().audioElement;
          if (audio) {
            audio.pause();
            audio.removeAttribute("src");
          }
          set({ isPlaying: false });
        }
      },
      setQueue: (stations: Station[], metadata) => {
        set({
          queue: [...stations],
          currentStationIndex: 0,
          queueId: metadata?.queueId ?? get().queueId,
          queueSourceType: metadata?.queueSourceType ?? get().queueSourceType,
          queueSourceLabel: metadata?.queueSourceLabel ?? get().queueSourceLabel,
          queueSourceContext: metadata?.queueSourceContext ?? get().queueSourceContext,
        });
      },
      setQueueSession: (session: QueueSession, currentIndex = 0) => {
        const nextIndex = Math.max(0, Math.min(currentIndex, session.stations.length - 1));
        set({
          queue: [...session.stations],
          currentStationIndex: nextIndex,
          queueId: session.queueId,
          queueSourceType: session.queueSourceType,
          queueSourceLabel: session.queueSourceLabel,
          queueSourceContext: session.queueSourceContext ?? null,
        });
      },
      enqueueStations: (stations: Station[]) => {
        set((state) => ({ queue: [...state.queue, ...stations] }));
      },
      clearQueue: () => {
        set({
          queue: [],
          currentStationIndex: 0,
          queueId: null,
          queueSourceType: "direct",
          queueSourceLabel: "Direct Tune",
          queueSourceContext: null,
        });
      },
      setCrossfadeMs: (value: number) => {
        const normalized = Math.max(0, Math.round(value));
        set({ crossfadeMs: normalized });
      },
      setVolume: (volume: number) => {
        const newVolume = Math.max(0, Math.min(1, volume));
        set({ volume: newVolume });
        const audio = get().audioElement;
        if (audio) {
          audio.volume = newVolume;
        }
      },
      applySceneDescriptor: (descriptor: SceneDescriptor) => {
        const stations = Array.isArray(descriptor.stations)
          ? descriptor.stations
          : [];
        const strategy = descriptor.play?.strategy ?? "autoplay_first";
        const crossfade = descriptor.play?.crossfadeMs ?? 0;

        set({
          queue: stations,
          currentStationIndex: 0,
          queueId: `ai-mix:${descriptor.visual ?? "scene"}`,
          queueSourceType: "ai_mix",
          queueSourceLabel: "AI Mix",
          queueSourceContext: {
            description: descriptor.mood ?? null,
            view: descriptor.visual,
          },
          crossfadeMs: Math.max(0, Math.round(crossfade)),
        });

        if (strategy === "autoplay_first" && stations[0]) {
          return stations[0];
        }

        return null;
      },
      startStation: (station: Station, options?: StartStationOptions) => {
        const rawStreamUrl = station.streamUrl ?? station.url ?? "";
        const hasStream = hasValidStreamUrl(rawStreamUrl);
        const preserveQueue = options?.preserveQueue ?? false;
        const shouldAutoplay = options?.autoPlay ?? true;
        const currentQueue = get().queue;
        const nextSession = options?.queueSession ?? null;

        // Determine the new queue and index
        let nextQueue: Station[];
        let nextIndex: number;
        let queueId = get().queueId;
        let queueSourceType = get().queueSourceType;
        let queueSourceLabel = get().queueSourceLabel;
        let queueSourceContext = get().queueSourceContext;

        if (nextSession && nextSession.stations.length > 0) {
          nextQueue = [...nextSession.stations];
          nextIndex = resolveQueueIndex(nextQueue, station, options?.queueIndex);
          queueId = nextSession.queueId;
          queueSourceType = nextSession.queueSourceType;
          queueSourceLabel = nextSession.queueSourceLabel;
          queueSourceContext = nextSession.queueSourceContext ?? null;
        } else if (preserveQueue) {
          // Keep the existing queue and find the station's index
          nextQueue = currentQueue;
          nextIndex = currentQueue.findIndex((s) => s.uuid === station.uuid);

          // If station not found in queue, add it and use that index
          if (nextIndex === -1) {
            nextQueue = [...currentQueue, station];
            nextIndex = nextQueue.length - 1;
          }
        } else {
          nextQueue = [station];
          nextIndex = 0;
          queueId = `direct:${station.uuid}`;
          queueSourceType = "direct";
          queueSourceLabel = "Direct Tune";
          queueSourceContext = {
            country: station.country,
            description: station.name,
          };
        }

        set({
          nowPlaying: station,
          queue: nextQueue,
          currentStationIndex: nextIndex,
          queueId,
          queueSourceType,
          queueSourceLabel,
          queueSourceContext,
          isPlaying: shouldAutoplay && hasStream,
        });

        if (!hasStream) {
          const audio = get().audioElement;
          if (audio) {
            audio.pause();
            audio.removeAttribute("src");
          }
        }
      },
      togglePlay: () => {
        const audio = get().audioElement;
        if (!audio) return;

        if (audio.paused) {
          void audio
            .play()
            .then(() => set({ isPlaying: true }))
            .catch(() => set({ isPlaying: false }));
        } else {
          audio.pause();
          set({ isPlaying: false });
        }
      },
      playPause: () => {
        const audio = get().audioElement;
        if (!audio) return;

        if (audio.paused) {
          void audio
            .play()
            .then(() => set({ isPlaying: true }))
            .catch(() => set({ isPlaying: false }));
        } else {
          audio.pause();
          set({ isPlaying: false });
        }
      },
      stop: () => {
        const audio = get().audioElement;
        if (audio) {
          audio.pause();
          audio.removeAttribute("src");
        }
        set({ nowPlaying: null, isPlaying: false });
      },
    }),
    {
      name: "player-store",
      storage: playerStorage,
      merge: mergePersistedState,
      partialize: (state) => ({
        nowPlaying: state.nowPlaying,
        queue: state.queue,
        queueId: state.queueId,
        queueSourceType: state.queueSourceType,
        queueSourceLabel: state.queueSourceLabel,
        queueSourceContext: state.queueSourceContext,
        shuffleMode: state.shuffleMode,
        currentStationIndex: state.currentStationIndex,
        volume: state.volume,
      }),
    }
  )
);
