import { useState, useEffect } from "react";
import type { Station, ListeningMode } from "~/types/radio";
import { rbFetchJson } from "~/utils/radioBrowser";
import { dedupeStations } from "~/utils/geography";
import { normalizeStations } from "~/utils/stations";
import { rankStations } from "~/utils/stationMeta";

export function useListeningMode() {
  const [listeningMode, setListeningMode] = useState<ListeningMode>("local");
  const [exploreStations, setExploreStations] = useState<Station[]>([]);
  const [isFetchingExplore, setIsFetchingExplore] = useState(false);
  const [exploreError, setExploreError] = useState<string | null>(null);

  // Persist listening mode to localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("radio-passport-mode");
    if (stored === "world" || stored === "local") {
      setListeningMode(stored);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("radio-passport-mode", listeningMode);
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
