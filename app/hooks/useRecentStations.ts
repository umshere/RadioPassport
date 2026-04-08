import { useState, useEffect, useCallback } from "react";
import type { Station } from "~/types/radio";

const RECENT_STATIONS_STORAGE_KEY = "radio-passport-recent-stations";
const MAX_RECENT_STATIONS = 12;

export function useRecentStations() {
  const [recentStations, setRecentStations] = useState<Station[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(RECENT_STATIONS_STORAGE_KEY);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as Station[];
      if (Array.isArray(parsed)) {
        setRecentStations(
          parsed
            .filter((station) => station?.uuid)
            .slice(0, MAX_RECENT_STATIONS),
        );
      }
    } catch (error) {
      console.error("Failed to parse stored recent stations", error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      RECENT_STATIONS_STORAGE_KEY,
      JSON.stringify(recentStations.slice(0, MAX_RECENT_STATIONS)),
    );
  }, [recentStations]);

  const addToRecent = useCallback((station: Station) => {
    setRecentStations((prev) => {
      const filtered = prev.filter((s) => s.uuid !== station.uuid);
      return [station, ...filtered].slice(0, MAX_RECENT_STATIONS);
    });
  }, []);

  return {
    recentStations,
    addToRecent,
  };
}
