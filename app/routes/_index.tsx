import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSearchParams } from "@remix-run/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createQueueSession } from "~/utils/playerQueue";
import type { Station } from "~/types/radio";
import type { InterpretResponse } from "~/types/ai";
import { usePlayerStore } from "~/state/playerStore";
import { useJourneyStore } from "~/state/journeyStore";
import { resolveKeptSignals } from "~/state/favoriteSnapshot";
import { useListeningMode } from "~/hooks/useListeningMode";
import { roomForStation, useRoomStore } from "~/state/roomStore";
import { loadWorldDescriptorPreview } from "~/services/aiOrchestrator";
import { stationLocation } from "~/components/radio-passport/StationRow";
import { AtmospherePin } from "~/components/radio-passport/AtmospherePin";
import { applyAiPreviewPool } from "~/components/radio-passport/aiPreview";
import {
  hourTapNextState,
  playFromAtlasNextState,
  shouldClearBrowsingFilters,
  surpriseTapNextState,
} from "~/components/radio-passport/searchState";
import { IntentBar } from "~/components/radio-passport/IntentBar";
import { SeekShell } from "~/components/radio-passport/SeekShell";
import { HourRail } from "~/components/radio-passport/HourRail";
import {
  BoardSheet,
  type BoardSheetState,
} from "~/components/radio-passport/BoardSheet";
import { CoverStrip } from "~/components/CoverStrip";
import { CoverSlotPortal } from "~/components/radio-passport/CoverSlot";
import {
  boardDeal,
} from "~/components/radio-passport/FlipBoard";
import { SiteSeekPortal, SiteSeekRail } from "~/components/radio-passport/SiteSeek";
import {
  resolveCoverArrival,
  describeCoverEmpty,
  sameHourPillLabel,
  hourTravelHead,
  looksLikeIntentSentence,
  hourBoardLabel,
  intentEchoFromInterpret,
  seekingBoardLabel,
  seekingStatus,
  theaterIntelligenceFromRoom,
  homeWelcomeCopy,
} from "~/components/radio-passport/productFlow";
import { resolveTypedIntent, solarHourFromWord } from "~/services/ai/intent/promptIntent";
import {
  formatClock,
  formatLocalLabel,
  localDateAtLongitude,
  solarHourAtLongitude,
  type SolarHour,
} from "~/utils/localTime";
import { Button } from "~/components/ui/Button";
import { useHomeStations } from "~/hooks/home/useHomeStations";
import { useCatalogSearch } from "~/hooks/home/useCatalogSearch";
import { useHomeIntent } from "~/hooks/home/useHomeIntent";
import { useHomeOverlays } from "~/hooks/home/useHomeOverlays";
import { HomeOverlays } from "~/components/radio-passport/HomeOverlays";
import { HomeGlobeSide } from "~/components/radio-passport/HomeGlobeSide";
import { StationBoard } from "~/components/radio-passport/StationBoard";
import { HOME_NO_STORE, loadHomeBoard } from "~/services/home/homeBoard.server";

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
  // boardSeed is per request, so the board deals a fresh window on every load
  // while the catalog itself comes from the short server-side cache.
  const boardSeed = Date.now();
  const board = await loadHomeBoard();
  return json({ ...board, boardSeed }, { headers: HOME_NO_STORE });
}

export default function Index() {
  const {
    countries,
    stations: initialStations,
    boardSeed = 0,
  } = useLoaderData<typeof loader>();
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
  const { hour, setHour, place, setPlace, query, setQuery } = useHomeIntent(
    searchParams.toString()
  );
  const {
    catalog,
    loading: catalogLoading,
    error: catalogError,
    retry: retryCatalog,
  } = useCatalogSearch(query);
  const overlays = useHomeOverlays(searchParams.toString());
  const {
    atlas,
    setAtlas,
    country,
    countryCache,
    countryStations,
    passport,
  } = overlays;
  const [aiStatus, setAiStatus] = useState<"idle" | "loading" | "error">(
    "idle"
  );
  const [mixLabel, setMixLabel] = useState<string | null>(null);
  // The station board rests as a sheet on the phone: peek until a search
  // asks for the rows, back to peek the moment a station lands.
  const [boardSheet, setBoardSheet] = useState<BoardSheetState>("peek");
  // The interpreter's whisper: what it understood differently, until the next keystroke.
  const [intentEcho, setIntentEcho] = useState<string | null>(null);
  const queryRef = useRef(query);
  queryRef.current = query;

  const {
    featured,
    continueStation,
    filtered,
    liveFiltered,
    globeStations,
    places,
    selectedPool,
  } = useHomeStations({
    initialStations,
    catalog,
    query,
    hour,
    place,
    countryCache,
    listeningMode: listening.listeningMode,
    exploreStations: listening.exploreStations,
    nowPlaying,
    stamps,
    played,
    journeyReady,
  });
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
      // Landing is the globe's moment again: the sheet settles back to its
      // peek so the cover and the land stay in view.
      setBoardSheet("peek");
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

  const isSeeking = query.trim().length >= 2;
  // A typed search is a request for rows: the sheet rises on its own so the
  // results meet the eye instead of waiting behind the grip.
  useEffect(() => {
    if (isSeeking) setBoardSheet("open");
  }, [isSeeking]);
  // Manual reshuffle: a fresh idle window from the loaded pool, no refetch.
  // A real deal, not a rotation — rotating slides the window one slot and
  // leaves 7 of 8 rows standing.
  const [shuffle, setShuffle] = useState(0);
  const boardRows = useMemo(() => {
    const cap = isSeeking ? 32 : 8;
    const ordered = isSeeking
      ? filtered
      : boardDeal(filtered.slice(0, Math.max(cap, 36)), boardSeed + shuffle);
    const ids = ordered.slice(0, cap).map((station) => station.uuid);
    const live = new Map(
      liveFiltered.map((station) => [station.uuid, station]),
    );
    return ids.map(
      (id) => live.get(id) ?? ordered.find((station) => station.uuid === id)!,
    );
  }, [boardSeed, filtered, isSeeking, liveFiltered, shuffle]);
  // Time travel lands after the deal: the cover offers the head of the hour
  // rows it can see. Suspended resume returns when the hour is cleared.
  const hourHead = hourTravelHead(hour, nowPlaying, boardRows);
  const arrivalCity = nowPlaying
    ? stationLocation(nowPlaying)
    : hourHead
      ? stationLocation(hourHead)
      : continueStation
        ? stationLocation(continueStation)
        : featured
          ? stationLocation(featured)
          : "the world";
  const arrivalStation = nowPlaying || hourHead || continueStation || featured;
  const locatorShrunk = isSeeking || Boolean(hour);
  const seekingCover = isSeeking && !isPlaying;
  const arrival = resolveCoverArrival({
    isPlaying,
    hasNowPlaying: Boolean(nowPlaying),
    // Hour travel suspends resume: "Continue in {hour city}" must never
    // resume a different city. Clearing the hour brings resume back.
    hasContinue: Boolean(continueStation) && !hourHead,
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
        <SeekShell
          open
          busy={catalogLoading || aiStatus === "loading"}
          lensLabel="Seek the catalog — focus the intent field"
        >
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
        </SeekShell>
      </SiteSeekPortal>
      <CoverSlotPortal>
        <CoverStrip
          land={arrivalCity}
          live={arrival.live}
          clock={localNow ? formatClock(localNow) : null}
          overlay={atlas || Boolean(country) || passport}
          coverKey={seekingCover ? "seeking" : arrivalStation?.uuid ?? arrivalCity}
        />
      </CoverSlotPortal>
      <div className="rp-stage">
        <div className="ew-home-seek">
          <SiteSeekRail />
        </div>
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
              <p className="rp-lede">{homeWelcomeCopy().lede}</p>
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
            {/* First visit only: the brand line and the promise, once. After the
                first stamp the button is enough. */}
            {!isPlaying && arrivalStation && arrival.ctaKind === "land" && stamps.length === 0 ? (
              <p className="ew-hook">
                <em>You are not here.</em> Hear {arrivalCity} right now.
              </p>
            ) : null}
            {!isPlaying && arrivalStation && arrival.ctaKind !== "none" ? (
              <Button
                variant="land"
                kicker={arrival.ctaKind === "continue" ? "EW · Re-entry" : "EW · Arrival"}
                onClick={() =>
                  // The button always plays the city it names: the arrival
                  // station already resolves playing → hour travel → resume →
                  // featured, in that order.
                  play(
                    arrivalStation,
                    selectedPool,
                    arrival.ctaKind === "continue" ? "Continue" : "Land here"
                  )
                }
              >
                {arrival.cta}
              </Button>
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
            <Button variant="atlas" onClick={() => setAtlas(true)}>
              <i className="ew-atlas-globe" aria-hidden="true" />
              Atlas
              <span aria-hidden="true">→</span>
            </Button>
          </div>
          {hour ? (
            <p className="mt-3 rp-eyebrow text-dust">
              Live where it is {hour.toLowerCase()}
            </p>
          ) : sameHour.length > 0 && !isSeeking ? (
            <p className="mt-3 rp-eyebrow text-dust">Also at this hour</p>
          ) : null}
          {!hour && !isSeeking && stamps.length === 0 ? (
            <p className="mt-3 rp-eyebrow text-dust">
              {homeWelcomeCopy().hourDecoder}
            </p>
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
          <BoardSheet
            state={boardSheet}
            onStateChange={setBoardSheet}
            docked={Boolean(nowPlaying)}
          >
          <div className="rp-intro-board">
            <div
              className="mt-7 flex items-center justify-between"
              id="live-board"
            >
              <span className="flex items-center gap-2">
                <span
                  className={`rp-eyebrow ${isSeeking ? "text-ether" : ""}`}
                  role="status"
                  aria-live="polite"
                >
                  <i className="rp-live-dot" /> {boardLabel}
                </span>
                {!isSeeking ? (
                  <button
                    type="button"
                    className="rp-board-shuffle"
                    onClick={() => setShuffle((value) => value + 1)}
                    aria-label="Show fresh stations"
                    title="Fresh stations"
                  >
                    <svg
                      key={shuffle}
                      className="rp-board-shuffle-spin"
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      aria-hidden="true"
                    >
                      <path d="M20 12a8 8 0 1 1-2.34-5.66" />
                      <path d="M20 3v4h-4" />
                    </svg>
                  </button>
                ) : null}
              </span>
              {mixLabel ? (
                <span className="rp-eyebrow text-foil">{mixLabel}</span>
              ) : (
                <span className="rp-eyebrow text-dust">
                  {liveFiltered.length} LANDS
                </span>
              )}
            </div>
            {aiStatus === "error" && listening.exploreError && (
              <div className="mt-2" role="alert">
                <p className="text-xs text-dust">{listening.exploreError}</p>
                <Button className="mt-2" onClick={() => void requestAiWorld()}>
                  Try the mix again →
                </Button>
              </div>
            )}
            <StationBoard
              rows={boardRows}
              loading={catalogLoading}
              playingUuid={isPlaying ? nowPlaying?.uuid ?? null : null}
              favoriteIds={favorites}
              onPlay={(station) => play(station)}
              onFavorite={(station) => toggleFavorite(station.uuid, station)}
              empty={liveFiltered.length === 0 ? coverEmpty : null}
              onEmptyAction={(action) => {
                if (action.id === "surprise") void requestAiWorld();
                if (action.id === "atlas") setAtlas(true);
                if (action.id === "clear-search") setQuery("");
                if (action.id === "clear-hour") setHour(null);
                if (action.id === "clear-place") setPlace(null);
                if (action.id === "retry-catalog") retryCatalog();
              }}
            />
          </div>
          </BoardSheet>
        </section>
        <HomeGlobeSide
          places={places}
          catalogReady={catalog.length > 0}
          onSelectPlace={playPlace}
          nowPlaying={nowPlaying}
          query={query}
          seekingCover={seekingCover}
          arrivalStation={arrivalStation}
          arrivalCity={arrivalCity}
          live={arrival.live}
          localNow={localNow}
          seekLabel={
            seekingBoardLabel(query, catalogLoading, liveFiltered.length, catalogError) ?? ""
          }
        />
      </div>
      <HomeOverlays
        overlays={overlays}
        countries={countries}
        stations={initialStations}
        catalog={catalog}
        favorites={favorites}
        favoriteStations={favoriteStations}
        stamps={stamps}
        playedCount={played.length}
        memberSince={memberSince}
        travelerNumber={travelerNumber}
        selectedPool={selectedPool}
        play={play}
        toggleFavorite={toggleFavorite}
      />
    </main>
  );
}
