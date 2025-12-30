import { useEffect, useMemo, useCallback, useState, useRef, type MouseEvent } from "react";
import { useLocation } from "@remix-run/react";
import { Drawer, Popover, Text, Tooltip } from "@mantine/core";
import { motion, AnimatePresence } from "framer-motion";
import RetroTuner from "./RetroTuner";
import { StationArtwork } from "./StationArtwork";
import {
  IconPlayerPauseFilled,
  IconPlayerPlayFilled,
  IconPlayerSkipBackFilled,
  IconPlayerSkipForwardFilled,
  IconMapPin,
  IconSparkles,
  IconBrandYoutube,
  IconBrandWikipedia,
  IconUser,
  IconDisc,
  IconMusic,
  IconExternalLink,
} from "@tabler/icons-react";
import { usePlayerStore } from "~/state/playerStore";
import { useUIStore } from "~/state/uiStore";
import { usePlayerNoticeStore } from "~/state/playerNoticeStore";
import { useNowPlayingMetadata } from "~/hooks/useNowPlayingMetadata";
import { useTrackTrivia } from "~/hooks/useTrackTrivia";
import { useMediaQuery } from "@mantine/hooks";

export default function PlayerDock() {
  const location = useLocation();
  const isAiRoute = location.pathname.startsWith("/ai");
  const notice = usePlayerNoticeStore((state) => state.notice);
  const clearNotice = usePlayerNoticeStore((state) => state.clearNotice);

  const {
    nowPlaying,
    isPlaying,
    togglePlay,
    queue,
    currentStationIndex,
    startStation
  } = usePlayerStore();

  const {
    toggleQuickRetune,
    raptorMiniEnabled,
    aiTriviaExpanded,
    setAiTriviaExpanded,
    insightsOpen,
    setInsightsOpen,
  } = useUIStore();

  const title = useMemo(() => nowPlaying?.name ?? "", [nowPlaying?.name]);
  const subtitle = useMemo(
    () => [nowPlaying?.country, nowPlaying?.state].filter(Boolean).join(" • "),
    [nowPlaying?.country, nowPlaying?.state]
  );

  const frequency = useMemo(() => {
    if (!nowPlaying) return "0.0";
    let hash = 0;
    for (let i = 0; i < nowPlaying.uuid.length; i++) {
      hash = nowPlaying.uuid.charCodeAt(i) + ((hash << 5) - hash);
    }
    const range = 108.0 - 88.0;
    const normalized = Math.abs(hash % 1000) / 1000;
    return (88.0 + normalized * range).toFixed(1);
  }, [nowPlaying?.uuid]);

  const frequencyPercent = useMemo(() => {
    const freqNum = parseFloat(frequency);
    return ((freqNum - 88.0) / 20.0) * 100;
  }, [frequency]);

  const ticks = useMemo(() => {
    const freqNum = parseFloat(frequency);
    const tickStart = 88;
    const tickEnd = 108;
    const tickCount = 21;
    return Array.from({ length: tickCount }, (_, i) => ({
      value: tickStart + i,
      isNear: Math.abs((tickStart + i) - freqNum) < 2,
    }));
  }, [frequency]);

  const handleNext = useCallback(() => {
    if (queue.length === 0) return;

    // Calculate next index with proper wrapping
    const nextIndex = (currentStationIndex + 1) % queue.length;
    const nextStation = queue[nextIndex];

    if (nextStation) {
      // Update the index in the store before starting the station
      startStation(nextStation, { preserveQueue: true });
    }
  }, [queue, currentStationIndex, startStation]);

  const handlePrev = useCallback(() => {
    if (queue.length === 0) return;

    // Calculate previous index with proper wrapping
    const prevIndex = (currentStationIndex - 1 + queue.length) % queue.length;
    const prevStation = queue[prevIndex];

    if (prevStation) {
      // Update the index in the store before starting the station
      startStation(prevStation, { preserveQueue: true });
    }
  }, [queue, currentStationIndex, startStation]);

  const handleRetune = useCallback(() => {
    if (queue.length === 0) return;
    // Pick a random station different from current
    let randomIndex = Math.floor(Math.random() * queue.length);
    if (queue.length > 1 && randomIndex === currentStationIndex) {
      randomIndex = (randomIndex + 1) % queue.length;
    }
    const randomStation = queue[randomIndex];
    if (randomStation) {
      startStation(randomStation, { preserveQueue: true });
    }
  }, [queue, currentStationIndex, startStation]);

  const [isExpanded, setIsExpanded] = useState(false);
  const isMobile = useMediaQuery("(max-width: 1024px)");
  const miniSwipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const miniSwipeDeltaRef = useRef(0);

  const handleMiniSwipeStart = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse") return;
    miniSwipeStartRef.current = { x: event.clientX, y: event.clientY };
    miniSwipeDeltaRef.current = 0;
  }, []);

  const handleMiniSwipeMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!miniSwipeStartRef.current) return;
    const dx = event.clientX - miniSwipeStartRef.current.x;
    const dy = event.clientY - miniSwipeStartRef.current.y;
    if (Math.abs(dy) < 10 || Math.abs(dy) < Math.abs(dx) * 1.2) return;
    miniSwipeDeltaRef.current = dy;
  }, []);

  const handleMiniSwipeEnd = useCallback(() => {
    if (!miniSwipeStartRef.current) return;
    const dy = miniSwipeDeltaRef.current;
    miniSwipeStartRef.current = null;
    miniSwipeDeltaRef.current = 0;
    if (dy < -70) {
      setIsExpanded(true);
    }
  }, []);
  const nowPlayingMeta = useNowPlayingMetadata(nowPlaying, isPlaying);
  const handleOpenInsights = useCallback(
    (event?: MouseEvent) => {
      event?.stopPropagation();
      setAiTriviaExpanded(true);
      setInsightsOpen(true);
    },
    [setAiTriviaExpanded, setInsightsOpen]
  );
  const handleToggleInsights = useCallback(
    (event: MouseEvent) => {
      event.stopPropagation();
      if (!insightsOpen) {
        setAiTriviaExpanded(true);
      }
      setInsightsOpen(!insightsOpen);
    },
    [insightsOpen, setAiTriviaExpanded, setInsightsOpen]
  );
  const freeTrivia = useTrackTrivia({
    track: nowPlayingMeta.track,
    source: "free",
    enabled: insightsOpen,
  });
  const aiTrivia = useTrackTrivia({
    track: nowPlayingMeta.track,
    source: "ai",
    enabled: insightsOpen && aiTriviaExpanded,
    context: {
      summary: freeTrivia.trivia?.summary ?? null,
      facts: freeTrivia.trivia?.facts ?? [],
    },
  });
  const trackLine =
    nowPlayingMeta.status === "ready" && nowPlayingMeta.track
      ? [nowPlayingMeta.track.artist, nowPlayingMeta.track.title]
        .filter(Boolean)
        .join(" — ")
      : null;
  const trackKey = nowPlayingMeta.track
    ? `${nowPlayingMeta.track.artist ?? ""}|${nowPlayingMeta.track.title ?? ""}`
    : "";
  const hasFreeContent = Boolean(freeTrivia.trivia);
  const canRequestAi = Boolean(trackKey);
  const showEmptyHint = !hasFreeContent && (freeTrivia.status === "empty" || freeTrivia.status === "idle");
  const [warmupSeen, setWarmupSeen] = useState(false);
  const statusHint =
    nowPlayingMeta.status === "loading"
      ? "Identifying track…"
      : nowPlayingMeta.status === "empty"
        ? "On-air update soon"
        : nowPlayingMeta.status === "error"
          ? "Track info unavailable"
          : null;
  const triviaTitle = trackLine ?? statusHint ?? "Listening live";
  const lastTrackKeyRef = useRef<string>("");
  const lastStationRef = useRef<string | null>(null);

  useEffect(() => {
    const stationId = nowPlaying?.uuid ?? null;
    if (stationId !== lastStationRef.current) {
      setAiTriviaExpanded(false);
      setInsightsOpen(false);
      setWarmupSeen(false);
      lastStationRef.current = stationId;
      if (trackKey) {
        lastTrackKeyRef.current = trackKey;
      }
      return;
    }
    if (trackKey && trackKey !== lastTrackKeyRef.current) {
      setAiTriviaExpanded(false);
      setInsightsOpen(false);
      setWarmupSeen(false);
      lastTrackKeyRef.current = trackKey;
    }
    // Keep AI trivia expanded during temporary metadata gaps to avoid UI flicker.
  }, [nowPlaying?.uuid, trackKey, setAiTriviaExpanded, setInsightsOpen]);

  useEffect(() => {
    if (insightsOpen && showEmptyHint && !warmupSeen) {
      setWarmupSeen(true);
    }
  }, [insightsOpen, showEmptyHint, warmupSeen]);

  const renderLinkIcon = (kind?: string) => {
    switch (kind) {
      case "youtube":
        return IconBrandYoutube;
      case "artist":
        return IconUser;
      case "release":
        return IconDisc;
      case "track":
        return IconMusic;
      case "info":
        return IconBrandWikipedia;
      default:
        return IconExternalLink;
    }
  };

  const renderTriviaBody = (state: typeof freeTrivia, label: string) => {
    if (state.status === "loading") {
      return <Text size="xs" className="text-amber-100/70">Fetching {label.toLowerCase()}…</Text>;
    }
    if (state.status === "error") {
      return (
        <Text size="xs" className="text-rose-300">
          {state.message ?? "Trivia unavailable."}
        </Text>
      );
    }
    if (state.status === "empty") return null;
    if (!state.trivia) return null;

    return (
      <div className="space-y-2">
        {state.trivia.imageUrl && (
          <div className="flex items-center gap-3">
            <img
              src={state.trivia.imageUrl}
              alt="Track artwork"
              className="h-12 w-12 rounded-lg object-cover shadow-sm"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
            <div className="min-w-0">
              <Text size="sm" fw={600} className="text-amber-50">
                {state.trivia.summary}
              </Text>
            </div>
          </div>
        )}
        {!state.trivia.imageUrl && (
          <Text size="sm" fw={600} className="text-amber-50">
            {state.trivia.summary}
          </Text>
        )}
        <div className="space-y-1 text-xs text-amber-100/70">
          {state.trivia.facts.map((fact) => (
            <div key={fact.label} className="flex items-center gap-2">
              <span className="font-semibold text-amber-50">{fact.label}</span>
              <span className="text-amber-100/50">•</span>
              <span>{fact.value}</span>
            </div>
          ))}
        </div>
        {state.trivia.links && state.trivia.links.length > 0 && (
          <div className="flex flex-wrap gap-2 text-[11px]">
            {state.trivia.links.map((link) => {
              const Icon = renderLinkIcon(link.kind);
              return (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-amber-400/30 bg-[#141822] text-amber-100/80 hover:border-amber-400/60 hover:text-amber-100"
                  aria-label={link.label}
                  title={link.label}
                >
                  <Icon size={16} />
                </a>
              );
            })}
          </div>
        )}
        <Text size="xs" className="text-amber-100/60">
          Source: {state.trivia.source === "ai" ? "AI" : "MusicBrainz"}
        </Text>
      </div>
    );
  };
  const triviaContent = (
    <div
      className="space-y-2"
      onClick={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <>
        <div className="flex items-center justify-between">
          <Text size="xs" fw={700} className="text-amber-50">
            Insights
          </Text>
          <div className="text-[10px] font-semibold uppercase tracking-wide text-amber-100/60">
            AI + Metadata
          </div>
        </div>
        <Text size="xs" className="text-amber-100/70">
          {triviaTitle}
        </Text>
        {renderTriviaBody(freeTrivia, "details")}
        {showEmptyHint && !warmupSeen && (
          <div className="rounded-lg border border-amber-400/30 bg-[#151922] px-3 py-2 text-[11px] text-amber-100/70 shadow-sm">
            <div className="font-semibold text-amber-50">Spotlight is warming up.</div>
            <div className="text-amber-100/60">Ask AI for quick facts while we wait for metadata.</div>
          </div>
        )}
        {aiTriviaExpanded && (() => {
          const content = renderTriviaBody(aiTrivia, "AI insights");
          return content ? (
            <div className="rounded-xl border border-amber-400/20 bg-[#141822] px-3 py-2 shadow-sm">
              {content}
            </div>
          ) : null;
        })()}
        {!aiTriviaExpanded && canRequestAi && (
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-[#151922] px-3 py-1 text-[11px] font-semibold text-amber-100 hover:border-amber-400/70 shadow-sm"
            onClick={(event) => {
              event.stopPropagation();
              setAiTriviaExpanded(true);
            }}
          >
            <IconSparkles size={12} />
            {hasFreeContent ? "AI insights" : "Ask AI"}
          </button>
        )}
        {!aiTriviaExpanded && !canRequestAi && showEmptyHint && (
          <Text size="xs" className="text-amber-100/60">
            Waiting for track details…
          </Text>
        )}
      </>
    </div>
  );

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted || !nowPlaying) return null;

  // Desktop dock (float bottom-right to avoid covering hero CTAs)
  return (
    <>
      <AnimatePresence>
        {isExpanded && (
          <RetroTuner
            station={nowPlaying}
            isPlaying={isPlaying}
            onPlayPause={togglePlay}
            onNext={handleNext}
            onPrev={handlePrev}
            onClose={() => setIsExpanded(false)}
            queue={queue}
            currentIndex={currentStationIndex}
            onSelectStation={(nextStation) => {
              startStation(nextStation, { preserveQueue: true });
            }}
          />
        )}
      </AnimatePresence>
      <Drawer
        opened={Boolean(isMobile) && insightsOpen}
        onClose={() => setInsightsOpen(false)}
        position="bottom"
        size="md"
        title="AI Insights"
        overlayProps={{ opacity: 0.2 }}
        styles={{
          content: {
            background: 'rgba(12, 14, 18, 0.96)',
            backdropFilter: 'blur(28px)',
            WebkitBackdropFilter: 'blur(28px)',
            borderRadius: '24px',
            margin: '0',
            marginBottom: 'calc(env(safe-area-inset-bottom) + 12px)',
            left: '50%',
            transform: 'translateX(-50%)',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
            border: '1px solid rgba(255, 204, 122, 0.25)',
            height: 'auto',
            maxHeight: '85vh',
            width: 'calc(100% - 48px)',
            overflow: 'hidden',
          },
          header: {
            background: 'transparent',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          },
          title: {
            fontWeight: 700,
            color: '#fbe7b3',
          },
          close: {
            color: '#f6d07a',
          }
        }}
      >
        {triviaContent}
      </Drawer>

      <aside className="pointer-events-none fixed bottom-6 left-1/2 -translate-x-1/2 z-30 hidden w-full max-w-3xl px-4 lg:block">
        <motion.div
          className="pointer-events-auto rounded-3xl overflow-hidden transition-transform hover:-translate-y-1 relative"
          onClick={() => setIsExpanded(true)}
          style={{
            background: 'linear-gradient(135deg, rgba(12,14,18,0.98) 0%, rgba(18,22,30,0.95) 100%)',
            backdropFilter: 'blur(18px) saturate(140%)',
            WebkitBackdropFilter: 'blur(18px) saturate(140%)',
            boxShadow: '0 24px 60px -24px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 204, 122, 0.18)',
          }}
        >
          {/* Animated golden shimmer overlay */}
          <motion.div
            className="absolute inset-0 pointer-events-none opacity-15"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(245,193,104,0.35) 50%, transparent 100%)',
            }}
            animate={{
              x: ['-100%', '200%'],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              repeatDelay: 2,
              ease: 'easeInOut',
            }}
          />

          {/* Floating sparkles when playing */}
          {isPlaying && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 rounded-full"
                  style={{
                    background: 'radial-gradient(circle, rgba(255,180,50,0.9) 0%, transparent 70%)',
                    left: `${15 + i * 15}%`,
                    boxShadow: '0 0 6px 2px rgba(255,180,50,0.4)',
                  }}
                  animate={{
                    y: [60, -20],
                    opacity: [0, 1, 0],
                    scale: [0.5, 1.2, 0.8],
                  }}
                  transition={{
                    duration: 2 + i * 0.3,
                    delay: i * 0.4,
                    repeat: Infinity,
                    ease: 'easeOut',
                  }}
                />
              ))}
            </div>
          )}

          {/* Progress Bar - Vibrant gradient */}
          <div className="relative h-1.5 w-full bg-gradient-to-r from-[#1b1f28] via-[#222833] to-[#1b1f28]">
            {isPlaying && (
              <div
                className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[#f6c86f] via-[#f1aa45] to-[#f7d18b]"
                style={{
                  boxShadow: '0 0 16px rgba(246,200,111,0.45)',
                }}
              />
            )}
          </div>

          <div className="flex items-center gap-5 p-4 pr-6 relative z-10">
            {/* Artwork with glow effect */}
            <div className="h-14 w-14 rounded-xl overflow-hidden flex-shrink-0 relative group"
              style={{
                boxShadow: isPlaying ? '0 4px 20px rgba(246,200,111,0.35), 0 0 0 2px rgba(245,193,104,0.4)' : '0 4px 12px rgba(0,0,0,0.4), 0 0 0 2px rgba(255,204,122,0.3)',
              }}
            >
              <StationArtwork
                station={nowPlaying}
                fallbackClassName="w-full h-full bg-gradient-to-br from-[#141822] to-[#1d2230] flex items-center justify-center text-amber-200 font-mono font-bold text-lg"
              />
              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-amber-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-2">
                <IconMapPin size={14} className="text-white drop-shadow" />
              </div>
            </div>

            {/* Station Info & Tuner */}
            <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5">
              <div className="flex items-baseline gap-3">
                <Text size="sm" fw={700} className="truncate text-amber-50">
                  {title}
                </Text>
                <Text size="xs" className="truncate text-amber-200/70 font-medium">
                  {subtitle}
                </Text>
              </div>
              <div className="flex items-center gap-2">
                <Text size="xs" className="truncate text-amber-100/70">
                  {triviaTitle}
                </Text>
                {isMobile ? (
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-full border border-amber-400/50 bg-amber-500/15 px-2.5 py-1 text-[11px] font-semibold text-amber-100 hover:border-amber-400/70"
                    onClick={handleOpenInsights}
                    aria-label="Open AI insights"
                  >
                    <IconSparkles size={12} />
                    AI Insights
                  </button>
                ) : (
                  <Popover
                    opened={insightsOpen}
                    onChange={setInsightsOpen}
                    position="top"
                    withArrow
                    shadow="md"
                    width={280}
                    withinPortal
                  >
                    <Popover.Target>
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-full border border-amber-400/50 bg-amber-500/15 px-2.5 py-1 text-[11px] font-semibold text-amber-100 hover:border-amber-400/70"
                        onClick={handleToggleInsights}
                        aria-label="Toggle AI insights"
                      >
                        <IconSparkles size={12} />
                        AI Insights
                      </button>
                    </Popover.Target>
                    <Popover.Dropdown className="border border-amber-400/20 bg-[#12151c] shadow-2xl">
                      {triviaContent}
                    </Popover.Dropdown>
                  </Popover>
                )}
              </div>
              {notice && (
                <div
                  className="flex items-center gap-2 rounded-xl border px-3 py-2"
                  style={{
                    borderColor:
                      notice.kind === "error"
                        ? "rgba(251,113,133,0.35)"
                        : notice.kind === "warning"
                          ? "rgba(245,193,104,0.35)"
                          : "rgba(245,193,104,0.2)",
                    background:
                      notice.kind === "error"
                        ? "linear-gradient(135deg, rgba(39,16,22,0.92) 0%, rgba(49,17,24,0.85) 100%)"
                        : notice.kind === "warning"
                          ? "linear-gradient(135deg, rgba(40,30,18,0.92) 0%, rgba(54,38,18,0.85) 100%)"
                          : "linear-gradient(135deg, rgba(20,23,31,0.9) 0%, rgba(24,28,36,0.85) 100%)",
                  }}
                  onClick={(e) => e.stopPropagation()}
                  role="status"
                  aria-live="polite"
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{
                      background:
                        notice.kind === "error"
                          ? "#fb7185"
                          : notice.kind === "warning"
                            ? "#f5c168"
                            : "#f5c168",
                    }}
                  />
                  <Text size="xs" className="flex-1 min-w-0 truncate text-amber-50 font-semibold">
                    {notice.message}
                  </Text>
                  <button
                    type="button"
                    className="text-[10px] font-bold uppercase tracking-[0.25em] text-amber-100/70 opacity-70 hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearNotice(notice.id);
                    }}
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* Minimal Tuner Scale - warm colors */}
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs font-bold text-amber-200 tabular-nums tracking-wider">{frequency} MHz</span>
                <div className="h-1.5 flex-1 bg-gradient-to-r from-[#1d2230] to-[#262c3a] rounded-full overflow-hidden relative">
                  <motion.div
                    className="absolute top-0 bottom-0 w-3 rounded-full bg-gradient-to-r from-[#f6c86f] to-[#f1aa45]"
                    style={{
                      left: `${frequencyPercent}%`,
                      transform: 'translateX(-50%)',
                      boxShadow: '0 0 12px rgba(246,200,111,0.5)',
                    }}
                    animate={isPlaying ? { scale: [1, 1.2, 1] } : {}}
                    transition={{ duration: 0.5, repeat: Infinity }}
                  />
                  {/* Subtle ticks */}
                  <div className="absolute inset-0 flex justify-between px-1">
                    {[0, 25, 50, 75, 100].map(p => (
                      <div key={p} className="w-px h-full bg-amber-200/20" />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Controls - Vibrant style */}
            <div className="flex items-center gap-2">
              <Tooltip label="Quick Retune" position="top" withArrow>
                <button
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-amber-400/30 bg-[#161a22] text-amber-100 hover:border-amber-400/60 transition-all active:scale-95 shadow-md"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleQuickRetune();
                  }}
                  aria-label="Quick Retune"
                >
                  <IconMapPin size={18} />
                </button>
              </Tooltip>

              <div className="h-8 w-px bg-white/10 mx-1" />

              <Tooltip label="Previous" position="top" withArrow>
                <button
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-[#151922] text-amber-100/70 hover:text-amber-100 transition-all active:scale-95 shadow-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrev();
                  }}
                  aria-label="Previous"
                >
                  <IconPlayerSkipBackFilled size={18} />
                </button>
              </Tooltip>

              <Tooltip label={isPlaying ? "Pause" : "Play"} position="top" withArrow>
                <motion.button
                  className="flex h-14 w-14 items-center justify-center rounded-full text-white transition-all"
                  style={{
                    background: 'linear-gradient(135deg, #f6c86f 0%, #f1aa45 55%, #e99f2b 100%)',
                    boxShadow: '0 10px 30px -6px rgba(246,200,111,0.45), 0 0 0 2px rgba(255,210,136,0.2)',
                  }}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.95 }}
                  animate={isPlaying ? { boxShadow: ['0 10px 30px -6px rgba(246,200,111,0.45)', '0 12px 36px -6px rgba(246,200,111,0.7)', '0 10px 30px -6px rgba(246,200,111,0.45)'] } : {}}
                  transition={isPlaying ? { duration: 1.5, repeat: Infinity } : {}}
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePlay();
                  }}
                  aria-label={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? <IconPlayerPauseFilled size={24} /> : <IconPlayerPlayFilled size={24} className="ml-0.5" />}
                </motion.button>
              </Tooltip>

              <Tooltip label="Next" position="top" withArrow>
                <button
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-[#151922] text-amber-100/70 hover:text-amber-100 transition-all active:scale-95 shadow-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNext();
                  }}
                  aria-label="Next"
                >
                  <IconPlayerSkipForwardFilled size={18} />
                </button>
              </Tooltip>
            </div>
          </div>
        </motion.div>
      </aside>

      {/* Mobile mini-player - Scrubbed Glass design */}
      {!isAiRoute && (
        <motion.div
          className="lg:hidden fixed left-0 right-0 z-40 px-3"
          style={{
            bottom: "calc(env(safe-area-inset-bottom) + 12px)"
          }}
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        >
          <motion.div
            data-raptor={raptorMiniEnabled ? "true" : "false"}
            onClick={() => setIsExpanded(true)}
            onPointerDown={handleMiniSwipeStart}
            onPointerMove={handleMiniSwipeMove}
            onPointerUp={handleMiniSwipeEnd}
            onPointerCancel={handleMiniSwipeEnd}
            className={`rounded-[2rem] overflow-hidden active:scale-[0.98] transition-transform cursor-pointer relative ${raptorMiniEnabled ? 'py-2 px-3' : 'py-3 px-4'}`}
            style={{
              background: 'linear-gradient(135deg, rgba(12,14,18,0.96) 0%, rgba(18,22,30,0.94) 100%)',
              backdropFilter: 'blur(18px)',
              WebkitBackdropFilter: 'blur(18px)',
              boxShadow: '0 18px 40px -18px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,204,122,0.15) inset',
              border: '1px solid rgba(255,204,122,0.15)',
            }}
          >
            {/* Glass Shine Overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-40 pointer-events-none" />

            {/* Static status bar */}
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-white/10" />

            <div className="flex items-center gap-3.5 relative z-10 pt-1 px-1">
              <div
                className={`${raptorMiniEnabled ? 'h-10 w-10' : 'h-12 w-12'} overflow-visible flex items-center justify-center text-sm flex-shrink-0 relative`}
              >
                <div
                  className="w-full h-full rounded-xl overflow-hidden relative z-0"
                  style={{
                    boxShadow: '0 6px 16px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,204,122,0.25)',
                  }}
                >
                  <StationArtwork
                    station={nowPlaying}
                    fallbackClassName="w-full h-full flex items-center justify-center text-amber-200 bg-transparent backdrop-blur"
                  />
                </div>

                {/* AI Button - Pinned to Artwork */}
                <button
                  type="button"
                  className="absolute -top-1.5 -right-1.5 z-10 inline-flex h-6 items-center justify-center gap-1 rounded-full border border-amber-400/50 bg-[#171b24] px-2 text-[10px] font-semibold text-amber-100 shadow-[0_2px_10px_rgba(245,193,104,0.35)] active:scale-95 transition-all"
                  onClick={handleOpenInsights}
                  aria-label="Open AI insights"
                >
                  <IconSparkles size={12} />
                  AI
                </button>
              </div>

              <div className="min-w-0 flex-1 flex flex-col justify-center">
                <div className="flex items-center gap-2">
                  <div className="text-[13px] font-bold text-amber-50 truncate leading-tight shadow-sm">{title}</div>
                </div>
                <div className="text-[11px] text-amber-200/80 truncate leading-tight mt-0.5 font-bold tracking-wide">
                  {subtitle}
                </div>
              </div>

              {/* Mobile Controls - Embossed Glass */}
              <div className="flex items-center gap-2.5">
                {/* Quick Retune - Restored */}
                <button
                  className="flex h-9 w-9 items-center justify-center rounded-full text-amber-100/80 active:scale-95 transition-all"
                  style={{
                    background: 'rgba(20,24,32,0.85)',
                    border: '1px solid rgba(255,204,122,0.18)',
                    boxShadow: '0 6px 16px rgba(0,0,0,0.35)',
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleQuickRetune();
                  }}
                  aria-label="Quick Retune"
                >
                  <IconMapPin size={15} />
                </button>

                {/* Prev */}
                <button
                  className="flex h-9 w-9 items-center justify-center rounded-full text-amber-100/80 active:scale-95 transition-all"
                  style={{
                    background: 'rgba(20,24,32,0.85)',
                    border: '1px solid rgba(255,204,122,0.18)',
                    boxShadow: '0 6px 16px rgba(0,0,0,0.35)',
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrev();
                  }}
                  aria-label="Previous"
                >
                  <IconPlayerSkipBackFilled size={15} />
                </button>

                {/* Play/Pause - Embossed Active State */}
                <motion.button
                  className="flex h-12 w-12 items-center justify-center rounded-full text-white active:scale-95 transition-transform"
                  style={{
                    background: 'linear-gradient(135deg, #f6c86f, #f1aa45)',
                    boxShadow: '0 10px 24px rgba(245,193,104,0.4)',
                    border: '1px solid rgba(255,230,170,0.35)',
                  }}
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePlay();
                  }}
                  aria-label={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? <IconPlayerPauseFilled size={20} /> : <IconPlayerPlayFilled size={20} className="ml-0.5" />}
                </motion.button>

                {/* Next */}
                <button
                  className="flex h-9 w-9 items-center justify-center rounded-full text-amber-100/80 active:scale-95 transition-all"
                  style={{
                    background: 'rgba(20,24,32,0.85)',
                    border: '1px solid rgba(255,204,122,0.18)',
                    boxShadow: '0 6px 16px rgba(0,0,0,0.35)',
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNext();
                  }}
                  aria-label="Next"
                >
                  <IconPlayerSkipForwardFilled size={15} />
                </button>
              </div>
            </div>


            {/* Mobile Bottom Bar - Text Ticker & Freq */}
            <div className="mt-3 mx-1 mb-0.5"
              style={{
                position: "relative",
                width: "auto",
                height: "26px",
                background: "rgba(20,24,32,0.9)",
                borderRadius: "8px",
                padding: "0 10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                boxShadow: "inset 0 1px 2px rgba(0,0,0,0.2)",
                border: "1px solid rgba(255,204,122,0.15)"
              }}
            >
              {/* Marquee Song Title */}
              <div className="flex-1 overflow-hidden relative h-full flex items-center mask-image-linear-gradient-to-r">
                <div className="whitespace-nowrap text-[10px] font-mono font-medium text-amber-100/70 uppercase tracking-wide">
                  {triviaTitle}
                </div>
              </div>

              {/* Frequency Display */}
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: "0.75rem",
                  fontWeight: "bold",
                  color: "#f5c168",
                  display: "flex",
                  alignItems: "baseline",
                  gap: "2px",
                  paddingLeft: "12px",
                  position: "relative",
                  zIndex: 2
                }}
              >
                <span>{frequency}</span>
                <span style={{ fontSize: "0.55rem", opacity: 0.8 }}>MHz</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </>
  );
}
