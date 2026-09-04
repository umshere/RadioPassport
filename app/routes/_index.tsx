import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { Link, useLoaderData, useSearchParams } from "@remix-run/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { rbFetchJson } from "~/utils/radioBrowser";
import { normalizeStations } from "~/utils/stations";
import { applyLiveCatalog } from "~/utils/stationMeta";
import { useShelfProbe } from "~/hooks/useShelfProbe";
import { createQueueSession } from "~/utils/playerQueue";
import type { Country, Station } from "~/types/radio";
import type { InterpretResponse } from "~/types/ai";
import { usePlayerStore } from "~/state/playerStore";
import { useJourneyStore } from "~/state/journeyStore";
import { resolveKeptSignals } from "~/state/favoriteSnapshot";
import { useListeningMode } from "~/hooks/useListeningMode";
import { roomForStation, useRoomStore } from "~/state/roomStore";
import { loadWorldDescriptorPreview } from "~/services/aiOrchestrator";
import { ParticleGlobe } from "~/components/radio-passport/ParticleGlobe";
import { GalaxyBackdrop } from "~/components/radio-passport/GalaxyBackdrop";
import {
  buildGlobePlaces,
  globeFocusId,
  globeStationPool,
} from "~/components/radio-passport/globePlaces";
import { AtmospherePin } from "~/components/radio-passport/AtmospherePin";
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
  hourTapNextState,
  intentSearchString,
  parseInitialIntent,
  parseInitialQuery,
  playFromAtlasNextState,
  shouldClearBrowsingFilters,
  surpriseTapNextState,
} from "~/components/radio-passport/searchState";
import { IntentBar } from "~/components/radio-passport/IntentBar";
import { HourRail } from "~/components/radio-passport/HourRail";
import { SiteSeekPortal } from "~/components/radio-passport/SiteSeek";
import {
  resolveCoverArrival,
  describeCoverEmpty,
  findCityFromPassport,
  sameHourPillLabel,
  OPEN_PASSPORT_EVENT,
  passportRequested,
  resolveStampReplay,
  looksLikeIntentSentence,
  hourBoardLabel,
  intentEchoFromInterpret,
  seekingBoardLabel,
  seekingStatus,
  theaterIntelligenceFromRoom,
} from "~/components/radio-passport/productFlow";
import { resolveTypedIntent, solarHourFromWord } from "~/services/ai/intent/promptIntent";
import { BRAND } from "~/constants/brand";
import {
  formatClock,
  formatLocalLabel,
  localDateAtLongitude,
  solarHourAtLongitude,
  stationMatchesSolarHour,
  type SolarHour,
} from "~/utils/localTime";

export const meta = () => [
  { property: "og:title", content: "Elsewhere — You are not here." },
  {
    property: "og:description",
    content:
      "Live radio from cities that are awake without you. Land somewhere, stay long enough to be stamped.",
  },
  { property: "og:url", content: "https://elsewheremusic.com/" },
];

/**
 * Home ↔ theater crossings reuse the board: skip the 240-row refetch unless
 * the intent (search string) actually changed. Document loads always run.
 */
export function shouldRevalidate({
  currentUrl,
  nextUrl,
  defaultShouldRevalidate,
}: {
  currentUrl: URL;
  nextUrl: URL;
  defaultShouldRevalidate: boolean;
}) {
  if (!defaultShouldRevalidate) return false;
  return currentUrl.search !== nextUrl.search;
}

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

export default function Index() {
  const { countries, stations: initialStations } =
    useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();
  const nowPlaying = usePlayerStore((state) => state.nowPlaying);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const startStation = usePlayerStore((state) => state.startStation);
  const favorites = useJourneyStore((state) => state.favoriteStationIds);
  const favoriteSnapshots = useJourneyStore((state) => state.favoriteStations);
  const stamps = useJourneyStore((state) => state.stamps);
  const played = useJourneyStore((state) => state.playedStationIds);
  const memberSince = useJourneyStore((state) => state.memberSince);
  const travelerNumber = useJourneyStore((state) => state.travelerNumber);
  const journeyReady = useJourneyStore((state) => state.hydrated);
  const toggleFavorite = useJourneyStore((state) => state.toggleFavorite);
  const recordPlayed = useJourneyStore((state) => state.recordPlayed);
  const listening = useListeningMode();
  const storedRoom = useRoomStore((state) => state.room);
  const room = roomForStation(storedRoom, nowPlaying?.uuid);
  const [hour, setHour] = useState<SolarHour | null>(
    () =>
      parseInitialIntent(`https://radio.example/?${searchParams.toString()}`)
        .hour as SolarHour | null
  );
  const [place, setPlace] = useState<string | null>(
    () =>
      parseInitialIntent(`https://radio.example/?${searchParams.toString()}`)
        .place
  );
  const [query, setQuery] = useState(() =>
    parseInitialQuery(`https://radio.example/?${searchParams.toString()}`)
  );
  // The board mirrors itself in the URL (replace, never push): theater trips
  // and reloads land on the same intent. replaceState skips Remix loader
  // revalidation; unrelated params (e.g. passport) are preserved.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const next = intentSearchString(window.location.search, {
      query,
      hour,
      place,
    });
    if (window.location.search === next) return;
    // Carry history.state through: React Router keeps { usr, key, idx } there,
    // and nulling it collapses this entry's ScrollRestoration key to "default"
    // and resets the router's stack index.
    window.history.replaceState(
      window.history.state,
      "",
      `${window.location.pathname}${next}${window.location.hash}`
    );
  }, [query, hour, place]);
  const [catalog, setCatalog] = useState<Station[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  // True only when the live catalog could not be reached — never when it
  // answered empty. The cover owes the visitor that distinction (flow audit F3).
  const [catalogError, setCatalogError] = useState(false);
  const [catalogAttempt, setCatalogAttempt] = useState(0);
  const retryCatalog = useCallback(() => {
    setCatalogError(false);
    setCatalogAttempt((attempt) => attempt + 1);
  }, []);
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
  // The interpreter's whisper: what it understood differently, until the next keystroke.
  const [intentEcho, setIntentEcho] = useState<string | null>(null);
  const queryRef = useRef(query);
  queryRef.current = query;

  useEffect(() => {
    if (!catalogRequestState(query).shouldFetch) {
      setCatalog([]);
      setCatalogLoading(false);
      setCatalogError(false);
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
            if (cancelled) return;
            setCatalog(
              normalizeStations(data.stations || [])
                .filter((station) => stationMatches(station, query))
                .slice(0, 200)
            );
            setCatalogError(false);
          })
          .catch(() => {
            if (cancelled) return;
            // An outage is not an empty catalog: flag it so the cover says
            // "Signal lost" instead of lying "No signal".
            setCatalog([]);
            setCatalogError(true);
          })
          .finally(() => !cancelled && setCatalogLoading(false)),
      260
    );
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [query, catalogAttempt]);

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

  const globeStations = globeStationPool(
    query,
    catalog,
    initialStations,
    liveFiltered
  );
  const stampedKeys = useMemo(
    () => new Set(stamps.map((stamp) => `${stamp.country}:${stamp.city}`)),
    [stamps]
  );

  const places = useMemo(
    () =>
      buildGlobePlaces(globeStations, {
        nowPlaying,
        place,
        stampedKeys,
      }),
    [globeStations, nowPlaying, place, stampedKeys]
  );

  const selectedPool = liveFiltered.length
    ? liveFiltered
    : applyLiveCatalog(baseStations).slice(0, 60);
  const play = useCallback(
    (
      station: Station,
      pool = selectedPool,
      label = "Live now",
      home?: ReturnType<typeof playFromAtlasNextState>
    ) => {
      if (home) {
        setQuery(home.query);
        setHour(home.hour);
        setPlace(home.place);
        setMixLabel(home.mixLabel);
      }
      const q = home ? home.query : query;
      const h = home ? home.hour : hour;
      const p = home ? home.place : place;
      const mix = home ? home.mixLabel : mixLabel;
      const queue = createQueueSession({
        sourceType: home
          ? "atlas"
          : q.trim()
            ? "search"
            : listening.listeningMode === "world"
              ? "ai_mix"
              : "atlas",
        sourceLabel: mix || (q.trim() ? `Search: ${q.trim()}` : label),
        stations: pool,
        context: {
          country: station.country,
          query: q.trim() || null,
          view: "elsewhere",
        },
        seed: `${q}:${h || ""}:${p || ""}`,
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
      const next = surpriseTapNextState();
      setQuery(next.query);
      setHour(next.hour);
      setPlace(next.place);
      setAiStatus("loading");
      listening.setIsFetchingExplore(true);
      listening.setExploreError(null);
      try {
        const descriptor = await loadWorldDescriptorPreview({
          prompt:
            prompt || "Take me somewhere live at this hour of the world",
          currentStationId: nowPlaying?.uuid ?? null,
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
    [aiStatus, favorites, listening, nowPlaying, play, played]
  );

  const submitIntent = useCallback(
    async (value: string) => {
      const prompt = value.trim();
      if (!prompt) return;
      const resolved = resolveTypedIntent(prompt);
      if (resolved.wantsMix) {
        void requestAiWorld(prompt);
        return;
      }
      setQuery(resolved.query);
      setHour(resolved.hour);
      const tightened =
        resolved.query.trim().toLowerCase() !== prompt.toLowerCase();
      if (resolved.hour || tightened || !looksLikeIntentSentence(prompt)) {
        return;
      }
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
        // A slow response must never rewrite an intent the visitor already
        // retyped (or cleared) while waiting — same staleness rule as the echo.
        if (queryRef.current !== prompt) return;
        if (payload.intent.place) setPlace(payload.intent.place);
        if (payload.intent.language) {
          setQuery(payload.intent.language);
        } else if (payload.intent.query && payload.intent.query !== prompt) {
          setQuery(payload.intent.query);
        }
        const hour =
          solarHourFromWord(payload.intent.mood) ??
          solarHourFromWord(payload.intent.query);
        if (hour) setHour(hour);
        const echo = intentEchoFromInterpret(prompt, payload.intent);
        if (echo && queryRef.current === prompt) setIntentEcho(echo);
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
      const next = globeStations.find((station) => station.uuid === id);
      if (next) play(next, selectedPool, found.stationName);
    },
    [globeStations, places, play, selectedPool]
  );

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
  const isSeeking = query.trim().length >= 2;
  const locatorShrunk = isSeeking || Boolean(hour);
  const seekingCover = isSeeking && !isPlaying;
  const arrival = resolveCoverArrival({
    isPlaying,
    hasNowPlaying: Boolean(nowPlaying),
    hasContinue: Boolean(continueStation),
    city: arrivalCity,
    query,
    count: liveFiltered.length,
    loading: catalogLoading,
    unreachable: catalogError,
  });
  const localNow =
    arrivalStation && typeof arrivalStation.longitude === "number"
      ? localDateAtLongitude(arrivalStation.longitude)
      : null;
  const trackLine = room.signal.track
    ? [room.signal.track.artist, room.signal.track.title].filter(Boolean).join(" — ")
    : null;
  const coverIntel = theaterIntelligenceFromRoom({
    hasTrack: Boolean(trackLine),
    captionBody: room.caption?.body,
    summary: room.dossier.summary,
    facts: room.dossier.facts,
    imageUrl: room.plate,
    links: room.dossier.links,
    track: trackLine,
  });
  const sameHour = useMemo(() => {
    const current =
      hour ||
      (arrivalStation && typeof arrivalStation.longitude === "number"
        ? solarHourAtLongitude(arrivalStation.longitude)
        : null);
    if (!current) return [];
    const seen = new Set<string>();
    return initialStations
      .filter((station) => {
        if (typeof station.longitude !== "number") return false;
        if (station.uuid === arrivalStation?.uuid) return false;
        if (solarHourAtLongitude(station.longitude) !== current) return false;
        // "Also at this hour" is a city affordance: a station with no city
        // would render a country name on the pill (flow audit F1).
        if (!(station.city || "").trim()) return false;
        const key = stationLocation(station);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 4);
  }, [arrivalStation, hour, initialStations]);

  const favoriteStations = useMemo(() => {
    const pool = [...initialStations, ...catalog, ...countryStations];
    return resolveKeptSignals(favorites, favoriteSnapshots, pool).slice(0, 8);
  }, [catalog, countryStations, favoriteSnapshots, favorites, initialStations]);

  const seek = seekingStatus({
    query,
    loading: catalogLoading,
    count: liveFiltered.length,
    unreachable: catalogError,
  });
  const boardLabel =
    seekingBoardLabel(
      query,
      catalogLoading,
      liveFiltered.length,
      catalogError
    ) ??
    hourBoardLabel(hour, catalogLoading, liveFiltered.length) ??
    (mixLabel ? "WORLD MIX" : "LIVE NOW");
  const coverEmpty = describeCoverEmpty({
    query,
    hour,
    place,
    unreachable: catalogError,
  });

  return (
    <main
      className={`rp-home${locatorShrunk ? " is-seeking" : ""}${
        nowPlaying ? " is-landed" : ""
      }`}
    >
      <SiteSeekPortal>
        <IntentBar
          value={query}
          onChange={(value) => {
            setIntentEcho(null);
            setQuery(value);
            if (shouldClearBrowsingFilters(value)) {
              setHour(null);
              setPlace(null);
            }
          }}
          onSubmit={submitIntent}
          onSurprise={() => void requestAiWorld()}
          loading={catalogLoading}
          surpriseLoading={aiStatus === "loading"}
          statusLabel={intentEcho ?? seek.label}
          statusSpoken={
            intentEcho ? `Heard: ${intentEcho}` : seek.spoken
          }
          // IntentBar tones are styling only; "Signal lost" rides the label
          // while the outage borrows the empty tone's styling.
          statusTone={seek.tone === "unreachable" ? "empty" : seek.tone}
        />
      </SiteSeekPortal>
      <div className="rp-stage">
        <section className="rp-intro">
          {/* The horizon row: the room-hour pin stands on the same line as the
              local-time readout it answers, directly above the four-hour
              filter it mirrors. The pin stays mounted even when the readout
              is hidden, so the room is always reachable. */}
          <div className="rp-horizon-row">
            {localNow && !seekingCover ? (
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
            <AtmospherePin />
          </div>
          <div className="rp-intro-copy">
            {nowPlaying && trackLine && !seekingCover ? (
              <p className="ew-track ew-arrive" key={trackLine}>
                {trackLine}
              </p>
            ) : nowPlaying && !seekingCover ? (
              <p className="rp-lede">
                Live from {arrivalCity}. This station sends no track titles.
              </p>
            ) : (
              <p className="rp-lede">{BRAND.promise}</p>
            )}
            <div className="rp-intel-slot">
              {!seekingCover && coverIntel.dispatchBody ? (
                <p className="ew-caption">{coverIntel.dispatchBody}</p>
              ) : null}
              {!seekingCover && coverIntel.facts[0] ? (
                <p className="mt-3 max-w-[36ch] text-sm text-dust">
                  <span className="rp-eyebrow mr-2 text-foil">
                    {coverIntel.facts[0].label}
                  </span>
                  {coverIntel.facts[0].value}
                </p>
              ) : !seekingCover && coverIntel.summary ? (
                <p className="ew-caption">{coverIntel.summary}</p>
              ) : null}
            </div>
          </div>
          <div className="rp-land-slot">
            {!isPlaying && arrivalStation && arrival.ctaKind !== "none" ? (
              <button
                type="button"
                className="ew-land"
                onClick={() =>
                  play(
                    nowPlaying || continueStation || arrivalStation,
                    selectedPool,
                    arrival.ctaKind === "continue" ? "Continue" : "Land here"
                  )
                }
              >
                <span className="ew-land-kicker">
                  {arrival.ctaKind === "continue" ? "EW · Re-entry" : "EW · Arrival"}
                </span>
                <span className="ew-land-city">{arrival.cta}</span>
              </button>
            ) : null}
          </div>
          <div className="ew-horizon">
            <HourRail
              hour={hour}
              onTap={(item) => {
                const next = hourTapNextState(hour, item, query);
                setHour(next.hour as SolarHour | null);
                setPlace(next.place);
                if (next.query !== query) setQuery(next.query);
              }}
            />
            <button
              type="button"
              className="ew-atlas"
              onClick={() => setAtlas(true)}
            >
              <i className="ew-atlas-globe" aria-hidden="true" />
              Atlas
              <span aria-hidden="true">→</span>
            </button>
          </div>
          {hour ? (
            <p className="mt-3 rp-eyebrow text-dust">
              Live where it is {hour.toLowerCase()}
            </p>
          ) : sameHour.length > 0 && !isSeeking ? (
            <p className="mt-3 rp-eyebrow text-dust">Also at this hour</p>
          ) : null}
          {sameHour.length > 0 && !isSeeking ? (
            <div className="ew-same-hour">
              {sameHour.map((station) => {
                const pill = sameHourPillLabel(stationLocation(station));
                return (
                  <button
                    type="button"
                    key={station.uuid}
                    title={pill.spoken}
                    aria-label={pill.spoken}
                    onClick={() => play(station, selectedPool, "Same hour")}
                  >
                    {pill.label}
                  </button>
                );
              })}
            </div>
          ) : null}
          <div className="rp-intro-board">
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
              {/* Skeletons only when there is nothing to show yet: a refetch
                  must never flash over rows we already have (aria-busy on the
                  list carries the pending state instead). */}
              {catalogLoading && isSeeking && liveFiltered.length === 0
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
                      onFavorite={() => toggleFavorite(station.uuid, station)}
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
                      className={action.id === "atlas" ? "ew-atlas" : "rp-chip"}
                      onClick={() => {
                        if (action.id === "surprise") void requestAiWorld();
                        if (action.id === "atlas") setAtlas(true);
                        if (action.id === "clear-search") setQuery("");
                        if (action.id === "clear-hour") setHour(null);
                        if (action.id === "clear-place") setPlace(null);
                        if (action.id === "retry-catalog") retryCatalog();
                      }}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
        <section className="rp-globe-side">
          <GalaxyBackdrop />
          <div className="rp-globe-wrap">
            <ParticleGlobe
              places={places}
              focusId={globeFocusId(
                nowPlaying,
                query,
                catalog.length > 0,
                places
              )}
              onSelect={playPlace}
            />
          </div>
          <div
            className={`ew-cover${arrivalCity ? " ew-seam-city" : ""}`}
          >
            <i className="ew-cover-rule" />
            <h1
              className="ew-coverline ew-arrive"
              key={seekingCover ? "seeking" : arrivalStation?.uuid ?? arrivalCity}
            >
              {seekingCover ? query.trim() : arrivalCity}
            </h1>
            <p
              className="rp-eyebrow ew-arrive ew-arrive-2"
              key={
                seekingCover
                  ? `seek-meta-${query}`
                  : `cover-meta-${arrivalStation?.uuid ?? arrivalCity}`
              }
            >
              {seekingCover
                ? seekingBoardLabel(
                  query,
                  catalogLoading,
                  liveFiltered.length,
                  catalogError
                ) ?? ""
                : arrivalStation
                  ? `${arrivalStation.bitrate
                    ? `${arrivalStation.bitrate} · `
                    : ""
                  }${arrivalCity.toUpperCase()} · ${arrival.live ? "LIVE" : "LAND"
                  }`
                  : "TAP A CITY TO TUNE"}
              {!seekingCover && localNow ? ` · ${formatClock(localNow)}` : ""}
            </p>
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
            play(
              station,
              countryStations,
              `Country: ${country}`,
              playFromAtlasNextState()
            );
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
          onFindCity={() => {
            const next = findCityFromPassport();
            setPassport(next.passport);
            setAtlas(next.atlas);
          }}
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
          onFavorite={(station) => toggleFavorite(station.uuid, station)}
        />
      )}
    </main>
  );
}
