import { Link } from "@remix-run/react";
import { useMemo } from "react";
import { sourceKeyForNowPlaying } from "~/hooks/useNowPlayingMetadata";
import { useTrackTrivia } from "~/hooks/useTrackTrivia";
import { useHydrated } from "~/hooks/useHydrated";
import { usePlayerStore } from "~/state/playerStore";
import { useDispatchStore } from "~/state/dispatchStore";
import {
  IDLE_NOW_PLAYING_METADATA,
  useNowPlayingMetadataStore,
} from "~/state/nowPlayingMetadataStore";
import { BRAND } from "~/constants/brand";
import { stationLocation, stationTelemetry } from "~/components/radio-passport/StationRow";
import { stationTags } from "~/components/radio-passport/stationInsights";
import { TheaterField, TheaterWell } from "~/components/radio-passport/TheaterWell";
import {
  lockSeed,
  splitFieldTokens,
  theaterPhase,
  theaterReleases,
  theaterTrackCopy,
} from "~/components/radio-passport/theaterLock";
import { formatLocalLabel, localDateAtLongitude } from "~/utils/localTime";
import {
  theaterIntelligence,
  theaterWithoutStation,
} from "~/components/radio-passport/productFlow";

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
  const storedQueue = usePlayerStore((state) => state.queue);
  const storedIndex = usePlayerStore((state) => state.currentStationIndex);
  const togglePlay = usePlayerStore((state) => state.togglePlay);
  const startStation = usePlayerStore((state) => state.startStation);
  const nowPlaying = hydrated ? storedNowPlaying : null;
  const isPlaying = hydrated ? storedIsPlaying : false;
  const queue = hydrated ? storedQueue : [];
  const index = hydrated ? storedIndex : 0;
  const sharedMetadata = useNowPlayingMetadataStore((state) => state.state);
  const sourceKey = sourceKeyForNowPlaying(nowPlaying);
  const metadata =
    sourceKey && sharedMetadata.sourceKey === sourceKey
      ? sharedMetadata
      : IDLE_NOW_PLAYING_METADATA;
  const trivia = useTrackTrivia({
    track: metadata.track,
    source: "ai",
    enabled: Boolean(metadata.track),
  });
  const dispatch = useDispatchStore((state) => state.dispatch);

  const city = nowPlaying ? stationLocation(nowPlaying) : "";
  const local =
    nowPlaying && typeof nowPlaying.longitude === "number"
      ? localDateAtLongitude(nowPlaying.longitude)
      : null;
  const rawTrackLine = metadata.track
    ? [metadata.track.artist, metadata.track.title].filter(Boolean).join(" — ")
    : null;
  const trackLine = theaterTrackCopy({
    isPlaying,
    metadataStatus: metadata.status,
    trackLine: rawTrackLine,
  });
  const intelligence = theaterIntelligence({
    hasTrack: Boolean(rawTrackLine),
    dispatchBody: dispatch?.body,
    summary: trivia.trivia?.summary,
    facts: trivia.trivia?.facts,
  });
  const phase = theaterPhase({
    isPlaying,
    hasTrack: Boolean(rawTrackLine),
    metadataStatus: metadata.status,
    triviaStatus: trivia.status,
  });
  const factKey = intelligence.facts
    .map((fact) => `${fact.label}:${fact.value}`)
    .join("|");
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
        artist: metadata.track?.artist,
        title: metadata.track?.title,
        dispatchBody: intelligence.dispatchBody,
        summary: intelligence.summary,
        facts: intelligence.facts,
      }),
    [
      city,
      factKey,
      intelligence.dispatchBody,
      intelligence.summary,
      metadata.track?.artist,
      metadata.track?.title,
      nowPlaying?.bitrate,
      nowPlaying?.codec,
      nowPlaying?.country,
      nowPlaying?.language,
      nowPlaying?.longitude,
      tagKey,
    ],
  );
  const seed = lockSeed([nowPlaying?.uuid, city]);
  const neighbors = useMemo(() => {
    if (!nowPlaying || queue.length < 2) return { prev: null, next: null };
    return {
      prev: queue[(index - 1 + queue.length) % queue.length] ?? null,
      next: queue[(index + 1) % queue.length] ?? null,
    };
  }, [index, nowPlaying, queue]);

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
          {empty.label}
        </Link>
      </main>
    );
  }

  return (
    <main className="ew-theater" data-phase={phase}>
      <TheaterField
        seed={seed}
        phase={phase}
        releases={releases}
        longitude={nowPlaying.longitude}
      />
      <Link
        to="/"
        className="ew-theater-back rp-eyebrow text-foil"
        prefetch="intent"
      >
        ← {BRAND.name}
      </Link>
      <div className="ew-theater-stage" key={nowPlaying.uuid}>
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
        <p className="ew-track ew-arrive ew-arrive-4" key={trackLine ?? "quiet"}>
          {trackLine}
        </p>
        <TheaterWell
          phase={phase}
          dispatchBody={intelligence.dispatchBody}
          summary={intelligence.summary}
          facts={intelligence.facts}
        />
        <div className="ew-theater-controls">
          <button
            type="button"
            className="rp-dock-control"
            onClick={() =>
              neighbors.prev &&
              startStation(neighbors.prev, {
                preserveQueue: true,
                autoPlay: true,
              })
            }
            disabled={!neighbors.prev}
            aria-label="Previous station"
          >
            ‹
          </button>
          <button
            type="button"
            className="rp-dock-play"
            onClick={togglePlay}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? "Ⅱ" : "▶"}
          </button>
          <button
            type="button"
            className="rp-dock-control"
            onClick={() =>
              neighbors.next &&
              startStation(neighbors.next, {
                preserveQueue: true,
                autoPlay: true,
              })
            }
            disabled={!neighbors.next}
            aria-label="Next station"
          >
            ›
          </button>
        </div>
      </div>
    </main>
  );
}
