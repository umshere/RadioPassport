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

type TriviaContext = {
  summary?: string | null;
  facts?: Array<{ label: string; value: string }>;
};

type UseTrackTriviaOptions = {
  track: NowPlayingTrack | null;
  source: "free" | "ai";
  enabled: boolean;
  context?: TriviaContext;
};

export function triviaContextKey(source: "free" | "ai", context?: TriviaContext) {
  if (source !== "ai" || !context) return "";
  return JSON.stringify({
    summary: context.summary ?? "",
    facts: (context.facts ?? []).map((fact) => ({
      label: fact.label,
      value: fact.value,
    })),
  });
}

export function requestTrackTrivia(input: {
  track: NowPlayingTrack;
  source: "free" | "ai";
  context?: TriviaContext;
}): Promise<TriviaState> {
  const currentTrackKey = trackKey(input.track);
  const contextKey = triviaContextKey(input.source, input.context);
  const requestKey = triviaRequestKey(input.source, currentTrackKey, contextKey);
  const hit = requestKey ? AI_TRIVIA_CACHE.get(requestKey) : null;
  if (hit && shouldCacheAiTriviaStatus(hit.status)) return Promise.resolve(hit);
  const pending = requestKey ? AI_TRIVIA_INFLIGHT.get(requestKey) : undefined;
  if (pending) return pending;

  const params = new URLSearchParams();
  if (input.track.title) params.set("title", input.track.title);
  if (input.track.artist) params.set("artist", input.track.artist);
  params.set("source", input.source);
  if (input.source === "ai" && contextKey) params.set("context", contextKey);

  const next = fetch(`/api/now-playing-trivia?${params.toString()}`)
    .then(async (res) =>
      res.ok
        ? (res.json() as Promise<TrackTriviaResponse>)
        : res.status === 404
          ? ({ status: "empty", reason: "Trivia unavailable." } as TrackTriviaResponse)
          : ({ status: "error", reason: "Trivia lookup failed." } as TrackTriviaResponse),
    )
    .then((data) => {
      const nextState: TriviaState =
        data.status === "ok"
          ? { status: "ready", trivia: data.trivia, message: null, requestKey }
          : data.status === "empty"
            ? { status: "empty", trivia: null, message: null, requestKey }
            : {
                status: "error",
                trivia: null,
                message: data.reason || "Trivia lookup failed.",
                requestKey,
              };
      if (requestKey && shouldCacheAiTriviaStatus(nextState.status)) {
        AI_TRIVIA_CACHE.set(requestKey, nextState);
      }
      return nextState;
    })
    .catch(() => ({
      status: "error",
      trivia: null,
      message: "Trivia lookup failed.",
      requestKey,
    }) as TriviaState)
    .finally(() => {
      if (requestKey) AI_TRIVIA_INFLIGHT.delete(requestKey);
    });

  if (requestKey) AI_TRIVIA_INFLIGHT.set(requestKey, next);
  return next;
}

export function useTrackTrivia({ track, source, enabled, context }: UseTrackTriviaOptions) {
  const [state, setState] = useState<TriviaState>(INITIAL_STATE);
  const currentTrackKey = trackKey(track);
  const contextKey = triviaContextKey(source, context);
  const requestKey = triviaRequestKey(source, currentTrackKey, contextKey);
  const hasTrack = Boolean(track && (track.title || track.artist));
  const cached = requestKey ? AI_TRIVIA_CACHE.get(requestKey) ?? null : null;

  useEffect(() => {
    let cancelled = false;
    if (!enabled) { setState(INITIAL_STATE); return; }
    if (!hasTrack || !track) {
      setState({ status: "empty", trivia: null, message: null, requestKey });
      return;
    }
    const hit = requestKey ? AI_TRIVIA_CACHE.get(requestKey) : null;
    if (hit && shouldCacheAiTriviaStatus(hit.status)) { setState(hit); return; }

    setState({ status: "loading", trivia: null, message: null, requestKey });
    void requestTrackTrivia({ track, source, context }).then((nextState) => {
      if (!cancelled) setState(nextState);
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, hasTrack, source, contextKey, requestKey, track?.artist, track?.title]);

  return triviaForCurrentRequest(state, requestKey, enabled, hasTrack, cached);
}
