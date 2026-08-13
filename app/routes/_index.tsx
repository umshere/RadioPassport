import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { Link, useLoaderData, useSearchParams } from "@remix-run/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { rbFetchJson } from "~/utils/radioBrowser";
import { normalizeStations } from "~/utils/stations";
import { applyLiveCatalog } from "~/utils/stationMeta";
import { useShelfProbe } from "~/hooks/useShelfProbe";
import { createQueueSession } from "~/utils/playerQueue";
import type { Country, Station } from "~/types/radio";
import type { InterpretResponse } from "~/types/ai";
import { usePlayerStore } from "~/state/playerStore";
import { useJourneyStore } from "~/state/journeyStore";
import { useListeningMode } from "~/hooks/useListeningMode";
import { useNowPlayingMetadata } from "~/hooks/useNowPlayingMetadata";
import { useTrackTrivia } from "~/hooks/useTrackTrivia";
import { useDispatchStore } from "~/state/dispatchStore";
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
import {
  catalogRequestState,
  shouldClearBrowsingFilters,
} from "~/components/radio-passport/searchState";
import { getContinent } from "~/utils/geography";
import { IntentBar } from "~/components/radio-passport/IntentBar";
import {
  describeCoverEmpty,
  OPEN_PASSPORT_EVENT,
  passportRequested,
  resolveStampReplay,
  looksLikeIntentSentence,
  seekingBoardLabel,
  seekingStatus,
  theaterIntelligence,
} from "~/components/radio-passport/productFlow";
import { BRAND } from "~/constants/brand";
import {
  formatClock,
  formatLocalLabel,
  localDateAtLongitude,
  solarHourAtLongitude,
  stationMatchesSolarHour,
  type SolarHour,
} from "~/utils/localTime";

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
      stations: applyLiveCatalog(
        normalizeStations(Array.isArray(stationsRaw) ? stationsRaw : [])
      ),
    });
  } catch {
    return json({ countries: [], stations: [] });
  }
}

const HOURS: SolarHour[] = ["Dawn", "Midday", "Dusk", "Night"];

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

function hueFromId(id: string) {
  return [...id].reduce(
    (total, char) => (total * 31 + char.charCodeAt(0)) % 360,
    0
  );
}

export default function Index() {
  const { countries, stations: initialStations } =
    useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();
  const nowPlaying = usePlayerStore((state) => state.nowPlaying);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const startStation = usePlayerStore((state) => state.startStation);
  const favorites = useJourneyStore((state) => state.favoriteStationIds);
  const stamps = useJourneyStore((state) => state.stamps);
  const played = useJourneyStore((state) => state.playedStationIds);
  const memberSince = useJourneyStore((state) => state.memberSince);
  const travelerNumber = useJourneyStore((state) => state.travelerNumber);
  const journeyReady = useJourneyStore((state) => state.hydrated);
  const toggleFavorite = useJourneyStore((state) => state.toggleFavorite);
  const recordPlayed = useJourneyStore((state) => state.recordPlayed);
  const listening = useListeningMode();
  const metadata = useNowPlayingMetadata(nowPlaying, isPlaying);
  const trivia = useTrackTrivia({
    track: metadata.track,
    source: "ai",
    enabled: Boolean(nowPlaying && metadata.track),
  });
  const dispatch = useDispatchStore((state) => state.dispatch);
  const requestDispatch = useDispatchStore((state) => state.requestDispatch);
  const [hour, setHour] = useState<SolarHour | null>(null);
  const [place, setPlace] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [catalog, setCatalog] = useState<Station[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [atlas, setAtlas] = useState(false);
  const [atlasQuery, setAtlasQuery] = useState("");
  const [country, setCountry] = useState<string | null>(null);
  const [countryCache, setCountryCache] = useState<
    Record<string, CountryDrilldownState>
  >({});
  const [aiStatus, setAiStatus] = useState<"idle" | "loading" | "error">(
    "idle"
  );
  const [mixLabel, setMixLabel] = useState<string | null>(null);
  const [passport, setPassport] = useState(false);

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
              setCatalog(
                normalizeStations(data.stations || [])
                  .filter((station) => stationMatches(station, query))
                  .slice(0, 200)
              );
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

  const featured = useMemo(() => {
    const geo = initialStations.filter(
      (station) => typeof station.latitude === "number"
    );
    return (
      [...geo].sort(
        (a, b) => (b.clickCount || 0) - (a.clickCount || 0)
      )[0] ??
      initialStations[0] ??
      null
    );
  }, [initialStations]);

  const continueStation = useMemo(() => {
    if (!journeyReady) return null;
    const lastId = played[0];
    if (!lastId) return null;
    return (
      initialStations.find((station) => station.uuid === lastId) ??
      catalog.find((station) => station.uuid === lastId) ??
      null
    );
  }, [catalog, initialStations, journeyReady, played]);

  const baseStations =
    query.trim().length >= 2
      ? catalog
      : listening.listeningMode === "world" && listening.exploreStations.length
      ? listening.exploreStations
      : initialStations;

  const filtered = useMemo(
    () =>
      applyLiveCatalog(
        baseStations.filter((station) => {
          if (!stationMatches(station, query)) return false;
          if (shouldClearBrowsingFilters(query)) return true;
          return (
            stationMatchesSolarHour(station.longitude, hour) &&
            (!place || stationLocation(station) === place)
          );
        })
      ).slice(0, 120),
    [baseStations, hour, place, query]
  );
  const liveFiltered = useShelfProbe(
    filtered,
    `${query}|${hour ?? ""}|${place ?? ""}|${listening.listeningMode}`
  );

  const globeStations = query.trim().length >= 2 ? catalog : initialStations;
  const stampedKeys = useMemo(
    () => new Set(stamps.map((stamp) => `${stamp.country}:${stamp.city}`)),
    [stamps]
  );

  const places = useMemo(() => {
    const map = new Map<string, GlobePlace>();
    globeStations.forEach((station) => {
      if (
        typeof station.latitude !== "number" ||
        typeof station.longitude !== "number"
      )
        return;
      const location = stationLocation(station);
      const key = `${station.country}:${location}`;
      const old = map.get(key);
      const lead = !old || (station.clickCount || 0) >= (old.clicks || 0);
      map.set(key, {
        id: key,
        name: location,
        country: station.country,
        countryCode: station.countryCode ?? null,
        region: getContinent(station.countryCode || undefined),
        stationName: lead ? station.name : old.stationName,
        count: (old?.count || 0) + 1,
        latitude: station.latitude!,
        longitude: station.longitude!,
        active: place === location,
        playing: nowPlaying
          ? stationLocation(nowPlaying) === location &&
            nowPlaying.country === station.country
          : false,
        stamped: stampedKeys.has(key),
        hue: lead ? hueFromId(station.uuid) : old.hue,
        clicks: lead ? station.clickCount || 0 : old.clicks,
      });
    });
    return [...map.values()].sort((a, b) => b.count - a.count).slice(0, 30);
  }, [globeStations, nowPlaying, place, stampedKeys]);

  const selectedPool = liveFiltered.length
    ? liveFiltered
    : applyLiveCatalog(baseStations).slice(0, 60);
  const play = useCallback(
    (station: Station, pool = selectedPool, label = "Live now") => {
      const queue = createQueueSession({
        sourceType: query.trim()
          ? "search"
          : listening.listeningMode === "world"
          ? "ai_mix"
          : "atlas",
        sourceLabel: mixLabel || (query.trim() ? `Search: ${query.trim()}` : label),
        stations: pool,
        context: {
          country: station.country,
          query: query.trim() || null,
          view: "elsewhere",
        },
        seed: `${query}:${hour || ""}:${place || ""}`,
      });
      startStation(station, { autoPlay: true, queueSession: queue });
      recordPlayed(station.uuid);
    },
    [
      hour,
      listening.listeningMode,
      mixLabel,
      place,
      query,
      recordPlayed,
      selectedPool,
      startStation,
    ]
  );

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

  const requestAiWorld = useCallback(
    async (prompt?: string) => {
      if (aiStatus === "loading") return;
      setAiStatus("loading");
      listening.setIsFetchingExplore(true);
      listening.setExploreError(null);
      try {
        const descriptor = await loadWorldDescriptorPreview({
          prompt:
            prompt ||
            hour ||
            "Take me somewhere live at this hour of the world",
          currentStationId: nowPlaying?.uuid ?? null,
          mood: hour ?? undefined,
          visual: "card_stack",
          sceneId: "card_stack",
          country: nowPlaying?.country ?? null,
          language: nowPlaying?.language ?? null,
          preferredCountries: nowPlaying?.country ? [nowPlaying.country] : [],
          preferredLanguages: nowPlaying?.language ? [nowPlaying.language] : [],
          favoriteStationIds: favorites,
          recentStationIds: played,
        });
        applyAiPreviewPool(descriptor, listening.setExploreStations);
        listening.setListeningMode("world");
        setMixLabel(descriptor.mood || descriptor.reason || "World mix");
        setAiStatus("idle");
        const first = descriptor.stations[0];
        if (first) {
          play(first, descriptor.stations, descriptor.mood || "World mix");
        }
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
    },
    [aiStatus, favorites, hour, listening, nowPlaying, play, played]
  );

  const submitIntent = useCallback(
    async (value: string) => {
      const prompt = value.trim();
      if (!prompt) return;
      if (!looksLikeIntentSentence(prompt)) return;
      try {
        const response = await fetch("/api/ai/interpret", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            currentStationId: nowPlaying?.uuid ?? null,
            country: nowPlaying?.country ?? null,
            language: nowPlaying?.language ?? null,
          }),
        });
        if (!response.ok) return;
        const payload = (await response.json()) as InterpretResponse;
        if (payload.intent.place) setPlace(payload.intent.place);
        if (payload.intent.query && payload.intent.query !== prompt) {
          setQuery(payload.intent.query);
        }
        if (payload.intent.wantsMix) {
          void requestAiWorld(prompt);
        }
      } catch {
        // Catalog search already runs from the typed query.
      }
    },
    [nowPlaying, requestAiWorld]
  );

  const playPlace = useCallback(
    (id: string) => {
      const found = places.find((item) => item.id === id);
      if (!found) return;
      setPlace(found.name);
      const pool = globeStations.filter(
        (station) =>
          stationLocation(station) === found.name &&
          station.country === found.country
      );
      const next = [...pool].sort(
        (a, b) => (b.clickCount || 0) - (a.clickCount || 0)
      )[0];
      if (next) play(next, pool.length ? pool : selectedPool, found.name);
    },
    [globeStations, places, play, selectedPool]
  );

  useEffect(() => {
    if (!nowPlaying || !isPlaying) return;
    const timer = window.setTimeout(() => {
      const longitude =
        typeof nowPlaying.longitude === "number" ? nowPlaying.longitude : 0;
      const local = localDateAtLongitude(longitude);
      requestDispatch({
        stationId: nowPlaying.uuid,
        stationName: nowPlaying.name,
        city: stationLocation(nowPlaying),
        country: nowPlaying.country,
        countryCode: nowPlaying.countryCode ?? null,
        language: nowPlaying.language,
        tags: nowPlaying.tagList ?? [],
        localTimeISO: local.toISOString(),
        track: metadata.track
          ? {
              title: metadata.track.title,
              artist: metadata.track.artist,
              raw: metadata.track.raw,
            }
          : null,
      });
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [
    isPlaying,
    metadata.track,
    nowPlaying,
    requestDispatch,
  ]);

  useEffect(() => {
    if (passportRequested(searchParams.toString())) {
      setPassport(true);
    }
  }, [searchParams]);

  useEffect(() => {
    const open = () => setPassport(true);
    window.addEventListener(OPEN_PASSPORT_EVENT, open);
    return () => window.removeEventListener(OPEN_PASSPORT_EVENT, open);
  }, []);

  const arrivalCity = nowPlaying
    ? stationLocation(nowPlaying)
    : continueStation
    ? stationLocation(continueStation)
    : featured
    ? stationLocation(featured)
    : "the world";
  const arrivalStation = nowPlaying || continueStation || featured;
  const localNow =
    arrivalStation && typeof arrivalStation.longitude === "number"
      ? localDateAtLongitude(arrivalStation.longitude)
      : null;
  const trackLine = metadata.track
    ? [metadata.track.artist, metadata.track.title].filter(Boolean).join(" — ")
    : null;
  const coverIntel = theaterIntelligence({
    hasTrack: Boolean(trackLine),
    dispatchBody: dispatch?.body,
    summary: trivia.trivia?.summary,
    facts: trivia.trivia?.facts,
  });
  const sameHour = useMemo(() => {
    if (!localNow) return [];
    const current = solarHourAtLongitude(
      arrivalStation && typeof arrivalStation.longitude === "number"
        ? arrivalStation.longitude
        : 0
    );
    const seen = new Set<string>();
    return initialStations
      .filter((station) => {
        if (typeof station.longitude !== "number") return false;
        if (station.uuid === arrivalStation?.uuid) return false;
        if (solarHourAtLongitude(station.longitude) !== current) return false;
        const key = stationLocation(station);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 4);
  }, [arrivalStation, initialStations, localNow]);

  const favoriteStations = useMemo(() => {
    const pool = [...initialStations, ...catalog, ...countryStations];
    return favorites
      .map((id) => pool.find((station) => station.uuid === id))
      .filter((station): station is Station => Boolean(station))
      .slice(0, 8);
  }, [catalog, countryStations, favorites, initialStations]);

  const seek = seekingStatus({
    query,
    loading: catalogLoading,
    count: liveFiltered.length,
  });
  const boardLabel =
    seekingBoardLabel(query, catalogLoading, liveFiltered.length) ??
    (mixLabel ? "WORLD MIX" : "LIVE NOW");
  const coverEmpty = describeCoverEmpty({ query, hour, place });
  const isSeeking = query.trim().length >= 2;

  useEffect(() => {
    if (!isSeeking || catalogLoading) return;
    const board = document.getElementById("live-board");
    if (!board) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const top = board.getBoundingClientRect().top;
    if (top < 72 || top > window.innerHeight * 0.58) {
      board.scrollIntoView({
        behavior: reduce ? "auto" : "smooth",
        block: "start",
      });
    }
  }, [catalogLoading, isSeeking, liveFiltered.length]);

  return (
    <main className={`rp-home ${isSeeking ? "is-seeking" : ""}`}>
      <header className="rp-home-header">
        <SignalWordmark />
        <IntentBar
          value={query}
          onChange={setQuery}
          onSubmit={submitIntent}
          onSurprise={() => void requestAiWorld()}
          loading={catalogLoading}
          surpriseLoading={aiStatus === "loading"}
          statusLabel={seek.label}
          statusSpoken={seek.spoken}
          statusTone={seek.tone}
        />
        <Link to="/about" className="rp-eyebrow text-dust" prefetch="intent">
          Issue
        </Link>
        <button
          type="button"
          className="rp-passport-button"
          onClick={() => setPassport(true)}
          aria-label={`Open passport, ${stamps.length} places stamped`}
        >
          Passport
          <b>{String(stamps.length).padStart(2, "0")}</b>
        </button>
      </header>
      <div className="rp-stage">
        <section className="rp-intro">
          <p className="rp-eyebrow text-foil">{BRAND.eyebrow}</p>
          <h1>
            {nowPlaying
              ? `${arrivalCity} is on air.`
              : continueStation
              ? `Continue in ${arrivalCity}.`
              : `${arrivalCity} is on air.`}
          </h1>
          {localNow ? (
            <p className="rp-eyebrow text-ether">
              <i className="rp-live-dot" />
              {formatLocalLabel(arrivalCity, localNow)} ·{" "}
              {solarHourAtLongitude(
                arrivalStation && typeof arrivalStation.longitude === "number"
                  ? arrivalStation.longitude
                  : 0
              ).toUpperCase()}
            </p>
          ) : null}
          {nowPlaying && trackLine ? (
            <p className="ew-track">{trackLine}</p>
          ) : nowPlaying ? (
            <p className="rp-lede">
              Live from {arrivalCity}. This station sends no track titles.
            </p>
          ) : (
            <p className="rp-lede">{BRAND.promise}</p>
          )}
          {coverIntel.dispatchBody ? (
            <p className="ew-caption">{coverIntel.dispatchBody}</p>
          ) : null}
          {coverIntel.facts[0] ? (
            <p className="mt-3 max-w-[36ch] text-sm text-dust">
              <span className="rp-eyebrow mr-2 text-foil">
                {coverIntel.facts[0].label}
              </span>
              {coverIntel.facts[0].value}
            </p>
          ) : coverIntel.summary ? (
            <p className="ew-caption">{coverIntel.summary}</p>
          ) : null}
          {!nowPlaying && arrivalStation ? (
            <button
              type="button"
              className="ew-land"
              onClick={() =>
                play(
                  arrivalStation,
                  selectedPool,
                  continueStation ? "Continue" : "Land here"
                )
              }
            >
              {continueStation ? `Continue in ${arrivalCity}` : "Land here"}
            </button>
          ) : null}
          <div className="rp-chip-list">
            {HOURS.map((item) => (
              <button
                type="button"
                className={`rp-chip ${hour === item ? "active" : ""}`}
                onClick={() => setHour((value) => (value === item ? null : item))}
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
              Atlas
            </button>
          </div>
          {sameHour.length > 0 ? (
            <div className="ew-same-hour">
              {sameHour.map((station) => (
                <button
                  type="button"
                  key={station.uuid}
                  onClick={() => play(station, selectedPool, "Same hour")}
                >
                  {stationLocation(station)}
                </button>
              ))}
            </div>
          ) : null}
          <div
            className="mt-7 flex items-center justify-between"
            id="live-board"
          >
            <span
              className={`rp-eyebrow ${isSeeking ? "text-ether" : ""}`}
              role="status"
              aria-live="polite"
            >
              <i className="rp-live-dot" /> {boardLabel}
            </span>
            {mixLabel ? (
              <span className="rp-eyebrow text-foil">{mixLabel}</span>
            ) : null}
          </div>
          {aiStatus === "error" && listening.exploreError && (
            <div className="mt-2" role="alert">
              <p className="text-xs text-dust">{listening.exploreError}</p>
              <button
                type="button"
                className="rp-text-button mt-2"
                onClick={() => void requestAiWorld()}
              >
                Try the mix again →
              </button>
            </div>
          )}
          <div className="rp-station-list" aria-busy={catalogLoading}>
            {catalogLoading && isSeeking
              ? [0, 1, 2].map((slot) => (
                  <div
                    key={`pending-${slot}`}
                    className="rp-station is-pending"
                    aria-hidden="true"
                  />
                ))
              : liveFiltered
                  .slice(0, isSeeking ? 32 : 8)
                  .map((station) => (
                    <StationRow
                      key={station.uuid}
                      station={station}
                      active={nowPlaying?.uuid === station.uuid && isPlaying}
                      favorite={favorites.includes(station.uuid)}
                      onPlay={() => play(station)}
                      onFavorite={() => toggleFavorite(station.uuid)}
                    />
                  ))}
          </div>
          {liveFiltered.length === 0 && !catalogLoading && (
            <div className="py-8" role="status">
              <p className="text-sm text-dust">{coverEmpty.message}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {coverEmpty.actions.map((action) => (
                  <button
                    type="button"
                    key={action.id}
                    className="rp-chip"
                    onClick={() => {
                      if (action.id === "surprise") void requestAiWorld();
                      if (action.id === "atlas") setAtlas(true);
                      if (action.id === "clear-search") setQuery("");
                      if (action.id === "clear-hour") setHour(null);
                      if (action.id === "clear-place") setPlace(null);
                    }}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
        <section className="rp-globe-side">
          <div className="rp-globe-wrap">
            <ParticleGlobe
              places={places}
              focusId={
                nowPlaying
                  ? `${nowPlaying.country}:${stationLocation(nowPlaying)}`
                  : null
              }
              onSelect={playPlace}
            />
            <div className="ew-cover">
              <i className="ew-cover-rule" />
              <p className="ew-coverline">{arrivalCity}</p>
              <p className="rp-eyebrow">
                {arrivalStation
                  ? `${
                      arrivalStation.bitrate
                        ? `${arrivalStation.bitrate} · `
                        : ""
                    }${arrivalCity.toUpperCase()} · LIVE`
                  : "TAP A CITY TO TUNE"}
                {localNow ? ` · ${formatClock(localNow)}` : ""}
              </p>
            </div>
          </div>
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
      )}
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
            setCountry(null);
          }}
          onFavorite={toggleFavorite}
        />
      )}
      {passport && (
        <PassportOverlay
          stamps={stamps}
          playedCount={played.length}
          memberSince={memberSince}
          travelerNumber={travelerNumber}
          favorites={favoriteStations}
          close={() => setPassport(false)}
          onFindCity={() => setPassport(false)}
          onReplay={(stamp) => {
            const resolved = resolveStampReplay(stamp, [
              ...initialStations,
              ...catalog,
              ...countryStations,
            ]);
            if (resolved.station) {
              play(resolved.station, selectedPool, stamp.city);
              setPassport(false);
              return;
            }
            setPassport(false);
            if (resolved.fallback === "country" && stamp.country) {
              chooseCountry(stamp.country);
              return;
            }
            setAtlas(true);
          }}
          onPlayFavorite={(station) => {
            play(station, selectedPool, "Favorites");
            setPassport(false);
          }}
        />
      )}
    </main>
  );
}
