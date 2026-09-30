import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { Link, useLoaderData, useSearchParams } from "@remix-run/react";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { usePlayerStore } from "~/state/playerStore";
import { useEnvStore } from "~/state/envStore";
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
  boardDeal,
} from "~/components/radio-passport/FlipBoard";
import { SiteSeekPortal } from "~/components/radio-passport/SiteSeek";
import {
  resolveCoverArrival,
  describeCoverEmpty,
  hourTravelHead,
  hourBoardLabel,
  seekingBoardLabel,
  seekingStatus,
} from "~/components/radio-passport/productFlow";
import type { SolarHour } from "~/utils/localTime";
import { Button } from "~/components/ui/Button";
import { useHomeStations } from "~/hooks/home/useHomeStations";
import { useCatalogSearch } from "~/hooks/home/useCatalogSearch";
import { useHomePlay } from "~/hooks/home/useHomePlay";
import { useHomeIntent } from "~/hooks/home/useHomeIntent";
import { useHomeOverlays } from "~/hooks/home/useHomeOverlays";
import { useKeeperHourHop } from "~/hooks/home/useKeeperHourHop";
import { HomeOverlays } from "~/components/radio-passport/HomeOverlays";
import { HomeSky } from "~/components/home/HomeSky";
import { HomeHow } from "~/components/home/HomeHow";
import { useFriendStore } from "~/state/friendStore";
import { HomeGates } from "~/components/home/HomeGates";
import { HomeDepartures } from "~/components/home/HomeDepartures";
import {
  arrivalSky,
  canShowMore,
  homeBoardCap,
  homeBoardHeading,
  homeDepartures,
  homeKeeperLine,
  homeKeeperState,
  homePhase,
  hoursFromListener,
  isSeekQuery,
} from "~/components/home/homeModel";
import { useFloorClearance, useMinuteClock } from "~/components/desk/deskHooks";
import { VOICE } from "~/components/keeper/keeperVoice";
import { useKeeperStore } from "~/state/keeperStore";
import { useHydrated } from "~/hooks/useHydrated";
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


/** Reduced motion scrolls instantly; everyone else glides. */
function scrollBehavior(): ScrollBehavior {
  return typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "auto"
    : "smooth";
}

/**
 * The home: the departures hall. One scrolling column of three bands (the
 * arrival city's sky, the gates, the departures board) that becomes a sticky
 * sky beside the gates and the board on wide screens. No globe: the Atlas
 * keeps the world.
 */
export default function Index() {
  const {
    countries,
    stations: initialStations,
    boardSeed = 0,
  } = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();
  const hydrated = useHydrated();
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
  const openKeeperSheet = useKeeperStore((state) => state.openSheet);
  const listening = useListeningMode();
  const storedRoom = useRoomStore((state) => state.room);
  const room = roomForStation(storedRoom, nowPlaying?.uuid);
  const now = useMinuteClock();
  const setEnvHour = useEnvStore((state) => state.setHomeHour);
  const pageRef = useRef<HTMLElement>(null);
  const pageBox = useFloorClearance(pageRef);
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
    setAtlas,
    countryCache,
    countryStations,
    setPassport,
  } = overlays;

  // Bring the board into view below the sticky gates, only when it is not
  // already on screen: no jump for a board you can already see.
  const scrollToBoard = useCallback(() => {
    window.requestAnimationFrame(() => {
      const page = pageRef.current;
      const board = document.getElementById("live-board");
      if (!page || !board) return;
      const gates = page.querySelector<HTMLElement>(".ew-gates");
      const pageTop = page.getBoundingClientRect().top;
      const gatesBottom = gates ? gates.getBoundingClientRect().bottom : pageTop;
      const boardTop = board.getBoundingClientRect().top;
      const visibleFloor = pageTop + page.clientHeight - 160;
      if (boardTop >= gatesBottom - 1 && boardTop <= visibleFloor) return;
      const target = page.scrollTop + boardTop - gatesBottom - 8;
      page.scrollTo({ top: Math.max(0, target), behavior: scrollBehavior() });
    });
  }, []);

  useKeeperHourHop({
    query,
    setHour,
    setPlace,
    setQuery,
    onHop: scrollToBoard,
  });
  const {
    featured,
    continueStation,
    filtered,
    liveFiltered,
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
    played,
    journeyReady,
  });
  const noop = useCallback(() => {}, []);
  const {
    play,
    requestAiWorld,
    submitIntent,
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
    onLanded: noop,
  });

  const isSeeking = isSeekQuery(query);
  // A typed search is a request for rows: the board comes into view.
  useEffect(() => {
    if (isSeeking) scrollToBoard();
  }, [isSeeking, scrollToBoard]);

  const phase = homePhase({
    query,
    hour,
    isPlaying,
    count: liveFiltered.length,
    loading: catalogLoading,
  });
  // "More departures" steps 8 → 16 → 32; a fresh question starts again at 8.
  const [more, setMore] = useState(0);
  useEffect(() => {
    setMore(0);
  }, [query, hour, place]);
  // Manual reshuffle: a fresh idle window from the loaded pool, no refetch.
  // A real deal, not a rotation — rotating slides the window one slot and
  // leaves 7 of 8 rows standing.
  const [shuffle, setShuffle] = useState(0);
  const cap = homeBoardCap(phase, more);
  const boardRows = useMemo(() => {
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
  }, [boardSeed, cap, filtered, isSeeking, liveFiltered, shuffle]);
  // Time travel lands after the deal: the sky offers the head of the hour
  // rows it can see. Suspended resume returns when the hour is cleared.
  // A paused station does not hold the sky against an hour gate: the gate
  // is a destination, so the sky retints to the head of its board.
  const hourHead = hourTravelHead(hour, isPlaying ? nowPlaying : null, boardRows);
  const arrivalStation =
    (isPlaying ? nowPlaying : null) || hourHead || nowPlaying || continueStation || featured;
  const arrivalCity = arrivalStation ? stationLocation(arrivalStation) : "the world";
  const arrival = resolveCoverArrival({
    isPlaying,
    hasNowPlaying: Boolean(nowPlaying) && !hourHead,
    // Hour travel suspends resume: "Continue in {hour city}" must never
    // resume a different city. Clearing the hour brings resume back.
    hasContinue: Boolean(continueStation) && !hourHead,
    city: arrivalCity,
    query,
    count: liveFiltered.length,
    loading: catalogLoading,
    unreachable: catalogError,
  });
  const sky = arrivalSky(arrivalStation, now);
  // The room takes the hour the home is showing: the gate, else the sky's city.
  const envSolar = hour ?? sky.solar;
  useEffect(() => {
    setEnvHour(envSolar);
    return () => setEnvHour(null);
  }, [envSolar, setEnvHour]);
  const offsetHours = hydrated ? hoursFromListener(sky.localHour, now.getHours()) : null;
  const trackLine = room.signal.track
    ? [room.signal.track.artist, room.signal.track.title].filter(Boolean).join(" — ")
    : null;
  const friendPending = useFriendStore((state) => state.pending);
  const firstVisit = journeyReady && stamps.length === 0;
  const keeperState = homeKeeperState({
    phase,
    loading: catalogLoading,
    isPlaying,
    localHour: sky.localHour,
  });
  const keeperLine = homeKeeperLine({
    phase,
    city: arrivalCity,
    query,
    hour,
    solar: sky.solar,
    firstVisit,
    asleep: keeperState === "sleeping",
  });

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
  const seekLabel = seekingBoardLabel(
    query,
    catalogLoading,
    liveFiltered.length,
    catalogError
  );
  const countLabel =
    seekLabel ??
    hourBoardLabel(hour, catalogLoading, liveFiltered.length) ??
    (mixLabel ? mixLabel : `${liveFiltered.length} LIVE`);
  const heading = homeBoardHeading({ phase, hour, seekLabel });
  const coverEmpty = describeCoverEmpty({
    query,
    hour,
    place,
    unreachable: catalogError,
  });
  const departures = useMemo(() => homeDepartures(boardRows, now), [boardRows, now]);

  return (
    <main
      ref={pageRef}
      className={`ew-home${nowPlaying ? " is-landed" : ""}`}
      data-phase={phase}
      style={
        {
          "--home-floor": `${pageBox.floor}px`,
          "--home-h": pageBox.height ? `${pageBox.height}px` : undefined,
        } as CSSProperties
      }
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
      <div className="ew-home-inner">
        <div className="ew-home-sky-col">
          <HomeSky
            phase={phase}
            place={arrivalCity}
            station={arrivalStation}
            sky={sky}
            offset={VOICE.offset(offsetHours)}
            playing={isPlaying}
            trackLine={trackLine}
            query={query}
            keeperLine={keeperLine}
            keeperState={keeperState}
            cta={{ label: arrival.cta, kind: arrival.ctaKind }}
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
            onOpenKeeper={nowPlaying ? openKeeperSheet : undefined}
          />
        </div>
        <div className="ew-home-main">
          <HomeHow show={firstVisit && !friendPending} />
          <HomeGates
            hour={hour}
            onHourTap={(item) => {
              const next = hourTapNextState(hour, item, query);
              setHour(next.hour as SolarHour | null);
              setPlace(next.place);
              if (next.query !== query) setQuery(next.query);
              if (next.hour) scrollToBoard();
            }}
            onAtlas={() => setAtlas(true)}
          />
          <HomeDepartures
            phase={phase}
            heading={heading}
            countLabel={countLabel}
            rows={departures}
            loading={catalogLoading}
            playingUuid={isPlaying ? nowPlaying?.uuid ?? null : null}
            favoriteIds={favorites}
            onPlay={(station) => play(station)}
            onFavorite={(station) => toggleFavorite(station.uuid, station)}
            empty={phase === "empty" ? coverEmpty : null}
            onEmptyAction={(action) => {
              if (action.id === "surprise") void requestAiWorld();
              if (action.id === "atlas") setAtlas(true);
              if (action.id === "clear-search") setQuery("");
              if (action.id === "clear-hour") setHour(null);
              if (action.id === "clear-place") setPlace(null);
              if (action.id === "retry-catalog") retryCatalog();
            }}
            onShuffle={() => setShuffle((value) => value + 1)}
            shuffleKey={shuffle}
            canMore={canShowMore(phase, more, filtered.length)}
            onMore={() => setMore((value) => value + 1)}
            stamps={journeyReady ? stamps : []}
            onOpenPassport={() => setPassport(true)}
            notice={
              aiStatus === "error" && listening.exploreError ? (
                <div className="ew-home-notice" role="alert">
                  <p>{listening.exploreError}</p>
                  <Button onClick={() => void requestAiWorld()}>
                    Try the mix again →
                  </Button>
                </div>
              ) : null
            }
          />
          <footer className="ew-home-foot">
            <span>You are not here.</span>
            <Link to="/about" prefetch="intent">
              How Elsewhere works
            </Link>
          </footer>
        </div>
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
