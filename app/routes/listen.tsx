import { Link, useNavigate } from "@remix-run/react";
import { useEffect, useMemo, useState } from "react";
import { Text } from "@mantine/core";
import {
  IconArrowLeft,
  IconLink,
  IconMoonStars,
  IconPlayerPauseFilled,
  IconPlayerPlayFilled,
  IconPlayerSkipBackFilled,
  IconPlayerSkipForwardFilled,
  IconSparkles,
} from "@tabler/icons-react";
import { StationArtwork } from "~/components/StationArtwork";
import { PretextMeasuredText } from "~/components/PretextMeasuredText";
import { useNowPlayingMetadata } from "~/hooks/useNowPlayingMetadata";
import { useTrackTrivia } from "~/hooks/useTrackTrivia";
import { usePlayerStore } from "~/state/playerStore";

const LISTEN_TITLE_FONT =
  '600 58px "General Sans", "SF Pro Display", "Segoe UI", "Helvetica Neue", Arial, sans-serif';
const LISTEN_BODY_FONT =
  '600 16px "General Sans", "SF Pro Text", "Segoe UI", "Helvetica Neue", Arial, sans-serif';
const LISTEN_CARD_FONT =
  '600 14px "General Sans", "SF Pro Text", "Segoe UI", "Helvetica Neue", Arial, sans-serif';
const LISTEN_STACK_FONT =
  '600 18px "General Sans", "SF Pro Text", "Segoe UI", "Helvetica Neue", Arial, sans-serif';

function deriveFrequency(uuid: string) {
  let hash = 0;
  for (let i = 0; i < uuid.length; i++) {
    hash = uuid.charCodeAt(i) + ((hash << 5) - hash);
  }
  const range = 108.0 - 88.0;
  const normalized = Math.abs(hash % 1000) / 1000;
  return (88.0 + normalized * range).toFixed(1);
}

export default function ListeningPage() {
  const navigate = useNavigate();
  const nowPlaying = usePlayerStore((state) => state.nowPlaying);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const queue = usePlayerStore((state) => state.queue);
  const queueSourceLabel = usePlayerStore((state) => state.queueSourceLabel);
  const currentStationIndex = usePlayerStore((state) => state.currentStationIndex);
  const togglePlay = usePlayerStore((state) => state.togglePlay);
  const startStation = usePlayerStore((state) => state.startStation);
  const [insightsEnabled, setInsightsEnabled] = useState(false);

  const nowPlayingMeta = useNowPlayingMetadata(nowPlaying, isPlaying);
  const freeTrivia = useTrackTrivia({
    track: nowPlayingMeta.track,
    source: "free",
    enabled: Boolean(insightsEnabled && nowPlayingMeta.track),
  });
  const aiTrivia = useTrackTrivia({
    track: nowPlayingMeta.track,
    source: "ai",
    enabled: Boolean(insightsEnabled && nowPlayingMeta.track),
    context: {
      summary: freeTrivia.trivia?.summary ?? null,
      facts: freeTrivia.trivia?.facts ?? [],
    },
  });

  useEffect(() => {
    // Keep the page metadata-first unless the user explicitly re-enables AI.
    setInsightsEnabled(false);
  }, [nowPlaying?.uuid, nowPlayingMeta.track?.artist, nowPlayingMeta.track?.title]);

  if (!nowPlaying) {
    return (
      <main className="min-h-screen bg-[#0b0d12] text-[var(--rp-text)]">
        <div className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center gap-6 px-6 text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[var(--rp-gold)]">
            <IconMoonStars size={28} />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold text-white">Listening page is waiting for a station</h1>
            <p className="max-w-xl text-sm text-white/65">
              Start a station from the atlas, search results, or a country page, then return here for the uncluttered listening board.
            </p>
          </div>
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full border border-[rgba(245,177,45,0.4)] bg-[rgba(245,177,45,0.12)] px-5 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--rp-gold)]"
          >
            <IconArrowLeft size={14} />
            Back to Atlas
          </Link>
        </div>
      </main>
    );
  }

  const trackLine = nowPlayingMeta.track
    ? [nowPlayingMeta.track.artist, nowPlayingMeta.track.title].filter(Boolean).join(" — ")
    : "Listening live";

  const metadataSummary = [
    nowPlayingMeta.track ? `${trackLine}.` : null,
    nowPlaying.country ? `Broadcasting from ${nowPlaying.country}.` : null,
    nowPlaying.state ? `Regional cue: ${nowPlaying.state}.` : null,
    nowPlaying.language ? `Language: ${nowPlaying.language}.` : null,
    nowPlaying.bitrate ? `Signal strength ${nowPlaying.bitrate} kbps.` : null,
  ]
    .filter(Boolean)
    .join(" ");

  const summary = insightsEnabled
    ? aiTrivia.trivia?.summary ?? freeTrivia.trivia?.summary ?? metadataSummary
    : metadataSummary;

  const factItems = insightsEnabled
    ? [
        ...(aiTrivia.trivia?.facts ?? []),
        ...(freeTrivia.trivia?.facts ?? []),
      ].slice(0, 4)
    : [
        nowPlaying.country ? { label: "Country", value: nowPlaying.country } : null,
        nowPlaying.state ? { label: "Region", value: nowPlaying.state } : null,
        nowPlaying.language ? { label: "Language", value: nowPlaying.language } : null,
        nowPlaying.bitrate ? { label: "Signal", value: `${nowPlaying.bitrate} kbps` } : null,
        nowPlaying.codec ? { label: "Codec", value: nowPlaying.codec.toUpperCase() } : null,
      ].filter(Boolean);

  const links = insightsEnabled
    ? [...(aiTrivia.trivia?.links ?? []), ...(freeTrivia.trivia?.links ?? [])].slice(0, 3)
    : [];

  const previousStation = queue.length > 1 ? queue[(currentStationIndex - 1 + queue.length) % queue.length] : null;
  const nextStation = queue.length > 1 ? queue[(currentStationIndex + 1) % queue.length] : null;
  const stackStations = queue
    .filter((station) => station.uuid !== nowPlaying.uuid)
    .slice(0, 4);

  return (
    <main className="min-h-screen overflow-hidden bg-[#07090d] text-[var(--rp-text)]">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(180deg, rgba(6,8,12,0.36) 0%, rgba(6,8,12,0.82) 72%, rgba(6,8,12,0.96) 100%), url('/listening-zen-hero.svg')",
          backgroundPosition: "center",
          backgroundSize: "cover",
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(245,177,45,0.18),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(245,177,45,0.12),transparent_24%)]" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-white/80 backdrop-blur"
          >
            <IconArrowLeft size={14} />
            Back
          </button>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setInsightsEnabled((value) => !value)}
              className={`inline-flex h-10 items-center gap-2 rounded-full border px-4 text-xs font-semibold uppercase tracking-[0.2em] ${
                insightsEnabled
                  ? "border-[rgba(245,177,45,0.42)] bg-[rgba(245,177,45,0.12)] text-[var(--rp-gold)]"
                  : "border-white/10 bg-black/30 text-white/75"
              }`}
            >
              <IconSparkles size={14} />
              {insightsEnabled ? "AI Insights On" : "Metadata Only"}
            </button>
            <div className="text-right">
              <div className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/45">Active Queue</div>
              <div className="text-sm font-semibold text-[var(--rp-gold)]">{queueSourceLabel}</div>
            </div>
          </div>
        </header>

        <section className="grid flex-1 gap-8 py-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-8">
          <div className="flex h-full flex-col justify-center">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[rgba(245,177,45,0.28)] bg-[rgba(245,177,45,0.1)] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--rp-gold)]">
              <IconMoonStars size={14} />
              Listening Board
            </div>

            <div className="mt-6 max-w-3xl space-y-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/45">
                {queueSourceLabel}
              </div>
              <PretextMeasuredText
                text={nowPlaying.name}
                font={LISTEN_TITLE_FONT}
                lineHeight={72}
                collapsedLines={2}
                lineClassName="text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl"
                fallbackClassName="text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl"
              />
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-white/55">
                {[nowPlaying.country, nowPlaying.state].filter(Boolean).join(" • ")}
              </p>
              <PretextMeasuredText
                text={summary || "Station metadata will settle here."}
                font={LISTEN_BODY_FONT}
                lineHeight={28}
                collapsedLines={4}
                expandable={insightsEnabled}
                moreLabel="Expand note"
                lessLabel="Collapse note"
                lineClassName="text-base font-medium leading-8 text-white/78"
                fallbackClassName="text-base font-medium leading-8 text-white/78"
              />
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => previousStation && startStation(previousStation, { preserveQueue: true, autoPlay: true })}
                disabled={!previousStation}
                className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-black/35 text-white disabled:opacity-40"
                aria-label="Previous station"
              >
                <IconPlayerSkipBackFilled size={20} />
              </button>
              <button
                type="button"
                onClick={togglePlay}
                className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-[linear-gradient(135deg,#f6c86f,#f1aa45)] text-black shadow-[0_16px_40px_rgba(245,177,45,0.32)]"
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? <IconPlayerPauseFilled size={28} /> : <IconPlayerPlayFilled size={28} className="ml-0.5" />}
              </button>
              <button
                type="button"
                onClick={() => nextStation && startStation(nextStation, { preserveQueue: true, autoPlay: true })}
                disabled={!nextStation}
                className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-black/35 text-white disabled:opacity-40"
                aria-label="Next station"
              >
                <IconPlayerSkipForwardFilled size={20} />
              </button>
              <div className="ml-2 rounded-full border border-white/10 bg-black/25 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/65">
                {deriveFrequency(nowPlaying.uuid)} MHz
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {factItems.map((fact) => (
                <div
                  key={`${fact.label}-${fact.value}`}
                  className="rounded-full border border-white/10 bg-black/30 px-3 py-2 text-xs text-white/82 backdrop-blur"
                >
                  <span className="font-semibold text-white">{fact.label}</span>
                  <span className="text-white/40"> • </span>
                  <span>{fact.value}</span>
                </div>
              ))}
            </div>

            {links.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {links.map((link) => (
                  <a
                    key={link.url}
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-2 text-xs font-semibold text-white/82 backdrop-blur"
                  >
                    <IconLink size={14} />
                    {link.label}
                  </a>
                ))}
              </div>
            ) : null}
          </div>

          <div className="relative flex h-full min-h-[520px] items-center justify-center lg:min-h-[640px]">
            <div className="absolute inset-x-0 top-0 h-[86%] rounded-[2.2rem] border border-white/10 bg-black/18 backdrop-blur-[2px]" />

            {stackStations.map((station, index) => {
              const offset = index + 1;
              return (
                <div
                  key={`stack-${station.uuid}`}
                  className="absolute rounded-[2rem] border border-[rgba(255,255,255,0.12)] bg-[linear-gradient(180deg,rgba(18,21,28,0.94)_0%,rgba(12,14,20,0.9)_100%)] p-4 shadow-[0_18px_36px_rgba(0,0,0,0.34)] backdrop-blur-xl"
                  style={{
                    left: `${14 + offset * 2}%`,
                    right: `${2 + offset * 2}%`,
                    top: `${4 + offset * 7}%`,
                    transform: `scale(${1 - offset * 0.03})`,
                    opacity: 0.82 - index * 0.12,
                    zIndex: 8 - index,
                  }}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-[1rem] border border-white/10 bg-black/35">
                        <StationArtwork
                          station={station}
                          className="h-full w-full object-cover"
                          fallbackClassName="flex h-full w-full items-center justify-center bg-[linear-gradient(180deg,#10151d,#18212e)] text-sm font-semibold text-white"
                        />
                      </div>
                      <PretextMeasuredText
                        text={station.name}
                        font={LISTEN_STACK_FONT}
                        lineHeight={24}
                        collapsedLines={2}
                        lineClassName="text-lg font-semibold text-white/84"
                        fallbackClassName="text-lg font-semibold text-white/84"
                      />
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <div className="hidden text-right md:block">
                        <div className="text-[10px] uppercase tracking-[0.22em] text-white/38">
                          {index === 0 ? "Up Next" : `In Queue ${index + 1}`}
                        </div>
                        <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-white/52">
                          {[station.country, station.state || station.language].filter(Boolean).join(" • ")}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => startStation(station, { preserveQueue: true, autoPlay: true })}
                        className="inline-flex h-10 items-center rounded-full border border-white/12 bg-black/35 px-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/78"
                      >
                        {index === 0 ? "Next" : "Tune"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="relative z-20 w-[82%] rounded-[2.2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(12,14,18,0.95)_0%,rgba(10,12,16,0.9)_100%)] p-4 shadow-[0_32px_80px_rgba(0,0,0,0.42)] backdrop-blur-xl">
              <div className="relative overflow-hidden rounded-[1.8rem] border border-white/10 bg-black/30">
                <img
                  src="/listening-zen-hero.svg"
                  alt=""
                  aria-hidden="true"
                  className="h-[22rem] w-full object-cover"
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,9,13,0.08)_0%,rgba(7,9,13,0.24)_40%,rgba(7,9,13,0.62)_100%)]" />
                <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full border border-[rgba(245,177,45,0.24)] bg-[rgba(7,9,13,0.52)] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--rp-gold)] backdrop-blur">
                  <IconMoonStars size={12} />
                  Uncluttered Signal
                </div>
                <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-4">
                  <div className="max-w-[70%]">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/55">
                      Now Playing
                    </div>
                    <PretextMeasuredText
                      text={nowPlaying.name}
                      font={LISTEN_CARD_FONT}
                      lineHeight={28}
                      collapsedLines={2}
                      lineClassName="mt-1 text-[1.9rem] font-semibold leading-tight text-white"
                      fallbackClassName="mt-1 text-[1.9rem] font-semibold leading-tight text-white"
                    />
                    <div className="mt-1 text-[11px] uppercase tracking-[0.2em] text-white/50">
                      {[nowPlaying.country, nowPlaying.state].filter(Boolean).join(" • ")}
                    </div>
                  </div>
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-[1.25rem] border border-white/10 bg-black/35 shadow-[0_14px_28px_rgba(0,0,0,0.32)]">
                    <StationArtwork
                      station={nowPlaying}
                      className="h-full w-full object-cover"
                      fallbackClassName="flex h-full w-full items-center justify-center bg-[linear-gradient(180deg,#10151d,#18212e)] text-xl font-semibold text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-4">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/45">
                    {insightsEnabled ? "AI Summary" : "Metadata"}
                  </div>
                  <Text size="sm" fw={700} c="white">
                    {trackLine}
                  </Text>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/45">Queue</div>
                  <Text size="sm" fw={700} c="var(--rp-gold)">
                    {currentStationIndex + 1} / {Math.max(queue.length, 1)}
                  </Text>
                </div>
              </div>

              <div className="mt-4 rounded-[1.5rem] border border-white/10 bg-white/[0.03] px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/45">
                      Visible Queue Deck
                    </div>
                    <div className="mt-1 text-sm font-semibold text-white/82">
                      {stackStations.length > 0
                        ? "The next stations now stay visible as layered cards behind the main board."
                        : "Direct tune is active. Start playback from a surface with a queue to build the deck."}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/35">
                      {queueSourceLabel}
                    </div>
                    <div className="mt-1 text-xs text-white/55">
                      {stackStations.length} queued visible
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
