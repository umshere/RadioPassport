import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { logUsage } from "~/utils/usage";
import { useHydrated } from "~/hooks/useHydrated";
import { usePlayerStore } from "~/state/playerStore";
import { roomForStation, useRoomStore } from "~/state/roomStore";
import { stationStampId, useJourneyStore } from "~/state/journeyStore";
import { useKeeperStore } from "~/state/keeperStore";
import { BRAND } from "~/constants/brand";
import { stationLocation } from "~/components/radio-passport/StationRow";
import { DeskDossier } from "~/components/radio-passport/DeskDossier";
import { LAST_TRACK_FRESH_MS } from "~/components/radio-passport/theaterLock";
import { SecretTrail } from "~/components/radio-passport/SecretTrail";
import { TheaterSeek } from "~/components/radio-passport/TheaterSeek";
import {
  theaterIntelligenceFromRoom,
  theaterRoomGate,
  theaterWithoutStation,
} from "~/components/radio-passport/productFlow";
import { cleanTrackLine } from "~/services/keeper/cleanTitle";
import { Eyebrow } from "~/components/ui/Eyebrow";
import { ButtonLink } from "~/components/ui/Button";
import { Keeper } from "~/components/keeper/Keeper";
import { useKeeperAskEnabled } from "~/components/keeper/KeeperSheet";
import { useKeeperView } from "~/components/keeper/useKeeper";
import { readKeeperFact } from "~/components/keeper/keeperFactClient";
import { hourOffsetFromListener, planMurmurs } from "~/components/keeper/keeperMurmur";
import { VOICE } from "~/components/keeper/keeperVoice";
import { DeskSky } from "~/components/desk/DeskSky";
import { DeskPass } from "~/components/desk/DeskPass";
import { DeskOnAir } from "~/components/desk/DeskOnAir";
import { DeskAsk } from "~/components/desk/DeskAsk";
import { DeskPostcards } from "~/components/desk/DeskPostcards";
import { DeskDepartures } from "~/components/desk/DeskDepartures";
import {
  deskDepartures,
  deskOnAir,
  listenerClock,
  minutesAboard,
  postmarkDate,
} from "~/components/desk/deskModel";
import type { NowPlayingTrack } from "~/types/nowPlaying";

export const meta = () => [
  { title: `The desk · ${BRAND.name}` },
  {
    name: "description",
    content: "The keeper’s desk: the hour, the place and the sound of the station you are inside.",
  },
  { property: "og:title", content: `The desk · ${BRAND.name}` },
  {
    property: "og:description",
    content: "The keeper’s desk: the hour, the place and the sound of the station you are inside.",
  },
  { property: "og:url", content: "https://elsewheremusic.com/listen" },
];

/** The clock, re-read on each minute boundary so the flaps turn on time. */
function useMinuteClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let interval: number | undefined;
    const first = window.setTimeout(() => {
      setNow(new Date());
      interval = window.setInterval(() => setNow(new Date()), 60_000);
    }, 60_000 - (Date.now() % 60_000) + 50);
    return () => {
      window.clearTimeout(first);
      if (interval) window.clearInterval(interval);
    };
  }, []);
  return now;
}

/**
 * The page scrolls inside the app frame; its last card must clear the dock
 * and the phone band, which stand fixed over the bottom of it. Measured, since
 * the dock's deck opens and the band comes and goes.
 */
function useDeskFloor(ref: React.RefObject<HTMLElement>, active: boolean) {
  const [box, setBox] = useState({ floor: 0, height: 0 });
  useLayoutEffect(() => {
    if (!active) return;
    const update = () => {
      const desk = ref.current;
      if (!desk) return;
      const bottom = desk.getBoundingClientRect().bottom;
      let top = bottom;
      for (const selector of [".rp-dock", ".ew-band-nav.is-band"]) {
        const node = document.querySelector<HTMLElement>(selector);
        if (!node) continue;
        const style = window.getComputedStyle(node);
        if (style.display === "none" || style.position !== "fixed") continue;
        const rect = node.getBoundingClientRect();
        if (rect.height > 0) top = Math.min(top, rect.top);
      }
      const floor = Math.max(0, Math.round(bottom - top));
      const height = Math.round(desk.clientHeight);
      setBox((current) =>
        current.floor === floor && current.height === height ? current : { floor, height },
      );
    };
    update();
    window.addEventListener("resize", update);
    const timer = window.setInterval(update, 800);
    return () => {
      window.removeEventListener("resize", update);
      window.clearInterval(timer);
    };
  }, [active, ref]);
  return box;
}

/**
 * The desk: the keeper's own page for the station you are inside. The sky at
 * the station's hour with the keeper on its horizon; your boarding pass; what
 * is on air; the ask box; his postcards; the station's file; the departures
 * board. One scrolling column on the phone, a sky beside the cards on wide
 * screens. Every field comes from the record or the stream; what is missing
 * is said, never filled in.
 */
export default function DeskPage() {
  const hydrated = useHydrated();
  const storedNowPlaying = usePlayerStore((state) => state.nowPlaying);
  const storedIsPlaying = usePlayerStore((state) => state.isPlaying);
  const nowPlaying = hydrated ? storedNowPlaying : null;
  const isPlaying = hydrated ? storedIsPlaying : false;
  const queue = usePlayerStore((state) => state.queue);
  const queueIndex = usePlayerStore((state) => state.currentStationIndex);
  const lastTrackByStation = usePlayerStore((state) => state.lastTrackByStation);
  const storedRoom = useRoomStore((state) => state.room);
  const room = roomForStation(storedRoom, nowPlaying?.uuid);
  const view = useKeeperView();
  const askEnabled = useKeeperAskEnabled();
  const factLog = useKeeperStore((state) => state.factLog);
  const reading = useKeeperStore((state) => state.reading);
  const murmur = useKeeperStore((state) => state.murmur);
  const setMurmur = useKeeperStore((state) => state.setMurmur);
  const landed = useKeeperStore((state) => state.landed);
  const stamps = useJourneyStore((state) => state.stamps);
  const now = useMinuteClock();
  const deskRef = useRef<HTMLElement>(null);
  const deskBox = useDeskFloor(deskRef, Boolean(nowPlaying));
  const lastTrackStationRef = useRef<string | null>(null);
  const lastTrackRef = useRef<NowPlayingTrack | null>(null);

  useEffect(() => {
    logUsage("desk_view");
  }, []);

  // The desk reads up on the place as soon as you sit down, so the postcards
  // are never a dead end (the same shared, cached reads as the sheet).
  const stationId = nowPlaying?.uuid ?? null;
  useEffect(() => {
    if (!askEnabled || !stationId || !view.facts) return;
    const held = useKeeperStore.getState().factLog;
    if (held.stationId === stationId && held.entries.length >= 2) return;
    for (const step of planMurmurs(view.facts)) {
      if (step.type === "fact") void readKeeperFact(stationId, step.kind, step.name);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [askEnabled, stationId, Boolean(view.facts)]);

  // Pause freezes the desk: the title feed reports nothing the instant
  // playback stops, which would blank the line and reflow the page. The last
  // aired title stays, seeded from storage so a fresh mount opens on it.
  if (!nowPlaying || lastTrackStationRef.current !== nowPlaying.uuid) {
    lastTrackStationRef.current = nowPlaying?.uuid ?? null;
    const saved = nowPlaying ? lastTrackByStation[nowPlaying.uuid] : undefined;
    lastTrackRef.current = saved && Date.now() - saved.at < LAST_TRACK_FRESH_MS ? saved.track : null;
  }
  const liveTrack = room.signal.track;
  if (liveTrack) lastTrackRef.current = liveTrack;
  const displayTrack = liveTrack ?? lastTrackRef.current;

  const roomGate = theaterRoomGate(hydrated, nowPlaying);
  if (roomGate === "wait") {
    return <main className="ew-desk" aria-busy="true" />;
  }
  if (roomGate === "empty" || !nowPlaying || !view.facts) {
    const empty = theaterWithoutStation();
    return (
      <main className="ew-desk is-empty">
        <div className="ew-desk-inner">
          <section className="ew-sky" data-hour="night" aria-labelledby="ew-desk-place">
            <div className="ew-sky-field" aria-hidden="true">
              <i className="ew-sky-stars" />
              <i className="ew-sky-grain" />
            </div>
            <div className="ew-sky-head">
              <Eyebrow as="span" tone="foil">{VOICE.deskTitle}</Eyebrow>
            </div>
            <div className="ew-sky-copy">
              <h1 id="ew-desk-place" className="ew-sky-place is-quiet">{VOICE.deskEmptyTitle}</h1>
              <p className="ew-sky-note">{VOICE.deskEmptyLine}</p>
              <ButtonLink
                to={empty.route}
                variant="land"
                kicker={empty.kicker}
                className="ew-desk-empty-cta"
                prefetch="intent"
                viewTransition
              >
                {empty.label}
              </ButtonLink>
            </div>
            <div className="ew-sky-ground">
              <div className="ew-sky-say" />
              <Keeper state="sleeping" mood="drowsy" size="desk" className="ew-sky-keeper" />
            </div>
          </section>
        </div>
      </main>
    );
  }

  const facts = view.facts;
  const place = facts.city || facts.station.country || facts.station.name;
  const offsetHours = hourOffsetFromListener(facts, now.getHours());
  const offset = VOICE.offset(offsetHours);
  const entries = factLog.stationId === nowPlaying.uuid ? factLog.entries : [];
  const stampId = stationStampId(nowPlaying.uuid, stationLocation(nowPlaying), nowPlaying.country);
  const stamped = stamps.some((stamp) => stamp.id === stampId);
  const minutes =
    landed.stationId === nowPlaying.uuid ? minutesAboard(landed.at, now.getTime()) : 0;
  const onAir = deskOnAir({ raw: displayTrack, stationName: nowPlaying.name, titles: facts.titles });
  const rawTrackLine = cleanTrackLine(displayTrack);
  const intelligence = theaterIntelligenceFromRoom({
    hasTrack: Boolean(rawTrackLine),
    captionBody: room.caption?.body,
    summary: room.dossier.summary,
    facts: room.dossier.facts,
    imageUrl: room.plate,
    links: room.dossier.links,
    track: rawTrackLine,
    graph: room.dossier.graph,
  });
  // The written caption ("night desk") is left off the desk: it is model
  // prose and can name an hour or a place the record never gave, which would
  // contradict the clock above. The file keeps only looked-up facts and links.
  const hasFile =
    (room.phase === "filed" && intelligence.facts.length > 0) ||
    Boolean(intelligence.links?.length);
  const departures = deskDepartures(queue, queueIndex, nowPlaying, now);

  return (
    <main
      ref={deskRef}
      className="ew-desk"
      data-phase={room.phase}
      style={
        {
          "--desk-floor": `${deskBox.floor}px`,
          "--desk-h": deskBox.height ? `${deskBox.height}px` : undefined,
        } as CSSProperties
      }
    >
      <div className="ew-desk-inner" key={nowPlaying.uuid}>
        <DeskSky
          facts={facts}
          place={place}
          countryCode={nowPlaying.countryCode}
          offset={offset}
          playing={isPlaying}
          keeper={{ state: view.state, mood: view.mood }}
          murmur={murmur}
          onDismissMurmur={() => setMurmur(null)}
        >
          <SecretTrail stationId={nowPlaying.uuid} city={place} longitude={nowPlaying.longitude} />
        </DeskSky>

        <div className="ew-desk-body">
          <div className="ew-desk-col is-a">
            <DeskPass
              facts={facts}
              station={nowPlaying}
              place={place}
              hereClock={listenerClock(now)}
              offset={offset}
              minutes={minutes}
              stamped={stamped}
              stampCount={stamps.length}
            />
            <DeskOnAir onAir={onAir} facts={facts} plate={view.plate} playing={isPlaying} />
          </div>
          <div className="ew-desk-col is-b">
            <DeskAsk facts={facts} askEnabled={askEnabled} entries={entries} />
            <DeskPostcards
              place={place}
              entries={entries}
              reading={reading}
              askEnabled={askEnabled}
              date={postmarkDate(now)}
            />
          </div>
          <div className="ew-desk-col is-c">
            {hasFile ? (
              <section className="ew-desk-card ew-desk-file" aria-labelledby="ew-file-title">
                <header className="ew-desk-card-head">
                  <h2 id="ew-file-title" className="ew-desk-card-title">{VOICE.fileTitle}</h2>
                </header>
                <Eyebrow as="p" tone="dust" className="ew-desk-notebook">{VOICE.notebook}</Eyebrow>
                <DeskDossier
                  phase={room.phase}
                  caption={null}
                  facts={intelligence.facts}
                  links={intelligence.links}
                  hasTitle={Boolean(rawTrackLine)}
                  stationName={nowPlaying.name}
                  catalog={{}}
                  showWaiting={false}
                />
              </section>
            ) : null}
            <DeskDepartures rows={departures}>
              <TheaterSeek held />
            </DeskDepartures>
          </div>
        </div>
      </div>
    </main>
  );
}
