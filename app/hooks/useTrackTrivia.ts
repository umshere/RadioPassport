import { useEffect, useState } from "react";
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
const AI_TRIVIA_INFLIGHT = new Map<string, Promise<TriviaState>>();

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
  const currentTrackKey = trackKey(track);
  const contextKey = source === "ai" && context
    ? JSON.stringify({ summary: context.summary ?? "", facts: (context.facts ?? []).map((fact) => ({ label: fact.label, value: fact.value })) })
    : "";
  const requestKey = triviaRequestKey(source, currentTrackKey, contextKey);
  const hasTrack = Boolean(track && (track.title || track.artist));
  const cached = source === "ai" && requestKey ? AI_TRIVIA_CACHE.get(requestKey) ?? null : null;

  useEffect(() => {
    let cancelled = false;
    if (!enabled) { setState(INITIAL_STATE); return; }
    if (!hasTrack) { setState({ status: "empty", trivia: null, message: null, requestKey }); return; }
    const hit = source === "ai" && requestKey ? AI_TRIVIA_CACHE.get(requestKey) : null;
    if (hit && shouldCacheAiTriviaStatus(hit.status)) { setState(hit); return; }

    setState({ status: "loading", trivia: null, message: null, requestKey });
    let pending = requestKey ? AI_TRIVIA_INFLIGHT.get(requestKey) : undefined;
    if (!pending) {
      const params = new URLSearchParams();
      if (track?.title) params.set("title", track.title);
      if (track?.artist) params.set("artist", track.artist);
      params.set("source", source);
      if (source === "ai" && contextKey) params.set("context", contextKey);
      pending = fetch(`/api/now-playing-trivia?${params.toString()}`)
        .then(async (res) => res.ok
          ? res.json() as Promise<TrackTriviaResponse>
          : res.status === 404
            ? { status: "empty", reason: "Trivia unavailable." } as TrackTriviaResponse
            : { status: "error", reason: "Trivia lookup failed." } as TrackTriviaResponse)
        .then((data) => {
          const nextState: TriviaState = data.status === "ok"
            ? { status: "ready", trivia: data.trivia, message: null, requestKey }
            : data.status === "empty"
              ? { status: "empty", trivia: null, message: null, requestKey }
              : { status: "error", trivia: null, message: data.reason || "Trivia lookup failed.", requestKey };
          if (source === "ai" && requestKey && shouldCacheAiTriviaStatus(nextState.status)) {
            AI_TRIVIA_CACHE.set(requestKey, nextState);
          }
          return nextState;
        })
        .catch((error) => {
          if ((error as Error).name === "AbortError") {
            return { status: "error", trivia: null, message: "Trivia lookup failed.", requestKey } as TriviaState;
          }
          return { status: "error", trivia: null, message: "Trivia lookup failed.", requestKey } as TriviaState;
        })
        .finally(() => {
          if (requestKey) AI_TRIVIA_INFLIGHT.delete(requestKey);
        });
      if (requestKey) AI_TRIVIA_INFLIGHT.set(requestKey, pending);
    }
    pending.then((nextState) => {
      if (!cancelled) setState(nextState);
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, hasTrack, source, contextKey, requestKey, track?.artist, track?.title]);

  return triviaForCurrentRequest(state, requestKey, enabled, hasTrack, cached);
}
