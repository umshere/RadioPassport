import { useCallback, useEffect, useState } from "react";
import { catalogRequestState } from "~/components/radio-passport/searchState";
import type { Station } from "~/types/radio";
import { normalizeStations } from "~/utils/stations";
import { stationMatches } from "~/utils/stationSearch";

const DEBOUNCE_MS = 260;
const MAX_RESULTS = 200;

/**
 * The live catalog for a typed query, debounced. `error` is true only when the
 * catalog could not be reached — never when it answered empty — so the cover
 * can say "Signal lost" instead of lying "No signal" (flow audit F3).
 */
export function useCatalogSearch(query: string) {
  const [catalog, setCatalog] = useState<Station[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => {
    setError(false);
    setAttempt((current) => current + 1);
  }, []);

  useEffect(() => {
    if (!catalogRequestState(query).shouldFetch) {
      setCatalog([]);
      setLoading(false);
      setError(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const id = window.setTimeout(
      () =>
        fetch(`/api/radio-catalog?stations=8000&q=${encodeURIComponent(query)}`)
          .then((response) => (response.ok ? response.json() : Promise.reject()))
          .then((data: { stations?: Station[] }) => {
            if (cancelled) return;
            setCatalog(
              normalizeStations(data.stations || [])
                .filter((station) => stationMatches(station, query))
                .slice(0, MAX_RESULTS),
            );
            setError(false);
          })
          .catch(() => {
            if (cancelled) return;
            setCatalog([]);
            setError(true);
          })
          .finally(() => !cancelled && setLoading(false)),
      DEBOUNCE_MS,
    );
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [query, attempt]);

  return { catalog, loading, error, retry };
}
