import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useNavigate, useSearchParams } from "@remix-run/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Collapse, Drawer, ScrollArea, Text, Title } from "@mantine/core";
import { useSwipeable } from "react-swipeable";
import { IconAdjustmentsHorizontal, IconWorld, IconSearch } from "@tabler/icons-react";
import { WorldHome } from "~/components/WorldMode/WorldHome";


import { BRAND } from "~/constants/brand";
import { getContinent } from "~/utils/geography";
import { rbFetchJson } from "~/utils/radioBrowser";
import { normalizeStations } from "~/utils/stations";
import { rankStations, pickTopStation } from "~/utils/stationMeta";
import {
  applyStationFilters,
  createDefaultStationFilters,
  deriveStationFilterOptions,
  isStationFilterDirty,
  type StationFilterState,
} from "~/utils/stationFilters";
import {
  isStationTemporarilyUnavailable,
  useStationAvailabilityStore,
} from "~/state/stationAvailabilityStore";
import { isSafariBrowser } from "~/utils/streamHeuristics";
import { vibrate } from "~/utils/haptics";
import type { Country, Station } from "~/types/radio";
import type { PassportEntry } from "~/types/world";

// Components
import { HeroSection } from "./components/HeroSection";
import { AtlasFilters } from "./components/AtlasFilters";
import { AtlasGrid } from "./components/AtlasGrid";
import { CountryOverview } from "./components/CountryOverview";
import { StationGrid } from "./components/StationGrid";
import { StationFiltersPanel } from "./components/StationFiltersPanel";
import { StationFilterQuickBar } from "./components/StationFilterQuickBar";
import { QuickRetuneWidget } from "./components/QuickRetuneWidget";
import { LoadingView } from "./components/LoadingView";
import { CollapsibleSection } from "./components/CollapsibleSection";
import { MobileFilterDrawer } from "./components/MobileFilterDrawer";
import { JourneyModule } from "./components/JourneyModule";
import { AISplashScreen, shouldShowAISplash } from "./components/AISplashScreen";
import { SignalField } from "~/components/SignalField";
import { SignalBand } from "./components/SignalBand";


import Footer from "~/components/Footer";

// Custom Hooks
import { useRadioPlayer } from "~/hooks/useRadioPlayer";
import { useListeningMode } from "~/hooks/useListeningMode";
import { useFavorites } from "~/hooks/useFavorites";
import { useRecentStations } from "~/hooks/useRecentStations";
import { useHoverAudio } from "~/hooks/useHoverAudio";
import { useAtlasState } from "~/hooks/useAtlasState";
import { usePlayerCards } from "~/hooks/usePlayerCards";
import { useStationNavigation } from "~/hooks/useStationNavigation";
import { useAtlasNavigation } from "~/hooks/useAtlasNavigation";
import { useDerivedData } from "~/hooks/useDerivedData";
import { useEventHandlers } from "~/hooks/useEventHandlers";
import { useHydrated } from "~/hooks/useHydrated";

const MAX_EXPANDED_LANGUAGES = 4;
const ENGLISH_TOKENS = new Set(["english", "en", "eng", "en-us", "en-gb", "en-uk"]);

function normalizeLanguageToken(value: string) {
  return value.trim().toLowerCase();
}

function isEnglishLanguage(value: string) {
  return ENGLISH_TOKENS.has(normalizeLanguageToken(value));
}

function matchesCatalogSearch(station: Station, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return false;
  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
  const haystack = [
    station.name,
    station.country,
    station.state,
    station.language,
    station.tags,
    station.tagList?.join(" "),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return tokens.every((token) => haystack.includes(token));
}

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const view = url.searchParams.get("view");
  const isWorldView = view === "world";
  const country = isWorldView ? null : url.searchParams.get("country");

  try {
    const stationsPath = country
      ? `/json/stations/bycountry/${encodeURIComponent(country)}?limit=100&hidebroken=true&order=clickcount&reverse=true`
      : `/json/stations/topclicks?limit=40&hidebroken=true`;

    const [countriesResult, stationsResult] = await Promise.allSettled([
      rbFetchJson<Country[]>(`/json/countries`),
      rbFetchJson<unknown>(stationsPath, undefined, { softFail: true }),
    ]);

    const countries =
      countriesResult.status === "fulfilled" ? countriesResult.value : [];
    let stations: Station[] = [];
    const rawStations =
      stationsResult.status === "fulfilled" ? stationsResult.value : null;

    if (countriesResult.status === "rejected") {
      console.error("Failed to load countries:", countriesResult.reason);
    }

    if (!rawStations) {
      if (stationsResult.status === "rejected") {
        console.error("Failed to load stations:", stationsResult.reason);
      } else {
        console.warn("Stations unavailable from all mirrors; continuing with countries.");
      }
    } else if (country) {
      const normalized = normalizeStations(
        Array.isArray(rawStations) ? rawStations : []
      );
      stations = rankStations(normalized);
    } else {
      // Default stations for World Mode / Global view
      stations = normalizeStations(
        Array.isArray(rawStations) ? rawStations : []
      );
    }

    return json(
      { countries, stations, selectedCountry: country, initialView: view },
      {
        headers: {
          "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
        },
      }
    );
  } catch (error) {
    console.error("Error loading radio data:", error);
    // If even countries fail, returned defaults
    return json({ countries: [], stations: [], selectedCountry: country, initialView: view });
  }
}

import { useUIStore } from "~/state/uiStore";

export default function Index() {
  const hydrated = useHydrated();
  const [showSplash, setShowSplash] = useState<boolean | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    setShowSplash(shouldShowAISplash());
  }, [hydrated]);

  // Remix hooks
  const { countries, stations: loaderStations, selectedCountry: loaderSelectedCountry, initialView } = useLoaderData<typeof loader>();
  const [sp, setSp] = useSearchParams();
  const navigate = useNavigate();

  // Route params
  const countryParam = sp.get("country");
  const loaderMatchesSearch = (countryParam ?? null) === (loaderSelectedCountry ?? null);
  const selectedCountry = loaderMatchesSearch ? loaderSelectedCountry : null;
  const [expandedCountryStations, setExpandedCountryStations] = useState<Station[] | null>(null);
  const [expandedCountryLanguages, setExpandedCountryLanguages] = useState<string[] | null>(null);
  const [expandedCountryTags, setExpandedCountryTags] = useState<string[] | null>(null);
  const stations = useMemo(() => {
    if (!loaderMatchesSearch) return [];
    if (!selectedCountry) return loaderStations;
    return expandedCountryStations ?? loaderStations;
  }, [expandedCountryStations, loaderMatchesSearch, loaderStations, selectedCountry]);
  const isCountryViewPending = Boolean(countryParam) && !loaderMatchesSearch;
  const searchQueryRaw = sp.get("q") ?? "";
  const searchQuery = searchQueryRaw.trim().toLowerCase();
  const [searchDraft, setSearchDraft] = useState(searchQueryRaw);
  const [catalogStations, setCatalogStations] = useState<Station[] | null>(null);
  const [isCatalogLoading, setIsCatalogLoading] = useState(false);
  const [catalogQuery, setCatalogQuery] = useState(searchQueryRaw.trim());
  const isCatalogSearchActive = catalogQuery.length >= 2;
  const atlasQuery = isCatalogSearchActive ? "" : searchQuery;

  // View configuration
  const viewParam = sp.get("view");
  const [viewMode, setViewModeState] = useState<'classical' | 'world'>(
    initialView === 'world' || viewParam === 'world' ? 'world' : 'classical'
  );

  // Synchronize viewMode with URL
  const setViewMode = useCallback((mode: 'classical' | 'world') => {
    setViewModeState(mode);
    setSp(prev => {
      const next = new URLSearchParams(prev);
      if (mode === 'world') next.set("view", "world");
      else next.delete("view");
      return next;
    }, { preventScrollReset: true });
  }, [setSp]);

  // Handle back/forward navigation for view param
  useEffect(() => {
    const currentView = sp.get("view") === 'world' ? 'world' : 'classical';
    if (currentView !== viewMode) {
      setViewModeState(currentView);
    }
  }, [sp, viewMode]);

  // Domain hooks - all state management extracted
  const player = useRadioPlayer();
  const mode = useListeningMode();
  const { favoriteStationIds, toggleFavorite } = useFavorites();
  const { recentStations, addToRecent } = useRecentStations();
  const { triggerHoverStatic } = useHoverAudio();
  const atlas = useAtlasState(countries, player.nowPlaying, selectedCountry);
  const cards = usePlayerCards(recentStations, stations, mode.exploreStations, mode.listeningMode);

  // UI state (minimal - most extracted to hooks)
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [cardDirection, setCardDirection] = useState<1 | -1>(1);
  const { isQuickRetuneOpen, setQuickRetuneOpen } = useUIStore();
  const [hasDismissedPlayer, setHasDismissedPlayer] = useState(false);
  const stationRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [stationFilters, setStationFilters] = useState<StationFilterState>(() => createDefaultStationFilters());
  const [isAdvancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [passportEntries, setPassportEntries] = useState<PassportEntry[]>([]);
  const [isPassportOpen, setPassportOpen] = useState(false);


  // Derived data
  const topCountries = useMemo(
    () => [...countries].sort((a, b) => b.stationcount - a.stationcount).slice(0, 80),
    [countries]
  );
  const stampedCountryCodes = useMemo(() => {
    const set = new Set<string>();
    for (const entry of passportEntries) {
      if (entry.countryCode) set.add(entry.countryCode);
    }
    return set;
  }, [passportEntries]);

  const derived = useDerivedData(countries, topCountries, atlasQuery, atlas.activeContinent);
  const selectedCountryMeta = selectedCountry ? atlas.countryMap.get(selectedCountry) || null : null;
  const stationFilterOptions = useMemo(() => deriveStationFilterOptions(stations), [stations]);
  const failuresById = useStationAvailabilityStore((state) => state.failuresById);
  const unavailableIds = useMemo(() => {
    const set = new Set<string>();
    const now = Date.now();
    for (const [id, failure] of Object.entries(failuresById)) {
      if (isStationTemporarilyUnavailable(failure, now)) set.add(id);
    }
    return set;
  }, [failuresById]);

  useEffect(() => {
    if (!selectedCountry || !loaderMatchesSearch) {
      setExpandedCountryLanguages(null);
      setExpandedCountryTags(null);
      setExpandedCountryStations(null);
      return;
    }
    let cancelled = false;

    const loadLanguages = async () => {
      const payload = await rbFetchJson<Array<{ name: string }>>(
        `/json/languages/bycountry/${encodeURIComponent(selectedCountry)}?limit=12&order=stationcount&reverse=true`,
        undefined,
        { softFail: true }
      );
      if (cancelled) return;
      const rawLanguages = Array.isArray(payload) ? payload : [];
      const nonEnglish = rawLanguages
        .map((item) => item?.name)
        .filter((name): name is string => Boolean(name && name.trim()))
        .map((name) => name.trim())
        .filter((name) => !isEnglishLanguage(name));
      const topLanguages = nonEnglish.slice(0, MAX_EXPANDED_LANGUAGES);
      const selectedLanguage = stationFilters.language?.trim();
      if (selectedLanguage && !topLanguages.some((lang) => normalizeLanguageToken(lang) === normalizeLanguageToken(selectedLanguage))) {
        topLanguages.unshift(selectedLanguage);
      }
      setExpandedCountryLanguages(topLanguages.length ? topLanguages : null);
    };

    loadLanguages();

    const selectedTag = stationFilters.mood?.trim();
    setExpandedCountryTags(selectedTag ? [selectedTag] : null);

    return () => {
      cancelled = true;
    };
  }, [loaderMatchesSearch, selectedCountry, stationFilters.language, stationFilters.mood]);

  useEffect(() => {
    if (!selectedCountry || !loaderMatchesSearch) {
      setExpandedCountryStations(null);
      return;
    }
    if ((!expandedCountryLanguages || expandedCountryLanguages.length === 0) && (!expandedCountryTags || expandedCountryTags.length === 0)) {
      setExpandedCountryStations(null);
      return;
    }

    let cancelled = false;

    const loadExpanded = async () => {
      const languageRequests = (expandedCountryLanguages ?? []).map((language) =>
        rbFetchJson<unknown>(
          `/json/stations/bylanguage/${encodeURIComponent(language)}?limit=80&hidebroken=true&order=clickcount&reverse=true`,
          undefined,
          { softFail: true }
        )
      );
      const tagRequests = (expandedCountryTags ?? []).map((tag) =>
        rbFetchJson<unknown>(
          `/json/stations/bytag/${encodeURIComponent(tag)}?limit=80&hidebroken=true&order=clickcount&reverse=true`,
          undefined,
          { softFail: true }
        )
      );
      const requests = [...languageRequests, ...tagRequests];

      const results = await Promise.allSettled(requests);
      if (cancelled) return;

      const merged = new Map<string, Station>();
      for (const station of loaderStations) {
        merged.set(station.uuid, station);
      }

      for (const result of results) {
        if (result.status !== "fulfilled") continue;
        const normalized = normalizeStations(Array.isArray(result.value) ? result.value : []);
        for (const station of normalized) {
          merged.set(station.uuid, station);
        }
      }

      setExpandedCountryStations(rankStations(Array.from(merged.values())));
    };

    loadExpanded();

    return () => {
      cancelled = true;
    };
  }, [expandedCountryLanguages, expandedCountryTags, loaderMatchesSearch, loaderStations, selectedCountry]);

  const handleOpenPassport = useCallback(() => {
    setPassportOpen(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("radio_passport");
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as PassportEntry[];
        setPassportEntries(parsed);
      } catch {
        setPassportEntries([]);
      }
    }
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== "radio_passport") return;
      if (!event.newValue) {
        setPassportEntries([]);
        return;
      }
      try {
        const parsed = JSON.parse(event.newValue) as PassportEntry[];
        setPassportEntries(parsed);
      } catch {
        setPassportEntries([]);
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!player.nowPlaying) return;
    const existing = passportEntries.find((entry) => entry.id === player.nowPlaying?.uuid);
    if (existing) return;
    const code = (player.nowPlaying as { countryCode?: string | null; countrycode?: string | null }).countryCode
      ?? (player.nowPlaying as { countrycode?: string | null }).countrycode;
    const nextEntry: PassportEntry = {
      id: player.nowPlaying.uuid,
      stationName: player.nowPlaying.name,
      country: player.nowPlaying.country,
      countryCode: code ?? undefined,
      timestamp: Date.now(),
      favicon: player.nowPlaying.favicon,
    };
    setPassportEntries((prev) => {
      const next = [nextEntry, ...prev].slice(0, 50);
      localStorage.setItem("radio_passport", JSON.stringify(next));
      return next;
    });
  }, [passportEntries, player.nowPlaying]);
  const pageProtocol = typeof window !== "undefined" ? window.location.protocol : null;
  const isSafari = typeof navigator === "undefined" ? undefined : isSafariBrowser();

  const filteredStations = useMemo(
    () =>
      applyStationFilters(stations, stationFilters, {
        unavailableIds,
        pinnedStationId: player.nowPlaying?.uuid,
        pageProtocol,
        isSafari,
      }),
    [stations, stationFilters, unavailableIds, player.nowPlaying?.uuid, pageProtocol, isSafari]
  );

  const areSameStationList = useCallback((a: Station[], b: Station[]) => {
    if (a === b) return true;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i]?.uuid !== b[i]?.uuid) return false;
    }
    return true;
  }, []);

  // Keep the playback queue aligned with the *visible* (filtered) country list so Next/Prev behave as users expect.
  useEffect(() => {
    if (!selectedCountry) return;
    if (!loaderMatchesSearch) return;

    const nextQueue = filteredStations;
    if (!areSameStationList(player.queue, nextQueue)) {
      player.setQueue(nextQueue);
    }

    if (player.nowPlaying) {
      const idx = nextQueue.findIndex((station) => station.uuid === player.nowPlaying!.uuid);
      if (idx >= 0 && idx !== player.currentStationIndex) {
        player.setCurrentStationIndex(idx);
      }
    }
  }, [
    selectedCountry,
    loaderMatchesSearch,
    filteredStations,
    player.queue,
    player.nowPlaying,
    player.currentStationIndex,
    player.setQueue,
    player.setCurrentStationIndex,
    areSameStationList,
  ]);
  const isStationFilterActive = isStationFilterDirty(stationFilters);
  const filteredEmptyMessage = isStationFilterActive
    ? "No stations match the current filters. Try resetting them or broadening the language, region, mood, or quality filters."
    : undefined;

  // Navigation helpers
  const atlasNavigation = useAtlasNavigation(
    atlas.countryMap,
    atlas.setSelectedContinent,
    atlas.setActiveContinent
  );

  const navigationStations = selectedCountry ? filteredStations : cards.activeStationsSnapshot;
  const { playNext, playPrevious } = useStationNavigation(
    player.currentStationIndex,
    player.setCurrentStationIndex,
    player.shuffleMode,
    navigationStations,
    player.startStation,
    atlas.countryMap,
    atlas.setSelectedContinent,
    atlas.setActiveContinent,
    selectedCountry
  );

  // Core event handler
  const handleStartStation = useCallback((station: Station, options?: { autoPlay?: boolean; preserveQueue?: boolean }) => {
    atlasNavigation.selectContinentForCountry(station.country);
    setHasDismissedPlayer(false);
    player.startStation(station, { autoPlay: options?.autoPlay ?? true, preserveQueue: selectedCountry ? true : options?.preserveQueue });
  }, [atlasNavigation, player, setHasDismissedPlayer, selectedCountry]);

  // All other event handlers
  const handlers = useEventHandlers({
    player,
    mode,
    atlas,
    navigate,
    selectedCountry,
    stations,
    favoriteStationIds,
    recentStations,
    setHasDismissedPlayer,
    setIsQuickRetuneOpen: setQuickRetuneOpen,
    setActiveCardIndex,
    handleStartStation,
    topCountries,
    countries,
    atlasNavigation,
    setViewMode,
  });
  const { handleWorldMoodRefresh } = handlers;

  // Search handler for HeroSection
  const handleSearch = useCallback((query: string) => {
    setSp(prev => {
      const next = new URLSearchParams(prev);
      if (query) next.set("q", query);
      else next.delete("q");
      return next;
    }, { replace: true, preventScrollReset: true });
  }, [setSp]);

  const handleSearchInput = useCallback((query: string) => {
    setSearchDraft(query);
    if (!query.trim()) {
      handleSearch("");
    }
  }, [handleSearch]);

  // Card navigation handlers
  const handleCardChange = useCallback((direction: 1 | -1) => {
    if (cards.playerCards.length <= 1) return;
    setCardDirection(direction);
    setActiveCardIndex((prev) => (prev + direction + cards.playerCards.length) % cards.playerCards.length);
  }, [cards.playerCards.length]);

  const handleCardJump = useCallback((index: number) => {
    if (index === activeCardIndex || index < 0 || index >= cards.playerCards.length) return;
    setCardDirection(index > activeCardIndex ? 1 : -1);
    setActiveCardIndex(index);
  }, [activeCardIndex, cards.playerCards.length]);

  const handleToggleFavorite = useCallback((station: Station) => {
    vibrate(10);
    toggleFavorite(station.uuid);
  }, [toggleFavorite]);

  const swipeHandlers = useSwipeable({
    onSwipedLeft: playNext,
    onSwipedRight: () => player.nowPlaying && (player.stop(), setHasDismissedPlayer(true)),
    trackMouse: true,
  });

  // Side effects
  useEffect(() => {
    setSearchDraft(searchQueryRaw);
  }, [searchQueryRaw]);

  useEffect(() => {
    const trimmed = searchDraft.trim();
    const timeout = window.setTimeout(() => {
      setCatalogQuery(trimmed);
      if (trimmed !== searchQueryRaw.trim()) {
        handleSearch(trimmed);
      }
    }, 1000);
    return () => window.clearTimeout(timeout);
  }, [handleSearch, searchDraft, searchQueryRaw]);

  useEffect(() => {
    const query = catalogQuery.trim();
    if (query.length < 2) {
      setCatalogStations(null);
      setIsCatalogLoading(false);
      return;
    }

    let cancelled = false;
    setIsCatalogLoading(true);
    fetch(`/api/radio-catalog?stations=8000&q=${encodeURIComponent(query)}`, {
      headers: {
        Accept: "application/json",
      },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Catalog snapshot failed with ${response.status}`);
        }
        return response.json() as Promise<{ stations?: Station[] }>;
      })
      .then((snapshot) => {
        if (cancelled) return;
        const snapshotStations = normalizeStations(
          Array.isArray(snapshot?.stations) ? snapshot.stations : []
        );
        const matches = snapshotStations
          .filter((station) => matchesCatalogSearch(station, query))
          .slice(0, 24);
        setCatalogStations(matches);
      })
      .catch((error) => {
        if (cancelled) return;
        console.warn("Catalog search failed", error);
        setCatalogStations([]);
      })
      .finally(() => {
        if (cancelled) return;
        setIsCatalogLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [catalogQuery]);
  useEffect(() => {
    if (player.nowPlaying) addToRecent(player.nowPlaying);
  }, [player.nowPlaying, addToRecent]);

  useEffect(() => {
    if (selectedCountry && player.nowPlaying && player.nowPlaying.country !== selectedCountry) {
      player.stop();
      setHasDismissedPlayer(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCountry, player.nowPlaying]);

  useEffect(() => {
    setStationFilters(createDefaultStationFilters());
  }, [selectedCountry]);

  useEffect(() => {
    if (
      mode.listeningMode === "world" &&
      mode.exploreStations.length === 0 &&
      !mode.isFetchingExplore
    ) {
      handleWorldMoodRefresh();
    }
  }, [
    mode.listeningMode,
    mode.exploreStations.length,
    mode.isFetchingExplore,
    handleWorldMoodRefresh,
  ]);

  useEffect(() => {
    if (selectedCountry || player.nowPlaying || topCountries.length === 0 || hasDismissedPlayer) return;

    let cancelled = false;
    const loadStation = async () => {
      try {
        const raw = await rbFetchJson<unknown>(
          `/json/stations/byname/Radio Caprice - Neo-progressive Rock?limit=1&hidebroken=true`
        );
        const station = pickTopStation(normalizeStations(Array.isArray(raw) ? raw : []));
        if (!station || cancelled) return;

        const continent = atlasNavigation.selectContinentForCountry(station.country) ?? "Asia";
        atlas.setSelectedContinent((prev) => prev ?? continent);
        setHasDismissedPlayer(false);
        player.startStation(station, { autoPlay: false, preserveQueue: true });
      } catch (error) {
        console.error("Failed to seed station", error);
      }
    };

    loadStation();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCountry, player.nowPlaying, topCountries.length, hasDismissedPlayer]);

  useEffect(() => {
    if (!player.nowPlaying) return;
    const stationIndex = cards.playerCards.findIndex(
      (card) => card.type === "station" && card.station.uuid === player.nowPlaying!.uuid
    );
    if (stationIndex >= 0 && stationIndex !== activeCardIndex) {
      setCardDirection(stationIndex > activeCardIndex ? 1 : -1);
      setActiveCardIndex(stationIndex);
    }
  }, [activeCardIndex, player.nowPlaying, cards.playerCards]);

  useEffect(() => {
    if (cards.playerCards.length === 0) setActiveCardIndex(0);
    else if (activeCardIndex > cards.playerCards.length - 1) setActiveCardIndex(cards.playerCards.length - 1);
  }, [activeCardIndex, cards.playerCards.length]);

  // Render
  const ariaHidden = isQuickRetuneOpen ? { "aria-hidden": true, style: { pointerEvents: "none" as const, userSelect: "none" as const } } : {};

  if (viewMode === 'world') {
    return (
      <div className="bg-[#0a0a0c] min-h-screen">
        <WorldHome
          nowPlaying={player.nowPlaying}
          onPlayStation={(s) => handlers.handleStartStation(s, { autoPlay: true })}
          initialStations={stations}
        />
        <QuickRetuneWidget
          isOpen={isQuickRetuneOpen}
          onOpenChange={setQuickRetuneOpen}
          continents={derived.continents}
          activeContinent={atlas.activeContinent}
          onContinentSelect={handlers.handleContinentSelect}
          countriesByContinent={derived.continentData}
          topCountries={topCountries}
          onCountrySelect={handlers.handleQuickRetuneCountrySelect}
          onSurprise={handlers.handleSurpriseRetune}
        />
        <Footer />
      </div>
    );
  }

  return (
    <div className="app-bg relative min-h-screen text-[var(--rp-text)] overflow-x-hidden w-full pb-32">
      {showSplash ? <AISplashScreen onComplete={() => setShowSplash(false)} /> : null}
      <SignalField quality={selectedCountry ? "lite" : "full"} />

      <main
        className={`relative z-10 flex w-full flex-col gap-0 pt-0 md:pt-2 ${
          showSplash === null ? "opacity-0" : ""
        }`}
        {...swipeHandlers}
        {...ariaHidden}
      >
        {isCountryViewPending ? (
          <div className="mx-auto w-full max-w-7xl px-4 md:px-6">
            <LoadingView />
          </div>
        ) : !selectedCountry ? (
          <>
            <HeroSection topCountries={topCountries} totalStations={derived.totalStations} continents={derived.continents.length}
              nowPlaying={player.nowPlaying} isPlaying={player.isPlaying} searchQueryRaw={searchDraft} onStartListening={handlers.handleStartListening}
              onQuickRetune={handlers.handleQuickRetune} onMissionExploreWorld={() => setViewMode('world')}
              onMissionStayLocal={handlers.handleMissionStayLocal} onHoverSound={triggerHoverStatic}
              onSearch={handleSearchInput}
              onOpenPassport={handleOpenPassport}
            />

            <div className="relative z-20 mx-auto -mt-6 flex w-full max-w-7xl flex-col gap-7 px-4 md:-mt-8 md:gap-8 md:px-6">
              <section className="relative -mx-4 px-4 pt-5 md:-mx-6 md:px-6 md:pt-6">
                <div className="pointer-events-none absolute left-4 top-5 h-[13rem] w-[30rem] max-w-full rounded-full bg-[radial-gradient(circle_at_16%_18%,rgba(245,177,45,0.11),transparent_46%),radial-gradient(circle_at_72%_58%,rgba(136,116,99,0.08),transparent_36%)] blur-2xl" />
                <div className="relative">
                  <JourneyModule
                    nowPlaying={player.nowPlaying}
                    recentStations={recentStations}
                    topCountries={topCountries}
                    onStartListening={handlers.handleStartListening}
                    onQuickRetune={handlers.handleQuickRetune}
                    onOpenPassport={handleOpenPassport}
                  />
                </div>
              </section>

              {catalogQuery.length >= 2 && (
                <section className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Title order={2} style={{ fontSize: "1.35rem", fontWeight: 700, color: "var(--rp-text)" }}>
                      Stations matching "{catalogQuery}"
                    </Title>
                    <button
                      onClick={() => handleSearch("")}
                      className="text-[10px] font-bold uppercase tracking-widest text-[var(--rp-gold)] hover:text-[var(--rp-gold-strong)] bg-[rgba(245,177,45,0.12)] px-2 py-0.5 rounded-full border border-[rgba(245,177,45,0.3)] transition-all hover:bg-[rgba(245,177,45,0.2)]"
                    >
                      Clear
                    </button>
                  </div>
                  <StationGrid
                    stations={catalogStations ?? []}
                    nowPlaying={player.nowPlaying}
                    stationRefs={stationRefs}
                    onPlayStation={handleStartStation}
                    isFetchingExplore={isCatalogLoading}
                    favoriteStationIds={favoriteStationIds}
                    onToggleFavorite={handleToggleFavorite}
                    emptyMessage={`No stations found for "${catalogQuery}". Try another search.`}
                    unavailableIds={unavailableIds}
                  />
                </section>
              )}

              <section id="atlas">
                <div className="relative overflow-hidden rounded-[2.2rem] border border-white/8 bg-[linear-gradient(180deg,rgba(8,12,18,0.56)_0%,rgba(8,12,18,0.42)_100%)] px-4 py-5 shadow-[0_18px_42px_rgba(0,0,0,0.28)] backdrop-blur-md md:px-6 md:py-6">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(245,177,45,0.1),transparent_26%),radial-gradient(circle_at_bottom_left,rgba(245,177,45,0.04),transparent_22%)]" />
                  <div className="relative px-1 py-2 md:px-2">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <Text size="xs" c="var(--rp-muted-2)" className="font-semibold uppercase tracking-[0.32em]">
                          {atlas.activeContinent ? `${atlas.activeContinent} route` : "Atlas guide"}
                        </Text>
                        <Title order={2} style={{ fontSize: "1.6rem", fontWeight: 700, color: "var(--rp-text)", marginBottom: "0.15rem" }}>
                          {atlasQuery ? `Search results for "${atlasQuery}"` : atlas.activeContinent ? `Start in ${atlas.activeContinent}` : "Choose a region, then enter a country flow"}
                        </Title>
                        <div className="flex items-center gap-3">
                          <Text size="xs" c="var(--rp-muted)">
                            {atlasQuery ? "Showing matching countries from the global atlas." : atlas.activeContinent ? "The first countries carry the strongest route into live stations, country notes, and listening context." : "Pick a region first. The atlas then narrows into curated country routes instead of a flat directory."}
                          </Text>
                          {(atlasQuery || atlas.activeContinent) && (
                            <button
                              onClick={() => {
                                handleSearch("");
                                atlas.setActiveContinent(null);
                              }}
                              className="text-[10px] font-bold uppercase tracking-widest text-[var(--rp-gold)] hover:text-[var(--rp-gold-strong)] bg-[rgba(245,177,45,0.12)] px-2 py-0.5 rounded-full border border-[rgba(245,177,45,0.3)] transition-all hover:bg-[rgba(245,177,45,0.2)]"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <Text size="xs" c="var(--rp-text)" className="whitespace-nowrap font-semibold uppercase tracking-[0.22em]">
                          {atlas.activeContinent ?? "Global atlas"}
                        </Text>
                        <Text size="xs" c="var(--rp-muted-2)" className="whitespace-nowrap font-mono tracking-[0.16em] uppercase">
                          {derived.filteredCountries.length.toLocaleString()} of {topCountries.length.toLocaleString()} spotlight countries
                        </Text>
                      </div>
                    </div>

                    <div className="mt-4 overflow-x-auto scroll-track pt-4">
                      <AtlasFilters continents={derived.continents} activeContinent={atlas.activeContinent} onContinentSelect={atlas.setActiveContinent} />
                    </div>
                  </div>
                  <div className="relative mt-6 md:mt-8">
                  {derived.filteredCountries.length > 0 ? (
                    <AtlasGrid
                      displaySections={derived.displaySections}
                      onPreviewCountry={handlers.handlePreviewCountryPlay}
                      stampedCountries={stampedCountryCodes}
                    />
                  ) : (
                    <div className="py-16 text-center bg-[var(--rp-card)] rounded-3xl border-2 border-dashed border-white/10 backdrop-blur-sm">
                      <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-black/40 text-[var(--rp-muted)] mb-4">
                        <IconSearch size={24} />
                      </div>
                      <Title order={3} size="h4" c="var(--rp-text)" fw={800} className="mb-1">No signals found</Title>
                      <Text size="sm" c="var(--rp-muted)" className="max-w-xs mx-auto mb-6">
                        We couldn't find any countries matching "{atlasQuery}". Try another name or explore the full atlas.
                      </Text>
                      <button
                        onClick={() => handleSearch("")}
                        className="px-6 py-2 rounded-full bg-[var(--rp-gold)] text-black text-xs font-bold uppercase tracking-widest hover:bg-[var(--rp-gold-strong)] transition-all"
                      >
                        Clear Search
                      </button>
                    </div>
                  )}
                  </div>
                </div>
              </section>

              <SignalBand
                topCountries={topCountries}
                nowPlaying={player.nowPlaying}
                recentStations={recentStations}
              />
            </div>
          </>
        ) : (
          <div className="mx-auto w-full max-w-7xl px-4 md:px-6 space-y-6 md:space-y-8">
            <CountryOverview
              selectedCountry={selectedCountry}
              selectedCountryMeta={selectedCountryMeta}
              stationCount={stations.length}
              stations={stations}
              onBack={handlers.handleBackToWorldView}
              nowPlaying={player.nowPlaying}
              isPlaying={player.isPlaying}
              onPlayPause={player.playPause}
              onNext={playNext}
              onPrev={playPrevious}
              queue={player.queue}
              currentIndex={player.currentStationIndex}
              onSelectStation={(station) => {
                player.startStation(station, { preserveQueue: true });
              }}
              transparent={false}
            />

            {player.nowPlaying && (
              <section className="rounded-3xl border border-white/10 bg-[var(--rp-surface)] px-6 py-6 md:px-10 md:py-8 shadow-[0_18px_40px_rgba(0,0,0,0.5)] backdrop-blur-xl">
                <JourneyModule
                  nowPlaying={player.nowPlaying}
                  recentStations={recentStations}
                  topCountries={topCountries}
                  onStartListening={handlers.handleStartListening}
                  onQuickRetune={handlers.handleQuickRetune}
                  onOpenPassport={handleOpenPassport}
                />
              </section>
            )}

            <section className="rounded-3xl border border-white/10 bg-[var(--rp-surface)] px-6 py-6 md:px-10 md:py-8 shadow-[0_18px_40px_rgba(0,0,0,0.5)] backdrop-blur-xl">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <Text fw={700} size="sm" c="slate.9">
                    Stations in {selectedCountry}
                  </Text>
                  <Text size="xs" c="dimmed" className="font-mono uppercase tracking-[0.32em]">
                    {filteredStations.length.toLocaleString()} / {stations.length.toLocaleString()} tuned
                  </Text>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsFilterDrawerOpen(true)}
                    className="md:hidden inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-600 shadow-sm"
                    aria-label="Open filters"
                  >
                    <IconAdjustmentsHorizontal size={16} />
                    Filters
                    {isStationFilterActive && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />}
                  </button>
                </div>
                <div className="hidden flex-wrap items-center gap-2 md:flex">
                  <button
                    type="button"
                    onClick={() => setStationFilters(createDefaultStationFilters())}
                    className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 hover:text-slate-900"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdvancedFiltersOpen((prev) => !prev)}
                    className="rounded-full border border-slate-300 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-600 transition hover:bg-slate-50"
                  >
                    {isAdvancedFiltersOpen ? "Hide advanced" : "Advanced"}
                  </button>
                </div>
              </div>

              <div className="mt-4">
                <div className="hidden md:block">
                  <StationFilterQuickBar
                    filters={stationFilters}
                    options={stationFilterOptions}
                    onChange={setStationFilters}
                  />
                  {/* Desktop Advanced Filters */}
                  <Collapse in={isAdvancedFiltersOpen}>
                    <div className="mt-4">
                      <StationFiltersPanel
                        filters={stationFilters}
                        options={stationFilterOptions}
                        counts={{ total: stations.length, filtered: filteredStations.length }}
                        isDirty={isStationFilterActive}
                        onChange={setStationFilters}
                        onReset={() => setStationFilters(createDefaultStationFilters())}
                      />
                    </div>
                  </Collapse>
                </div>

                {/* Mobile Filter Drawer */}
                <MobileFilterDrawer
                  opened={isFilterDrawerOpen}
                  onClose={() => setIsFilterDrawerOpen(false)}
                  filters={stationFilters}
                  options={stationFilterOptions}
                  counts={{ total: stations.length, filtered: filteredStations.length }}
                  isDirty={isStationFilterActive}
                  onChange={setStationFilters}
                  onReset={() => setStationFilters(createDefaultStationFilters())}
                />
              </div>

              <div className="mt-6">
                <StationGrid
                  stations={filteredStations}
                  nowPlaying={player.nowPlaying}
                  stationRefs={stationRefs}
                  onPlayStation={handleStartStation}
                  isFetchingExplore={mode.isFetchingExplore}
                  favoriteStationIds={favoriteStationIds}
                  onToggleFavorite={handleToggleFavorite}
                  emptyMessage={filteredEmptyMessage}
                  unavailableIds={unavailableIds}
                />
              </div>
            </section>
          </div>
      )}
      </main>

      <QuickRetuneWidget isOpen={isQuickRetuneOpen} onOpenChange={setQuickRetuneOpen} continents={derived.continents}
        activeContinent={atlas.activeContinent} onContinentSelect={handlers.handleContinentSelect}
        countriesByContinent={derived.continentData} topCountries={topCountries}
        onCountrySelect={handlers.handleQuickRetuneCountrySelect} onSurprise={handlers.handleSurpriseRetune}
      />

      <div className="hidden md:block">
        <Drawer
          opened={isPassportOpen}
          onClose={() => setPassportOpen(false)}
          position="right"
          size={420}
          padding={0}
          styles={{
            content: {
              backgroundColor: "var(--rp-card)",
              borderLeft: "1px solid rgba(255,255,255,0.08)",
            },
            header: {
              padding: 0,
              borderBottom: "1px solid rgba(255,255,255,0.08)",
            },
            body: {
              padding: 0,
              backgroundColor: "var(--rp-card)",
            },
            overlay: {
              backgroundColor: "rgba(2,6,12,0.6)",
              backdropFilter: "blur(6px)",
            },
          }}
        >
          <div className="px-5 py-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Text size="xs" fw={800} tt="uppercase" className="tracking-[0.32em] text-[var(--rp-muted-2)]">
                  My Passport
                </Text>
                <Text size="lg" fw={700} c="var(--rp-text)">
                  Latest stamps across the dial.
                </Text>
                <Text size="xs" c="var(--rp-muted)" className="font-mono uppercase tracking-[0.2em]">
                  {passportEntries.length.toLocaleString()} destinations visited
                </Text>
              </div>
              <a
                href="/?view=world&tab=passport"
                className="inline-flex h-9 items-center justify-center rounded-full border border-[rgba(245,177,45,0.5)] bg-[rgba(245,177,45,0.12)] px-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--rp-gold)] shadow-[0_12px_24px_rgba(0,0,0,0.45)] hover:bg-[rgba(245,177,45,0.2)]"
              >
                Full passport
              </a>
            </div>
          </div>
          <ScrollArea h="calc(100vh - 140px)" type="never">
            <div className="px-5 pb-6">
              {passportEntries.length > 0 ? (
                <div className="space-y-3">
                  {passportEntries.slice(0, 20).map((entry) => (
                    <div
                      key={`${entry.id}-${entry.timestamp}`}
                      className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/40 px-4 py-3 shadow-[0_10px_22px_rgba(0,0,0,0.45)]"
                    >
                      <div className="h-10 w-10 overflow-hidden rounded-xl border border-white/10 bg-black/60">
                        {entry.favicon ? (
                          <img src={entry.favicon} alt="" className="h-full w-full object-cover" />
                        ) : null}
                      </div>
                      <div className="min-w-0">
                        <Text size="sm" fw={700} c="var(--rp-text)" className="truncate">
                          {entry.stationName}
                        </Text>
                        <Text size="xs" c="var(--rp-muted)" className="truncate">
                          {entry.country}
                        </Text>
                      </div>
                      <div className="ml-auto text-right">
                        <Text size="xs" c="var(--rp-muted-2)" className="font-mono">
                          {new Date(entry.timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </Text>
                        <Text size="xs" c="var(--rp-muted-2)" className="font-mono opacity-70">
                          {new Date(entry.timestamp).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                        </Text>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-white/10 bg-black/30 px-5 py-6 text-sm text-[var(--rp-muted)]">
                  No passport stamps yet. Start listening to capture your first destination.
                </div>
              )}
            </div>
          </ScrollArea>
        </Drawer>
      </div>

      <div className="md:hidden">
        <Drawer
          opened={isPassportOpen}
          onClose={() => setPassportOpen(false)}
          position="bottom"
          size="70%"
          padding={0}
          styles={{
            content: {
              backgroundColor: "var(--rp-card)",
              borderTopLeftRadius: "24px",
              borderTopRightRadius: "24px",
            },
            header: {
              padding: 0,
              borderBottom: "1px solid rgba(255,255,255,0.08)",
            },
            body: {
              padding: 0,
              backgroundColor: "var(--rp-card)",
            },
            overlay: {
              backgroundColor: "rgba(2,6,12,0.6)",
              backdropFilter: "blur(6px)",
            },
          }}
        >
          <div className="px-5 py-4">
            <Text size="xs" fw={800} tt="uppercase" className="tracking-[0.32em] text-[var(--rp-muted-2)]">
              My Passport
            </Text>
            <Text size="lg" fw={700} c="var(--rp-text)">
              Latest stamps across the dial.
            </Text>
          </div>
          <ScrollArea h="calc(70vh - 80px)" type="never">
            <div className="px-5 pb-6">
              {passportEntries.length > 0 ? (
                <div className="space-y-3">
                  {passportEntries.slice(0, 12).map((entry) => (
                    <div
                      key={`${entry.id}-${entry.timestamp}`}
                      className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/40 px-4 py-3"
                    >
                      <div className="h-10 w-10 overflow-hidden rounded-xl border border-white/10 bg-black/60">
                        {entry.favicon ? (
                          <img src={entry.favicon} alt="" className="h-full w-full object-cover" />
                        ) : null}
                      </div>
                      <div className="min-w-0">
                        <Text size="sm" fw={700} c="var(--rp-text)" className="truncate">
                          {entry.stationName}
                        </Text>
                        <Text size="xs" c="var(--rp-muted)" className="truncate">
                          {entry.country}
                        </Text>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-white/10 bg-black/30 px-5 py-6 text-sm text-[var(--rp-muted)]">
                  No passport stamps yet. Start listening to capture your first destination.
                </div>
              )}
            </div>
          </ScrollArea>
        </Drawer>
      </div>

      <Footer />

    </div >
  );
}
