import { useCallback, useEffect, useState } from "react";
import { useSecretTrail } from "~/state/secretTrail";
import {
  countryCacheKey,
  countryCacheWith,
  fetchCountryDrilldown,
  type CountryDrilldownState,
} from "~/components/radio-passport/countryData";
import {
  CLOSE_ATLAS_EVENT,
  OPEN_ATLAS_EVENT,
  OPEN_PASSPORT_EVENT,
  announceAtlas,
  atlasRequested,
  passportRequested,
} from "~/components/radio-passport/productFlow";

/**
 * The three things that stand above the home: the Atlas, a country
 * drilldown and the Passport. Owns their open state, the URL flag for Atlas
 * (replace, never push), the window events that open/close them from the
 * site bar, the drilldown cache, and the secret-trail visits.
 */
export function useHomeOverlays(search: string) {
  const [atlas, setAtlas] = useState(() => atlasRequested(search));
  const [atlasQuery, setAtlasQuery] = useState("");
  const [country, setCountry] = useState<string | null>(null);
  const [countryCache, setCountryCache] = useState<
    Record<string, CountryDrilldownState>
  >({});
  const [passport, setPassport] = useState(false);

  const trailStage = useSecretTrail((state) => state.stage);
  const trailHydrate = useSecretTrail((state) => state.hydrate);
  const trailVisitAtlas = useSecretTrail((state) => state.visitAtlas);
  const trailVisitPassport = useSecretTrail((state) => state.visitPassport);
  useEffect(() => trailHydrate(), [trailHydrate]);
  useEffect(() => {
    if (atlas && trailStage === "atlas") trailVisitAtlas();
  }, [atlas, trailStage, trailVisitAtlas]);
  useEffect(() => {
    if (passport && trailStage === "passport") trailVisitPassport();
  }, [passport, trailStage, trailVisitPassport]);

  const loadCountry = useCallback(
    async (next: string, force = false) => {
      const key = countryCacheKey(next);
      if (!force && countryCache[key]) return;
      setCountryCache((current) =>
        countryCacheWith(current, next, { status: "loading", stations: [] })
      );
      try {
        const stations = await fetchCountryDrilldown(next);
        setCountryCache((current) =>
          countryCacheWith(current, next, { status: "ready", stations })
        );
      } catch (error) {
        setCountryCache((current) =>
          countryCacheWith(current, next, {
            status: "error",
            stations: [],
            message:
              error instanceof Error
                ? error.message
                : "We could not load this live country catalog.",
          })
        );
      }
    },
    [countryCache]
  );

  const chooseCountry = useCallback(
    (next: string) => {
      setCountry(next);
      setAtlas(false);
      void loadCountry(next);
    },
    [loadCountry]
  );

  const countryDrilldown = country
    ? countryCache[countryCacheKey(country)] ?? null
    : null;
  const countryStations = countryDrilldown?.stations ?? [];

  useEffect(() => {
    if (passportRequested(search)) setPassport(true);
    if (atlasRequested(search)) setAtlas(true);
  }, [search]);

  useEffect(() => {
    const open = () => setPassport(true);
    window.addEventListener(OPEN_PASSPORT_EVENT, open);
    return () => window.removeEventListener(OPEN_PASSPORT_EVENT, open);
  }, []);

  useEffect(() => {
    const open = () => setAtlas(true);
    window.addEventListener(OPEN_ATLAS_EVENT, open);
    return () => window.removeEventListener(OPEN_ATLAS_EVENT, open);
  }, []);

  // Elsewhere tabs and the wordmark ask to close: their Link to "/" is a
  // no-op while Atlas stands open (replaceState URL Remix never hears).
  // Leaving the overlay world drops the country drilldown too.
  useEffect(() => {
    const closeAtlas = () => {
      setCountry(null);
      setAtlas(false);
    };
    window.addEventListener(CLOSE_ATLAS_EVENT, closeAtlas);
    return () => window.removeEventListener(CLOSE_ATLAS_EVENT, closeAtlas);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (atlas) params.set("atlas", "1");
    else params.delete("atlas");
    const next = params.toString();
    const nextSearch = next ? `?${next}` : "";
    if (window.location.search === nextSearch) return;
    window.history.replaceState(
      window.history.state,
      "",
      `${window.location.pathname}${nextSearch}${window.location.hash}`,
    );
    announceAtlas(atlas);
  }, [atlas]);

  return {
    atlas,
    setAtlas,
    atlasQuery,
    setAtlasQuery,
    country,
    setCountry,
    countryCache,
    countryDrilldown,
    countryStations,
    loadCountry,
    chooseCountry,
    passport,
    setPassport,
  };
}
