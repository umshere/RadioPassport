import { useEffect, useRef, useState } from "react";
import type { Station } from "~/types/radio";
import type { NowPlayingResponse, NowPlayingTrack } from "~/types/nowPlaying";

export type NowPlayingState = {
  status: "idle" | "loading" | "ready" | "empty" | "error";
  track: NowPlayingTrack | null;
  message: string | null;
  lastUpdated: number | null;
  /** The same resolved track remains usable while its metadata is being refreshed. */
  refreshing: boolean;
  sourceKey: string | null;
};

const INITIAL_STATE: NowPlayingState = {
  status: "idle",
  track: null,
  message: null,
  lastUpdated: null,
  refreshing: false,
  sourceKey: null,
};

export function sourceKeyForNowPlaying(station: Station | null) {
  const streamUrl = getStationStreamUrl(station);
  return station?.uuid && streamUrl ? `${station.uuid}:${streamUrl}` : null;
}

export function metadataForCurrentSource(
  state: NowPlayingState,
  sourceKey: string | null,
  enabled: boolean,
): NowPlayingState {
  if (!enabled) return INITIAL_STATE;
  if (state.sourceKey === sourceKey) return state;
  return { ...INITIAL_STATE, status: sourceKey ? "loading" : "idle", sourceKey };
}

/** Initial/source-change requests clear stale identity; later polls preserve a ready identity. */
export function nextNowPlayingLoadingState(
  previous: NowPlayingState,
  refreshing: boolean,
): NowPlayingState {
  if (refreshing && previous.status === "ready" && previous.track) {
    return { ...previous, message: null, refreshing: true };
  }
  return {
    status: "loading",
    track: null,
    message: null,
    lastUpdated: null,
    refreshing: false,
    sourceKey: previous.sourceKey,
  };
}

const FIRST_POLL_DELAY_MS = 8000;
const POLL_INTERVAL_MS = 45000;

function getStationStreamUrl(station: Station | null): string {
  if (!station) return "";
  return (station.streamUrl ?? station.url ?? "").trim();
}

type PollTimer = number | ReturnType<typeof setTimeout>;

/**
 * Owns one polling generation. Stopping it makes post-await rescheduling a no-op,
 * so a previous station can never clear or replace a newer station's timer.
 */
export function createNowPlayingPoller(
  run: (refreshing: boolean) => Promise<void>,
  options: {
    schedule?: (callback: () => void, delay: number) => PollTimer;
    clear?: (timer: PollTimer) => void;
    firstDelayMs?: number;
    intervalMs?: number;
  } = {},
) {
  const schedule = options.schedule ?? ((callback, delay) => setTimeout(callback, delay));
  const clear = options.clear ?? ((timer) => clearTimeout(timer));
  const firstDelayMs = options.firstDelayMs ?? FIRST_POLL_DELAY_MS;
  const intervalMs = options.intervalMs ?? POLL_INTERVAL_MS;
  let timer: PollTimer | null = null;
  let cancelled = false;

  const scheduleNext = (delay: number) => {
    if (cancelled) return;
    if (timer !== null) clear(timer);
    timer = schedule(() => {
      void run(true).finally(() => {
        if (!cancelled) scheduleNext(intervalMs);
      });
    }, delay);
  };

  return {
    start() {
      void run(false);
      scheduleNext(firstDelayMs);
    },
    stop() {
      cancelled = true;
      if (timer !== null) clear(timer);
      timer = null;
    },
  };
}

export function useNowPlayingMetadata(station: Station | null, isPlaying: boolean) {
  const [state, setState] = useState<NowPlayingState>(INITIAL_STATE);
  const pendingRef = useRef<AbortController | null>(null);
  const lastSourceKeyRef = useRef<string | null>(null);
  const stationKey = station?.uuid ?? null;
  const streamUrl = getStationStreamUrl(station);
  const sourceKey = sourceKeyForNowPlaying(station);

  useEffect(() => {
    return () => pendingRef.current?.abort();
  }, []);

  useEffect(() => {
    if (!stationKey) {
      lastSourceKeyRef.current = null;
      setState(INITIAL_STATE);
      return;
    }

    if (!isPlaying) {
      pendingRef.current?.abort();
      setState({
        status: "idle",
        track: null,
        message: "Playback is paused.",
        lastUpdated: null,
        refreshing: false,
        sourceKey: null,
      });
      return;
    }

    if (!streamUrl || !sourceKey) {
      setState({
        status: "empty",
        track: null,
        message: "No stream URL available.",
        lastUpdated: Date.now(),
        refreshing: false,
        sourceKey: null,
      });
      return;
    }

    let cancelled = false;
    lastSourceKeyRef.current = sourceKey;
    let activeController: AbortController | null = null;

    const fetchNowPlaying = async (refreshing: boolean) => {
      activeController?.abort();
      const controller = new AbortController();
      activeController = controller;
      pendingRef.current = controller;

      setState((previous) => ({ ...nextNowPlayingLoadingState(previous, refreshing), sourceKey }));

      try {
        const params = new URLSearchParams({ url: streamUrl });
        const res = await fetch(`/api/now-playing?${params.toString()}`, { signal: controller.signal });
        if (cancelled) return;
        if (!res.ok) {
          setState({
            status: res.status === 404 ? "empty" : "error",
            track: null,
            message: res.status === 404 ? "Metadata unavailable for this station." : "Unable to read stream metadata.",
            lastUpdated: Date.now(),
            refreshing: false,
            sourceKey,
          });
          return;
        }
        const data = (await res.json()) as NowPlayingResponse;
        if (cancelled) return;
        if (data.status === "ok") {
          setState({ status: "ready", track: data.track, message: null, lastUpdated: Date.now(), refreshing: false, sourceKey });
          return;
        }
        setState({
          status: data.status === "empty" ? "empty" : "error",
          track: null,
          message: data.reason,
          lastUpdated: Date.now(),
          refreshing: false,
          sourceKey,
        });
      } catch (error) {
        if (cancelled || (error as Error).name === "AbortError") return;
        setState({ status: "error", track: null, message: "Unable to read stream metadata.", lastUpdated: Date.now(), refreshing: false, sourceKey });
      }
    };

    const poller = createNowPlayingPoller(fetchNowPlaying);
    poller.start();
    return () => {
      cancelled = true;
      poller.stop();
      activeController?.abort();
    };
  }, [stationKey, streamUrl, sourceKey, isPlaying]);

  return metadataForCurrentSource(state, sourceKey, isPlaying);
}
