import { Link } from "@remix-run/react";
import { useEffect, useMemo, useRef } from "react";
import { useHydrated } from "~/hooks/useHydrated";
import { usePlayerStore } from "~/state/playerStore";
import { roomForStation, useRoomStore } from "~/state/roomStore";
import { BRAND } from "~/constants/brand";
import { stationLocation, stationTelemetry } from "~/components/radio-passport/StationRow";
import { stationTags } from "~/components/radio-passport/stationInsights";
import { TheaterField, TheaterWell } from "~/components/radio-passport/TheaterWell";
import {
  lockSeed,
  splitFieldTokens,
  theaterReleases,
  theaterTrackCopy,
} from "~/components/radio-passport/theaterLock";
import { formatLocalLabel, localDateAtLongitude } from "~/utils/localTime";
import {
  theaterIntelligenceFromRoom,
  theaterWithoutStation,
} from "~/components/radio-passport/productFlow";

/** Scroll depth that folds the sky all the way. */
const SKY_FOLD_TRAVEL = 260;
/** Below this much page left to read, the sky keeps its full height. */
const SKY_FOLD_MIN_ROOM = 420;

export const meta = () => [
  { title: `Theater · ${BRAND.name}` },
  {
    name: "description",
    content: "A quiet listening room for the station you are already inside.",
  },
];

export default function ListeningPage() {
  const hydrated = useHydrated();
  const storedNowPlaying = usePlayerStore((state) => state.nowPlaying);
  const storedIsPlaying = usePlayerStore((state) => state.isPlaying);
  const nowPlaying = hydrated ? storedNowPlaying : null;
  const isPlaying = hydrated ? storedIsPlaying : false;
  const storedRoom = useRoomStore((state) => state.room);
  const room = roomForStation(storedRoom, nowPlaying?.uuid);

  const city = nowPlaying ? stationLocation(nowPlaying) : "";
  const local =
    nowPlaying && typeof nowPlaying.longitude === "number"
      ? localDateAtLongitude(nowPlaying.longitude)
      : null;
  const rawTrackLine = room.signal.track
    ? [room.signal.track.artist, room.signal.track.title].filter(Boolean).join(" — ")
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
  const phase = room.phase;
  const factKey = intelligence.facts
    .map((fact) => `${fact.label}:${fact.value}`)
    .join("|");
  const graphKey = [
    ...intelligence.graph.nodes.map((node) => node.id),
    ...intelligence.graph.edges.map((edge) => `${edge.from}:${edge.to}`),
  ].join("|");
  const tagKey = nowPlaying ? stationTags(nowPlaying).join("|") : "";
  const releases = useMemo(
    () =>
      theaterReleases({
        city,
        country: nowPlaying?.country,
        longitude: nowPlaying?.longitude,
        bitrate: nowPlaying?.bitrate,
        codec: nowPlaying?.codec,
        languages: splitFieldTokens(nowPlaying?.language),
        tags: nowPlaying ? stationTags(nowPlaying) : [],
        artist: room.signal.track?.artist,
        title: room.signal.track?.title,
        dispatchBody: intelligence.dispatchBody,
        summary: intelligence.summary,
        facts: intelligence.facts,
        graph: intelligence.graph,
      }),
    [
      city,
      factKey,
      graphKey,
      intelligence.dispatchBody,
      intelligence.summary,
      nowPlaying?.bitrate,
      nowPlaying?.codec,
      nowPlaying?.country,
      nowPlaying?.language,
      nowPlaying?.longitude,
      room.signal.track?.artist,
      room.signal.track?.title,
      tagKey,
    ],
  );
  const seed = lockSeed([nowPlaying?.uuid, city]);

  // The sky gives ground as you read deeper — scroll folds it, never a jump.
  const theaterRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const node = theaterRef.current;
    if (!node) return;
    const sky = node.querySelector<HTMLElement>(".ew-theater-sky");
    if (!sky) return;
    let frame = 0;
    let skyFull = sky.getBoundingClientRect().height;

    const measure = () => {
      node.style.setProperty("--ew-sky-shrink", "0");
      skyFull = sky.getBoundingClientRect().height;
    };

    const apply = () => {
      frame = 0;
      const folded = skyFull - sky.getBoundingClientRect().height;
      const room =
        document.documentElement.scrollHeight - window.innerHeight + folded;
      // A shallow folio has nothing to reveal, and folding it there would only
      // shorten the page under the scroll it was answering.
      const shrink =
        room < SKY_FOLD_MIN_ROOM
          ? 0
          : Math.min(1, Math.max(0, window.scrollY / SKY_FOLD_TRAVEL));
      node.style.setProperty("--ew-sky-shrink", shrink.toFixed(3));
    };

    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(apply);
    };
    const onResize = () => {
      measure();
      apply();
    };

    measure();
    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  if (!nowPlaying) {
    const empty = theaterWithoutStation();
    return (
      <main className="ew-theater flex min-h-screen flex-col items-start justify-center">
        <p className="rp-eyebrow text-foil ew-arrive">{BRAND.eyebrow}</p>
        <h1 className="ew-coverline mt-4 ew-arrive ew-arrive-2">
          The room is empty.
        </h1>
        <p className="rp-lede mt-4 ew-arrive ew-arrive-3">{empty.message}</p>
        <Link
          to={empty.route}
          className="ew-land mt-8 ew-arrive ew-arrive-4"
          prefetch="intent"
        >
          <span className="ew-land-kicker">EW · Departure</span>
          <span className="ew-land-city">{empty.label}</span>
        </Link>
      </main>
    );
  }

  return (
    <main className="ew-theater" data-phase={phase} ref={theaterRef}>
      <Link
        to="/"
        className="ew-theater-back rp-eyebrow text-foil"
        prefetch="intent"
      >
        ← {BRAND.name}
      </Link>
      <div className="ew-theater-room" key={nowPlaying.uuid}>
        <aside className="ew-theater-sky">
          <TheaterField
            seed={seed}
            phase={phase}
            releases={releases}
            longitude={nowPlaying.longitude}
            graph={intelligence.graph}
          />
        </aside>
        <div className="ew-theater-folio">
          <p className="rp-eyebrow text-ether ew-arrive">
            <i className="rp-live-dot" />
            {local ? formatLocalLabel(city, local) : "LIVE"} ·{" "}
            {stationTelemetry(nowPlaying)}
          </p>
          <h1 className="ew-coverline mt-3 ew-arrive ew-arrive-2">{city}</h1>
          <p className="rp-lede mt-2 ew-arrive ew-arrive-3">
            {nowPlaying.name} · {nowPlaying.country}
            {nowPlaying.language ? ` · ${nowPlaying.language}` : ""}
          </p>
          {trackLine && phase !== "filed" ? (
            <p className="ew-track ew-arrive ew-arrive-4" key={trackLine}>
              {trackLine}
            </p>
          ) : null}
          <TheaterWell
            phase={phase}
            dispatchBody={intelligence.dispatchBody}
            summary={intelligence.summary}
            facts={intelligence.facts}
            imageUrl={intelligence.imageUrl}
            links={intelligence.links}
            track={rawTrackLine}
          />
        </div>
      </div>
    </main>
  );
}
