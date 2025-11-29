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
import JourneyComposer from "~/components/JourneyComposer";
import MissionLogDrawer from "~/components/MissionLogDrawer";

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
  const filteredStations = useMemo(() => applyStationFilters(stations, stationFilters), [stations, stationFilters]);
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
          `/json/stations/byname/ISHQ FM 104.8?limit=1&hidebroken=true`
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
    <div className="app-bg relative min-h-screen text-slate-900" style={{
      background: "#e0e5ec",
    }}>
      <main
        className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pt-4 md:px-6"
        style={{ paddingBottom: "calc(8rem + env(safe-area-inset-bottom, 0px))" }}
        {...swipeHandlers}
        {...ariaHidden}
      >  {isCountryViewPending ? <LoadingView /> : !selectedCountry ? (
        <>
          <HeroSection topCountries={topCountries} totalStations={derived.totalStations} continents={derived.continents.length}
            nowPlaying={player.nowPlaying} searchQueryRaw={searchQueryRaw} onStartListening={handlers.handleStartListening}
            onQuickRetune={handlers.handleQuickRetune} onMissionExploreWorld={handlers.handleMissionExploreWorld}
            onMissionStayLocal={handlers.handleMissionStayLocal} onHoverSound={triggerHoverStatic}
          />

          <section className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <JourneyComposer onSubmit={() => handlers.handleQuickRetune()} />
            <div className="rounded-3xl border border-slate-200 bg-slate-100/50 p-4 shadow-sm flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-800">Mission Log</p>
                  <p className="text-xs text-slate-500">
                    Track upcoming AI journeys and revisit past prompts once the service hooks in.
                  </p>
                </div>
                <div className="rounded-full border border-slate-300 px-3 py-1 text-[11px] uppercase tracking-[0.35em] text-slate-500 font-bold">
                  TODO
                </div>
              </div>
              <MissionLogDrawer />
            </div>
          </section>

          <section id="atlas" className="mt-6">
            <div className="sticky top-[73px] z-40 pb-3 pt-3">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <Title order={2} style={{ fontSize: "1.35rem", fontWeight: 700, color: "#1e293b", marginBottom: "0.15rem" }}>
                    Chart your path by continent
                  </Title>
                  <Text size="xs" c="dimmed">
                    Filter the atlas to the regions that match your listening mood.
                  </Text>
                </div>
                <Text size="xs" c="dimmed" className="whitespace-nowrap font-mono">
                  Showing {derived.filteredCountries.length.toLocaleString()} of {topCountries.length.toLocaleString()} spotlight countries
                </Text>
              </div>

              <div className="mt-3">
                <AtlasFilters continents={derived.continents} activeContinent={atlas.activeContinent} onContinentSelect={atlas.setActiveContinent} />
              </div>
            </div>

            <div className="mt-4">
              <AtlasGrid displaySections={derived.displaySections} onPreviewCountry={handlers.handlePreviewCountryPlay} />
            </div>
          </section>
        </>
      ) : (
        <>
          <section className="mt-4 rounded-2xl border border-slate-300/30 bg-[#e0e5ec] shadow-[3px_3px_6px_#b8b9be,-3px_-3px_6px_#ffffff]">
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
              transparent={true}
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

          <div className="mt-4">
            <StationGrid
              stations={filteredStations}
              nowPlaying={player.nowPlaying}
              stationRefs={stationRefs}
              onPlayStation={handleStartStation}
              isFetchingExplore={mode.isFetchingExplore}
              favoriteStationIds={favoriteStationIds}
              onToggleFavorite={handleToggleFavorite}
              emptyMessage={filteredEmptyMessage}
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

    </div >
  );
}
