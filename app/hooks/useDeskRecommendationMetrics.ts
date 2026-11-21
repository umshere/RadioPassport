import { useCallback, useEffect, useRef, useState } from "react";
import { usePlayerStore } from "~/state/playerStore";
import { logUsage, type UsageEvent } from "~/utils/usage";

export type RecommendationPlaybackProgress = { played: number; lastTime: number | null };

/** Accumulate only observed media-time movement during confirmed playback. */
export function advanceRecommendationPlayback(
  progress: RecommendationPlaybackProgress,
  observation: { matches: boolean; playing: boolean; seeking: boolean; ready: boolean; currentTime: number },
) {
  if (!observation.matches || !observation.playing || observation.seeking || !observation.ready) {
    progress.played = 0;
    progress.lastTime = null;
    return false;
  }
  const current = observation.currentTime;
  if (progress.lastTime === null || current < progress.lastTime || current - progress.lastTime > 5) progress.played = 0;
  else progress.played += current - progress.lastTime;
  progress.lastTime = current;
  return progress.played >= 30;
}

/** Watch only this tune. It may reach 30 seconds after the listener leaves the Desk. */
function watchTune(stationId: string, once: (event: UsageEvent) => void) {
  const audio = usePlayerStore.getState().audioElement;
  if (!audio) return;
  const previousSource = audio.currentSrc || audio.src;
  const progress: RecommendationPlaybackProgress = { played: 0, lastTime: null };
  const matches = () => usePlayerStore.getState().nowPlaying?.uuid === stationId;
  let selected = false;
  let recording = false;

  const reset = () => {
    recording = false;
    progress.played = 0;
    progress.lastTime = null;
  };
  const onPlaying = () => {
    const source = audio.currentSrc || audio.src;
    if (!matches() || !source || source === previousSource || recording) return;
    recording = true;
    progress.lastTime = audio.currentTime;
    once("desk_rec_audio_started");
  };
  const onProgress = () => {
    if (!recording) return;
    const reached = advanceRecommendationPlayback(progress, {
      matches: matches(),
      playing: !audio.paused,
      seeking: audio.seeking,
      ready: audio.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA,
      currentTime: audio.currentTime,
    });
    if (reached) {
      once("desk_rec_listened_30s");
      stop();
    }
  };
  const events = [
    ["playing", onPlaying], ["timeupdate", onProgress],
    ["pause", reset], ["waiting", reset], ["seeking", reset],
    ["emptied", reset], ["ended", reset], ["error", reset],
  ] as const;
  const stop = () => {
    window.clearTimeout(timeout);
    for (const [event, handle] of events) audio.removeEventListener(event, handle);
    unsubscribe();
  };
  const unsubscribe = usePlayerStore.subscribe(() => {
    if (matches()) selected = true;
    else if (selected) stop();
  });
  const timeout = window.setTimeout(stop, 120_000);
  for (const [event, handle] of events) audio.addEventListener(event, handle);
  return stop;
}

/** Anonymous counts, at most one of each step per Desk visit. */
export function useDeskRecommendationMetrics(eligible: boolean) {
  const [target, exposureRef] = useState<HTMLDivElement | null>(null);
  const emitted = useRef(new Set<UsageEvent>());
  const stopWatching = useRef<() => void>();
  const once = useCallback((event: UsageEvent) => {
    if (emitted.current.has(event)) return;
    emitted.current.add(event);
    logUsage(event);
  }, []);

  useEffect(() => {
    if (eligible) once("desk_rec_eligible");
  }, [eligible, once]);

  useEffect(() => {
    if (!eligible || !target || typeof IntersectionObserver === "undefined") return;
    let observer: IntersectionObserver | undefined;
    const observe = () => {
      observer?.disconnect();
      if (document.visibilityState !== "visible") return;
      const dockTop = document.querySelector(".rp-dock")?.getBoundingClientRect().top ?? window.innerHeight;
      const clearance = Math.max(0, window.innerHeight - dockTop);
      observer = new IntersectionObserver(([entry], activeObserver) => {
        if (entry?.isIntersecting && entry.intersectionRatio >= 0.5 && document.visibilityState === "visible") {
          once("desk_rec_impression");
          activeObserver.disconnect();
        }
      }, { rootMargin: `0px 0px -${clearance}px 0px`, threshold: 0.5 });
      observer.observe(target);
    };
    observe();
    document.addEventListener("visibilitychange", observe);
    window.addEventListener("resize", observe);
    return () => {
      observer?.disconnect();
      document.removeEventListener("visibilitychange", observe);
      window.removeEventListener("resize", observe);
    };
  }, [eligible, once, target]);

  const trackTune = useCallback((stationId: string, tune: () => void) => {
    once("desk_rec_tune");
    stopWatching.current?.();
    stopWatching.current = watchTune(stationId, once);
    tune();
  }, [once]);
  const trackSeeAll = useCallback(() => once("desk_rec_see_all"), [once]);

  return { exposureRef, trackTune, trackSeeAll };
}
