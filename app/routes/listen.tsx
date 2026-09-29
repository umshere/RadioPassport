import { useRef, useState } from "react";
import { useHydrated } from "~/hooks/useHydrated";
import { usePlayerStore } from "~/state/playerStore";
import { roomForStation, useRoomStore } from "~/state/roomStore";
import { BRAND } from "~/constants/brand";
import { stationLocation, stationTelemetry } from "~/components/radio-passport/StationRow";
import { BoardSheet, type BoardSheetState } from "~/components/radio-passport/BoardSheet";
import { DeskDossier } from "~/components/radio-passport/DeskDossier";
import UpNextRow from "~/components/radio-passport/UpNextRow";
import { LAST_TRACK_FRESH_MS, theaterTrackCopy } from "~/components/radio-passport/theaterLock";
import { TheaterQueue } from "~/components/radio-passport/TheaterQueue";
import { SecretTrail } from "~/components/radio-passport/SecretTrail";
import { TheaterSeek } from "~/components/radio-passport/TheaterSeek";
import { formatClock, formatLocalLabel, localDateAtLongitude } from "~/utils/localTime";
import {
  theaterIntelligenceFromRoom,
  theaterRoomGate,
  theaterWithoutStation,
} from "~/components/radio-passport/productFlow";
import { cleanField } from "~/services/keeper/cleanTitle";
import { Eyebrow } from "~/components/ui/Eyebrow";
import { ButtonLink } from "~/components/ui/Button";
import type { NowPlayingTrack } from "~/types/nowPlaying";
import {
  preferSecureArtworkUrl,
  sanitizeArtworkUrl,
  markArtworkUrlFailed,
} from "~/utils/stations";

export const meta = () => [
  { title: `Theater · ${BRAND.name}` },
  {
    name: "description",
    content: "A quiet listening room for the station you are already inside.",
  },
  { property: "og:title", content: `Theater · ${BRAND.name}` },
  {
    property: "og:description",
    content: "A quiet listening room for the station you are already inside.",
  },
  { property: "og:url", content: "https://elsewheremusic.com/listen" },
];

/**
 * The desk: the big-screen view of the station you are inside. The artwork,
 * the place and the hour on top; the dossier in a drop-up sheet beneath (the
 * same sheet as the station list). The keeper, floating above, is the guide.
 */
export default function ListeningPage() {
  const hydrated = useHydrated();
  const storedNowPlaying = usePlayerStore((state) => state.nowPlaying);
  const storedIsPlaying = usePlayerStore((state) => state.isPlaying);
  const nowPlaying = hydrated ? storedNowPlaying : null;
  const isPlaying = hydrated ? storedIsPlaying : false;
  const storedRoom = useRoomStore((state) => state.room);
  const room = roomForStation(storedRoom, nowPlaying?.uuid);
  const lastTrackStationRef = useRef<string | null>(null);
  const lastTrackRef = useRef<NowPlayingTrack | null>(null);
  const [sheet, setSheet] = useState<BoardSheetState>("peek");
  const [plateFailed, setPlateFailed] = useState<string | null>(null);

  const city = nowPlaying ? stationLocation(nowPlaying) : "";
  const local =
    nowPlaying && typeof nowPlaying.longitude === "number"
      ? localDateAtLongitude(nowPlaying.longitude)
      : null;
  // Pause freezes the desk: the hook reports track:null the instant playback
  // stops, which would blank the title and reflow the page on resume. The last
  // aired title stays on display, seeded from storage so a fresh mount opens
  // on the same frame.
  const liveTrack = room.signal.track;
  const lastTrackByStation = usePlayerStore((state) => state.lastTrackByStation);
  if (!nowPlaying || lastTrackStationRef.current !== nowPlaying.uuid) {
    lastTrackStationRef.current = nowPlaying?.uuid ?? null;
    const saved = nowPlaying ? lastTrackByStation[nowPlaying.uuid] : undefined;
    lastTrackRef.current =
      saved && Date.now() - saved.at < LAST_TRACK_FRESH_MS ? saved.track : null;
  }
  if (liveTrack) lastTrackRef.current = liveTrack;
  const displayTrack = liveTrack ?? lastTrackRef.current;
  // Streams append their own site names and tags; show the cleaned pair.
  const rawTrackLine = displayTrack
    ? [cleanField(displayTrack.artist), cleanField(displayTrack.title)]
        .filter(Boolean)
        .join(" — ") || null
    : null;
  const trackLine = theaterTrackCopy({
    isPlaying,
    metadataStatus: room.signal.status,
    trackLine: rawTrackLine,
  });
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

  const roomGate = theaterRoomGate(hydrated, nowPlaying);
  if (roomGate === "wait") {
    return <main className="ew-desk" aria-busy="true" />;
  }
  if (roomGate === "empty" || !nowPlaying) {
    const empty = theaterWithoutStation();
    return (
      <main className="ew-desk ew-desk-empty">
        <Eyebrow tone="foil" className="ew-arrive">{BRAND.eyebrow}</Eyebrow>
        <h1 className="ew-coverline mt-4 ew-arrive ew-arrive-2">{empty.headline}</h1>
        <p className="rp-lede mt-4 ew-arrive ew-arrive-3">{empty.message}</p>
        <ButtonLink
          to={empty.route}
          variant="land"
          kicker={empty.kicker}
          className="mt-8 ew-arrive ew-arrive-4"
          prefetch="intent"
          viewTransition
        >
          {empty.label}
        </ButtonLink>
      </main>
    );
  }

  const plate =
    sanitizeArtworkUrl(intelligence.imageUrl) ??
    sanitizeArtworkUrl(preferSecureArtworkUrl(nowPlaying.favicon ?? null));
  const showPlate = Boolean(plate && plateFailed !== plate);
  const caption = intelligence.dispatchBody || intelligence.summary || null;

  return (
    <main className="ew-desk" data-phase={room.phase}>
      <div className="ew-desk-top" key={nowPlaying.uuid}>
        <figure className="ew-desk-plate" data-empty={showPlate ? undefined : ""}>
          {showPlate ? (
            <img
              src={plate!}
              alt=""
              onError={() => {
                markArtworkUrlFailed(plate!);
                setPlateFailed(plate);
              }}
            />
          ) : (
            <span className="ew-desk-seal" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.1">
                <circle cx="12" cy="12" r="8.5" />
                <circle cx="12" cy="12" r="2.6" fill="var(--ew-lacquer)" stroke="none" />
              </svg>
            </span>
          )}
        </figure>
        <div className="ew-desk-folio">
          <Eyebrow tone="ether" className="ew-arrive">
            <i className="rp-live-dot" />
            {local ? formatLocalLabel(city, local) : "LIVE"} · {stationTelemetry(nowPlaying)}
          </Eyebrow>
          <h1 className="ew-coverline ew-arrive ew-arrive-2">{city}</h1>
          <Eyebrow tone="dust" className="ew-desk-telemetry">
            {nowPlaying.name} · {isPlaying ? "Live" : "Paused"}
            {local ? ` · ${formatClock(local)} local` : ""}
          </Eyebrow>
          <SecretTrail stationId={nowPlaying.uuid} city={city} longitude={nowPlaying.longitude} />
          <p className="rp-lede ew-desk-lede">
            {nowPlaying.country}
            {nowPlaying.language ? ` · ${nowPlaying.language}` : ""}
          </p>
          {trackLine ? <p className="ew-track ew-arrive ew-arrive-4">{trackLine}</p> : null}
          <div className="ew-desk-seek">
            <TheaterSeek />
          </div>
          <UpNextRow />
        </div>
      </div>
      <BoardSheet state={sheet} onStateChange={setSheet} docked>
        <div className="rp-intro-board ew-desk-sheet">
          <div className="ew-desk-sheet-head" id="live-board">
            <Eyebrow tone="foil">The desk</Eyebrow>
            <Eyebrow tone="dust">{isPlaying ? "Live now" : "Paused"}</Eyebrow>
          </div>
          <DeskDossier
            phase={room.phase}
            caption={caption}
            deskSigned={room.captionSource === "ai"}
            facts={intelligence.facts}
            links={intelligence.links}
            hasTitle={Boolean(rawTrackLine)}
            stationName={nowPlaying.name}
            catalog={{
              land: nowPlaying.country,
              city,
              spoken: nowPlaying.language,
            }}
          />
          <TheaterQueue />
        </div>
      </BoardSheet>
    </main>
  );
}
