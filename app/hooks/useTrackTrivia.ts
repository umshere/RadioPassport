import { useEffect, useRef, useState } from "react";
import type { NowPlayingTrack } from "~/types/nowPlaying";
import type { TrackTrivia, TrackTriviaResponse } from "~/types/trivia";

type TriviaState = {
  status: "idle" | "loading" | "ready" | "empty" | "error";
  trivia: TrackTrivia | null;
  message: string | null;
};

const INITIAL_STATE: TriviaState = {
  status: "idle",
  trivia: null,
  message: null,
};

type UseTrackTriviaOptions = {
  track: NowPlayingTrack | null;
  source: "free" | "ai";
  enabled: boolean;
  context?: {
    summary?: string | null;
    facts?: Array<{ label: string; value: string }>;
  };
};

export function useTrackTrivia({
  track,
  source,
  enabled,
  context,
}: UseTrackTriviaOptions) {
  const [state, setState] = useState<TriviaState>(INITIAL_STATE);
  const pendingRef = useRef<AbortController | null>(null);
  const trackKey = track ? `${track.artist ?? ""}|${track.title ?? ""}` : "";
  const contextKey =
    source === "ai" && context
      ? JSON.stringify({
          summary: context.summary ?? "",
          facts: (context.facts ?? []).map((fact) => ({
            label: fact.label,
            value: fact.value,
          })),
        })
      : "";

  useEffect(() => {
    return () => {
      pendingRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;
    if (!track || (!track.title && !track.artist)) {
      // Hide widget instead of showing error text when nothing to resolve
      setState({ status: "empty", trivia: null, message: null });
      return;
    }

    pendingRef.current?.abort();
    const controller = new AbortController();
    pendingRef.current = controller;

    // Always clear previous trivia to avoid stale flash while loading next
    setState({ status: "loading", trivia: null, message: null });

    const params = new URLSearchParams();
    if (track.title) params.set("title", track.title);
    if (track.artist) params.set("artist", track.artist);
    params.set("source", source);
    if (source === "ai" && contextKey) {
      params.set("context", contextKey);
    }

    fetch(`/api/now-playing-trivia?${params.toString()}`, {
      signal: controller.signal,
    })
      .then((res) => res.json() as Promise<TrackTriviaResponse>)
      .then((data) => {
        if (controller.signal.aborted) return;
        if (data.status === "ok") {
          setState({ status: "ready", trivia: data.trivia, message: null });
          return;
        }
        if (data.status === "empty") {
          // Keep UI minimal; no explicit unavailable text
          setState({ status: "empty", trivia: null, message: null });
          return;
        }
        // Hide error details in UI; treat as empty to avoid noisy UX
        setState({ status: "empty", trivia: null, message: null });
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        if ((error as Error).name === "AbortError") return;
        setState({ status: "empty", trivia: null, message: null });
      });
  }, [enabled, trackKey, source, contextKey]);

  return state;
}
