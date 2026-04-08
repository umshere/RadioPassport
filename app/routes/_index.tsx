import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useNavigate, useSearchParams } from "@remix-run/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Collapse, Drawer, ScrollArea, Text, Title } from "@mantine/core";
import { useSwipeable } from "react-swipeable";
import { IconAdjustmentsHorizontal, IconSearch } from "@tabler/icons-react";


import { BRAND } from "~/constants/brand";
import { getContinent } from "~/utils/geography";
import { rbFetchJson } from "~/utils/radioBrowser";
import { normalizeStations, sanitizeArtworkUrl } from "~/utils/stations";
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
import type { Country, QueueSession, Station } from "~/types/radio";
import type { PassportEntry } from "~/types/world";
import { createQueueSession } from "~/utils/playerQueue";

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
import { SignalField } from "~/components/SignalField";
import { CuratedShelfDeck, type CuratedShelfViewModel } from "./components/CuratedShelfDeck";
import { annotateHealth } from "~/server/stations/health";
import { usePlayerStore } from "~/state/playerStore";
import { probeShelfStations } from "~/server/stations/probe";
import { buildAiShelfReason } from "~/server/stations/shelfReason";


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
const COUNTRY_NAME_ALIASES = new Map<string, string>([
  ["the united states of america", "united states"],
  ["united states of america", "united states"],
  ["usa", "united states"],
  ["u s a", "united states"],
  ["uk", "united kingdom"],
  ["great britain", "united kingdom"],
]);

function normalizeLanguageToken(value: string) {
  return value.trim().toLowerCase();
}

function isEnglishLanguage(value: string) {
  return ENGLISH_TOKENS.has(normalizeLanguageToken(value));
}

function normalizeCountryNameForCompare(value?: string | null) {
  const normalized = (value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

  return COUNTRY_NAME_ALIASES.get(normalized) ?? normalized;
}

function isSameCountryName(left?: string | null, right?: string | null) {
  const normalizedLeft = normalizeCountryNameForCompare(left);
  const normalizedRight = normalizeCountryNameForCompare(right);
  return Boolean(normalizedLeft && normalizedRight && normalizedLeft === normalizedRight);
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

type HomeCuratedShelf = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  badge: string;
  theme: {
    glow: string;
    border: string;
    pill: string;
  };
  stations: Station[];
  topCountries: string[];
  topTags: string[];
  languageCount: number;
  averageHealthScore: number;
  likelyUpCount: number;
  probedPlayableCount: number;
  probedStationCount: number;
  mixNote: string;
  availabilityNote: string;
  aiReason: string | null;
};

type BehaviorSnapshot = {
  favoriteStationIds: string[];
  recentStationIds: string[];
  skippedStationIds: string[];
};

const USER_BEHAVIOR_COOKIE = "rp-user-signals";

function readCookieValue(cookieHeader: string | null, name: string) {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(/;\s*/);
  for (const part of parts) {
    const [key, ...rest] = part.split("=");
    if (key !== name) continue;
    return rest.join("=");
  }
  return null;
}

function parseBehaviorSnapshot(cookieHeader: string | null): BehaviorSnapshot {
  const raw = readCookieValue(cookieHeader, USER_BEHAVIOR_COOKIE);
  if (!raw) {
    return { favoriteStationIds: [], recentStationIds: [], skippedStationIds: [] };
  }

  try {
    const decoded = JSON.parse(decodeURIComponent(raw)) as Partial<BehaviorSnapshot>;
    return {
      favoriteStationIds: Array.isArray(decoded.favoriteStationIds) ? decoded.favoriteStationIds.slice(0, 20) : [],
      recentStationIds: Array.isArray(decoded.recentStationIds) ? decoded.recentStationIds.slice(0, 12) : [],
      skippedStationIds: Array.isArray(decoded.skippedStationIds) ? decoded.skippedStationIds.slice(0, 20) : [],
    };
  } catch {
    return { favoriteStationIds: [], recentStationIds: [], skippedStationIds: [] };
  }
}

function writeBehaviorSnapshot(snapshot: BehaviorSnapshot) {
  return encodeURIComponent(
    JSON.stringify({
      favoriteStationIds: snapshot.favoriteStationIds.slice(0, 20),
      recentStationIds: snapshot.recentStationIds.slice(0, 12),
      skippedStationIds: snapshot.skippedStationIds.slice(0, 20),
    })
  );
}

const HOME_CURATED_SHELF_DEFINITIONS = [
  {
    id: "night-signals",
    eyebrow: "After dark",
    title: "Night Signals",
    description: "Ambient, chill, and low-tempo stations that feel settled enough for long listening sessions.",
    badge: "Mood-led",
    tags: ["ambient", "chillout", "downtempo"],
    theme: {
      glow: "rgba(93, 151, 208, 0.18)",
      border: "rgba(93, 151, 208, 0.34)",
      pill: "rgba(93, 151, 208, 0.14)",
    },
  },
  {
    id: "pulse-lift",
    eyebrow: "Move the dial",
    title: "Pulse Lift",
    description: "Brighter rhythmic stations when the user wants motion, drive, and less drift.",
    badge: "Energy",
    tags: ["electronic", "dance", "house"],
    theme: {
      glow: "rgba(232, 109, 80, 0.18)",
      border: "rgba(232, 109, 80, 0.34)",
      pill: "rgba(232, 109, 80, 0.14)",
    },
  },
  {
    id: "newsroom-live",
    eyebrow: "Spoken now",
    title: "Newsroom Live",
    description: "News, talk, and spoken-word stations worth checking right now.",
    badge: "Utility",
    tags: ["news", "talk", "culture"],
    theme: {
      glow: "rgba(245, 177, 45, 0.18)",
      border: "rgba(245, 177, 45, 0.34)",
      pill: "rgba(245, 177, 45, 0.14)",
    },
  },
] as const;

function collectTopValues(values: string[], limit: number) {
  const counts = new Map<string, number>();
  for (const value of values) {
    const normalized = value.trim();
    if (!normalized) continue;
    counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, limit)
    .map(([value]) => value);
}

async function fetchStationsByUuid(ids: string[]): Promise<Station[]> {
  if (ids.length === 0) return [];
  const raw = await rbFetchJson<unknown>(
    `/json/stations/byuuid?uuids=${encodeURIComponent(ids.join(","))}`,
    undefined,
    { softFail: true, timeoutMs: 4500 }
  );
  return normalizeStations(Array.isArray(raw) ? raw : []);
}

async function finalizeHomeCuratedShelf(
  shelf: Omit<HomeCuratedShelf, "stations" | "probedPlayableCount" | "probedStationCount" | "aiReason"> & { stations: Station[] }
): Promise<HomeCuratedShelf> {
  const probedStations = await probeShelfStations(shelf.stations, 5);
  const probedSubset = probedStations.slice(0, 5);
  const probedPlayableCount = probedSubset.filter((station) => station.probeStatus === "ok" || station.probeStatus === "slow").length;
  const probedStationCount = probedSubset.filter((station) => station.probeStatus && station.probeStatus !== "unknown").length;
  const aiReason = await buildAiShelfReason({
    shelfId: shelf.id,
    title: shelf.title,
    description: shelf.description,
    topCountries: shelf.topCountries,
    topTags: shelf.topTags,
    likelyUpCount: shelf.likelyUpCount,
    stationCount: shelf.stations.length,
  });

  const availabilityNote = probedStationCount > 0
    ? "Live signals checked before render."
    : shelf.availabilityNote;

  return {
    ...shelf,
    stations: probedStations,
    probedPlayableCount,
    probedStationCount,
    availabilityNote,
    aiReason,
  };
}

async function loadHomeCuratedShelf(definition: (typeof HOME_CURATED_SHELF_DEFINITIONS)[number]): Promise<HomeCuratedShelf> {
  const results = await Promise.allSettled(
    definition.tags.map((tag) =>
      rbFetchJson<unknown>(
        `/json/stations/bytag/${encodeURIComponent(tag)}?limit=24&hidebroken=true&order=clickcount&reverse=true`,
        undefined,
        { softFail: true }
      )
    )
  );

  const merged = new Map<string, Station>();
  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    const normalized = normalizeStations(Array.isArray(result.value) ? result.value : []);
    for (const station of normalized) {
      merged.set(station.uuid, station);
    }
  }

  const ranked = rankStations(Array.from(merged.values()));
  const healthAnnotated = annotateHealth(ranked);
  const shortlisted = healthAnnotated.filter(
    (station) => station.isLikelyUp !== false && station.healthStatus !== "error"
  );
  const selectedStations = (shortlisted.length >= 6 ? shortlisted : healthAnnotated).slice(0, 8);
  const topCountries = collectTopValues(selectedStations.map((station) => station.country).filter(Boolean), 4);
  const topTags = collectTopValues(
    selectedStations.flatMap((station) => station.tagList?.filter(Boolean) ?? []),
    6
  );
  const topLanguages = collectTopValues(
    selectedStations.map((station) => station.language ?? "").filter(Boolean),
    4
  );
  const averageHealthScore = selectedStations.length
    ? Math.round(
      selectedStations.reduce((total, station) => total + (station.healthScore ?? 55), 0) /
      selectedStations.length
    )
    : 0;
  const likelyUpCount = selectedStations.filter((station) => station.isLikelyUp !== false).length;
  const mixNoteParts = [
    topCountries.length ? `Mostly ${topCountries.slice(0, 2).join(" and ")}` : null,
    topTags.length ? `leaning ${topTags.slice(0, 3).join(", ")}` : null,
  ].filter(Boolean);

  return finalizeHomeCuratedShelf({
    id: definition.id,
    eyebrow: definition.eyebrow,
    title: definition.title,
    description: definition.description,
    badge: definition.badge,
    theme: definition.theme,
    stations: selectedStations,
    topCountries,
    topTags,
    languageCount: topLanguages.length,
    averageHealthScore,
    likelyUpCount,
    mixNote: mixNoteParts.length
      ? `${mixNoteParts.join(" with ")}.`
      : "Cross-country picks with enough spread to avoid a flat one-tag row.",
    availabilityNote:
      likelyUpCount === selectedStations.length
        ? `All shortlisted stations are currently marked likely up from Radio Browser health data.`
        : `${likelyUpCount} of ${selectedStations.length} shortlisted stations are marked likely up; weaker candidates were pushed down the row.`,
  });
}

async function loadBehaviorShelf(snapshot: BehaviorSnapshot): Promise<HomeCuratedShelf | null> {
  const seedIds = Array.from(new Set([...snapshot.favoriteStationIds, ...snapshot.recentStationIds])).slice(0, 10);
  if (seedIds.length < 2) return null;

  const seeds = await fetchStationsByUuid(seedIds);
  if (seeds.length === 0) return null;

  const preferredTags = collectTopValues(
    seeds.flatMap((station) => station.tagList?.filter(Boolean) ?? []),
    4
  );
  const preferredCountries = collectTopValues(seeds.map((station) => station.country).filter(Boolean), 3);
  const preferredLanguages = collectTopValues(seeds.map((station) => station.language ?? "").filter(Boolean), 3);

  const tagRequests = preferredTags.map((tag) =>
    rbFetchJson<unknown>(
      `/json/stations/bytag/${encodeURIComponent(tag)}?limit=24&hidebroken=true&order=clickcount&reverse=true`,
      undefined,
      { softFail: true }
    )
  );
  const countryRequests = preferredCountries.map((country) =>
    rbFetchJson<unknown>(
      `/json/stations/bycountry/${encodeURIComponent(country)}?limit=24&hidebroken=true&order=clickcount&reverse=true`,
      undefined,
      { softFail: true }
    )
  );

  const results = await Promise.allSettled([...tagRequests, ...countryRequests]);
  const merged = new Map<string, Station>();
  for (const station of seeds) {
    if (!snapshot.skippedStationIds.includes(station.uuid)) {
      merged.set(station.uuid, station);
    }
  }
  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    const normalized = normalizeStations(Array.isArray(result.value) ? result.value : []);
    for (const station of normalized) {
      if (snapshot.skippedStationIds.includes(station.uuid)) continue;
      merged.set(station.uuid, station);
    }
  }

  const ranked = annotateHealth(
    rankStations(Array.from(merged.values()))
  );
  const selectedStations = ranked
    .filter((station) => station.healthStatus !== "error" && station.isLikelyUp !== false)
    .slice(0, 8);
  if (selectedStations.length < 4) return null;

  const averageHealthScore = Math.round(
    selectedStations.reduce((total, station) => total + (station.healthScore ?? 55), 0) /
    selectedStations.length
  );
  const likelyUpCount = selectedStations.filter((station) => station.isLikelyUp !== false).length;

  return finalizeHomeCuratedShelf({
    id: "behavior-recent",
    eyebrow: "Behavior-driven",
    title: "More Like Your Recent Plays",
    description: "Built from the stations you favorite, revisit, and skip so home can steer toward your taste instead of generic popularity.",
    badge: "Personal",
    theme: {
      glow: "rgba(137, 122, 255, 0.18)",
      border: "rgba(137, 122, 255, 0.34)",
      pill: "rgba(137, 122, 255, 0.14)",
    },
    stations: selectedStations,
    topCountries: collectTopValues(selectedStations.map((station) => station.country).filter(Boolean), 4),
    topTags: collectTopValues(selectedStations.flatMap((station) => station.tagList?.filter(Boolean) ?? []), 6),
    languageCount: collectTopValues(selectedStations.map((station) => station.language ?? "").filter(Boolean), 4).length,
    averageHealthScore,
    likelyUpCount,
    mixNote: `Weighted by ${snapshot.favoriteStationIds.length} favorites, ${snapshot.recentStationIds.length} recents, and ${snapshot.skippedStationIds.length} skips to keep the shelf closer to your actual behavior.`,
    availabilityNote: "Availability is screened before stations land in the mix.",
  });
}

// In-process server-side cache for home page non-personalized data.
// Prevents re-fetching all RadioBrowser + probe + AI calls on every back-navigation.
type HomepageInMemCache = {
  countries: Country[];
  topStations: Station[];
  curatedShelves: HomeCuratedShelf[];
  expiresAt: number;
};
let _hpCache: HomepageInMemCache | null = null;
const HP_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const country = url.searchParams.get("country");
  const behaviorSnapshot = parseBehaviorSnapshot(request.headers.get("Cookie"));

  try {
    const now = Date.now();

    // Fast path: back-navigation from country view — serve cached home data
    // and only reload the personalized behavior shelf (which has its own sub-caches)
    if (!country && _hpCache && _hpCache.expiresAt > now) {
      const behaviorShelf = await loadBehaviorShelf(behaviorSnapshot).catch(() => null);
      const mergedShelves = behaviorShelf
        ? [behaviorShelf, ..._hpCache.curatedShelves]
        : _hpCache.curatedShelves;
      return json(
        { countries: _hpCache.countries, stations: _hpCache.topStations, curatedShelves: mergedShelves, selectedCountry: null },
        { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=600" } }
      );
    }

    const stationsPath = country
      ? `/json/stations/bycountry/${encodeURIComponent(country)}?limit=100&hidebroken=true&order=clickcount&reverse=true`
      : `/json/stations/topclicks?limit=40&hidebroken=true`;

    const [countriesResult, stationsResult, curatedShelvesResult, behaviorShelfResult] = await Promise.allSettled([
      rbFetchJson<Country[]>(`/json/countries`),
      rbFetchJson<unknown>(stationsPath, undefined, { softFail: true }),
      Promise.all(HOME_CURATED_SHELF_DEFINITIONS.map((definition) => loadHomeCuratedShelf(definition))),
      loadBehaviorShelf(behaviorSnapshot),
    ]);

    const countries =
      countriesResult.status === "fulfilled" ? countriesResult.value : [];
    const curatedShelves =
      curatedShelvesResult.status === "fulfilled" ? curatedShelvesResult.value.filter((shelf) => shelf.stations.length > 0) : [];
    const behaviorShelf =
      behaviorShelfResult.status === "fulfilled" ? behaviorShelfResult.value : null;
    let stations: Station[] = [];
    const rawStations =
      stationsResult.status === "fulfilled" ? stationsResult.value : null;

    if (!rawStations) {
      // Expected fallback path when RadioBrowser mirrors are flaky.
    } else if (country) {
      const normalized = normalizeStations(
        Array.isArray(rawStations) ? rawStations : []
      );
      stations = rankStations(normalized);
    } else {
      stations = normalizeStations(
        Array.isArray(rawStations) ? rawStations : []
      );
      // Populate cache for subsequent back-navigations from country views
      if (countries.length > 0) {
        _hpCache = { countries, topStations: stations, curatedShelves, expiresAt: now + HP_CACHE_TTL };
      }
    }

    return json(
      { countries, stations, curatedShelves: behaviorShelf ? [behaviorShelf, ...curatedShelves] : curatedShelves, selectedCountry: country },
      {
        headers: {
          "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
        },
      }
    );
  } catch {
    // If even countries fail, returned defaults
    return json({ countries: [], stations: [], curatedShelves: [], selectedCountry: country });
  }
}

import { useUIStore } from "~/state/uiStore";

export default function Index() {
  const hydrated = useHydrated();

  // Remix hooks
  const { countries, stations: loaderStations, curatedShelves: loaderCuratedShelves, selectedCountry: loaderSelectedCountry } = useLoaderData<typeof loader>();
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

  // Domain hooks - all state management extracted
  const player = useRadioPlayer();
  const renderedNowPlaying = hydrated ? player.nowPlaying : null;
  const renderedIsPlaying = hydrated ? player.isPlaying : false;
  const renderedQueue = hydrated ? player.queue : [];
  const renderedCurrentStationIndex = hydrated ? player.currentStationIndex : 0;
  const renderedQueueSourceLabel = hydrated ? player.queueSourceLabel : "Direct Tune";
  const mode = useListeningMode();
  const { favoriteStationIds, toggleFavorite } = useFavorites();
  const { recentStations, addToRecent } = useRecentStations();
  const skippedStationIds = usePlayerStore((state) => state.skippedStationIds);
  const { triggerHoverStatic } = useHoverAudio();
  const atlas = useAtlasState(countries, renderedNowPlaying, selectedCountry);
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
  const curatedShelves = useMemo<CuratedShelfViewModel[]>(
    () =>
      loaderCuratedShelves
        .map((shelf) => ({
          ...shelf,
          stations: shelf.stations.filter((station) => !unavailableIds.has(station.uuid)).slice(0, 10),
        }))
        .filter((shelf) => shelf.stations.length > 0),
    [loaderCuratedShelves, unavailableIds]
  );
  const visibleCuratedShelves = useMemo<CuratedShelfViewModel[]>(() => {
    if (isCatalogSearchActive) return [];
    if (curatedShelves.length <= 2) return curatedShelves;
    return (renderedNowPlaying || recentStations.length > 0)
      ? curatedShelves.slice(0, 3)
      : curatedShelves.slice(0, 2);
  }, [curatedShelves, isCatalogSearchActive, recentStations.length, renderedNowPlaying]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const cookieValue = writeBehaviorSnapshot({
      favoriteStationIds: Array.from(favoriteStationIds),
      recentStationIds: recentStations.map((station) => station.uuid),
      skippedStationIds,
    });
    document.cookie = `${USER_BEHAVIOR_COOKIE}=${cookieValue}; Path=/; Max-Age=${60 * 60 * 24 * 30}; SameSite=Lax`;
  }, [favoriteStationIds, recentStations, skippedStationIds]);

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
        pinnedStationId: renderedNowPlaying?.uuid,
        pageProtocol,
        isSafari,
      }),
    [stations, stationFilters, unavailableIds, renderedNowPlaying?.uuid, pageProtocol, isSafari]
  );

  const isStationFilterActive = isStationFilterDirty(stationFilters);
  const filteredEmptyMessage = isStationFilterActive
    ? "No stations match the current filters. Try resetting them or broadening the language, region, mood, or quality filters."
    : undefined;

  const countryQueueSession = useMemo<QueueSession | null>(() => {
    if (!selectedCountry || filteredStations.length === 0) return null;
    return createQueueSession({
      sourceType: "country",
      sourceLabel: `Country: ${selectedCountry}`,
      stations: filteredStations,
      context: {
        country: selectedCountry,
        view: "classical",
        description: `${filteredStations.length.toLocaleString()} stations`,
      },
      seed: selectedCountry,
    });
  }, [filteredStations, selectedCountry]);

  const searchQueueSession = useMemo<QueueSession | null>(() => {
    const trimmedQuery = catalogQuery.trim();
    if (trimmedQuery.length < 2 || !catalogStations?.length) return null;
    return createQueueSession({
      sourceType: "search",
      sourceLabel: `Search: ${trimmedQuery}`,
      stations: catalogStations,
      context: {
        query: trimmedQuery,
        view: "classical",
      },
      seed: trimmedQuery,
    });
  }, [catalogQuery, catalogStations]);

  const aiMixQueueSession = useMemo<QueueSession | null>(() => {
    if (cards.activeStationsSnapshot.length === 0) return null;
    return createQueueSession({
      sourceType: mode.listeningMode === "world" ? "ai_mix" : "atlas",
      sourceLabel: mode.listeningMode === "world" ? "AI Mix" : "Atlas Picks",
      stations: cards.activeStationsSnapshot,
      context: {
        view: "classical",
        country: selectedCountry,
      },
      seed: `${mode.listeningMode}:${selectedCountry ?? "global"}`,
    });
  }, [cards.activeStationsSnapshot, mode.listeningMode, selectedCountry]);

  const curatedQueueSessions = useMemo(() => {
    const sessions = new Map<string, QueueSession>();
    for (const shelf of curatedShelves) {
      sessions.set(
        shelf.id,
        createQueueSession({
          sourceType: "atlas",
          sourceLabel: shelf.title,
          stations: shelf.stations,
          context: {
            view: "classical",
            description: shelf.description,
          },
          seed: shelf.id,
        })
      );
    }
    return sessions;
  }, [curatedShelves]);

  useEffect(() => {
    if (!selectedCountry || !countryQueueSession || !player.nowPlaying) return;
    if (player.queueSourceType === "country" && player.queueSourceLabel === countryQueueSession.queueSourceLabel) {
      return;
    }
    const belongsToCountryQueue = countryQueueSession.stations.some(
      (station) => station.uuid === player.nowPlaying?.uuid
    );
    if (!belongsToCountryQueue) return;

    player.setQueueSession(
      countryQueueSession,
      Math.max(
        0,
        countryQueueSession.stations.findIndex(
          (station) => station.uuid === player.nowPlaying?.uuid
        )
      )
    );
  }, [
    countryQueueSession,
    player,
    player.nowPlaying,
    player.queueSourceLabel,
    player.queueSourceType,
    selectedCountry,
  ]);

  // Navigation helpers
  const atlasNavigation = useAtlasNavigation(
    atlas.countryMap,
    atlas.setSelectedContinent,
    atlas.setActiveContinent
  );

  const navigationStations = player.queue;
  const { playNext, playPrevious } = useStationNavigation(
    player.currentStationIndex,
    player.setCurrentStationIndex,
    player.shuffleMode,
    navigationStations,
    player.startStation,
    player.recordSkippedStation,
    atlas.countryMap,
    atlas.setSelectedContinent,
    atlas.setActiveContinent,
    selectedCountry
  );

  // Core event handler
  const handleStartStation = useCallback((station: Station, options?: { autoPlay?: boolean; preserveQueue?: boolean; queueSession?: QueueSession | null }) => {
    atlasNavigation.selectContinentForCountry(station.country);
    setHasDismissedPlayer(false);
    player.startStation(station, {
      autoPlay: options?.autoPlay ?? true,
      preserveQueue: options?.preserveQueue,
      queueSession: options?.queueSession
        ?? (selectedCountry ? countryQueueSession : null)
        ?? (isCatalogSearchActive && searchQueueSession?.stations.some((entry) => entry.uuid === station.uuid)
          ? searchQueueSession
          : null)
        ?? (mode.listeningMode === "world" ? aiMixQueueSession : null),
    });
  }, [
    aiMixQueueSession,
    atlasNavigation,
    countryQueueSession,
    isCatalogSearchActive,
    mode.listeningMode,
    player,
    searchQueueSession,
    selectedCountry,
    setHasDismissedPlayer,
  ]);

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
    if (selectedCountry && player.nowPlaying && !isSameCountryName(player.nowPlaying.country, selectedCountry)) {
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
        player.startStation(station, { autoPlay: false });
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
    <div className="app-bg relative min-h-screen text-[var(--rp-text)] overflow-x-hidden w-full pb-32">
      <SignalField quality={selectedCountry ? "lite" : "full"} />

      <main
        className="relative z-10 flex w-full flex-col gap-0 pt-0 md:pt-2"
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
              nowPlaying={renderedNowPlaying} isPlaying={renderedIsPlaying} searchQueryRaw={searchDraft} onStartListening={handlers.handleStartListening}
              onQuickRetune={handlers.handleQuickRetune} onHoverSound={triggerHoverStatic}
              onSearch={handleSearchInput}
            />

            <div className="relative z-20 mx-auto -mt-6 flex w-full max-w-7xl flex-col gap-7 px-4 md:-mt-8 md:gap-8 md:px-6">
              {visibleCuratedShelves.length > 0 && (
                <CuratedShelfDeck
                  shelves={visibleCuratedShelves}
                  nowPlaying={renderedNowPlaying}
                  isPlaying={renderedIsPlaying}
                  favoriteIds={favoriteStationIds}
                  onPlayStation={(shelfId, station) =>
                    handleStartStation(station, {
                      queueSession: curatedQueueSessions.get(shelfId) ?? null,
                    })
                  }
                  onToggleFavorite={handleToggleFavorite}
                />
              )}

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
                    nowPlaying={renderedNowPlaying}
                    stationRefs={stationRefs}
                    onPlayStation={(station) =>
                      handleStartStation(station, { queueSession: searchQueueSession })}
                    isFetchingExplore={isCatalogLoading}
                    favoriteStationIds={favoriteStationIds}
                    onToggleFavorite={handleToggleFavorite}
                    emptyMessage={`No stations found for "${catalogQuery}". Try another search.`}
                    unavailableIds={unavailableIds}
                  />
                </section>
              )}

              <section id="atlas">
                <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(8,12,18,0.56)_0%,rgba(8,12,18,0.42)_100%)] px-4 py-5 shadow-[0_18px_42px_rgba(0,0,0,0.28)] backdrop-blur-md md:rounded-[2.2rem] md:border-white/8 md:px-6 md:py-6">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(245,177,45,0.1),transparent_26%),radial-gradient(circle_at_bottom_left,rgba(245,177,45,0.04),transparent_22%)]" />
                  <div className="relative px-1 py-2 md:px-2">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <Text size="xs" c="var(--rp-muted-2)" className="font-semibold uppercase tracking-[0.32em]">
                          {atlas.activeContinent ? `${atlas.activeContinent} guide` : "Discovery guide"}
                        </Text>
                        <Title order={2} style={{ fontSize: "1.6rem", fontWeight: 700, color: "var(--rp-text)", marginBottom: "0.15rem" }}>
                          {atlasQuery ? `Search results for "${atlasQuery}"` : atlas.activeContinent ? `Start in ${atlas.activeContinent}` : "Choose a region, then open a country shelf"}
                        </Title>
                        <div className="flex items-center gap-3">
                          <Text size="xs" c="var(--rp-muted)">
                            {atlasQuery ? "Showing matching countries from the live discovery index." : atlas.activeContinent ? "The first countries carry the strongest path into live stations, country notes, and listening context." : "Pick a region first. Home then narrows into curated country discovery instead of a flat directory."}
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
                          {atlas.activeContinent ?? "Global discovery"}
                        </Text>
                        <Text size="xs" c="var(--rp-muted-2)" className="whitespace-nowrap font-mono tracking-[0.16em] uppercase">
                          {derived.filteredCountries.length.toLocaleString()} of {topCountries.length.toLocaleString()} spotlight countries
                        </Text>
                      </div>
                    </div>
                  </div>
                  <div className="relative mt-5 md:mt-8">
                    <div className="overflow-x-auto scroll-track pt-2 md:pt-0">
                      <AtlasFilters continents={derived.continents} activeContinent={atlas.activeContinent} onContinentSelect={atlas.setActiveContinent} />
                    </div>

                    <div className="mt-5 md:mt-6 max-md:rounded-[1.8rem] max-md:border max-md:border-white/10 max-md:bg-[linear-gradient(180deg,rgba(7,10,16,0.82)_0%,rgba(9,13,20,0.72)_100%)] max-md:p-4 max-md:shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_16px_34px_rgba(0,0,0,0.22)]">
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
                            We couldn't find any countries matching "{atlasQuery}". Try another name or return to the full discovery index.
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
                </div>
              </section>

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
              nowPlaying={renderedNowPlaying}
              isPlaying={renderedIsPlaying}
              onPlayPause={player.playPause}
              onNext={playNext}
              onPrev={playPrevious}
              queue={renderedQueue}
              currentIndex={renderedCurrentStationIndex}
              queueSourceLabel={renderedQueueSourceLabel}
              onSelectStation={(station) =>
                handleStartStation(station, { queueSession: countryQueueSession })}
              transparent={false}
            />

            <section className="rounded-3xl border border-white/10 bg-[var(--rp-surface)] px-4 py-5 shadow-[0_18px_40px_rgba(0,0,0,0.5)] backdrop-blur-xl max-md:-mx-4 max-md:rounded-none max-md:border-x-0 max-md:bg-transparent max-md:shadow-none max-md:backdrop-blur-0 md:px-6 md:py-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <Text fw={700} size="sm" c="var(--rp-text)">
                    Stations in {selectedCountry}
                  </Text>
                  <Text size="xs" c="var(--rp-muted-2)" className="font-mono uppercase tracking-[0.32em]">
                    {filteredStations.length.toLocaleString()} / {stations.length.toLocaleString()} tuned
                  </Text>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsFilterDrawerOpen(true)}
                    className="md:hidden inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/35 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--rp-text)] shadow-[0_12px_24px_rgba(0,0,0,0.35)]"
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
                    className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--rp-muted-2)] hover:text-[var(--rp-text)]"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdvancedFiltersOpen((prev) => !prev)}
                    className="rounded-full border border-white/10 bg-black/35 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.25em] text-[var(--rp-text)] transition hover:border-white/20 hover:bg-black/45"
                  >
                    {isAdvancedFiltersOpen ? "Hide advanced" : "Advanced"}
                  </button>
                </div>
              </div>

              <div className="relative z-20 mt-4">
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

              <div className="relative z-0 mt-6">
                <StationGrid
                  stations={filteredStations}
                  nowPlaying={renderedNowPlaying}
                  stationRefs={stationRefs}
                  onPlayStation={(station) =>
                    handleStartStation(station, { queueSession: countryQueueSession })}
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
              <button
                type="button"
                onClick={() => setPassportOpen(false)}
                className="inline-flex h-9 items-center justify-center rounded-full border border-[rgba(245,177,45,0.5)] bg-[rgba(245,177,45,0.12)] px-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--rp-gold)] shadow-[0_12px_24px_rgba(0,0,0,0.45)] hover:bg-[rgba(245,177,45,0.2)]"
              >
                Back to home
              </button>
            </div>
          </div>
          <ScrollArea h="calc(100vh - 140px)" type="never">
            <div className="px-5 pb-6">
              {passportEntries.length > 0 ? (
                <div className="space-y-3">
                  {passportEntries.slice(0, 20).map((entry) => (
                    (() => {
                      const artworkUrl = sanitizeArtworkUrl(entry.favicon);
                      return (
                        <div
                          key={`${entry.id}-${entry.timestamp}`}
                          className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/40 px-4 py-3 shadow-[0_10px_22px_rgba(0,0,0,0.45)]"
                        >
                          <div className="h-10 w-10 overflow-hidden rounded-xl border border-white/10 bg-black/60">
                            {artworkUrl ? (
                              <img src={artworkUrl} alt="" className="h-full w-full object-cover" />
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
                      );
                    })()
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
                    (() => {
                      const artworkUrl = sanitizeArtworkUrl(entry.favicon);
                      return (
                        <div
                          key={`${entry.id}-${entry.timestamp}`}
                          className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/40 px-4 py-3"
                        >
                          <div className="h-10 w-10 overflow-hidden rounded-xl border border-white/10 bg-black/60">
                            {artworkUrl ? (
                              <img src={artworkUrl} alt="" className="h-full w-full object-cover" />
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
                      );
                    })()
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
