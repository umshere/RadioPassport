import { useState, useEffect } from "react";
import type { Station, ListeningMode } from "~/types/radio";
import { rbFetchJson } from "~/utils/radioBrowser";
import { dedupeStations } from "~/utils/geography";
import { normalizeStations } from "~/utils/stations";
import { rankStations } from "~/utils/stationMeta";

/** World is a live mix this session. A stored leftover is never a land. */
export function restoreListeningMode(stored: string | null): ListeningMode {
  if (stored === "world") return "local";
  if (stored === "local") return "local";
  return "local";
}

/** World dies with the mix; do not write it for the next visit. */
export function persistListeningMode(mode: ListeningMode): ListeningMode | null {
  return mode === "world" ? null : "local";
}

export function useListeningMode() {
  const [listeningMode, setListeningMode] = useState<ListeningMode>("local");
  const [exploreStations, setExploreStations] = useState<Station[]>([]);
  const [isFetchingExplore, setIsFetchingExplore] = useState(false);
  const [exploreError, setExploreError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("radio-passport-mode");
    setListeningMode(restoreListeningMode(stored));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const next = persistListeningMode(listeningMode);
    if (next) window.localStorage.setItem("radio-passport-mode", next);
  }, [listeningMode]);

  // Fetch explore stations when switching to world mode
  useEffect(() => {
    if (listeningMode !== "world") return;
    if (exploreStations.length > 0 || isFetchingExplore) return;

    let cancelled = false;

    const fetchExploreStations = async () => {
      setIsFetchingExplore(true);
      setExploreError(null);
      try {
        const payload = await rbFetchJson<unknown>(
          `/json/stations/topvote/120?hidebroken=true&order=clicktrend&reverse=true`
        );
        if (!cancelled) {
          const normalized = normalizeStations(Array.isArray(payload) ? payload : []);
          const ranked = rankStations(dedupeStations(normalized));
          setExploreStations(ranked.slice(0, 120));
        }
      } catch (error) {
        console.error("Failed to fetch global stations", error);
        if (!cancelled) {
          setExploreError("We could not load world stations. Please try again.");
        }
      } finally {
        if (!cancelled) {
          setIsFetchingExplore(false);
        }
      }
    };

    fetchExploreStations();

    return () => {
      cancelled = true;
    };
  }, [exploreStations.length, isFetchingExplore, listeningMode]);

  return {
    listeningMode,
    exploreStations,
    isFetchingExplore,
    exploreError,
    setListeningMode,
    setExploreStations,
    setIsFetchingExplore,
    setExploreError,
  };
}
