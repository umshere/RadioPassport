import type { PointerEvent as ReactPointerEvent } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Badge, Title, Text, ActionIcon } from "@mantine/core";
import {
  IconArrowLeft,
  IconBroadcast,
  IconPlayerPauseFilled,
  IconPlayerPlayFilled,
  IconPlayerSkipBackFilled,
  IconPlayerSkipForwardFilled,
  IconSparkles,
  IconBrandYoutube,
  IconBrandWikipedia,
  IconUser,
  IconDisc,
  IconMusic,
  IconExternalLink,
  IconLanguage,
  IconTags,
  IconClock,
} from "@tabler/icons-react";
import { CountryFlag } from "~/components/CountryFlag";
import type { Country, Station } from "~/types/radio";
import type { TrackTrivia } from "~/types/trivia";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNowPlayingMetadata } from "~/hooks/useNowPlayingMetadata";
import { useTrackTrivia } from "~/hooks/useTrackTrivia";
import { useUIStore } from "~/state/uiStore";
import { useMediaQuery } from "@mantine/hooks";

type CountryOverviewProps = {
  selectedCountry: string;
  selectedCountryMeta: Country | null;
  stationCount: number;
  stations: Station[];
  onBack: () => void;
  nowPlaying?: Station | null;
  isPlaying?: boolean;
  onPlayPause?: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  queue: Station[];
  currentIndex: number;
  onSelectStation: (station: Station) => void;
  transparent?: boolean;
};

export function CountryOverview({
  selectedCountry,
  selectedCountryMeta,
  stationCount,
  stations,
  onBack,
  nowPlaying,
  isPlaying = false,
  onPlayPause,
  onNext,
  onPrev,
  queue,
  currentIndex,
  onSelectStation,
  transparent = false,
}: CountryOverviewProps) {
  const { aiTriviaExpanded, setAiTriviaExpanded, setInsightsOpen } = useUIStore();
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const { scrollY } = useScroll();
  const parallaxDistance = isDesktop ? 90 : 0;
  const leftColumnY = useTransform(scrollY, [0, 600], [0, -parallaxDistance]);
  const rightColumnY = useTransform(scrollY, [0, 600], [0, parallaxDistance]);



  const settleTimerRef = useRef<number | null>(null);
  const inertiaRef = useRef<number | null>(null);
  const lastAngleRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const velocityRef = useRef(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const [tunerExpanded, setTunerExpanded] = useState(false);
  const lastScrollYRef = useRef(0);
  const [dialValue, setDialValue] = useState(0);
  const [dialIndex, setDialIndex] = useState(0);
  const [isDialing, setIsDialing] = useState(false);
  const dialValueRef = useRef(0);
  const lastIndexRef = useRef<number>(0);

  const deriveFrequency = useCallback((target: Station) => {
    let hash = 0;
    for (let i = 0; i < target.uuid.length; i++) {
      hash = target.uuid.charCodeAt(i) + ((hash << 5) - hash);
    }
    const range = 108.0 - 88.0;
    const normalized = Math.abs(hash % 1000) / 1000;
    return 88.0 + normalized * range;
  }, []);

  const boundedQueue = nowPlaying ? (queue.length > 0 ? queue : [nowPlaying]) : [];
  const totalStations = boundedQueue.length;
  const clampedIndex = Math.max(0, Math.min(currentIndex, totalStations - 1));
  const displayStation = boundedQueue[dialIndex] ?? nowPlaying ?? null;
  const isPreviewing = Boolean(nowPlaying && displayStation && displayStation.uuid !== nowPlaying.uuid);
  const insights = useMemo(() => {
    const languageCounts = new Map<string, number>();
    const tagCounts = new Map<string, number>();
    for (const station of stations) {
      if (station.language) {
        const key = station.language.trim();
        if (key) languageCounts.set(key, (languageCounts.get(key) ?? 0) + 1);
      }
      for (const tag of station.tagList ?? []) {
        const key = tag.trim();
        if (key) tagCounts.set(key, (tagCounts.get(key) ?? 0) + 1);
      }
    }
    const topLanguages = [...languageCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([label]) => label);
    const topGenres = [...tagCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([label]) => label);
    const timeZoneName =
      new Intl.DateTimeFormat(undefined, { timeZoneName: "short" })
        .formatToParts(new Date())
        .find((part) => part.type === "timeZoneName")?.value ?? "Local";
    const localTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return { topLanguages, topGenres, timeZoneName, localTime };
  }, [stations]);
  const [showAllLanguages, setShowAllLanguages] = useState(false);
  const [showAllGenres, setShowAllGenres] = useState(false);

  const syncDialFromIndex = useCallback((index: number) => {
    const bounded = Math.max(0, Math.min(index, totalStations - 1));
    setDialIndex(bounded);
    lastIndexRef.current = bounded;
    if (totalStations <= 1) {
      setDialValue(0);
      dialValueRef.current = 0;
      return;
    }
    const nextValue = bounded / (totalStations - 1);
    setDialValue(nextValue);
    dialValueRef.current = nextValue;
  }, [totalStations]);

  useEffect(() => {
    if (!nowPlaying || isDialing) return;
    syncDialFromIndex(clampedIndex);
  }, [clampedIndex, isDialing, nowPlaying, syncDialFromIndex]);

  useEffect(() => {
    return () => {
      if (settleTimerRef.current) {
        window.clearTimeout(settleTimerRef.current);
      }
      if (inertiaRef.current) {
        window.cancelAnimationFrame(inertiaRef.current);
      }
    };
  }, []);

  const playClick = useCallback(() => {
    try {
      const context = audioCtxRef.current ?? new AudioContext();
      audioCtxRef.current = context;
      if (context.state === "suspended") {
        context.resume();
      }
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = "square";
      osc.frequency.value = 1200;
      gain.gain.value = 0.0001;
      osc.connect(gain);
      gain.connect(context.destination);
      const now = context.currentTime;
      gain.gain.exponentialRampToValueAtTime(0.08, now + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);
      osc.start(now);
      osc.stop(now + 0.04);
    } catch {
      // Ignore audio errors on unsupported platforms.
    }
  }, []);

  const tickFeedback = useCallback((nextIndex: number) => {
    if (nextIndex !== lastIndexRef.current) {
      lastIndexRef.current = nextIndex;
      playClick();
      if (navigator.vibrate) {
        navigator.vibrate(8);
      }
    }
  }, [playClick]);

  const scheduleTune = useCallback((index: number) => {
    if (!nowPlaying) return;
    if (settleTimerRef.current) {
      window.clearTimeout(settleTimerRef.current);
    }
    settleTimerRef.current = window.setTimeout(() => {
      const nextStation = boundedQueue[index];
      if (!nextStation || nextStation.uuid === nowPlaying.uuid) return;
      onSelectStation(nextStation);
    }, 650);
  }, [boundedQueue, nowPlaying, onSelectStation]);

  const handleDialValue = useCallback((value: number) => {
    if (totalStations <= 1) return;
    const clamped = Math.min(1, Math.max(0, value));
    const nextIndex = Math.round(clamped * (totalStations - 1));
    setDialValue(clamped);
    dialValueRef.current = clamped;
    setDialIndex(nextIndex);
    tickFeedback(nextIndex);
    scheduleTune(nextIndex);
  }, [scheduleTune, tickFeedback, totalStations]);

  const handleDialPointer = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (totalStations <= 1) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const angle = Math.atan2(event.clientY - centerY, event.clientX - centerX);
    const angleDeg = (angle * 180) / Math.PI;
    const minAngle = -135;
    const maxAngle = 135;
    const clamped = Math.min(maxAngle, Math.max(minAngle, angleDeg));
    const normalized = (clamped - minAngle) / (maxAngle - minAngle);
    const now = performance.now();
    if (lastTimeRef.current !== null && lastAngleRef.current !== null) {
      const dt = now - lastTimeRef.current;
      if (dt > 0) {
        velocityRef.current = (clamped - lastAngleRef.current) / dt;
      }
    }
    lastAngleRef.current = clamped;
    lastTimeRef.current = now;
    handleDialValue(normalized);
  }, [handleDialValue, totalStations]);

  const frequencyValue = displayStation ? deriveFrequency(displayStation) : 0;
  const frequency = frequencyValue.toFixed(1);

  const freqNum = frequencyValue;
  const tickStart = Math.floor(freqNum) - 2;
  const ticks = Array.from({ length: 25 }, (_, i) => tickStart + i * 0.2);
  const nowPlayingMeta = useNowPlayingMetadata(nowPlaying ?? null, Boolean(isPlaying));
  const [cachedFreeTrivia, setCachedFreeTrivia] = useState<TrackTrivia | null>(null);
  const freeTrivia = useTrackTrivia({
    track: nowPlayingMeta.track,
    source: "free",
    enabled: Boolean(nowPlaying),
  });
  const aiTrivia = useTrackTrivia({
    track: nowPlayingMeta.track,
    source: "ai",
    enabled: aiTriviaExpanded,
    context: {
      summary: freeTrivia.trivia?.summary ?? cachedFreeTrivia?.summary ?? null,
      facts: freeTrivia.trivia?.facts ?? cachedFreeTrivia?.facts ?? [],
    },
  });
  const trackLine =
    nowPlayingMeta.status === "ready" && nowPlayingMeta.track
      ? [nowPlayingMeta.track.artist, nowPlayingMeta.track.title]
        .filter(Boolean)
        .join(" — ")
      : nowPlayingMeta.status === "loading"
        ? "Identifying track…"
        : nowPlayingMeta.status === "empty"
          ? "On-air update soon"
          : nowPlayingMeta.status === "error"
            ? "Track info unavailable"
            : "Listening live";
  const lastTrackKeyRef = useRef<string>("");
  const lastStationRef = useRef<string | null>(null);
  const trackKey = nowPlayingMeta.track
    ? `${nowPlayingMeta.track.artist ?? ""}|${nowPlayingMeta.track.title ?? ""}`
    : "";

  useEffect(() => {
    lastScrollYRef.current = typeof window !== "undefined" ? window.scrollY : 0;
  }, []);

  useEffect(() => {
    if (freeTrivia.status === "ready" && freeTrivia.trivia) {
      setCachedFreeTrivia(freeTrivia.trivia);
    }
  }, [freeTrivia.status, freeTrivia.trivia]);

  useEffect(() => {
    const stationId = nowPlaying?.uuid ?? null;
    if (stationId !== lastStationRef.current) {
      lastStationRef.current = stationId;
      setCachedFreeTrivia(null);
      if (trackKey) {
        lastTrackKeyRef.current = trackKey;
      }
      return;
    }
    if (trackKey && trackKey !== lastTrackKeyRef.current) {
      lastTrackKeyRef.current = trackKey;
      setCachedFreeTrivia(null);
    }
  }, [nowPlaying?.uuid, trackKey]);

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

  const containerClasses = transparent
    ? "relative overflow-hidden rounded-3xl border border-white/10 bg-[var(--rp-surface)] backdrop-blur-xl px-6 py-8 md:px-10 md:py-10 shadow-[0_24px_60px_rgba(0,0,0,0.55)]"
    : "relative overflow-hidden rounded-3xl border border-white/10 bg-[var(--rp-surface)] backdrop-blur-xl px-6 py-8 md:px-10 md:py-10 shadow-[0_24px_60px_rgba(0,0,0,0.55)]";

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={containerClasses}
      style={{ position: 'relative' }}
    >
      <div className="relative z-10 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-white/10 bg-black/40 px-4 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--rp-text)] shadow-[0_10px_24px_rgba(0,0,0,0.45)] hover:bg-black/60"
          >
            <IconArrowLeft size={14} />
            Back to Atlas
          </button>
          <Badge
            radius="xl"
            size="lg"
            leftSection={<IconBroadcast size={16} />}
            className="bg-black/40 text-[var(--rp-text)] border border-white/10 shadow-[0_10px_24px_rgba(0,0,0,0.45)]"
          >
            {stationCount.toLocaleString()} stations
          </Badge>
        </div>

        <div className="sticky top-4 z-20 md:hidden">
          <div className="rounded-2xl border border-white/10 bg-black/60 px-3 py-2 shadow-[0_10px_24px_rgba(0,0,0,0.6)] backdrop-blur">
            <div className="flex items-center gap-3">
              <CountryFlag
                iso={selectedCountryMeta?.iso_3166_1}
                title={`${selectedCountry} flag`}
                size={36}
                className="rounded-lg border border-white/20 shadow-[0_8px_18px_rgba(0,0,0,0.45)]"
              />
              <div className="min-w-0 flex-1">
                <Text size="xs" fw={700} className="truncate text-[var(--rp-text)]">
                  {selectedCountry}
                </Text>
                <Text size="xs" c="var(--rp-muted)" className="truncate">
                  {displayStation?.name ?? nowPlaying?.name ?? "Choose a station"}
                </Text>
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(245,177,45,0.5)] bg-[rgba(245,177,45,0.12)] px-2 py-1 text-[10px] font-semibold text-[var(--rp-gold)]"
                onClick={() => {
                  setAiTriviaExpanded(true);
                  setInsightsOpen(true);
                }}
              >
                <IconSparkles size={12} />
                Insights
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-12 lg:items-start">
          <motion.div
            className="flex flex-col gap-4 lg:col-span-3 order-1"
            style={{ y: leftColumnY }}
          >
            <div className="order-2 hidden rounded-3xl border border-white/10 bg-[var(--rp-card)] p-3 shadow-[0_18px_40px_rgba(0,0,0,0.5)] md:order-1 md:block md:p-4">
              <div className="flex items-center gap-4">
                <CountryFlag
                  iso={selectedCountryMeta?.iso_3166_1}
                  title={`${selectedCountry} flag`}
                  size={56}
                  className="rounded-xl border border-white/20 shadow-[0_10px_22px_rgba(0,0,0,0.45)]"
                />
                <div>
                  <Title order={1} className="text-2xl md:text-3xl font-semibold text-[var(--rp-text)]">
                    {selectedCountry}
                  </Title>
                  <Text size="sm" c="var(--rp-muted)">
                    Explore local voices and regional soundscapes in real time.
                  </Text>
                </div>
              </div>
              {selectedCountryMeta && (
                <div className="mt-4 flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--rp-muted-2)]">
                  <span className="rounded-full border border-white/10 bg-black/40 px-3 py-1">
                    Passport {selectedCountryMeta.iso_3166_1}
                  </span>
                  <span className="rounded-full border border-white/10 bg-black/40 px-3 py-1">
                    {stationCount.toLocaleString()} signals
                  </span>
                </div>
              )}
            </div>

            <div className="order-3 rounded-3xl border border-white/10 bg-[var(--rp-card)] p-3 shadow-[0_12px_24px_rgba(0,0,0,0.45)] md:p-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--rp-muted-2)]">
                Country Insights
              </div>
              <div className="mt-3 grid gap-3 text-sm text-slate-700 md:grid-cols-1">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/40 text-[var(--rp-gold)]">
                    <IconLanguage size={16} />
                  </span>
                  <div className="min-w-0">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--rp-muted-2)]">
                      Languages
                    </div>
                    {insights.topLanguages.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(showAllLanguages ? insights.topLanguages : insights.topLanguages.slice(0, 4)).map((label) => (
                          <span
                            key={label}
                            className="rounded-full border border-white/10 bg-black/40 px-2 py-0.5 text-[11px] font-semibold text-[var(--rp-text)]"
                            title={label}
                          >
                            {label}
                          </span>
                        ))}
                        {insights.topLanguages.length > 4 && (
                          <button
                            type="button"
                            onClick={() => setShowAllLanguages((prev) => !prev)}
                            className="rounded-full border border-white/10 bg-black/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--rp-muted-2)]"
                          >
                            {showAllLanguages ? "Show less" : `+${insights.topLanguages.length - 4} more`}
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm font-medium text-[var(--rp-text)]">Mixed</div>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/40 text-[var(--rp-gold)]">
                    <IconTags size={16} />
                  </span>
                  <div className="min-w-0">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--rp-muted-2)]">
                      Top Genres
                    </div>
                    {insights.topGenres.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(showAllGenres ? insights.topGenres : insights.topGenres.slice(0, 4)).map((label) => (
                          <span
                            key={label}
                            className="rounded-full border border-white/10 bg-black/40 px-2 py-0.5 text-[11px] font-semibold text-[var(--rp-text)]"
                            title={label}
                          >
                            {label}
                          </span>
                        ))}
                        {insights.topGenres.length > 4 && (
                          <button
                            type="button"
                            onClick={() => setShowAllGenres((prev) => !prev)}
                            className="rounded-full border border-white/10 bg-black/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--rp-muted-2)]"
                          >
                            {showAllGenres ? "Show less" : `+${insights.topGenres.length - 4} more`}
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm font-medium text-[var(--rp-text)]">Curated mix</div>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/40 text-[var(--rp-gold)]">
                    <IconClock size={16} />
                  </span>
                  <div className="min-w-0">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--rp-muted-2)]">
                      Local Time
                    </div>
                    <div className="truncate text-sm font-medium text-[var(--rp-text)]">
                      {insights.localTime} {insights.timeZoneName}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          <div className="space-y-5 lg:col-span-6 order-3 lg:order-2">
            {nowPlaying ? (
              <div className="rounded-3xl border border-white/10 bg-[var(--rp-card)] p-4 shadow-[0_18px_40px_rgba(0,0,0,0.5)] md:p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--rp-muted-2)]">
                    Tuning Console
                  </div>
                  <button
                    type="button"
                    onClick={() => setTunerExpanded((prev) => !prev)}
                    className="md:hidden inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--rp-text)] shadow-[0_8px_18px_rgba(0,0,0,0.45)]"
                    aria-expanded={tunerExpanded}
                  >
                    {tunerExpanded ? "Collapse" : "Expand"}
                  </button>
                </div>
                <div
                  className={`mt-4 flex flex-col gap-4 md:flex-row md:items-start md:gap-6 ${
                    tunerExpanded ? "block" : "hidden"
                  } md:flex`}
                >
                  <div className="flex flex-col gap-4 md:flex-1">
                    <div className="relative h-20 w-full overflow-hidden rounded-2xl border border-white/10 bg-black/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                      <div className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-between px-6">
                        {ticks.map((tick, i) => {
                          const isMajor = i % 5 === 0;
                          const isNearCurrent = Math.abs(tick - freqNum) < 1.5;
                          return (
                            <div
                              key={i}
                              className="flex flex-col items-center gap-2"
                              style={{ opacity: isNearCurrent ? 1 : 0.3 }}
                            >
                              <div className={`w-px bg-[var(--rp-muted-2)] ${isMajor ? "h-5" : "h-3"}`} />
                              {isMajor && (
                                <span className="text-[9px] font-bold text-[var(--rp-muted-2)]">
                                  {Math.floor(tick)}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="h-full w-0.5 bg-red-500" />
                        <div className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rotate-45 bg-red-500" />
                      </div>
                    </div>

                    <div className="flex flex-col items-center gap-2 text-center md:hidden">
                      <div
                        onPointerDown={(event) => {
                          event.currentTarget.setPointerCapture(event.pointerId);
                          if (inertiaRef.current) {
                            window.cancelAnimationFrame(inertiaRef.current);
                          }
                          setIsDialing(true);
                          lastAngleRef.current = null;
                          lastTimeRef.current = null;
                          velocityRef.current = 0;
                          handleDialPointer(event);
                        }}
                        onPointerMove={(event) => {
                          if (!isDialing) return;
                          handleDialPointer(event);
                        }}
                        onPointerUp={(event) => {
                          event.currentTarget.releasePointerCapture(event.pointerId);
                          setIsDialing(false);
                          const angleRange = 270;
                          let velocity = velocityRef.current / angleRange;
                          if (Math.abs(velocity) < 0.00005) return;
                          let lastFrame = performance.now();
                          const animate = () => {
                            const now = performance.now();
                            const dt = now - lastFrame;
                            lastFrame = now;
                            velocity *= 0.92;
                            const nextValue = Math.min(1, Math.max(0, dialValueRef.current + velocity * dt));
                            handleDialValue(nextValue);
                            if (Math.abs(velocity) > 0.00003 && nextValue > 0 && nextValue < 1) {
                              inertiaRef.current = window.requestAnimationFrame(animate);
                            }
                          };
                          inertiaRef.current = window.requestAnimationFrame(animate);
                        }}
                        onPointerCancel={(event) => {
                          event.currentTarget.releasePointerCapture(event.pointerId);
                          setIsDialing(false);
                        }}
                        className="relative h-16 w-16 rounded-full border border-white/10 bg-[var(--rp-card-2)] shadow-[0_16px_30px_rgba(0,0,0,0.6)] touch-none"
                        style={{
                          transform: `rotate(${(-135 + dialValue * 270).toFixed(1)}deg)`,
                        }}
                        aria-label="Tuning dial"
                        role="slider"
                        aria-valuemin={0}
                        aria-valuemax={Math.max(0, totalStations - 1)}
                        aria-valuenow={dialIndex}
                      >
                        <div className="absolute left-1/2 top-1.5 h-2.5 w-0.5 -translate-x-1/2 rounded-full bg-[var(--rp-gold)]" />
                        <div className="absolute inset-2 rounded-full border border-white/10 bg-black/30" />
                      </div>
                      <Text size="xs" c="dimmed" className="font-mono uppercase tracking-[0.28em]">
                        Rotate to tune
                      </Text>
                    </div>

                    <div className="mt-1 text-center md:text-left">
                      <Text fw={700} size="md" c="var(--rp-text)" lineClamp={1}>
                        {displayStation?.name ?? nowPlaying.name}
                      </Text>
                      <Text size="sm" c="var(--rp-muted)">
                        {[displayStation?.country, displayStation?.state].filter(Boolean).join(" • ")}
                      </Text>
                      <div className="mt-1 min-h-[44px]">
                        <Text size="xs" c="var(--rp-muted-2)" className="uppercase tracking-[0.2em]">
                          {isPreviewing ? "Tuning preview" : "Now playing"}
                        </Text>
                        <Text size="sm" c="var(--rp-text)" lineClamp={1}>
                          {trackLine}
                        </Text>
                        <Text
                          size="xs"
                          c="var(--rp-muted-2)"
                          className={freeTrivia.status === "loading" ? "mt-2 animate-pulse" : "mt-2 opacity-0"}
                        >
                          Updating spotlight…
                        </Text>
                      </div>
                      {(() => {
                        const aiDisplay = aiTriviaExpanded && aiTrivia.status === "ready" ? aiTrivia.trivia : null;
                        const display = aiDisplay ?? (freeTrivia.status === "ready" ? freeTrivia.trivia : cachedFreeTrivia);
                        const hasContent =
                          Boolean(display?.summary) ||
                          Boolean(display?.imageUrl) ||
                          (display?.facts?.length ?? 0) > 0 ||
                          (display?.links?.length ?? 0) > 0;
                        const canRequestAi = Boolean(trackKey);
                        return (
                          <div className="mt-3 rounded-2xl border border-white/10 bg-black/40 px-4 py-3 shadow-[0_12px_24px_rgba(0,0,0,0.5)] min-h-[120px] md:min-h-0">
                            {freeTrivia.status === "loading" && !cachedFreeTrivia && (
                              <Text size="xs" c="var(--rp-muted)">
                                Loading spotlight…
                              </Text>
                            )}
                            {hasContent && (
                              <>
                                {display?.summary && (
                                  <Text size="xs" c="var(--rp-text)" fw={600} lineClamp={2}>
                                    {display?.summary}
                                  </Text>
                                )}
                                {(display?.imageUrl || (display?.facts?.length ?? 0) > 0) && (
                                  <div className="mt-2 flex flex-wrap items-center gap-3">
                                    {display?.imageUrl && (
                                      <img
                                        src={display?.imageUrl}
                                        alt="Track artwork"
                                        className="h-10 w-10 rounded-xl border border-white/10 object-cover"
                                        onError={(event) => {
                                          event.currentTarget.style.display = "none";
                                        }}
                                      />
                                    )}
                                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--rp-muted)]">
                                      {(display?.facts ?? []).slice(0, 3).map((fact) => (
                                        <span
                                          key={fact.label}
                                          className="rounded-full border border-white/10 bg-black/40 px-2 py-1"
                                        >
                                          <span className="font-semibold text-[var(--rp-text)]">{fact.label}</span>
                                          <span className="text-[var(--rp-muted-2)]"> • </span>
                                          <span className="text-[var(--rp-muted)]">{fact.value}</span>
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {(display?.links ?? []).length > 0 && (
                                  <div className="mt-2 flex flex-wrap items-center gap-2">
                                    {display?.links?.map((link) => {
                                      const Icon = renderLinkIcon(link.kind);
                                      return (
                                        <a
                                          key={link.url}
                                          href={link.url}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/40 text-[var(--rp-text)] shadow-[0_8px_18px_rgba(0,0,0,0.5)] hover:text-[var(--rp-gold)]"
                                          aria-label={link.label}
                                          title={link.label}
                                        >
                                          <Icon size={16} />
                                        </a>
                                      );
                                    })}
                                  </div>
                                )}
                              </>
                            )}
                            {!hasContent && freeTrivia.status !== "loading" && !aiTriviaExpanded && (
                              <div className="flex flex-col items-start gap-2 text-left">
                                <Text size="xs" c="var(--rp-text)" fw={600}>
                                  Spotlight is warming up.
                                </Text>
                                <Text size="xs" c="var(--rp-muted)">
                                  Ask AI for quick facts while we wait for metadata.
                                </Text>
                              </div>
                            )}
                            {aiTriviaExpanded && aiTrivia.status === "loading" && (
                              <Text size="xs" c="var(--rp-muted)" className="mt-3 animate-pulse">
                                Fetching AI insights…
                              </Text>
                            )}
                            {canRequestAi && !aiTriviaExpanded && (
                              <button
                                type="button"
                                className="mt-3 inline-flex items-center gap-2 rounded-full border border-[rgba(245,177,45,0.5)] bg-[rgba(245,177,45,0.12)] px-3 py-1 text-[11px] font-semibold text-[var(--rp-gold)] shadow-[0_10px_20px_rgba(0,0,0,0.45)]"
                                onClick={() => {
                                  setAiTriviaExpanded(true);
                                  setInsightsOpen(true);
                                }}
                              >
                                <IconSparkles size={12} />
                                Open AI insights
                              </button>
                            )}
                            {!canRequestAi && !hasContent && freeTrivia.status !== "loading" && (
                              <Text size="xs" c="var(--rp-muted)" className="mt-3">
                                Waiting for track details…
                              </Text>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="hidden flex-col items-center gap-4 md:flex md:min-w-[160px] md:justify-start md:pt-2">
                    <div className="flex flex-col items-center gap-2 text-center">
                      <div
                        onPointerDown={(event) => {
                          event.currentTarget.setPointerCapture(event.pointerId);
                          if (inertiaRef.current) {
                            window.cancelAnimationFrame(inertiaRef.current);
                          }
                          setIsDialing(true);
                          lastAngleRef.current = null;
                          lastTimeRef.current = null;
                          velocityRef.current = 0;
                          handleDialPointer(event);
                        }}
                        onPointerMove={(event) => {
                          if (!isDialing) return;
                          handleDialPointer(event);
                        }}
                        onPointerUp={(event) => {
                          event.currentTarget.releasePointerCapture(event.pointerId);
                          setIsDialing(false);
                          const angleRange = 270;
                          let velocity = velocityRef.current / angleRange;
                          if (Math.abs(velocity) < 0.00005) return;
                          let lastFrame = performance.now();
                          const animate = () => {
                            const now = performance.now();
                            const dt = now - lastFrame;
                            lastFrame = now;
                            velocity *= 0.92;
                            const nextValue = Math.min(1, Math.max(0, dialValueRef.current + velocity * dt));
                            handleDialValue(nextValue);
                            if (Math.abs(velocity) > 0.00003 && nextValue > 0 && nextValue < 1) {
                              inertiaRef.current = window.requestAnimationFrame(animate);
                            }
                          };
                          inertiaRef.current = window.requestAnimationFrame(animate);
                        }}
                        onPointerCancel={(event) => {
                          event.currentTarget.releasePointerCapture(event.pointerId);
                          setIsDialing(false);
                        }}
                        className="relative h-16 w-16 rounded-full border border-white/10 bg-[var(--rp-card-2)] shadow-[0_16px_30px_rgba(0,0,0,0.6)] touch-none"
                        style={{
                          transform: `rotate(${(-135 + dialValue * 270).toFixed(1)}deg)`,
                        }}
                        aria-label="Tuning dial"
                        role="slider"
                        aria-valuemin={0}
                        aria-valuemax={Math.max(0, totalStations - 1)}
                        aria-valuenow={dialIndex}
                      >
                        <div className="absolute left-1/2 top-1.5 h-2.5 w-0.5 -translate-x-1/2 rounded-full bg-[var(--rp-gold)]" />
                        <div className="absolute inset-2 rounded-full border border-white/10 bg-black/30" />
                      </div>
                      <Text size="xs" c="dimmed" className="font-mono uppercase tracking-[0.28em]">
                        Rotate to tune
                      </Text>
                    </div>
                    <div className="flex items-center justify-center gap-3">
                      <ActionIcon
                        size="lg"
                        radius="xl"
                        variant="light"
                        color="gray"
                        onClick={onPrev}
                        className="border border-white/10 bg-black/40 text-[var(--rp-text)] shadow-[0_12px_24px_rgba(0,0,0,0.5)]"
                      >
                        <IconPlayerSkipBackFilled size={20} />
                      </ActionIcon>

                      <ActionIcon
                        size="xl"
                        radius="xl"
                        onClick={onPlayPause}
                        className="border border-[rgba(245,177,45,0.5)] bg-[var(--rp-gold)] text-black shadow-[0_14px_28px_rgba(245,177,45,0.28)] active:scale-95 transition-transform"
                      >
                        {isPlaying ? (
                          <IconPlayerPauseFilled size={24} />
                        ) : (
                          <IconPlayerPlayFilled size={24} />
                        )}
                      </ActionIcon>

                      <ActionIcon
                        size="lg"
                        radius="xl"
                        variant="light"
                        color="gray"
                        onClick={onNext}
                        className="border border-white/10 bg-black/40 text-[var(--rp-text)] shadow-[0_12px_24px_rgba(0,0,0,0.5)]"
                      >
                        <IconPlayerSkipForwardFilled size={20} />
                      </ActionIcon>
                    </div>
                  </div>
                </div>
                {!tunerExpanded && (
                  <button
                    type="button"
                    onClick={() => setTunerExpanded(true)}
                    className="mt-4 flex w-full items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-left shadow-[0_12px_24px_rgba(0,0,0,0.5)] md:hidden"
                  >
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--rp-muted-2)]">
                        Frequency
                      </div>
                      <div className="font-mono text-2xl font-semibold text-[var(--rp-text)]">
                        {frequency}
                      </div>
                    </div>
                    <div className="min-w-0 text-right">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--rp-muted-2)]">
                        Now Playing
                      </div>
                      <div className="text-sm font-semibold text-[var(--rp-text)] line-clamp-1">
                        {displayStation?.name ?? nowPlaying.name}
                      </div>
                      <Text size="xs" c="var(--rp-muted)" className="line-clamp-1">
                        {[displayStation?.country, displayStation?.state].filter(Boolean).join(" • ")}
                      </Text>
                    </div>
                  </button>
                )}
              </div>
            ) : (
              <div className="rounded-3xl border border-white/10 bg-[var(--rp-card)] p-6 text-sm text-[var(--rp-muted)] shadow-[0_12px_24px_rgba(0,0,0,0.45)]">
                Play any station to unlock tuning controls and local insights.
              </div>
            )}
          </div>
          <motion.div
            className="flex flex-col gap-4 lg:col-span-3 order-2 lg:order-3"
            style={{ y: rightColumnY }}
          >
            {nowPlaying ? (
              <div className="rounded-3xl border border-[rgba(245,177,45,0.5)] bg-[var(--rp-card)] p-3 shadow-[0_16px_36px_rgba(245,177,45,0.18)] md:p-4">
                <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--rp-gold)]">
                  {isPreviewing ? "Tuning preview" : "Now Playing"}
                </div>
                <div className="mt-3 flex items-end justify-between gap-3">
                  <div>
                    <div className="font-mono text-3xl font-semibold tracking-tight text-[var(--rp-text)]">
                      {frequency}
                    </div>
                    <Text size="xs" c="var(--rp-muted)">
                      MHz
                    </Text>
                  </div>
                  <div className="text-right">
                    <Text size="sm" fw={700} c="var(--rp-text)" lineClamp={1}>
                      {displayStation?.name ?? nowPlaying.name}
                    </Text>
                    <Text size="xs" c="var(--rp-muted)">
                      {[displayStation?.country, displayStation?.state].filter(Boolean).join(" • ")}
                    </Text>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-3xl border border-white/10 bg-[var(--rp-card)] p-4 text-sm text-[var(--rp-muted)] shadow-[0_12px_24px_rgba(0,0,0,0.45)]">
                Choose a station to unlock your local listening ritual.
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </motion.section>
  );
}
