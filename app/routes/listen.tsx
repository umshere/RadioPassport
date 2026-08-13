import { Link } from "@remix-run/react";
import { useMemo } from "react";
import { useNowPlayingMetadata } from "~/hooks/useNowPlayingMetadata";
import { useTrackTrivia } from "~/hooks/useTrackTrivia";
import { useHydrated } from "~/hooks/useHydrated";
import { usePlayerStore } from "~/state/playerStore";
import { useDispatchStore } from "~/state/dispatchStore";
import { BRAND } from "~/constants/brand";
import { stationLocation, stationTelemetry } from "~/components/radio-passport/StationRow";
import { formatLocalLabel, localDateAtLongitude } from "~/utils/localTime";
import { theaterWithoutStation } from "~/components/radio-passport/productFlow";

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
  const metadata = useNowPlayingMetadata(nowPlaying, isPlaying);
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
  const trackLine = metadata.track
    ? [metadata.track.artist, metadata.track.title].filter(Boolean).join(" — ")
    : null;
  const fact = trivia.trivia?.facts?.[0] ?? null;
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
        <p className="rp-eyebrow text-foil">{BRAND.eyebrow}</p>
        <h1 className="ew-coverline mt-4">The room is empty.</h1>
        <p className="rp-lede mt-4">{empty.message}</p>
        <Link to={empty.route} className="ew-land mt-8" prefetch="intent">
          {empty.label}
        </Link>
      </main>
    );
  }

  return (
    <main className="ew-theater">
      <div className="mx-auto flex min-h-[calc(100svh-8rem)] max-w-4xl flex-col justify-end">
        <Link
          to="/"
          className="rp-eyebrow inline-flex min-h-11 items-center text-foil"
          prefetch="intent"
        >
          ← {BRAND.name}
        </Link>
        <p className="rp-eyebrow mt-10 text-ether">
          <i className="rp-live-dot" />
          {local ? formatLocalLabel(city, local) : "LIVE"} ·{" "}
          {stationTelemetry(nowPlaying)}
        </p>
        <h1 className="ew-coverline mt-3">{city}</h1>
        <p className="rp-lede mt-2">
          {nowPlaying.name} · {nowPlaying.country}
          {nowPlaying.language ? ` · ${nowPlaying.language}` : ""}
        </p>
        <p className="ew-track mt-6">
          {trackLine || "This station sends no track titles."}
        </p>
        {dispatch?.body ? <p className="ew-caption">{dispatch.body}</p> : null}
        {fact ? (
          <p className="mt-6 max-w-xl text-sm text-dust">
            <span className="rp-eyebrow mr-2 text-foil">{fact.label}</span>
            {fact.value}
          </p>
        ) : trivia.trivia?.summary ? (
          <p className="ew-caption">{trivia.trivia.summary}</p>
        ) : null}
        <div className="ew-theater-controls mt-10 flex flex-wrap items-center gap-4">
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
