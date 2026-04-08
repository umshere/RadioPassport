import { useEffect, useMemo, useCallback, useState, useRef, type MouseEvent } from "react";
import { useLocation, useNavigate } from "@remix-run/react";
import { Drawer, Text, Tooltip } from "@mantine/core";
import { motion, AnimatePresence } from "framer-motion";
import { StationArtwork } from "./StationArtwork";
import {
  IconPlayerPauseFilled,
  IconPlayerPlayFilled,
  IconPlayerSkipBackFilled,
  IconPlayerSkipForwardFilled,
  IconMapPin,
  IconSparkles,
  IconMoonStars,
  IconBrandYoutube,
  IconBrandWikipedia,
  IconLink,
  IconDisc,
  IconUser,
  IconMusic,
} from "@tabler/icons-react";
import { usePlayerStore } from "~/state/playerStore";
import { useUIStore } from "~/state/uiStore";
import { usePlayerNoticeStore } from "~/state/playerNoticeStore";
import { useNowPlayingMetadata } from "~/hooks/useNowPlayingMetadata";
import { useTrackTrivia } from "~/hooks/useTrackTrivia";
import { useElementSize, useMediaQuery } from "@mantine/hooks";
import { fitsPretextWidth, getPretextLineCount } from "~/utils/pretextLayout";
import { scrollToId } from "~/utils/scrollHelpers";
import { PretextMeasuredText } from "~/components/PretextMeasuredText";

const DOCK_TITLE_FONT =
  '700 14px "General Sans", "SF Pro Text", "Segoe UI", "Helvetica Neue", Arial, sans-serif';
const DOCK_SUBTITLE_FONT =
  '500 12px "General Sans", "SF Pro Text", "Segoe UI", "Helvetica Neue", Arial, sans-serif';
const DOCK_TRIVIA_FONT =
  '500 12px "General Sans", "SF Pro Text", "Segoe UI", "Helvetica Neue", Arial, sans-serif';
const DOCK_BUTTON_FONT =
  '600 11px "General Sans", "SF Pro Text", "Segoe UI", "Helvetica Neue", Arial, sans-serif';
const DOCK_MOBILE_TITLE_FONT =
  '700 13px "General Sans", "SF Pro Text", "Segoe UI", "Helvetica Neue", Arial, sans-serif';
const DOCK_MOBILE_SUBTITLE_FONT =
  '600 11px "General Sans", "SF Pro Text", "Segoe UI", "Helvetica Neue", Arial, sans-serif';
const DESKTOP_INSIGHTS_BUTTON_WIDTH = 152;
const DESKTOP_META_INLINE_ENTER_WIDTH = 520;
const DESKTOP_META_STACK_EXIT_WIDTH = 460;

export default function PlayerDock() {
  const location = useLocation();
  const navigate = useNavigate();
  const isAiRoute = location.pathname.startsWith("/ai");
  const isListeningRoute = location.pathname === "/listen";
  const hasInlineHeroInsights = location.pathname === "/";
  const isCountryView = location.pathname === "/" && new URLSearchParams(location.search).has("country");
  const notice = usePlayerNoticeStore((state) => state.notice);
  const clearNotice = usePlayerNoticeStore((state) => state.clearNotice);
  const nowPlaying = usePlayerStore((state) => state.nowPlaying);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const togglePlay = usePlayerStore((state) => state.togglePlay);
  const queue = usePlayerStore((state) => state.queue);
  const currentStationIndex = usePlayerStore((state) => state.currentStationIndex);
  const queueSourceLabel = usePlayerStore((state) => state.queueSourceLabel);
  const startStation = usePlayerStore((state) => state.startStation);
  const recordSkippedStation = usePlayerStore((state) => state.recordSkippedStation);

  const toggleQuickRetune = useUIStore((state) => state.toggleQuickRetune);
  const raptorMiniEnabled = useUIStore((state) => state.raptorMiniEnabled);
  const aiTriviaExpanded = useUIStore((state) => state.aiTriviaExpanded);
  const setAiTriviaExpanded = useUIStore((state) => state.setAiTriviaExpanded);
  const insightsOpen = useUIStore((state) => state.insightsOpen);
  const setInsightsOpen = useUIStore((state) => state.setInsightsOpen);

  const title = useMemo(() => nowPlaying?.name ?? "", [nowPlaying?.name]);
  const subtitle = useMemo(
    () => [nowPlaying?.country, nowPlaying?.state].filter(Boolean).join(" • "),
    [nowPlaying?.country, nowPlaying?.state]
  );

  const handleNext = useCallback(() => {
    if (queue.length === 0) return;
    if (nowPlaying?.uuid) {
      recordSkippedStation(nowPlaying.uuid);
    }

    // Calculate next index with proper wrapping
    const nextIndex = (currentStationIndex + 1) % queue.length;
    const nextStation = queue[nextIndex];

    if (nextStation) {
      // Update the index in the store before starting the station
      startStation(nextStation, { preserveQueue: true });
    }
  }, [queue, currentStationIndex, nowPlaying?.uuid, recordSkippedStation, startStation]);

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
    if (nowPlaying?.uuid) {
      recordSkippedStation(nowPlaying.uuid);
    }
    // Pick a random station different from current
    let randomIndex = Math.floor(Math.random() * queue.length);
    if (queue.length > 1 && randomIndex === currentStationIndex) {
      randomIndex = (randomIndex + 1) % queue.length;
    }
    const randomStation = queue[randomIndex];
    if (randomStation) {
      startStation(randomStation, { preserveQueue: true });
    }
  }, [queue, currentStationIndex, nowPlaying?.uuid, recordSkippedStation, startStation]);

  const isMobile = useMediaQuery("(max-width: 1024px)", false, { getInitialValueInEffect: true });
  const { ref: desktopMetaRef, width: desktopMetaWidth } = useElementSize();
  const [desktopMetaMode, setDesktopMetaMode] = useState<"stacked" | "inline">("stacked");
  const [mobileDockHidden, setMobileDockHidden] = useState(false);
  const handleOpenListeningPage = useCallback(
    (event?: { stopPropagation?: () => void }) => {
      event?.stopPropagation?.();
      navigate("/listen");
    },
    [navigate]
  );
  const nowPlayingMeta = useNowPlayingMetadata(nowPlaying, isPlaying);
  const scrollHeroIntoView = useCallback(() => {
    if (location.pathname !== "/") return;
    const params = new URLSearchParams(location.search);
    window.requestAnimationFrame(() => {
      scrollToId(params.has("country") ? "country-hero" : "home-hero", "start");
    });
  }, [location.pathname, location.search]);
  const handleOpenInsights = useCallback(
    (event?: MouseEvent) => {
      event?.stopPropagation();
      setAiTriviaExpanded(true);
      setInsightsOpen(true);
      scrollHeroIntoView();
    },
    [scrollHeroIntoView, setAiTriviaExpanded, setInsightsOpen]
  );
  const handleToggleInsights = useCallback(
    (event: MouseEvent) => {
      event.stopPropagation();
      if (!insightsOpen) {
        setAiTriviaExpanded(true);
        scrollHeroIntoView();
      }
      setInsightsOpen(!insightsOpen);
    },
    [insightsOpen, scrollHeroIntoView, setAiTriviaExpanded, setInsightsOpen]
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
  const stationFactItems = useMemo(
    () =>
      [
        nowPlaying?.country ? { label: "Country", value: nowPlaying.country } : null,
        nowPlaying?.state ? { label: "Region", value: nowPlaying.state } : null,
        nowPlaying?.language ? { label: "Language", value: nowPlaying.language } : null,
        nowPlaying?.bitrate ? { label: "Quality", value: `${nowPlaying.bitrate} kbps` } : null,
        nowPlaying?.codec ? { label: "Codec", value: nowPlaying.codec.toUpperCase() } : null,
      ].filter(Boolean) as Array<{ label: string; value: string }>,
    [nowPlaying?.bitrate, nowPlaying?.codec, nowPlaying?.country, nowPlaying?.language, nowPlaying?.state]
  );
  const mergedTrivia = useMemo(() => {
    const primary = aiTrivia.trivia ?? freeTrivia.trivia;
    const summary = aiTrivia.trivia?.summary ?? freeTrivia.trivia?.summary ?? null;
    const imageUrl = aiTrivia.trivia?.imageUrl ?? freeTrivia.trivia?.imageUrl ?? null;
    const facts = [
      ...(aiTrivia.trivia?.facts ?? []),
      ...(freeTrivia.trivia?.facts ?? []),
      ...stationFactItems,
    ].filter((fact, index, list) => {
      return list.findIndex(
        (candidate) =>
          candidate.label.toLowerCase() === fact.label.toLowerCase() &&
          candidate.value.toLowerCase() === fact.value.toLowerCase()
      ) === index;
    });
    const links = [...(aiTrivia.trivia?.links ?? []), ...(freeTrivia.trivia?.links ?? [])].filter(
      (link, index, list) => list.findIndex((candidate) => candidate.url === link.url) === index
    );
    return primary || summary || facts.length || links.length || imageUrl
      ? {
        source: aiTrivia.trivia ? "ai" : freeTrivia.trivia ? "free" : "station",
        summary,
        imageUrl,
        facts,
        links,
      }
      : null;
  }, [aiTrivia.trivia, freeTrivia.trivia, stationFactItems]);
  const canInlineDesktopMeta = useMemo(() => {
    if (!desktopMetaWidth || !title) return false;
    const titleFitsInline =
      getPretextLineCount(title, DOCK_TITLE_FONT, Math.floor(desktopMetaWidth * 0.56), 18) <= 1;
    const subtitleFitsInline =
      !subtitle ||
      getPretextLineCount(subtitle, DOCK_SUBTITLE_FONT, Math.floor(desktopMetaWidth * 0.34), 16) <= 1;
    return titleFitsInline && subtitleFitsInline;
  }, [desktopMetaWidth, subtitle, title]);
  const stackedDesktopMeta = desktopMetaMode === "stacked";

  useEffect(() => {
    if (!desktopMetaWidth || !title) return;
    setDesktopMetaMode((current) => {
      if (current === "stacked") {
        return canInlineDesktopMeta && desktopMetaWidth >= DESKTOP_META_INLINE_ENTER_WIDTH
          ? "inline"
          : "stacked";
      }
      return !canInlineDesktopMeta && desktopMetaWidth <= DESKTOP_META_STACK_EXIT_WIDTH
        ? "stacked"
        : "inline";
    });
  }, [canInlineDesktopMeta, desktopMetaWidth, title]);

  const desktopInsightsLabel = useMemo(() => {
    if (desktopMetaWidth <= 0) return "Insights";
    const labelBudget = DESKTOP_INSIGHTS_BUTTON_WIDTH - 34;
    if (desktopMetaWidth >= DESKTOP_META_INLINE_ENTER_WIDTH && fitsPretextWidth("AI Insights", DOCK_BUTTON_FONT, labelBudget, 0)) {
      return "AI Insights";
    }
    if (fitsPretextWidth("Insights", DOCK_BUTTON_FONT, labelBudget, 0)) {
      return "Insights";
    }
    return "AI";
  }, [desktopMetaWidth]);
  const lastTrackKeyRef = useRef<string>("");
  const lastStationRef = useRef<string | null>(null);

  useEffect(() => {
    const stationId = nowPlaying?.uuid ?? null;
    if (stationId !== lastStationRef.current) {
      setAiTriviaExpanded(false);
      setWarmupSeen(false);
      lastStationRef.current = stationId;
      if (trackKey) {
        lastTrackKeyRef.current = trackKey;
      }
      return;
    }
    if (trackKey && trackKey !== lastTrackKeyRef.current) {
      setAiTriviaExpanded(false);
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
        return IconLink;
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
              <PretextMeasuredText
                text={state.trivia.summary}
                font={DOCK_TRIVIA_FONT}
                lineHeight={18}
                collapsedLines={3}
                lineClassName="text-sm font-semibold text-amber-50"
                fallbackClassName="text-sm font-semibold text-amber-50"
              />
            </div>
          </div>
        )}
        {!state.trivia.imageUrl && (
          <PretextMeasuredText
            text={state.trivia.summary}
            font={DOCK_TRIVIA_FONT}
            lineHeight={18}
            collapsedLines={3}
            expandable
            moreLabel="Expand note"
            lessLabel="Collapse note"
            lineClassName="text-sm font-semibold text-amber-50"
            fallbackClassName="text-sm font-semibold text-amber-50"
          />
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
        {mergedTrivia ? (
          <div className="space-y-2">
            {mergedTrivia.imageUrl && mergedTrivia.summary ? (
              <div className="flex items-center gap-3">
                <img
                  src={mergedTrivia.imageUrl}
                  alt="Track artwork"
                  className="h-12 w-12 rounded-lg object-cover shadow-sm"
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
                <div className="min-w-0">
                  <PretextMeasuredText
                    text={mergedTrivia.summary}
                    font={DOCK_TRIVIA_FONT}
                    lineHeight={18}
                    collapsedLines={3}
                    lineClassName="text-sm font-semibold text-amber-50"
                    fallbackClassName="text-sm font-semibold text-amber-50"
                  />
                </div>
              </div>
            ) : mergedTrivia.summary ? (
              <PretextMeasuredText
                text={mergedTrivia.summary}
                font={DOCK_TRIVIA_FONT}
                lineHeight={18}
                collapsedLines={3}
                expandable
                moreLabel="Expand note"
                lessLabel="Collapse note"
                lineClassName="text-sm font-semibold text-amber-50"
                fallbackClassName="text-sm font-semibold text-amber-50"
              />
            ) : null}
            <div className="space-y-1 text-xs text-amber-100/70">
              {mergedTrivia.facts.slice(0, 6).map((fact) => (
                <div key={`${fact.label}-${fact.value}`} className="flex items-center gap-2">
                  <span className="font-semibold text-amber-50">{fact.label}</span>
                  <span className="text-amber-100/50">•</span>
                  <span>{fact.value}</span>
                </div>
              ))}
            </div>
            {mergedTrivia.links.length > 0 && (
              <div className="flex flex-wrap gap-2 text-[11px]">
                {mergedTrivia.links.map((link) => {
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
              Source: {mergedTrivia.source === "ai" ? "AI + metadata" : mergedTrivia.source === "free" ? "MusicBrainz + station" : "Station metadata"}
            </Text>
          </div>
        ) : (
          renderTriviaBody(freeTrivia, "details")
        )}
        {showEmptyHint && !warmupSeen && (
          <div className="rounded-lg border border-amber-400/30 bg-[#151922] px-3 py-2 text-[11px] text-amber-100/70 shadow-sm">
            <div className="font-semibold text-amber-50">Spotlight is warming up.</div>
            <div className="text-amber-100/60">Ask AI for quick facts while we wait for metadata.</div>
          </div>
        )}
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

  useEffect(() => {
    if (typeof document === "undefined") return;

    const clearance = !isMounted || !nowPlaying || isListeningRoute
      ? "0px"
      : isMobile
        ? "116px"
        : "156px";

    document.documentElement.style.setProperty("--player-dock-clearance", clearance);

    return () => {
      document.documentElement.style.removeProperty("--player-dock-clearance");
    };
  }, [isListeningRoute, isMobile, isMounted, nowPlaying]);

  useEffect(() => {
    if (!isMounted || !isMobile || !nowPlaying || isListeningRoute) {
      setMobileDockHidden(false);
      return;
    }

    let lastY = window.scrollY;

    const handleScroll = () => {
      const nextY = window.scrollY;
      const delta = nextY - lastY;

      if (insightsOpen || nextY < 72) {
        setMobileDockHidden(false);
      } else if (Math.abs(delta) >= 10) {
        setMobileDockHidden(delta > 0);
      }

      lastY = nextY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [insightsOpen, isListeningRoute, isMobile, isMounted, nowPlaying]);

  if (!isMounted || !nowPlaying || isListeningRoute) return null;

  // Desktop dock
  return (
    <>
      <Drawer
        opened={Boolean(isMobile) && insightsOpen && !hasInlineHeroInsights}
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

      <aside className="pointer-events-none fixed bottom-6 left-1/2 z-30 hidden w-full max-w-3xl -translate-x-1/2 px-4 lg:block">
        <motion.div
          className="pointer-events-auto rounded-3xl overflow-hidden transition-transform hover:-translate-y-1 relative"
          style={{
            background: 'linear-gradient(135deg, rgba(12,14,18,0.98) 0%, rgba(18,22,30,0.95) 100%)',
            backdropFilter: 'blur(18px) saturate(140%)',
            WebkitBackdropFilter: 'blur(18px) saturate(140%)',
            boxShadow: '0 24px 60px -24px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 204, 122, 0.18)',
          }}
        >
          <div className="relative z-10 flex items-center gap-5 p-4 pr-6">
            {/* Artwork with glow effect */}
            <div className="h-14 w-14 rounded-xl overflow-hidden flex-shrink-0 relative group"
              style={{
                boxShadow: isPlaying ? '0 4px 20px rgba(246,200,111,0.35), 0 0 0 2px rgba(245,193,104,0.4)' : '0 4px 12px rgba(0,0,0,0.4), 0 0 0 2px rgba(255,204,122,0.3)',
              }}
            >
              <StationArtwork
                station={nowPlaying}
                fallbackClassName="w-full h-full bg-gradient-to-br from-[#141822] to-[#1d2230] flex items-center justify-center text-amber-200 font-mono font-bold text-lg"
                loading="eager"
                sizes="56px"
              />
              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-amber-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-2">
                <IconMapPin size={14} className="text-white drop-shadow" />
              </div>
            </div>

            {/* Station Info */}
            <div ref={desktopMetaRef} className="flex-1 min-w-0 flex flex-col justify-center gap-1.5 min-h-[78px]">
              <div className={stackedDesktopMeta ? "min-h-[38px] space-y-0.5" : "min-h-[38px] flex items-start gap-3"}>
                <div className={stackedDesktopMeta ? "min-w-0" : "min-w-0 max-w-[58%]"}>
                  <PretextMeasuredText
                    text={title}
                    font={DOCK_TITLE_FONT}
                    lineHeight={18}
                    collapsedLines={stackedDesktopMeta ? 2 : 1}
                    lineClassName="text-sm font-bold text-amber-50"
                    fallbackClassName="text-sm font-bold text-amber-50"
                  />
                </div>
                {subtitle ? (
                  <div className={stackedDesktopMeta ? "min-w-0" : "min-w-0 flex-1 pt-0.5"}>
                    <PretextMeasuredText
                      text={subtitle}
                      font={DOCK_SUBTITLE_FONT}
                      lineHeight={16}
                      collapsedLines={1}
                      lineClassName="text-xs font-medium text-amber-200/70"
                      fallbackClassName="text-xs font-medium text-amber-200/70"
                    />
                  </div>
                ) : null}
              </div>
              <div className="min-h-[18px] flex items-center gap-2">
                <Text size="xs" className="truncate text-amber-50/80 font-semibold uppercase tracking-[0.2em]">
                  {queueSourceLabel}
                </Text>
                <span className="text-amber-100/30">•</span>
                <Text size="xs" className="truncate text-amber-100/70">
                  {triviaTitle}
                </Text>
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

            </div>

            {/* Controls - Vibrant style */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-[#141822] px-2 py-2 shadow-[0_8px_20px_rgba(0,0,0,0.28)]">
                <button
                  type="button"
                  className={`inline-flex h-9 w-[152px] shrink-0 items-center justify-center gap-2 rounded-full border px-3 text-[11px] font-semibold transition-colors ${insightsOpen
                    ? "border-amber-300/80 bg-amber-500/18 text-amber-50 shadow-[0_0_0_1px_rgba(255,214,127,0.14)_inset]"
                    : "border-amber-400/35 bg-amber-500/12 text-amber-100 hover:border-amber-400/70"
                    }`}
                  onClick={handleToggleInsights}
                  aria-label="Toggle hero insights"
                  aria-pressed={insightsOpen}
                >
                  <IconSparkles size={12} />
                  {insightsOpen ? "Insights On" : desktopInsightsLabel}
                </button>

                <Tooltip label="Quick Retune" position="top" withArrow>
                  <button
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-amber-400/22 bg-[#161a22] text-amber-100 hover:border-amber-400/60 transition-all active:scale-95 shadow-md"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleQuickRetune();
                    }}
                    aria-label="Quick Retune"
                  >
                    <IconMapPin size={17} />
                  </button>
                </Tooltip>

                <Tooltip label="Open Listening Page" position="top" withArrow>
                  <button
                    className="flex h-9 items-center justify-center gap-2 rounded-full border border-amber-400/22 bg-[#161a22] px-3 text-amber-100 hover:border-amber-400/60 transition-all active:scale-95 shadow-md"
                    onClick={handleOpenListeningPage}
                    aria-label="Open listening page"
                  >
                    <IconMoonStars size={15} />
                    Zen
                  </button>
                </Tooltip>
              </div>

              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-[#141822] px-2 py-2 shadow-[0_8px_20px_rgba(0,0,0,0.28)]">
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
          </div>
        </motion.div>
      </aside>

      {/* Mobile mini-player - Scrubbed Glass design */}
      {!isAiRoute && (
        <motion.div
          className="lg:hidden fixed left-0 right-0 z-40 px-3"
          style={{
            bottom: "calc(env(safe-area-inset-bottom) + 12px)",
            pointerEvents: mobileDockHidden ? "none" : "auto",
          }}
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: mobileDockHidden ? 120 : 0, opacity: mobileDockHidden ? 0 : 1 }}
          transition={{ type: 'spring', damping: 28, stiffness: 240 }}
        >
          <motion.div
            data-raptor={raptorMiniEnabled ? "true" : "false"}
            className={`rounded-[1.75rem] overflow-hidden active:scale-[0.985] transition-transform relative ${raptorMiniEnabled ? 'py-2 px-3' : 'py-2.5 px-3.5'}`}
            style={{
              background: 'linear-gradient(135deg, rgba(12,14,18,0.96) 0%, rgba(18,22,30,0.94) 100%)',
              backdropFilter: 'blur(18px)',
              WebkitBackdropFilter: 'blur(18px)',
              boxShadow: '0 16px 36px -18px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,204,122,0.15) inset',
              border: '1px solid rgba(255,204,122,0.15)',
            }}
          >
            <div className="flex items-center gap-3 relative z-10 px-0.5 py-0.5">
              <div
                className={`${raptorMiniEnabled ? 'h-10 w-10' : 'h-11 w-11'} overflow-visible flex items-center justify-center text-sm flex-shrink-0 relative`}
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
                    loading="eager"
                    sizes="44px"
                  />
                </div>

                {/* AI Button - Pinned to Artwork */}
                {!hasInlineHeroInsights ? (
                  <button
                    type="button"
                    className="absolute -top-1.5 -right-1.5 z-10 inline-flex h-6 items-center justify-center gap-1 rounded-full border border-amber-400/50 bg-[#171b24] px-2 text-[10px] font-semibold text-amber-100 shadow-[0_2px_10px_rgba(245,193,104,0.35)] active:scale-95 transition-all"
                    onClick={handleOpenInsights}
                    aria-label="Open AI insights"
                  >
                    <IconSparkles size={12} />
                    AI
                  </button>
                ) : null}
              </div>

              <div className="min-w-0 flex-1 flex flex-col justify-center">
                <PretextMeasuredText
                  text={title}
                  font={DOCK_MOBILE_TITLE_FONT}
                  lineHeight={16}
                  collapsedLines={raptorMiniEnabled ? 1 : 2}
                  lineClassName="text-[13px] font-bold leading-tight text-amber-50"
                  fallbackClassName="text-[13px] font-bold leading-tight text-amber-50"
                />
                <div className="mt-0.5 text-[9px] text-amber-50/68 truncate uppercase tracking-[0.18em]">
                  {queueSourceLabel}
                </div>
                {subtitle ? (
                  <PretextMeasuredText
                    text={subtitle}
                    font={DOCK_MOBILE_SUBTITLE_FONT}
                    lineHeight={14}
                    collapsedLines={1}
                    lineClassName="mt-0.5 text-[11px] font-semibold leading-tight text-amber-200/80"
                    fallbackClassName="mt-0.5 text-[11px] font-semibold leading-tight text-amber-200/80"
                  />
                ) : null}
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

                <button
                  className="flex h-9 w-9 items-center justify-center rounded-full text-amber-100/80 active:scale-95 transition-all"
                  style={{
                    background: 'rgba(20,24,32,0.85)',
                    border: '1px solid rgba(255,204,122,0.18)',
                    boxShadow: '0 6px 16px rgba(0,0,0,0.35)',
                  }}
                  onClick={handleOpenListeningPage}
                  aria-label="Open listening page"
                >
                  <IconMoonStars size={15} />
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


          </motion.div>
        </motion.div>
      )}
    </>
  );
}
