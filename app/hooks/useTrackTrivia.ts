import { useEffect, useRef, useState } from "react";
import type { NowPlayingTrack } from "~/types/nowPlaying";
import type { TrackTrivia, TrackTriviaResponse } from "~/types/trivia";
import { trackKey } from "~/components/radio-passport/stationInsights";

export type TriviaState = {
  status: "idle" | "loading" | "ready" | "empty" | "error";
  trivia: TrackTrivia | null;
  message: string | null;
  requestKey: string | null;
};

export function shouldCacheAiTriviaStatus(status: TriviaState["status"]) {
  return status === "ready" || status === "empty";
}

const INITIAL_STATE: TriviaState = { status: "idle", trivia: null, message: null, requestKey: null };
const AI_TRIVIA_CACHE = new Map<string, TriviaState>();

export function triviaRequestKey(source: "free" | "ai", trackKey: string, contextKey: string) {
  return trackKey ? JSON.stringify([source, trackKey, contextKey]) : "";
}

export function triviaForCurrentRequest(
  state: TriviaState,
  requestKey: string,
  enabled: boolean,
  hasTrack: boolean,
  cached: TriviaState | null = null,
): TriviaState {
  if (!enabled) return INITIAL_STATE;
  if (!hasTrack) return { status: "empty", trivia: null, message: null, requestKey };
  if (cached && shouldCacheAiTriviaStatus(cached.status)) return cached;
  if (state.requestKey === requestKey) return state;
  return { status: "loading", trivia: null, message: null, requestKey };
}

type UseTrackTriviaOptions = {
  track: NowPlayingTrack | null;
  source: "free" | "ai";
  enabled: boolean;
  context?: { summary?: string | null; facts?: Array<{ label: string; value: string }> };
};

export function useTrackTrivia({ track, source, enabled, context }: UseTrackTriviaOptions) {
  const [state, setState] = useState<TriviaState>(INITIAL_STATE);
  const pendingRef = useRef<AbortController | null>(null);
  const currentTrackKey = trackKey(track);
  const contextKey = source === "ai" && context
    ? JSON.stringify({ summary: context.summary ?? "", facts: (context.facts ?? []).map((fact) => ({ label: fact.label, value: fact.value })) })
    : "";
  const requestKey = triviaRequestKey(source, currentTrackKey, contextKey);
  const hasTrack = Boolean(track && (track.title || track.artist));
  const cached = source === "ai" && requestKey ? AI_TRIVIA_CACHE.get(requestKey) ?? null : null;

  useEffect(() => () => pendingRef.current?.abort(), []);

  useEffect(() => {
    pendingRef.current?.abort();
    if (!enabled) { setState(INITIAL_STATE); return; }
    if (!hasTrack) { setState({ status: "empty", trivia: null, message: null, requestKey }); return; }
    if (cached && shouldCacheAiTriviaStatus(cached.status)) { setState(cached); return; }

    const controller = new AbortController();
    pendingRef.current = controller;
    setState({ status: "loading", trivia: null, message: null, requestKey });
    const params = new URLSearchParams();
    if (track?.title) params.set("title", track.title);
    if (track?.artist) params.set("artist", track.artist);
    params.set("source", source);
    if (source === "ai" && contextKey) params.set("context", contextKey);

    fetch(`/api/now-playing-trivia?${params.toString()}`, { signal: controller.signal })
      .then(async (res) => res.ok
        ? res.json() as Promise<TrackTriviaResponse>
        : res.status === 404
          ? { status: "empty", reason: "Trivia unavailable." } as TrackTriviaResponse
          : { status: "error", reason: "Trivia lookup failed." } as TrackTriviaResponse)
      .then((data) => {
        if (controller.signal.aborted) return;
        const nextState: TriviaState = data.status === "ok"
          ? { status: "ready", trivia: data.trivia, message: null, requestKey }
          : data.status === "empty"
            ? { status: "empty", trivia: null, message: null, requestKey }
            : { status: "error", trivia: null, message: data.reason || "Trivia lookup failed.", requestKey };
        if (source === "ai" && requestKey && shouldCacheAiTriviaStatus(nextState.status)) AI_TRIVIA_CACHE.set(requestKey, nextState);
        setState(nextState);
      })
      .catch((error) => {
        if (controller.signal.aborted || (error as Error).name === "AbortError") return;
        setState({ status: "error", trivia: null, message: "Trivia lookup failed.", requestKey });
      });
  }, [enabled, hasTrack, source, contextKey, requestKey, cached, track?.artist, track?.title]);

  return triviaForCurrentRequest(state, requestKey, enabled, hasTrack, cached);
}
