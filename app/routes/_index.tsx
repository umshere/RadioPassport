import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useNavigate, useSearchParams } from "@remix-run/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Text, Title } from "@mantine/core";
import { useSwipeable } from "react-swipeable";

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

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const country = url.searchParams.get("country");

  try {
    const countries: Country[] = await rbFetchJson(`/json/countries`);
    let stations: Station[] = [];

    if (country) {
      const rawStations = await rbFetchJson<unknown>(
        `/json/stations/bycountry/${encodeURIComponent(country)}?limit=100&hidebroken=true&order=clickcount&reverse=true`
      );
      const normalized = normalizeStations(Array.isArray(rawStations) ? rawStations : []);
      stations = rankStations(normalized);
    }

    return json(
      { countries, stations, selectedCountry: country },
      {
        headers: {
          "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
        },
      }
    );
  } catch (error) {
    console.error("Error loading radio data:", error);
    return json({ countries: [], stations: [], selectedCountry: country });
  }
}

import { useUIStore } from "~/state/uiStore";

export default function Index() {
  // Remix hooks
  const { countries, stations: loaderStations, selectedCountry: loaderSelectedCountry } = useLoaderData<typeof loader>();
  const [sp] = useSearchParams();
  const navigate = useNavigate();

  // Route params
  const countryParam = sp.get("country");
  const loaderMatchesSearch = (countryParam ?? null) === (loaderSelectedCountry ?? null);
  const selectedCountry = loaderMatchesSearch ? loaderSelectedCountry : null;
  const stations = loaderMatchesSearch ? loaderStations : [];
  const isCountryViewPending = Boolean(countryParam) && !loaderMatchesSearch;
  const searchQueryRaw = sp.get("q") ?? "";
  const searchQuery = searchQueryRaw.trim().toLowerCase();

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

  // Derived data
  const topCountries = useMemo(
    () => [...countries].sort((a, b) => b.stationcount - a.stationcount).slice(0, 80),
    [countries]
  );

  const derived = useDerivedData(countries, topCountries, searchQuery, atlas.activeContinent);
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

  const { playNext, playPrevious } = useStationNavigation(
    player.currentStationIndex,
    player.setCurrentStationIndex,
    player.shuffleMode,
    cards.activeStationsSnapshot,
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
    player.startStation(station, { autoPlay: options?.autoPlay ?? true });
  }, [atlasNavigation, player, setHasDismissedPlayer]);

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
  });
  const { handleWorldMoodRefresh } = handlers;

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
          `/json/stations/byname/Radio Schizoid - Dub Techno?limit=1&hidebroken=true`
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

  return (
    <div className="app-bg relative min-h-screen text-slate-900 overflow-x-hidden w-full pb-32" style={{
      background: "linear-gradient(180deg, #d1d5db 0%, #9ca3af 50%, #6b7280 100%)",
    }}>
      <main
        className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-4 md:gap-6 px-4 pt-0 md:px-6 md:pt-2"
        {...swipeHandlers}
        {...ariaHidden}
      >  {isCountryViewPending ? <LoadingView /> : !selectedCountry ? (
        <>
          <HeroSection topCountries={topCountries} totalStations={derived.totalStations} continents={derived.continents.length}
            nowPlaying={player.nowPlaying} searchQueryRaw={searchQueryRaw} onStartListening={handlers.handleStartListening}
            onQuickRetune={handlers.handleQuickRetune} onMissionExploreWorld={handlers.handleMissionExploreWorld}
            onMissionStayLocal={handlers.handleMissionStayLocal} onHoverSound={triggerHoverStatic}
          />

          {/* Stats Bar - Consistent pill surface */}
          <div className="rounded-2xl border border-white/60 bg-white/90 px-4 py-5 shadow-lg backdrop-blur-sm md:px-8">
            <div className="grid grid-cols-3 divide-x divide-slate-200/50 text-center">
              <div className="px-2">
                <Text size="lg" fw={800} c="slate.9" className="leading-none">
                  {topCountries.length.toLocaleString()}
                </Text>
                <Text size="xs" c="dimmed" fw={600} tt="uppercase" className="mt-1 tracking-[0.25em]">
                  Countries
                </Text>
              </div>
              <div className="px-2">
                <Text size="lg" fw={800} c="slate.9" className="leading-none">
                  {(derived.totalStations / 1000).toFixed(0)}k+
                </Text>
                <Text size="xs" c="dimmed" fw={600} tt="uppercase" className="mt-1 tracking-[0.25em]">
                  Stations
                </Text>
              </div>
              <div className="px-2">
                <Text size="lg" fw={800} c="slate.9" className="leading-none">
                  {derived.continents.length}
                </Text>
                <Text size="xs" c="dimmed" fw={600} tt="uppercase" className="mt-1 tracking-[0.25em]">
                  Continents
                </Text>
              </div>
            </div>
          </div>

          <section id="atlas" className="mt-4 md:mt-6">
            <div className="sticky top-[73px] z-30 -mx-4 px-4 py-3 md:-mx-8 md:px-8">
              <div className="rounded-2xl border border-white/70 bg-white/85 px-4 py-3 shadow-[0_12px_32px_rgba(15,23,42,0.12)] backdrop-blur-xl md:px-6">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <Title order={2} style={{ fontSize: "1.35rem", fontWeight: 700, color: "#1e293b", marginBottom: "0.15rem" }}>
                      Chart your path by continent
                    </Title>
                    <Text size="xs" c="dimmed">
                      Filter the atlas to the regions that match your listening mood.
                    </Text>
                  </div>
                  <Text size="xs" c="dimmed" className="whitespace-nowrap font-mono tracking-[0.16em] uppercase">
                    Showing {derived.filteredCountries.length.toLocaleString()} of {topCountries.length.toLocaleString()} spotlight countries
                  </Text>
                </div>

                <div className="mt-3">
                  <AtlasFilters continents={derived.continents} activeContinent={atlas.activeContinent} onContinentSelect={atlas.setActiveContinent} />
                </div>
              </div>
            </div>

            <div className="mt-6 md:mt-8">
              <AtlasGrid displaySections={derived.displaySections} onPreviewCountry={handlers.handlePreviewCountryPlay} />
            </div>
          </section>
        </>
      ) : (
        <>
          <section className="-mx-4 sm:-mx-6 md:mx-0 rounded-2xl border border-white/70 bg-white/80 shadow-[0_12px_32px_rgba(15,23,42,0.12)] backdrop-blur-xl">
            <CountryOverview
              selectedCountry={selectedCountry}
              selectedCountryMeta={selectedCountryMeta}
              stationCount={stations.length}
              onBack={handlers.handleBackToWorldView}
              nowPlaying={player.nowPlaying}
              isPlaying={player.isPlaying}
              onPlayPause={player.playPause}
              onNext={playNext}
              onPrev={playPrevious}
              transparent={false}
            />

            <div className="border-t border-slate-300/30 px-6 py-6 md:px-10">
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
                <StationFilterQuickBar
                  filters={stationFilters}
                  options={stationFilterOptions}
                  onChange={setStationFilters}
                />
              </div>

              {isAdvancedFiltersOpen && (
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
              )}
            </div>
          </section>

          <div>
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
        </>
      )}
      </main>

      <QuickRetuneWidget isOpen={isQuickRetuneOpen} onOpenChange={setQuickRetuneOpen} continents={derived.continents}
        activeContinent={atlas.activeContinent} onContinentSelect={handlers.handleContinentSelect}
        countriesByContinent={derived.continentData} topCountries={topCountries}
        onCountrySelect={handlers.handleQuickRetuneCountrySelect} onSurprise={handlers.handleSurpriseRetune}
      />

      <Footer />

    </div >
  );
}
