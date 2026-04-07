import { Link, useNavigate } from "@remix-run/react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { Text } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { motion } from "framer-motion";
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
import { useHydrated } from "~/hooks/useHydrated";
import { usePlayerStore } from "~/state/playerStore";
import { useUIStore } from "~/state/uiStore";

const LISTEN_TITLE_FONT =
  '600 58px "General Sans", "SF Pro Display", "Segoe UI", "Helvetica Neue", Arial, sans-serif';
const LISTEN_TITLE_MOBILE_FONT =
  '600 38px "General Sans", "SF Pro Display", "Segoe UI", "Helvetica Neue", Arial, sans-serif';
const LISTEN_BODY_FONT =
  '600 16px "General Sans", "SF Pro Text", "Segoe UI", "Helvetica Neue", Arial, sans-serif';
const LISTEN_CARD_FONT =
  '600 14px "General Sans", "SF Pro Text", "Segoe UI", "Helvetica Neue", Arial, sans-serif';
const LISTEN_STACK_FONT =
  '600 18px "General Sans", "SF Pro Text", "Segoe UI", "Helvetica Neue", Arial, sans-serif';
const LISTEN_STACK_TITLE_FONT =
  '700 28px "General Sans", "SF Pro Display", "Segoe UI", "Helvetica Neue", Arial, sans-serif';
const LISTEN_STACK_PREVIEW_FONT =
  '700 18px "General Sans", "SF Pro Text", "Segoe UI", "Helvetica Neue", Arial, sans-serif';

type ListenFact = {
  label: string;
  value: string;
};

type StackCardTone = {
  border: string;
  background: string;
  glow: string;
};

const STACK_CARD_TONES: StackCardTone[] = [
  {
    border: "rgba(245,177,45,0.56)",
    background:
      "linear-gradient(160deg, rgba(31,23,14,0.98) 0%, rgba(56,39,18,0.96) 34%, rgba(27,20,12,0.98) 100%)",
    glow: "radial-gradient(circle at top right, rgba(245,177,45,0.34), transparent 40%)",
  },
  {
    border: "rgba(96,142,255,0.42)",
    background:
      "linear-gradient(160deg, rgba(18,23,46,0.98) 0%, rgba(28,41,77,0.96) 42%, rgba(16,20,38,0.98) 100%)",
    glow: "radial-gradient(circle at top right, rgba(118,144,255,0.28), transparent 38%)",
  },
  {
    border: "rgba(86,219,200,0.4)",
    background:
      "linear-gradient(160deg, rgba(13,29,34,0.98) 0%, rgba(18,45,52,0.96) 42%, rgba(12,24,28,0.98) 100%)",
    glow: "radial-gradient(circle at top right, rgba(86,219,200,0.24), transparent 38%)",
  },
  {
    border: "rgba(216,134,255,0.4)",
    background:
      "linear-gradient(160deg, rgba(30,18,41,0.98) 0%, rgba(46,23,60,0.96) 42%, rgba(24,16,31,0.98) 100%)",
    glow: "radial-gradient(circle at top right, rgba(216,134,255,0.24), transparent 38%)",
  },
];

export default function ListeningPage() {
  const navigate = useNavigate();
  const hydrated = useHydrated();
  const dragStartX = useRef<number | null>(null);
  const storedNowPlaying = usePlayerStore((state) => state.nowPlaying);
  const storedIsPlaying = usePlayerStore((state) => state.isPlaying);
  const storedQueue = usePlayerStore((state) => state.queue);
  const storedQueueSourceLabel = usePlayerStore((state) => state.queueSourceLabel);
  const storedCurrentStationIndex = usePlayerStore((state) => state.currentStationIndex);
  const togglePlay = usePlayerStore((state) => state.togglePlay);
  const startStation = usePlayerStore((state) => state.startStation);
  const insightsEnabled = useUIStore((state) => state.insightsOpen);
  const setInsightsOpen = useUIStore((state) => state.setInsightsOpen);
  const setAiTriviaExpanded = useUIStore((state) => state.setAiTriviaExpanded);
  const nowPlaying = hydrated ? storedNowPlaying : null;
  const isPlaying = hydrated ? storedIsPlaying : false;
  const queue = hydrated ? storedQueue : [];
  const queueSourceLabel = hydrated ? storedQueueSourceLabel : "Direct Tune";
  const currentStationIndex = hydrated ? storedCurrentStationIndex : 0;
  const isMobileTitle = useMediaQuery("(max-width: 639px)", false, { getInitialValueInEffect: true });
  const isStackCompact = useMediaQuery("(max-width: 1023px)", false, { getInitialValueInEffect: true });

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
    setInsightsOpen(false);
    setAiTriviaExpanded(false);
  }, [nowPlaying?.uuid, nowPlayingMeta.track?.artist, nowPlayingMeta.track?.title, setAiTriviaExpanded, setInsightsOpen]);

  const previousStation = queue.length > 1 ? queue[(currentStationIndex - 1 + queue.length) % queue.length] : null;
  const nextStation = queue.length > 1 ? queue[(currentStationIndex + 1) % queue.length] : null;
  const orderedQueue = useMemo(() => {
    if (!nowPlaying) return [];
    if (queue.length === 0) return [nowPlaying];
    const rotated = queue.map((_, offset) => queue[(currentStationIndex + offset) % queue.length]);
    if (rotated[0]?.uuid === nowPlaying.uuid) return rotated;
    return [nowPlaying, ...rotated.filter((station) => station.uuid !== nowPlaying.uuid)];
  }, [currentStationIndex, nowPlaying, queue]);
  const activeCard = orderedQueue[0] ?? nowPlaying;
  const previewCards = orderedQueue.slice(1, 4);
  const hiddenQueueCount = Math.max(0, orderedQueue.length - 1 - previewCards.length);
  const compactQueueLabel = queue.length > 1 ? `${currentStationIndex + 1} / ${queue.length}` : "Direct tune";
  const handleToggleInsights = () => {
    const next = !insightsEnabled;
    setInsightsOpen(next);
    if (next) setAiTriviaExpanded(true);
  };
  const promoteStation = useCallback(
    (station: typeof nowPlaying) => {
      if (!station) return;
      startStation(station, { preserveQueue: true, autoPlay: true });
    },
    [startStation]
  );
  const handleStepBackward = useCallback(() => {
    if (previousStation) {
      startStation(previousStation, { preserveQueue: true, autoPlay: true });
    }
  }, [previousStation, startStation]);
  const handleStepForward = useCallback(() => {
    if (nextStation) {
      startStation(nextStation, { preserveQueue: true, autoPlay: true });
    }
  }, [nextStation, startStation]);
  const handleStackTouchStart = useCallback((event: React.TouchEvent<HTMLElement>) => {
    dragStartX.current = event.touches[0]?.clientX ?? null;
  }, []);
  const handleStackTouchEnd = useCallback(
    (event: React.TouchEvent<HTMLElement>) => {
      if (dragStartX.current == null) return;
      const deltaX = (event.changedTouches[0]?.clientX ?? dragStartX.current) - dragStartX.current;
      dragStartX.current = null;
      if (Math.abs(deltaX) < 48) return;
      if (deltaX > 0) {
        handleStepBackward();
      } else {
        handleStepForward();
      }
    },
    [handleStepBackward, handleStepForward]
  );

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

  const factItems: ListenFact[] = insightsEnabled
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
    ].filter((fact): fact is ListenFact => Boolean(fact));

  const links = insightsEnabled
    ? [...(aiTrivia.trivia?.links ?? []), ...(freeTrivia.trivia?.links ?? [])].slice(0, 3)
    : [];
  const activeInsightImage = aiTrivia.trivia?.imageUrl ?? freeTrivia.trivia?.imageUrl ?? null;

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
        <header className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
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
              onClick={handleToggleInsights}
              className={`inline-flex h-10 items-center gap-2 rounded-full border px-4 text-xs font-semibold uppercase tracking-[0.2em] ${insightsEnabled
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

        <section className="grid flex-1 gap-8 py-6 lg:grid-cols-[0.72fr_1.28fr] lg:items-center lg:py-8">
          <div className="flex h-full flex-col justify-center lg:pr-6">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[rgba(245,177,45,0.28)] bg-[rgba(245,177,45,0.1)] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--rp-gold)]">
              <IconMoonStars size={14} />
              Listening Board
            </div>

            <div className="mt-6 max-w-2xl space-y-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/45">
                {queueSourceLabel}
              </div>
              <PretextMeasuredText
                text={nowPlaying.name}
                font={isMobileTitle ? LISTEN_TITLE_MOBILE_FONT : LISTEN_TITLE_FONT}
                lineHeight={isMobileTitle ? 46 : 72}
                collapsedLines={2}
                lineClassName="text-[2.35rem] font-semibold leading-[2.875rem] tracking-tight text-white sm:text-5xl sm:leading-[3.75rem] lg:text-6xl lg:leading-[4.5rem]"
                fallbackClassName="text-[2.35rem] font-semibold leading-[2.875rem] tracking-tight text-white sm:text-5xl sm:leading-[3.75rem] lg:text-6xl lg:leading-[4.5rem]"
              />
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-white/55">
                {[nowPlaying.country, nowPlaying.state].filter(Boolean).join(" • ")}
              </p>
              <PretextMeasuredText
                text={summary || "Station metadata will settle here."}
                font={LISTEN_BODY_FONT}
                lineHeight={28}
                collapsedLines={isStackCompact ? 3 : 4}
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
                onClick={handleStepBackward}
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
                onClick={handleStepForward}
                disabled={!nextStation}
                className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-black/35 text-white disabled:opacity-40"
                aria-label="Next station"
              >
                <IconPlayerSkipForwardFilled size={20} />
              </button>
              <div className="ml-2 rounded-full border border-white/10 bg-black/25 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/65">
                {compactQueueLabel}
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

            <div className="mt-6 rounded-[1.6rem] border border-white/10 bg-black/22 p-4 backdrop-blur-xl">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">Signal flow</div>
                  <div className="mt-1 text-sm font-semibold text-white/82">Queue compressed into motion</div>
                </div>
                <div className="rounded-full border border-[rgba(245,177,45,0.26)] bg-[rgba(245,177,45,0.1)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--rp-gold)]">
                  {hiddenQueueCount > 0 ? `+${hiddenQueueCount} hidden` : "Live focus"}
                </div>
              </div>
              <div className="mt-3 text-sm font-medium leading-6 text-white/62">
                The active station owns the front card. Swipe the card or tap a preview layer to rotate through the route without reopening the queue as a full list.
              </div>
            </div>
          </div>

          <div className="flex h-full min-h-0 flex-col justify-center lg:min-h-[700px]">
            <div className="relative min-h-[31rem] sm:min-h-[35rem] lg:min-h-[41rem]">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_72%_20%,rgba(245,177,45,0.28),transparent_18%),radial-gradient(circle_at_32%_78%,rgba(90,118,255,0.2),transparent_22%)] blur-2xl" />
              <div className="pointer-events-none absolute left-[10%] right-[10%] top-3 h-[11rem] rounded-[2.8rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] opacity-70 blur-sm" />

              {previewCards.length > 0 ? (
                previewCards.map((station, index) => {
                  const tone = STACK_CARD_TONES[(index + 1) % STACK_CARD_TONES.length];
                  const depth = index + 1;
                  const topOffset = isStackCompact ? 8 + depth * 16 : 12 + depth * 22;
                  const insetX = isStackCompact ? 18 + depth * 14 : 44 + depth * 22;
                  const scale = 1 - depth * 0.085;
                  const rotation = depth % 2 === 0 ? -4.5 : 3.6;
                  return (
                    <motion.button
                      key={`preview-${station.uuid}`}
                      type="button"
                      onClick={() => promoteStation(station)}
                      initial={false}
                      animate={{
                        top: topOffset,
                        left: insetX,
                        right: insetX,
                        scale,
                        rotate: rotation,
                        opacity: 0.94 - depth * 0.14,
                      }}
                      transition={{ type: "spring", stiffness: 260, damping: 28, mass: 0.9 }}
                      className="absolute z-10 h-[13rem] overflow-hidden rounded-[2rem] border p-4 text-left shadow-[0_32px_58px_rgba(0,0,0,0.34)] backdrop-blur-xl sm:h-[13.5rem]"
                      style={{
                        borderColor: tone.border,
                        background: tone.background,
                        transformOrigin: "top center",
                        boxShadow: `0 26px 56px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.08), 0 0 0 1px ${tone.border}`,
                      }}
                      aria-label={`Promote ${station.name}`}
                    >
                      <div className="pointer-events-none absolute inset-0 opacity-80" style={{ backgroundImage: tone.glow }} />
                      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/18" />
                      <div className="relative z-10 flex items-start gap-3">
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-[1rem] border border-white/10 bg-black/30">
                          <StationArtwork
                            station={station}
                            className="h-full w-full object-cover"
                            fallbackClassName="flex h-full w-full items-center justify-center bg-[linear-gradient(180deg,#10151d,#18212e)] text-sm font-semibold text-white"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/40">
                            {index === 0 ? "Next in stack" : `Layer ${depth + 1}`}
                          </div>
                          <PretextMeasuredText
                            text={station.name}
                            font={LISTEN_STACK_PREVIEW_FONT}
                            lineHeight={22}
                            collapsedLines={2}
                            lineClassName="mt-1 text-base font-semibold leading-tight text-white/86"
                            fallbackClassName="mt-1 text-base font-semibold leading-tight text-white/86"
                          />
                          <div className="mt-1 truncate text-[11px] font-medium uppercase tracking-[0.16em] text-white/45">
                            {[station.country, station.state || station.language].filter(Boolean).join(" • ")}
                          </div>
                        </div>
                      </div>
                    </motion.button>
                  );
                })
              ) : null}

              <motion.article
                initial={false}
                animate={{ y: 0, scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 28, mass: 0.92 }}
                onTouchStart={handleStackTouchStart}
                onTouchEnd={handleStackTouchEnd}
                className="absolute bottom-0 left-3 right-3 z-20 h-[24rem] overflow-hidden rounded-[2.2rem] border border-[rgba(245,177,45,0.32)] bg-[linear-gradient(165deg,rgba(15,16,20,0.98)_0%,rgba(20,18,15,0.96)_34%,rgba(11,12,16,0.98)_100%)] p-4 shadow-[0_34px_70px_rgba(0,0,0,0.42)] backdrop-blur-xl sm:left-8 sm:right-8 sm:h-[26rem] sm:p-5 lg:left-12 lg:right-12 lg:h-[30rem] lg:p-6"
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_14%,rgba(245,177,45,0.24),transparent_18%),radial-gradient(circle_at_18%_78%,rgba(96,142,255,0.14),transparent_22%)]" />
                <div className="absolute inset-0 opacity-50" style={{ backgroundImage: "url('/listening-zen-hero.svg')", backgroundPosition: "center", backgroundSize: "cover" }} />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(9,11,15,0.34)_0%,rgba(9,11,15,0.44)_34%,rgba(9,11,15,0.88)_100%)]" />

                <div className="relative z-10 flex h-full flex-col">
                  <div className="flex items-center justify-between gap-3">
                    <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(245,177,45,0.24)] bg-[rgba(7,9,13,0.44)] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--rp-gold)] backdrop-blur">
                      <IconMoonStars size={12} />
                      Front card
                    </div>
                    <div className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/58">
                      {compactQueueLabel}
                    </div>
                  </div>

                  <div className="mt-5 flex min-h-[7.75rem] items-start justify-between gap-4 sm:min-h-[8.5rem]">
                    <div className="min-w-0 max-w-[74%]">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/52">
                        {queueSourceLabel}
                      </div>
                      <PretextMeasuredText
                        text={activeCard?.name ?? nowPlaying.name}
                        font={LISTEN_STACK_TITLE_FONT}
                        lineHeight={34}
                        collapsedLines={2}
                        lineClassName="mt-2 text-[2rem] font-semibold leading-tight tracking-tight text-white sm:text-[2.35rem]"
                        fallbackClassName="mt-2 text-[2rem] font-semibold leading-tight tracking-tight text-white sm:text-[2.35rem]"
                      />
                      <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/48">
                        {[activeCard?.country, activeCard?.state].filter(Boolean).join(" • ")}
                      </div>
                    </div>

                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-[1.35rem] border border-white/10 bg-black/35 shadow-[0_18px_32px_rgba(0,0,0,0.28)] sm:h-24 sm:w-24">
                      {activeInsightImage ? (
                        <img
                          src={activeInsightImage}
                          alt="Track or artist artwork"
                          className="h-full w-full object-cover"
                          loading="eager"
                          sizes="96px"
                          onError={(event) => {
                            event.currentTarget.style.display = "none";
                          }}
                        />
                      ) : (
                        <StationArtwork
                          station={activeCard ?? nowPlaying}
                          className="h-full w-full object-cover"
                          fallbackClassName="flex h-full w-full items-center justify-center bg-[linear-gradient(180deg,#10151d,#18212e)] text-xl font-semibold text-white"
                          loading="eager"
                          sizes="96px"
                        />
                      )}
                    </div>
                  </div>

                  <div className="mt-5 h-[7.75rem] rounded-[1.6rem] border border-white/10 bg-[rgba(7,9,13,0.34)] p-4 backdrop-blur-sm sm:h-[8.25rem]">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/44">
                          {insightsEnabled ? "AI Summary" : "Metadata"}
                        </div>
                        <Text size="sm" fw={700} c="white">
                          {trackLine}
                        </Text>
                      </div>
                      <button
                        type="button"
                        onClick={handleToggleInsights}
                        className={`inline-flex h-10 items-center gap-2 rounded-full border px-4 text-[10px] font-semibold uppercase tracking-[0.2em] ${insightsEnabled
                          ? "border-[rgba(245,177,45,0.42)] bg-[rgba(245,177,45,0.14)] text-[var(--rp-gold)]"
                          : "border-white/10 bg-black/30 text-white/72"}`}
                      >
                        <IconSparkles size={13} />
                        {insightsEnabled ? "Insights On" : "Metadata"}
                      </button>
                    </div>
                    <PretextMeasuredText
                      text={summary || "Station metadata will settle here."}
                      font={LISTEN_BODY_FONT}
                      lineHeight={23}
                      collapsedLines={2}
                      expandable={insightsEnabled}
                      moreLabel="Expand note"
                      lessLabel="Collapse note"
                      className="mt-3"
                      lineClassName="text-sm font-medium leading-6 text-white/82"
                      fallbackClassName="text-sm font-medium leading-6 text-white/82"
                    />
                  </div>

                  <div className="mt-4 min-h-[4.75rem] flex flex-wrap content-start gap-2 overflow-hidden">
                    {factItems.slice(0, 4).map((fact) => (
                      <div
                        key={`stack-${fact.label}-${fact.value}`}
                        className="rounded-full border border-white/10 bg-black/28 px-3 py-2 text-[11px] font-medium text-white/82"
                      >
                        <span className="font-semibold text-white">{fact.label}</span>
                        <span className="text-white/40"> • </span>
                        <span>{fact.value}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-auto pt-6">
                    <div className="flex flex-wrap items-center justify-between gap-4 rounded-[1.6rem] border border-white/10 bg-[rgba(7,9,13,0.42)] p-4 backdrop-blur-sm">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={handleStepBackward}
                          disabled={!previousStation}
                          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-black/35 text-white disabled:opacity-40"
                          aria-label="Previous station"
                        >
                          <IconPlayerSkipBackFilled size={18} />
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
                          onClick={handleStepForward}
                          disabled={!nextStation}
                          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-black/35 text-white disabled:opacity-40"
                          aria-label="Next station"
                        >
                          <IconPlayerSkipForwardFilled size={18} />
                        </button>
                      </div>

                      <div className="text-right">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/42">Route depth</div>
                        <div className="mt-1 text-sm font-semibold text-[var(--rp-gold)]">
                          {currentStationIndex + 1} / {Math.max(queue.length, 1)}
                        </div>
                        <div className="mt-1 text-[11px] font-medium text-white/46">
                          {previewCards.length > 0 ? `${previewCards.length} preview layers` : "No layered queue yet"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.article>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
