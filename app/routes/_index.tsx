import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { rbFetchJson } from "~/utils/radioBrowser";
import { normalizeStations } from "~/utils/stations";
import { createQueueSession } from "~/utils/playerQueue";
import type { Country, Station } from "~/types/radio";
import { usePlayerStore } from "~/state/playerStore";
import { useJourneyStore } from "~/state/journeyStore";
import { useListeningMode } from "~/hooks/useListeningMode";
import { loadWorldDescriptorPreview } from "~/services/aiOrchestrator";
import {
  ParticleGlobe,
  type GlobePlace,
} from "~/components/radio-passport/ParticleGlobe";
import { SignalWordmark } from "~/components/radio-passport/SignalMark";
import {
  StationRow,
  stationLocation,
} from "~/components/radio-passport/StationRow";
import {
  AtlasOverlay,
  CountryOverlay,
  PassportOverlay,
} from "~/components/radio-passport/Overlays";
import {
  countryCacheKey,
  countryCacheWith,
  fetchCountryDrilldown,
  type CountryDrilldownState,
} from "~/components/radio-passport/countryData";
import { applyAiPreviewPool } from "~/components/radio-passport/aiPreview";
import { catalogRequestState } from "~/components/radio-passport/searchState";
import WhyTheseChip from "~/components/WhyTheseChip";
import type { SceneDescriptor } from "~/scenes/types";
import { useStationInsightsStore } from "~/state/stationInsightsStore";
import { prepareCatalogSearchStations } from "~/components/radio-passport/stationInsights";

export async function loader(_: LoaderFunctionArgs) {
  try {
    const [countriesRaw, stationsRaw] = await Promise.all([
      rbFetchJson<Country[]>("/json/countries", undefined, { softFail: true }),
      rbFetchJson<unknown>(
        "/json/stations/search?limit=240&hidebroken=true&order=clickcount&reverse=true&has_geo_info=true",
        undefined,
        { softFail: true }
      ),
    ]);
    return json({
      countries: Array.isArray(countriesRaw) ? countriesRaw : [],
      stations: normalizeStations(
        Array.isArray(stationsRaw) ? stationsRaw : []
      ),
    });
  } catch {
    return json({ countries: [], stations: [] });
  }
}

const MOODS = ["Late Night", "Slow Morning", "Dance", "Focus", "Road Trip"];
function tokens(value: string | null | undefined) {
  return (value || "").toLowerCase();
}
function stationMatches(station: Station, query: string) {
  const queryTokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!queryTokens.length) return true;
  const haystack = [
    station.name,
    station.tags,
    station.language,
    station.country,
    station.city,
    station.state,
    station.codec,
  ]
    .map(tokens)
    .join(" ");
  return queryTokens.every((token) => haystack.includes(token));
}
function stationMatchesMood(station: Station, mood: string | null) {
  if (!mood) return true;
  const query =
    mood === "Late Night"
      ? "ambient chill lounge"
      : mood === "Slow Morning"
      ? "acoustic jazz easy"
      : mood === "Dance"
      ? "dance house electronic"
      : mood === "Focus"
      ? "classical ambient jazz"
      : "rock pop country";
  return query
    .split(" ")
    .some((token) =>
      `${tokens(station.tags)} ${tokens(station.name)}`.includes(token)
    );
}
export default function Index() {
  const { countries, stations: initialStations } =
    useLoaderData<typeof loader>();
  const nowPlaying = usePlayerStore((state) => state.nowPlaying);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const startStation = usePlayerStore((state) => state.startStation);
  const favorites = useJourneyStore((state) => state.favoriteStationIds);
  const stamps = useJourneyStore((state) => state.stamps);
  const played = useJourneyStore((state) => state.playedStationIds);
  const memberSince = useJourneyStore((state) => state.memberSince);
  const toggleFavorite = useJourneyStore((state) => state.toggleFavorite);
  const recordPlayed = useJourneyStore((state) => state.recordPlayed);
  const listening = useListeningMode();
  const [mode, setMode] = useState<"mood" | "place">("mood");
  const [mood, setMood] = useState<string | null>(null);
  const [place, setPlace] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [catalog, setCatalog] = useState<Station[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [atlas, setAtlas] = useState(false);
  const [atlasQuery, setAtlasQuery] = useState("");
  const [country, setCountry] = useState<string | null>(null);
  const [countryFilter, setCountryFilter] = useState<string | null>(null);
  const [countryCache, setCountryCache] = useState<
    Record<string, CountryDrilldownState>
  >({});
  const [aiStatus, setAiStatus] = useState<"idle" | "loading" | "error">(
    "idle"
  );
  const [passport, setPassport] = useState(false);
  const [worldDescriptor, setWorldDescriptor] = useState<SceneDescriptor | null>(null);
  const openDetails = useStationInsightsStore((state) => state.open);
  useEffect(() => {
    if (!catalogRequestState(query).shouldFetch) {
      setCatalog([]);
      setCatalogLoading(false);
      return;
    }
    let cancelled = false;
    setCatalogLoading(true);
    const id = window.setTimeout(
      () =>
        fetch(`/api/radio-catalog?stations=8000&q=${encodeURIComponent(query)}`)
          .then((response) =>
            response.ok ? response.json() : Promise.reject()
          )
          .then((data: { stations?: Station[] }) => {
            if (!cancelled)
              setCatalog(prepareCatalogSearchStations(data.stations || [], query, stationMatches));
          })
          .catch(() => !cancelled && setCatalog([]))
          .finally(() => !cancelled && setCatalogLoading(false)),
      260
    );
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [query]);
  const baseStations =
    query.trim().length >= 2
      ? catalog
      : listening.listeningMode === "world" && listening.exploreStations.length
      ? listening.exploreStations
      : initialStations;
  const filtered = useMemo(
    () =>
      baseStations
        .filter(
          (station) =>
            stationMatches(station, query) &&
            stationMatchesMood(station, mode === "mood" ? mood : null) &&
            (mode !== "place" ||
              !place ||
              stationLocation(station) === place) &&
            (!countryFilter || station.country === countryFilter)
        )
        .slice(0, 120),
    [baseStations, countryFilter, mood, mode, place, query]
  );
  const places = useMemo(() => {
    const map = new Map<string, GlobePlace>();
    filtered.forEach((station) => {
      if (
        typeof station.latitude !== "number" ||
        typeof station.longitude !== "number"
      )
        return;
      const location = stationLocation(station),
        key = `${station.country}:${location}`;
      const old = map.get(key);
      map.set(key, {
        id: key,
        name: location,
        count: (old?.count || 0) + 1,
        latitude: station.latitude!,
        longitude: station.longitude!,
        active: place === location,
        playing: nowPlaying
          ? stationLocation(nowPlaying) === location &&
            nowPlaying.country === station.country
          : false,
      });
    });
    return [...map.values()].sort((a, b) => b.count - a.count).slice(0, 30);
  }, [filtered, nowPlaying, place]);
  const placeChips = useMemo(
    () =>
      Array.from(
        new Set([
          ...places.map((item) => item.name),
          ...initialStations.map(stationLocation),
        ])
      ).slice(0, 6),
    [initialStations, places]
  );
  const selectedPool = filtered.length ? filtered : baseStations.slice(0, 60);
  const play = useCallback(
    (station: Station, pool = selectedPool, label = "Live now") => {
      const queue = createQueueSession({
        sourceType: query.trim() ? "search" : country ? "country" : "atlas",
        sourceLabel: country
          ? `Country: ${country}`
          : query.trim()
          ? `Search: ${query.trim()}`
          : label,
        stations: pool,
        context: {
          country: station.country,
          query: query.trim() || null,
          view: "signal-stamp",
        },
        seed: `${country || "world"}:${query}:${mood || ""}:${place || ""}`,
      });
      startStation(station, { autoPlay: true, queueSession: queue });
      recordPlayed(station.uuid);
    },
    [country, mood, place, query, recordPlayed, selectedPool, startStation]
  );
  const selectPlace = (next: string) => {
    setMode("place");
    setPlace((old) => (old === next ? null : next));
  };
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
  const requestAiWorld = useCallback(async () => {
    if (aiStatus === "loading") return;
    setAiStatus("loading");
    listening.setIsFetchingExplore(true);
    listening.setExploreError(null);
    try {
      const descriptor = await loadWorldDescriptorPreview({
        currentStationId: nowPlaying?.uuid ?? null,
        mood: mood ?? undefined,
        visual: "card_stack",
        sceneId: "card_stack",
        country: nowPlaying?.country ?? null,
        language: nowPlaying?.language ?? null,
        preferredCountries: nowPlaying?.country ? [nowPlaying.country] : [],
        preferredLanguages: nowPlaying?.language ? [nowPlaying.language] : [],
        favoriteStationIds: favorites,
        recentStationIds: played,
      });
      setWorldDescriptor(applyAiPreviewPool(descriptor, listening.setExploreStations));
      listening.setListeningMode("world");
      setAiStatus("idle");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "We could not curate a world mix. Please try again.";
      listening.setExploreError(message);
      setAiStatus("error");
    } finally {
      listening.setIsFetchingExplore(false);
    }
  }, [aiStatus, favorites, listening, mood, nowPlaying, played]);
  return (
    <main className="rp-home">
      <header className="rp-home-header">
        <SignalWordmark />
        <div className="rp-header-search">
          <span>⌕</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Where do you want to go? Kerala, jazz, rainy night…"
            aria-label="Search stations, tags, locations, countries, languages, and moods"
          />
        </div>
        <button
          type="button"
          className="rp-passport-button"
          onClick={() => setPassport(true)}
          aria-label={`Open passport, ${stamps.length} places stamped`}
        >
          <span>◌</span>
          <span className="hidden sm:inline">Passport</span>
          <b>{stamps.length}</b>
        </button>
      </header>
      <div className="rp-main-grid">
        <section className="rp-intro">
          <p className="rp-eyebrow text-coral">LIVE RADIO · REAL PLACES</p>
          <h1>
            The world,
            <br />
            on air.
          </h1>
          <p className="rp-lede">
            Travel by place or by feeling. Every continuous listen inks your
            passport.
          </p>
          <div className="rp-mode">
            <button
              type="button"
              onClick={() => setMode("mood")}
              className={mode === "mood" ? "active" : ""}
            >
              MOOD
            </button>
            <button
              type="button"
              onClick={() => setMode("place")}
              className={mode === "place" ? "active" : ""}
            >
              PLACE
            </button>
          </div>
          <div className="rp-chip-list">
            {mode === "mood"
              ? MOODS.map((item) => (
                  <button
                    type="button"
                    className={`rp-chip ${mood === item ? "active" : ""}`}
                    onClick={() =>
                      setMood((value) => (value === item ? null : item))
                    }
                    key={item}
                  >
                    {item}
                  </button>
                ))
              : placeChips.map((item) => (
                  <button
                    type="button"
                    className={`rp-chip ${place === item ? "active" : ""}`}
                    onClick={() => selectPlace(item)}
                    key={item}
                  >
                    {item}
                  </button>
                ))}
            <button
              type="button"
              className="rp-chip rp-chip-dashed"
              onClick={() => setAtlas(true)}
            >
              All places →
            </button>
          </div>
          {query.trim() && (
            <div className="rp-quick-places">
              <span className="rp-eyebrow">PLACES</span>
              {placeChips
                .filter((item) =>
                  item.toLowerCase().includes(query.toLowerCase())
                )
                .slice(0, 4)
                .map((item) => (
                  <button
                    type="button"
                    onClick={() => selectPlace(item)}
                    key={item}
                  >
                    {item}
                  </button>
                ))}
            </div>
          )}
          <div className="mt-7 flex items-center justify-between">
            <span className="rp-eyebrow">
              <i className="rp-live-dot" />{" "}
              {query
                ? catalogLoading
                  ? "SEARCHING"
                  : "SEARCH RESULTS"
                : "LIVE NOW"}
            </span>
            <button
              type="button"
              className="rp-text-button"
              onClick={() => void requestAiWorld()}
              disabled={aiStatus === "loading"}
            >
              {aiStatus === "loading"
                ? "Curating world…"
                : listening.listeningMode === "world"
                ? "Refresh AI mix →"
                : "Explore world →"}
            </button>
          </div>
          {aiStatus === "error" && listening.exploreError && (
            <p className="mt-2 text-xs text-muted" role="alert">
              {listening.exploreError}
            </p>
          )}
          {listening.listeningMode === "world" && worldDescriptor && (
            <WhyTheseChip descriptor={worldDescriptor} className="mt-3" />
          )}
          <div className={`rp-station-list ${expanded ? "expanded" : ""}`}>
            {filtered.slice(0, expanded ? 30 : 3).map((station) => (
              <StationRow
                key={station.uuid}
                station={station}
                active={nowPlaying?.uuid === station.uuid && isPlaying}
                favorite={favorites.includes(station.uuid)}
                onPlay={() => play(station)}
                onFavorite={() => toggleFavorite(station.uuid)}
                onDetails={(trigger) => openDetails(station, trigger)}
              />
            ))}
          </div>
          {filtered.length === 0 && !catalogLoading && (
            <p className="py-8 text-sm text-muted">
              No live stations match that route. Try a country, language, tag,
              city, or mood.
            </p>
          )}
          {filtered.length > 3 && (
            <button
              type="button"
              className="rp-text-button mt-3"
              onClick={() => setExpanded((value) => !value)}
            >
              {expanded ? "← Back to live now" : "Explore all →"}
            </button>
          )}
        </section>
        <section className="rp-globe-side">
          <div className="rp-globe-wrap">
            <ParticleGlobe
              places={places}
              onSelect={(id) => {
                const found = places.find((item) => item.id === id);
                if (found) selectPlace(found.name);
              }}
            />
            <span>tap a city to tune in</span>
          </div>
          <button
            type="button"
            className="rp-passport-band"
            onClick={() => setPassport(true)}
          >
            <span className="rp-passport-seal">◌</span>
            <span className="min-w-0 flex-1 text-left">
              <span className="rp-eyebrow block text-paper">YOUR PASSPORT</span>
              <span className="mt-1 block text-xs text-muted">
                <b className="text-coral">
                  {String(stamps.length).padStart(2, "0")}
                </b>{" "}
                / 10 places
              </span>
              <i style={{ width: `${Math.min(stamps.length, 10) * 10}%` }} />
            </span>
            <span className="hidden min-w-0 gap-2 md:flex">
              {stamps.slice(0, 3).map((stamp) => (
                <small className="rp-mini-stamp" key={stamp.id}>
                  {stamp.city}
                </small>
              ))}
            </span>
            <span className="text-coral">View passport →</span>
          </button>
        </section>
      </div>
      {atlas && (
        <AtlasOverlay
          countries={countries}
          stations={initialStations}
          query={atlasQuery}
          setQuery={setAtlasQuery}
          close={() => setAtlas(false)}
          openCountry={chooseCountry}
        />
      )}{" "}
      {country && (
        <CountryOverlay
          country={country}
          stations={countryStations}
          drilldown={countryDrilldown}
          onRetry={() => country && void loadCountry(country, true)}
          favorites={favorites}
          onBack={() => {
            setCountry(null);
            setAtlas(true);
          }}
          close={() => setCountry(null)}
          onPlay={(station) => {
            play(station, countryStations, `Country: ${country}`);
            setCountryFilter(country);
            setCountry(null);
          }}
          onFavorite={toggleFavorite}
          onDetails={(station, trigger) => openDetails(station, trigger)}
        />
      )}{" "}
      {passport && (
        <PassportOverlay
          stamps={stamps}
          playedCount={played.length}
          memberSince={memberSince}
          close={() => setPassport(false)}
        />
      )}{" "}
    </main>
  );
}
