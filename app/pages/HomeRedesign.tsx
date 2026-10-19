import type { loader } from "~/routes/_index";
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
import { solarHourFromDate, type SolarHour } from "~/utils/localTime";
import { Button } from "~/components/ui/Button";
import { useHomeStations } from "~/hooks/home/useHomeStations";
import { useCatalogSearch } from "~/hooks/home/useCatalogSearch";
import { useHomePlay } from "~/hooks/home/useHomePlay";
import { useHomeIntent } from "~/hooks/home/useHomeIntent";
import { useHomeOverlays } from "~/hooks/home/useHomeOverlays";
import { useKeeperHourHop } from "~/hooks/home/useKeeperHourHop";
import { HomeOverlays } from "~/components/radio-passport/HomeOverlays";
import { HomeSky } from "~/components/home/HomeSky";
import { useFriendStore } from "~/state/friendStore";
import { HomeGates } from "~/components/home/HomeGates";
import { HomeDepartures } from "~/components/home/HomeDepartures";
import {
  arrivalSky,
  canShowMore,
  DESIGN_BOARD_STEPS,
  homeBoardCap,
  homeBoardHeading,
  homeDepartures,
  homeGuide,
  routeHomeAsk,
  homeAskFromChoice,
  type HomeAsk,
  homeKeeperLine,
  homeKeeperState,
  homePhase,
  hoursFromListener,
  isSeekQuery,
} from "~/components/home/homeModel";
import { useFloorClearance, useMinuteClock } from "~/components/desk/deskHooks";
import { InstagramGlyph } from "~/components/ui/InstagramGlyph";
import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from "~/utils/social";
import { VOICE } from "~/components/keeper/keeperVoice";
import { askHomeKeeper } from "~/components/keeper/keeperClient";
import { useKeeperAskEnabled } from "~/components/keeper/KeeperSheet";
import { useKeeperStore } from "~/state/keeperStore";
import { useHydrated } from "~/hooks/useHydrated";
import { slimToStation } from "~/state/favoriteSnapshot";
import { useTripsStore, type Trip } from "~/state/tripsStore";
import { HomeShelfRow, HomeYours, type YoursTab } from "~/components/home/HomeShelfRows";
import { TripPicker, type CardActions } from "~/components/home/HomeCard";
import {
  buildHourShelf,
  hourCounts,
  shelfFromSpec,
  shelfHour,
  tourStops,
  type HomeShelf,
  type ShelfCard,
} from "~/components/home/homeShelves";
import { useHomeGuide, GUIDE_BOARD, GUIDE_LANDING } from "~/hooks/home/useHomeGuide";
import { keeperAnchor } from "~/components/keeper/keeperRoamModel";
import { hourWord } from "~/components/keeper/keeperVoice";
import type { Station } from "~/types/radio";

/** Reduced motion scrolls instantly; everyone else glides. */
function scrollBehavior(): ScrollBehavior {
  return typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "auto"
    : "smooth";
}

/**
 * The home: the departures hall, with the keeper showing you around. One
 * scrolling column: a compact landing band (the arrival city's card beside
 * the gates), your stations (saved, recently boarded, trips), shelves (the
 * hour, mostly music, voices, a genre or two), then all departures. No globe:
 * the Atlas keeps the world.
 */
export function HomeRedesign() {
  const {
    countries,
    stations: initialStations,
    shelves: shelfSpecs = [],
    labels = {},
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
  const cap = homeBoardCap(phase, more, DESIGN_BOARD_STEPS);
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
  const guide = homeGuide({
    phase,
    isPlaying,
    city: arrivalCity,
    firstVisit: firstVisit && !friendPending,
    listenerHour: hydrated ? solarHourFromDate(now) : null,
  });
  const welcomeLine = homeKeeperLine({
    phase,
    city: arrivalCity,
    query,
    hour,
    solar: sky.solar,
    firstVisit,
    asleep: keeperState === "sleeping",
  });
  // A returning listener gets a line that fits their own hour, not the welcome.
  const askEnabled = useKeeperAskEnabled();
  const [askLine, setAskLine] = useState<string | null>(null);
  useEffect(() => {
    if (!askLine) return;
    const id = window.setTimeout(() => setAskLine(null), 14000);
    return () => window.clearTimeout(id);
  }, [askLine]);
  const baseLine =
    phase === "arrive" && !firstVisit && guide.line && keeperState !== "sleeping"
      ? guide.line
      : welcomeLine;
  const keeperLine = askLine ?? baseLine;

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

  /* ---- Your stations and the shelves. ---- */
  const hydrateTrips = useTripsStore((state) => state.hydrate);
  const trips = useTripsStore((state) => state.trips);
  const createTrip = useTripsStore((state) => state.createTrip);
  const deleteTrip = useTripsStore((state) => state.deleteTrip);
  useEffect(() => hydrateTrips(), [hydrateTrips]);
  const roamAt = useKeeperStore((state) => (state.roam.phase === "resting" ? state.roam.anchor : null));
  const roamShown = useKeeperStore((state) => state.roamShown);
  const roamSay = useKeeperStore((state) => state.roamSay);
  const roamBubbleOpen = useKeeperStore(
    (state) => state.roam.phase === "resting" && state.roam.anchor === GUIDE_LANDING && Boolean(state.roam.bubble),
  );
  const keeperHushed = useKeeperStore((state) => state.hushed);
  // The head room is for his greeting. Hold it until he has actually spoken
  // there, then give it back once he walks off, is hushed or closes the bubble.
  const [greeted, setGreeted] = useState(false);
  useEffect(() => {
    if (roamBubbleOpen) setGreeted(true);
  }, [roamBubbleOpen]);
  const roamElsewhere = Boolean(roamAt && roamAt !== GUIDE_LANDING);
  const headRoom = !(roamElsewhere || keeperHushed || (greeted && !roamBubbleOpen));
  const toCards = useCallback(
    (stations: Station[]): ShelfCard[] =>
      homeDepartures(stations, now).map((row) => ({ ...row, label: labels[row.station.uuid] ?? null })),
    [labels, now],
  );
  const savedCards = useMemo(() => {
    const pool = [...initialStations, ...catalog, ...countryStations];
    return toCards(resolveKeptSignals(favorites, favoriteSnapshots, pool));
  }, [catalog, countryStations, favoriteSnapshots, favorites, initialStations, toCards]);
  const recentCards = useMemo(() => {
    if (!journeyReady) return [];
    const known = new Map<string, Station>();
    for (const station of [...countryStations, ...catalog, ...initialStations]) known.set(station.uuid, station);
    for (const slim of favoriteSnapshots) if (!known.has(slim.uuid)) known.set(slim.uuid, slimToStation(slim));
    for (const trip of trips) for (const slim of trip.stations) if (!known.has(slim.uuid)) known.set(slim.uuid, slimToStation(slim));
    const stations = played.map((id) => known.get(id)).filter((station): station is Station => Boolean(station));
    return toCards(stations.slice(0, 12));
  }, [catalog, countryStations, favoriteSnapshots, initialStations, journeyReady, played, toCards, trips]);
  const tripCards = useCallback((trip: Trip) => toCards(trip.stations.map(slimToStation)), [toCards]);
  const [yoursTab, setYoursTab] = useState<YoursTab | null>(null);
  // Nothing chosen yet: the hearts if there are any, else what you boarded.
  const tab: YoursTab = yoursTab ?? (savedCards.length === 0 && recentCards.length > 0 ? "recent" : "saved");

  const counts = useMemo(() => hourCounts(initialStations, now), [initialStations, now]);
  const listenerHour = hydrated ? solarHourFromDate(now) : null;
  const theHour = shelfHour({ gate: hour, listenerHour, counts });
  const shelves = useMemo(() => {
    const byId = new Map(initialStations.map((station) => [station.uuid, station]));
    const list: Array<HomeShelf | null> = [
      buildHourShelf(initialStations, theHour, labels, now),
      ...shelfSpecs.map((spec) => shelfFromSpec(spec, byId, labels, now)),
    ];
    return list.filter((shelf): shelf is HomeShelf => Boolean(shelf));
  }, [initialStations, labels, now, shelfSpecs, theHour]);
  const browsing = !(phase === "seek" || (phase === "empty" && isSeeking));
  const playingUuid = isPlaying ? nowPlaying?.uuid ?? null : null;
  const stops = useMemo(
    () =>
      browsing
        ? tourStops(
            [
              ...(tab === "saved" ? [{ id: "yours", cards: savedCards, saved: true }] : []),
              ...shelves,
            ],
            playingUuid,
          )
        : [],
    [browsing, playingUuid, savedCards, shelves, tab],
  );
  const landArrival = useCallback(() => {
    // The button always plays the city it names: the arrival station
    // already resolves playing → hour travel → resume → featured.
    if (arrivalStation) {
      play(arrivalStation, selectedPool, arrival.ctaKind === "continue" ? "Continue" : "Land here");
    }
  }, [arrival.ctaKind, arrivalStation, play, selectedPool]);
  useHomeGuide({
    stops,
    hourShelfId: shelves.some((shelf) => shelf.id === "hour") ? "hour" : null,
    hour,
    seeking: isSeeking,
    query,
    greetWord: listenerHour ? hourWord(listenerHour) : null,
    canLand: Boolean(arrivalStation) && !isPlaying && arrival.ctaKind !== "none",
    onLand: landArrival,
    onBoard: (station) => play(station),
  });
  // The keeper's answers to a typed question: in his bubble when he roams.
  useEffect(() => {
    if (askLine && roamShown) roamSay({ pose: "speaking", line: askLine });
  }, [askLine, roamSay, roamShown]);
  const [tripFor, setTripFor] = useState<{ station: Station; from: HTMLElement } | null>(null);
  const closeTrip = useCallback(() => setTripFor(null), []);
  const cardActions: CardActions = {
    playingUuid,
    favoriteIds: favorites,
    keeperAt: roamShown ? roamAt : null,
    onPlay: (station) => play(station),
    onFavorite: (station) => toggleFavorite(station.uuid, station),
    onTrip: (station, from) => setTripFor((open) => (open?.station.uuid === station.uuid ? null : { station, from })),
  };

  return (
    <main
      ref={pageRef}
      className={`ew-home is-redesign${headRoom ? " has-head-room" : ""}${nowPlaying ? " is-landed" : ""}`}
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
        <div className="ew-home-landing">
        <div className="ew-home-sky-col">
          <HomeSky
            phase={phase}
            place={arrivalCity}
            station={arrivalStation}
            sky={sky}
            offset={VOICE.offsetShort(offsetHours)}
            playing={isPlaying}
            trackLine={trackLine}
            query={query}
            keeperLine={keeperLine}
            keeperState={keeperState}
            cta={{ label: arrival.cta, kind: arrival.ctaKind }}
            onLand={landArrival}
            onAsk={(question) => {
              const act = (route: HomeAsk) => {
                if (route.kind === "search") {
                  setAskLine(null);
                  setQuery(route.query);
                  submitIntent(route.query);
                  return;
                }
                setAskLine(route.line);
                if (route.kind === "surprise") void requestAiWorld();
                else if (route.kind === "hour") {
                  setHour(route.hour);
                  setPlace(null);
                  setQuery("");
                  scrollToBoard();
                }
              };
              const rules = routeHomeAsk(question);
              if (!rules) return;
              // The keeper's rules answer at once; with the desk open to
              // questions, Jev reads the sentence first and the rules back it up.
              if (!askEnabled) return act(rules);
              setAskLine(VOICE.askThinking);
              void askHomeKeeper(question).then((jev) => {
                act((jev && homeAskFromChoice(jev.choice, jev.hour, question)) || rules);
              });
            }}
            guide={guide.chips}
            onGuide={(chip) => {
              if (chip.id === "how") setAskLine(VOICE.askSteps);
              else if (chip.id === "surprise") void requestAiWorld();
              else if (chip.id === "ask") openKeeperSheet(arrivalCity ? { ask: VOICE.askAbout(arrivalCity) } : undefined);
              else if (chip.id === "hour") {
                setHour(chip.hour);
                setPlace(null);
                setQuery("");
                scrollToBoard();
              }
            }}
            onOpenKeeper={nowPlaying ? () => openKeeperSheet() : undefined}
          />
        </div>
          <HomeGates
            hour={hour}
            stamps={journeyReady ? stamps.slice(0, 3) : undefined}
            onPassport={journeyReady ? () => setPassport(true) : undefined}
            onHourTap={(item) => {
              // The hour shelf answers a gate; the keeper walks to its pick
              // (useHomeGuide) and the board below narrows to that hour.
              const next = hourTapNextState(hour, item, query);
              setHour(next.hour as SolarHour | null);
              setPlace(next.place);
              if (next.query !== query) setQuery(next.query);
            }}
            onAtlas={() => setAtlas(true)}
          />
        </div>
        <div className="ew-home-main">
          <div className="ew-home-all" {...keeperAnchor(GUIDE_BOARD)}>
            <HomeDepartures
              phase={phase}
              heading={phase === "arrive" ? VOICE.homeAllDepartures : heading}
              countLabel={countLabel}
              rows={departures}
              loading={catalogLoading}
              playingUuid={isPlaying ? nowPlaying?.uuid ?? null : null}
              favoriteIds={favorites}
              onPlay={(station) => play(station)}
              onFavorite={(station) => toggleFavorite(station.uuid, station)}
              onTrip={cardActions.onTrip}
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
              canMore={canShowMore(phase, more, filtered.length, DESIGN_BOARD_STEPS)}
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
          </div>
          {browsing ? (
            <>
              {shelves.slice(0, 1).map((shelf) => (
                <HomeShelfRow key={shelf.id} shelf={shelf} stops={stops} actions={cardActions} />
              ))}
              <HomeYours
                tab={tab}
                onTab={setYoursTab}
                saved={savedCards}
                recent={recentCards}
                trips={trips}
                tripCards={tripCards}
                onCreateTrip={createTrip}
                onDeleteTrip={(id) => {
                  deleteTrip(id);
                  setYoursTab("saved");
                }}
                stops={stops}
                actions={cardActions}
                onFind={scrollToBoard}
              />
              {shelves.slice(1).map((shelf) => (
                <HomeShelfRow key={shelf.id} shelf={shelf} stops={stops} actions={cardActions} />
              ))}
            </>
          ) : null}
          <footer className="ew-home-foot">
            <span>You are not here.</span>
            <Link to="/about" prefetch="intent">
              How Elsewhere works
            </Link>
            <Link to="/legal" prefetch="intent">
              Terms · Privacy · Credits
            </Link>
            <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" aria-label={`Instagram ${INSTAGRAM_HANDLE}`}>
              <InstagramGlyph size={16} /> {INSTAGRAM_HANDLE}
            </a>
          </footer>
        </div>
      </div>
      {tripFor ? <TripPicker station={tripFor.station} from={tripFor.from} onClose={closeTrip} /> : null}
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
