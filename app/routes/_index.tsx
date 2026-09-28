import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSearchParams } from "@remix-run/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePlayerStore } from "~/state/playerStore";
import { useJourneyStore } from "~/state/journeyStore";
import { resolveKeptSignals } from "~/state/favoriteSnapshot";
import { useListeningMode } from "~/hooks/useListeningMode";
import { roomForStation, useRoomStore } from "~/state/roomStore";
import { stationLocation } from "~/components/radio-passport/StationRow";
import {
  hourTapNextState,
  shouldClearBrowsingFilters,
} from "~/components/radio-passport/searchState";
import { IntentBar } from "~/components/radio-passport/IntentBar";
import { SeekShell } from "~/components/radio-passport/SeekShell";
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
  hourTravelHead,
  hourBoardLabel,
  seekingBoardLabel,
  seekingStatus,
  theaterIntelligenceFromRoom,
} from "~/components/radio-passport/productFlow";
import {
  formatClock,
  localDateAtLongitude,
  solarHourAtLongitude,
  type SolarHour,
} from "~/utils/localTime";
import { Button } from "~/components/ui/Button";
import { useHomeStations } from "~/hooks/home/useHomeStations";
import { useCatalogSearch } from "~/hooks/home/useCatalogSearch";
import { useHomePlay } from "~/hooks/home/useHomePlay";
import { useHomeIntent } from "~/hooks/home/useHomeIntent";
import { useHomeOverlays } from "~/hooks/home/useHomeOverlays";
import { HomeIntro } from "~/components/radio-passport/HomeIntro";
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
  const favorites = useJourneyStore((state) => state.favoriteStationIds);
  const favoriteSnapshots = useJourneyStore((state) => state.favoriteStations);
  const stamps = useJourneyStore((state) => state.stamps);
  const played = useJourneyStore((state) => state.playedStationIds);
  const memberSince = useJourneyStore((state) => state.memberSince);
  const travelerNumber = useJourneyStore((state) => state.travelerNumber);
  const journeyReady = useJourneyStore((state) => state.hydrated);
  const toggleFavorite = useJourneyStore((state) => state.toggleFavorite);
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
  // The station board rests as a sheet on the phone: peek until a search
  // asks for the rows, back to peek the moment a station lands.
  const [boardSheet, setBoardSheet] = useState<BoardSheetState>("peek");
  const settleSheet = useCallback(() => setBoardSheet("peek"), []);
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
  const {
    play,
    requestAiWorld,
    submitIntent,
    playPlace,
    aiStatus,
    mixLabel,
    intentEcho,
    setIntentEcho,
  } = useHomePlay({
    query,
    hour,
    place,
    setQuery,
    setHour,
    setPlace,
    selectedPool,
    listening,
    globeStations,
    places,
    onLanded: settleSheet,
  });

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
        <HomeIntro
          nowPlaying={nowPlaying}
          isPlaying={isPlaying}
          arrivalStation={arrivalStation}
          arrivalCity={arrivalCity}
          arrival={arrival}
          localNow={localNow}
          seekingCover={seekingCover}
          isSeeking={isSeeking}
          trackLine={trackLine}
          coverIntel={coverIntel}
          firstVisit={stamps.length === 0}
          hour={hour}
          query={query}
          sameHour={sameHour}
          onLand={() =>
            // The button always plays the city it names: the arrival station
            // already resolves playing → hour travel → resume → featured.
            arrivalStation &&
            play(
              arrivalStation,
              selectedPool,
              arrival.ctaKind === "continue" ? "Continue" : "Land here"
            )
          }
          onSameHour={(station) => play(station, selectedPool, "Same hour")}
          onHourTap={(item) => {
            const next = hourTapNextState(hour, item, query);
            setHour(next.hour as SolarHour | null);
            setPlace(next.place);
            if (next.query !== query) setQuery(next.query);
          }}
          onAtlas={() => setAtlas(true)}
        >
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
        </HomeIntro>
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
