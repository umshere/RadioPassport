import { useEffect, useRef, useState } from "react";
import type { Station } from "~/types/radio";
import type { NowPlayingResponse, NowPlayingTrack } from "~/types/nowPlaying";

type NowPlayingState = {
  status: "idle" | "loading" | "ready" | "empty" | "error";
  track: NowPlayingTrack | null;
  message: string | null;
  lastUpdated: number | null;
};

const INITIAL_STATE: NowPlayingState = {
  status: "idle",
  track: null,
  message: null,
  lastUpdated: null,
};

const FIRST_POLL_DELAY_MS = 8000;
const POLL_INTERVAL_MS = 45000;

function getStationStreamUrl(station: Station | null): string {
  if (!station) return "";
  return (station.streamUrl ?? station.url ?? "").trim();
}

export function useNowPlayingMetadata(station: Station | null, isPlaying: boolean) {
  const [state, setState] = useState<NowPlayingState>(INITIAL_STATE);
  const pollRef = useRef<number | null>(null);
  const pendingRef = useRef<AbortController | null>(null);
  const stationKey = station?.uuid ?? null;
  const streamUrl = getStationStreamUrl(station);

  useEffect(() => {
    return () => {
      if (pollRef.current) window.clearTimeout(pollRef.current);
      pendingRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!stationKey) {
      setState(INITIAL_STATE);
      return;
    }

    if (!streamUrl) {
      setState({
        status: "empty",
        track: null,
        message: "No stream URL available.",
        lastUpdated: Date.now(),
      });
      return;
    }

    if (!isPlaying) {
      return;
    }

    let cancelled = false;

    const fetchNowPlaying = async () => {
      pendingRef.current?.abort();
      const controller = new AbortController();
      pendingRef.current = controller;
      // Clear previous track to avoid showing stale metadata briefly
      setState({ status: "loading", track: null, message: null, lastUpdated: null });

      try {
        const params = new URLSearchParams({ url: streamUrl });
        const res = await fetch(`/api/now-playing?${params.toString()}`, {
          signal: controller.signal,
        });
        const data = (await res.json()) as NowPlayingResponse;
        if (cancelled) return;

        if (data.status === "ok") {
          setState({
            status: "ready",
            track: data.track,
            message: null,
            lastUpdated: Date.now(),
          });
          return;
        }

        if (data.status === "empty") {
          setState({
            status: "empty",
            track: null,
            message: data.reason,
            lastUpdated: Date.now(),
          });
          return;
        }

        setState({
          status: "error",
          track: null,
          message: data.reason,
          lastUpdated: Date.now(),
        });
      } catch (error) {
        if (cancelled) return;
        if ((error as Error).name === "AbortError") return;
        setState({
          status: "error",
          track: null,
          message: "Unable to read stream metadata.",
          lastUpdated: Date.now(),
        });
      }
    };

    const scheduleNext = (delayMs: number) => {
      if (pollRef.current) window.clearTimeout(pollRef.current);
      pollRef.current = window.setTimeout(async () => {
        await fetchNowPlaying();
        scheduleNext(POLL_INTERVAL_MS);
      }, delayMs);
    };

    fetchNowPlaying();
    scheduleNext(FIRST_POLL_DELAY_MS);

    return () => {
      cancelled = true;
      if (pollRef.current) window.clearTimeout(pollRef.current);
      pendingRef.current?.abort();
    };
  }, [stationKey, streamUrl, isPlaying]);

  return state;
}
