import { useEffect, useRef, useState, type CSSProperties } from "react";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { allStationShelfLabels } from "~/services/catalog/stationLabels.server";
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
import { findSimilar } from "~/components/keeper/keeperSimilarClient";
import type { Similar } from "~/components/keeper/keeperSimilar";
import { tidyStationName } from "~/components/keeper/keeperFacts";
import { VOICE } from "~/components/keeper/keeperVoice";
import { DeskPlace } from "~/components/desk/DeskPlace";
import { DeskOnAir } from "~/components/desk/DeskOnAir";
import { DeskPlays } from "~/components/desk/DeskPlays";
import { DeskAsk } from "~/components/desk/DeskAsk";
import { DeskNote } from "~/components/desk/DeskNote";
import { DeskShelf } from "~/components/desk/DeskShelf";
import { DESK_ANCHORS } from "~/components/desk/deskKeeper";
import { useDeskKeeper } from "~/components/desk/useDeskKeeper";
import { deskDepartures, deskOnAir, deskShelf, postmarkDate } from "~/components/desk/deskModel";
import type { NowPlayingTrack } from "~/types/nowPlaying";
import { useFloorClearance, useMinuteClock } from "~/components/desk/deskHooks";

export const meta = () => [
  { name: "robots", content: "noindex, follow" },
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

/**
 * The shelf labels (worked out offline by Jev, see stationLabels.server.ts)
 * for every labelled station: plain words only, so the labels file with its
 * confidences stays on the server. The desk picks the one on air.
 */
export const loader = () =>
  json(
    { shelfLabels: allStationShelfLabels() },
    { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" } },
  );

/**
 * The desk: the keeper's own page for the station you are inside. A compact
 * place card ("You are not here": the hour there, what is spoken, the
 * signal, the stamp), what is on air, what the station plays, the Ask card,
 * one note from his notebook at a time, the station's file, and the next
 * stations on this shelf. On wider screens the roaming keeper hosts it,
 * walking between the cards; phones get one column and the edge float.
 * Every field comes from the record or the stream; what is missing is said,
 * never filled in.
 */
export default function DeskPage() {
  const { shelfLabels } = useLoaderData<typeof loader>();
  const hydrated = useHydrated();
  const storedNowPlaying = usePlayerStore((state) => state.nowPlaying);
  const storedIsPlaying = usePlayerStore((state) => state.isPlaying);
  const nowPlaying = hydrated ? storedNowPlaying : null;
  const isPlaying = hydrated ? storedIsPlaying : false;
  const queue = usePlayerStore((state) => state.queue);
  const queueIndex = usePlayerStore((state) => state.currentStationIndex);
  const lastTrackByStation = usePlayerStore((state) => state.lastTrackByStation);
  const startStation = usePlayerStore((state) => state.startStation);
  const storedRoom = useRoomStore((state) => state.room);
  const room = roomForStation(storedRoom, nowPlaying?.uuid);
  const view = useKeeperView();
  const askEnabled = useKeeperAskEnabled();
  const factLog = useKeeperStore((state) => state.factLog);
  const reading = useKeeperStore((state) => state.reading);
  const goTo = useKeeperStore((state) => state.goTo);
  const stamps = useJourneyStore((state) => state.stamps);
  const now = useMinuteClock();
  const deskRef = useRef<HTMLElement>(null);
  const deskBox = useFloorClearance(deskRef, Boolean(nowPlaying));
  const lastTrackStationRef = useRef<string | null>(null);
  const lastTrackRef = useRef<NowPlayingTrack | null>(null);
  const [similar, setSimilar] = useState<{ station: string; found: Similar | null } | null>(null);
  const [pointed, setPointed] = useState(false);

  useEffect(() => {
    logUsage("desk_view");
  }, []);

  // The desk reads up on the place as soon as you sit down, so the note is
  // never a dead end (the same shared, cached reads as the sheet).
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

  // Somewhere like this: stations that share something real with this one,
  // for the head of the shelf. Never on the audio path.
  useEffect(() => {
    if (!nowPlaying) return;
    let live = true;
    const station = nowPlaying.uuid;
    void findSimilar(nowPlaying, usePlayerStore.getState().queue).then((found) => {
      if (live) setSimilar({ station, found });
    });
    return () => {
      live = false;
    };
    // The thread is about the station on air.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stationId]);

  useEffect(() => {
    if (!pointed) return;
    const timer = window.setTimeout(() => setPointed(false), 2400);
    return () => window.clearTimeout(timer);
  }, [pointed]);

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

  const facts = nowPlaying ? view.facts : null;
  const place = facts ? facts.city || facts.station.country || facts.station.name : "";
  const entries = nowPlaying && factLog.stationId === nowPlaying.uuid ? factLog.entries : [];
  const stampId = nowPlaying
    ? stationStampId(nowPlaying.uuid, stationLocation(nowPlaying), nowPlaying.country)
    : null;
  const stamped = stamps.some((stamp) => stamp.id === stampId);
  const departures = nowPlaying ? deskDepartures(queue, queueIndex, nowPlaying, now) : [];
  const picks = similar && similar.station === nowPlaying?.uuid ? similar.found : null;
  const shelf = nowPlaying ? deskShelf(nowPlaying, picks?.stations ?? [], departures, now) : [];

  useDeskKeeper(
    nowPlaying && facts
      ? {
          stationId: nowPlaying.uuid,
          place,
          clock: facts.hour?.clock ?? null,
          stationName: tidyStationName(nowPlaying.name),
          stamped,
          playing: isPlaying,
          hasNote: entries.length > 0,
          hasShelf: shelf.length > 0,
        }
      : null,
  );

  const roomGate = theaterRoomGate(hydrated, nowPlaying);
  if (roomGate === "wait") {
    return <main className="ew-desk" aria-busy="true" />;
  }
  if (roomGate === "empty" || !nowPlaying || !facts) {
    const empty = theaterWithoutStation();
    return (
      <main className="ew-desk is-empty">
        <div className="ew-desk-inner">
          <section className="ew-desk-card ew-place is-empty" data-hour="night" aria-labelledby="ew-desk-place">
            <div className="ew-place-head">
              <Eyebrow as="span" tone="foil">{VOICE.deskTitle}</Eyebrow>
            </div>
            <div className="ew-place-where">
              <h1 id="ew-desk-place" className="ew-place-name is-quiet">{VOICE.deskEmptyTitle}</h1>
              <p className="ew-place-note">{VOICE.deskEmptyLine}</p>
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
            <Keeper state="sleeping" mood="drowsy" size="desk" className="ew-place-keeper" />
          </section>
        </div>
      </main>
    );
  }

  const offsetHours = hourOffsetFromListener(facts, now.getHours());
  const offset = VOICE.offset(offsetHours);
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

  const pick = picks?.stations[0] ?? null;
  const onSomewhereLike = pick
    ? () => {
        setPointed(true);
        const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
        document
          .getElementById("ew-desk-shelf")
          ?.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
        const name = tidyStationName(pick.name);
        goTo(DESK_ANCHORS.next, {
          pose: "travel",
          line: VOICE.similarAnswer(picks!.label),
          sub: VOICE.deskRoam.similarSub(name, stationLocation(pick)),
          actions: [
            {
              label: VOICE.similarHop(name),
              onSelect: () => startStation(pick, { preserveQueue: true, autoPlay: true }),
            },
            {
              label: VOICE.similarStay,
              onSelect: () => goTo(DESK_ANCHORS.onair, { pose: "listening", line: VOICE.deskRoam.stay }),
            },
          ],
        });
      }
    : undefined;

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
        <div className="ew-desk-top">
          <DeskPlace
            facts={facts}
            station={nowPlaying}
            place={place}
            offset={offset}
            playing={isPlaying}
            stamped={stamped}
            stampCount={stamps.length}
          >
            <SecretTrail stationId={nowPlaying.uuid} city={place} longitude={nowPlaying.longitude} />
          </DeskPlace>
          <div className="ew-desk-mid">
            <DeskOnAir onAir={onAir} facts={facts} plate={view.plate} playing={isPlaying} />
            <DeskPlays labels={shelfLabels[nowPlaying.uuid] ?? null} tags={facts.station.tags} />
          </div>
          <DeskAsk facts={facts} askEnabled={askEnabled} entries={entries} onSomewhereLike={onSomewhereLike} />
        </div>

        <div className="ew-desk-more">
          <DeskNote
            place={place}
            entries={entries}
            reading={reading}
            askEnabled={askEnabled}
            date={postmarkDate(now)}
          />
          <DeskShelf cards={shelf} label={picks?.label ?? null} pointed={pointed}>
            <TheaterSeek held />
          </DeskShelf>
        </div>

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
      </div>
    </main>
  );
}
