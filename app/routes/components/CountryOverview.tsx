import type { PointerEvent as ReactPointerEvent } from "react";
import { motion } from "framer-motion";
import { Badge, Title, Text, ActionIcon } from "@mantine/core";
import {
  IconBroadcast,
  IconMapPin,
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
} from "@tabler/icons-react";
import { CountryFlag } from "~/components/CountryFlag";
import type { Country, Station } from "~/types/radio";
import type { TrackTrivia } from "~/types/trivia";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNowPlayingMetadata } from "~/hooks/useNowPlayingMetadata";
import { useTrackTrivia } from "~/hooks/useTrackTrivia";
import { useUIStore } from "~/state/uiStore";

type CountryOverviewProps = {
  selectedCountry: string;
  selectedCountryMeta: Country | null;
  stationCount: number;
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
  const [isMounted, setIsMounted] = useState(false);
  const { aiTriviaExpanded, setAiTriviaExpanded } = useUIStore();

  useEffect(() => {
    setIsMounted(true);
  }, []);



  const settleTimerRef = useRef<number | null>(null);
  const inertiaRef = useRef<number | null>(null);
  const lastAngleRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const velocityRef = useRef(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
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
  const freeTrivia = useTrackTrivia({
    track: nowPlayingMeta.track,
    source: "free",
    enabled: Boolean(nowPlaying),
  });
  const aiTrivia = useTrackTrivia({
    track: nowPlayingMeta.track,
    source: "ai",
    enabled: Boolean(nowPlaying) && aiTriviaExpanded,
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
      : nowPlayingMeta.status === "loading"
        ? "Identifying track…"
        : nowPlayingMeta.status === "empty"
          ? "On-air update soon"
          : nowPlayingMeta.status === "error"
            ? "Track info unavailable"
            : "Listening live";
  const freeSummary = freeTrivia.trivia?.summary ?? null;
  const freeFacts = freeTrivia.trivia?.facts ?? [];
  const freeLinks = freeTrivia.trivia?.links ?? [];
  const freeImage = freeTrivia.trivia?.imageUrl ?? null;
  const aiSummary = aiTrivia.trivia?.summary ?? null;
  const aiFacts = aiTrivia.trivia?.facts ?? [];
  const [cachedFreeTrivia, setCachedFreeTrivia] = useState<TrackTrivia | null>(null);
  const [cachedAiTrivia, setCachedAiTrivia] = useState<TrackTrivia | null>(null);

  useEffect(() => {
    if (freeTrivia.status === "ready" && freeTrivia.trivia) {
      setCachedFreeTrivia(freeTrivia.trivia);
    }
  }, [freeTrivia.status, freeTrivia.trivia]);

  useEffect(() => {
    if (aiTrivia.status === "ready" && aiTrivia.trivia) {
      setCachedAiTrivia(aiTrivia.trivia);
    }
  }, [aiTrivia.status, aiTrivia.trivia]);

  useEffect(() => {
    setAiTriviaExpanded(false);
  }, [nowPlaying?.uuid, trackLine]);

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
    ? "relative overflow-hidden px-6 py-8 md:px-10 md:py-10"
    : "relative overflow-hidden rounded-2xl bg-white/80 backdrop-blur-xl px-6 py-8 md:px-10 md:py-10 shadow-[0_12px_32px_rgba(15,23,42,0.12)]";

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={containerClasses}
      style={{ position: 'relative' }}
    >
      {/* Hero Background Image */}
      <div
        className="absolute inset-0 z-0 rounded-2xl"
        style={{
          backgroundImage: "url('/RPhero.png')",
          backgroundSize: "cover",
          backgroundPosition: "center -80px",
          backgroundRepeat: "no-repeat",
        }}
      />
      {/* Subtle overlay for text readability */}
      <div
        className="absolute inset-0 z-0 rounded-2xl"
        style={{
          background: "linear-gradient(180deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.5) 100%)",
        }}
      />
      {/* Animated Gradient Orbs Background */}
      <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden opacity-40">
        <motion.div
          className="absolute w-96 h-96 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }}
          animate={{
            x: ['-20%', '120%'],
            y: ['-10%', '110%'],
            scale: isPlaying ? [1, 1.8, 1] : [1, 1.2, 1],
            opacity: isPlaying ? [0.4, 0.7, 0.4] : [0.2, 0.3, 0.2],
          }}
          transition={{
            duration: isPlaying ? 20 : 35,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
        <motion.div
          className="absolute w-80 h-80 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(168, 85, 247, 0.12) 0%, transparent 70%)',
            filter: 'blur(50px)',
          }}
          animate={{
            x: ['120%', '-20%'],
            y: ['110%', '-10%'],
            scale: isPlaying ? [1.2, 0.8, 1.2] : [1, 1, 1],
            opacity: isPlaying ? [0.5, 0.8, 0.5] : [0.2, 0.3, 0.2],
          }}
          transition={{
            duration: isPlaying ? 25 : 40,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      </div>



      <div className="relative z-10 space-y-6">
        {/* Top Row: Just Badges */}
        <div className="flex items-center justify-end">
          <Badge
            radius="xl"
            size="lg"
            leftSection={<IconBroadcast size={16} />}
            className="bg-white/60 text-slate-600 border border-slate-300/50 shadow-[2px_2px_4px_#b8b9be,-2px_-2px_4px_#ffffff]"
          >
            {stationCount.toLocaleString()} stations catalogued
          </Badge>
        </div>

        {/* Country Info & Now Playing Combined */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          {/* Left: Country Info */}
          <div className="flex items-center gap-4">
            <CountryFlag
              iso={selectedCountryMeta?.iso_3166_1}
              title={`${selectedCountry} flag`}
              size={64}
              className="rounded-xl shadow-[4px_4px_8px_#b8b9be,-4px_-4px_8px_#ffffff] border border-slate-200/50"
            />
            <div>
              <Title order={1} className="text-3xl md:text-4xl font-bold text-slate-900">
                {selectedCountry}
              </Title>
              <Text size="sm" c="slate.7">
                Explore this nation's airwaves and discover local voices in real time.
              </Text>
            </div>
          </div>

          {/* Right: Passport Code or Now Playing */}
          {nowPlaying ? (
            <div className="flex flex-col items-center gap-4 lg:items-end">
              <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                {isPreviewing ? "Tuning preview" : "Now Playing"}
              </Text>
              <div className="text-center lg:text-right">
                <h2 className="font-mono text-5xl font-bold tracking-tighter text-slate-900 lg:text-6xl">
                  {frequency}
                </h2>
                <Text size="sm" c="dimmed" fw={500}>
                  MHz
                </Text>
              </div>
            </div>
          ) : (
            selectedCountryMeta && (
              <div className="rounded-xl border border-slate-300/30 bg-white/60 px-6 py-4 text-sm text-slate-600 shadow-[2px_2px_4px_#b8b9be,-2px_-2px_4px_#ffffff]">
                <div className="flex items-center gap-2">
                  <IconMapPin size={16} />
                  Passport code: {selectedCountryMeta.iso_3166_1}
                </div>
              </div>
            )
          )}
        </div>

        {/* Tuner Scale & Controls (only when playing) */}
        {nowPlaying && (
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-6">
            {/* Tuner + Dial (mobile) */}
            <div className="flex flex-col gap-4 md:flex-1">
              <div className="relative h-20 w-full overflow-hidden rounded-2xl bg-white/40 border border-slate-300/30 shadow-[inset_3px_3px_6px_#b8b9be,inset_-3px_-3px_6px_#ffffff]">
                {/* Scale Ticks */}
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
                        <div
                          className={`w-px bg-slate-400 ${isMajor ? "h-5" : "h-3"
                            }`}
                        />
                        {isMajor && (
                          <span className="text-[9px] font-bold text-slate-500">
                            {Math.floor(tick)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Red Needle */}
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
                  className="relative h-16 w-16 rounded-full bg-[#e0e5ec] shadow-[6px_6px_12px_#b8b9be,-6px_-6px_12px_#ffffff] touch-none"
                  style={{
                    transform: `rotate(${(-135 + dialValue * 270).toFixed(1)}deg)`,
                  }}
                  aria-label="Tuning dial"
                  role="slider"
                  aria-valuemin={0}
                  aria-valuemax={Math.max(0, totalStations - 1)}
                  aria-valuenow={dialIndex}
                >
                  <div className="absolute left-1/2 top-1.5 h-2.5 w-0.5 -translate-x-1/2 rounded-full bg-slate-400" />
                  <div className="absolute inset-2 rounded-full bg-[#d9dee7] shadow-[inset_3px_3px_6px_#b8b9be,inset_-3px_-3px_6px_#ffffff]" />
                </div>
                <Text size="xs" c="dimmed" className="font-mono uppercase tracking-[0.28em]">
                  Rotate to tune
                </Text>
              </div>

              {/* Station Info */}
              <div className="mt-1 text-center md:text-left">
                <Text fw={700} size="md" c="slate.9" lineClamp={1}>
                  {displayStation?.name ?? nowPlaying.name}
                </Text>
                <Text size="sm" c="dimmed">
                  {[displayStation?.country, displayStation?.state].filter(Boolean).join(" • ")}
                </Text>
                <div className="mt-1 min-h-[44px]">
                  <Text size="xs" c="slate.5" className="uppercase tracking-[0.2em]">
                    {isPreviewing ? "Tuning preview" : "Now playing"}
                  </Text>
                  <Text size="sm" c="slate.9" lineClamp={1}>
                    {trackLine}
                  </Text>
                  <Text size="xs" c="slate.5" className={freeTrivia.status === "loading" ? "mt-2 animate-pulse" : "mt-2 opacity-0"}>
                    Updating spotlight…
                  </Text>
                </div>
                {(() => {
                  const display = freeTrivia.status === "ready" ? freeTrivia.trivia : cachedFreeTrivia;
                  const hasContent =
                    Boolean(display?.summary) ||
                    Boolean(display?.imageUrl) ||
                    (display?.facts?.length ?? 0) > 0 ||
                    (display?.links?.length ?? 0) > 0;
                  if (!hasContent && freeTrivia.status !== "loading") return null;
                  return (
                    <div className="mt-3 rounded-2xl bg-white/85 px-4 py-3 shadow-[4px_4px_10px_#b8b9be,-4px_-4px_10px_#ffffff] min-h-[120px] md:min-h-0">
                      {freeTrivia.status === "loading" && !cachedFreeTrivia && (
                        <Text size="xs" c="slate.5">
                          Loading spotlight…
                        </Text>
                      )}
                      <>
                        {display?.summary && (
                          <Text size="xs" c="slate.9" fw={600} lineClamp={2}>
                            {display?.summary}
                          </Text>
                        )}
                        {(display?.imageUrl || (display?.facts?.length ?? 0) > 0) && (
                          <div className="mt-2 flex flex-wrap items-center gap-3">
                            {display?.imageUrl && (
                              <img
                                src={display?.imageUrl}
                                alt="Track artwork"
                                className="h-10 w-10 rounded-xl object-cover shadow-[2px_2px_4px_#b8b9be,-2px_-2px_4px_#ffffff]"
                                onError={(event) => {
                                  event.currentTarget.style.display = "none";
                                }}
                              />
                            )}
                            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-700">
                              {(display?.facts ?? []).slice(0, 3).map((fact) => (
                                <span
                                  key={fact.label}
                                  className="rounded-full bg-white/90 px-2 py-1 shadow-[2px_2px_4px_#b8b9be,-2px_-2px_4px_#ffffff]"
                                >
                                  <span className="font-semibold text-slate-800">{fact.label}</span>
                                  <span className="text-slate-500"> • </span>
                                  <span>{fact.value}</span>
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
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-700 shadow-[2px_2px_4px_#b8b9be,-2px_-2px_4px_#ffffff] hover:text-slate-900"
                                  aria-label={link.label}
                                  title={link.label}
                                >
                                  <Icon size={16} />
                                </a>
                              );
                            })}
                          </div>
                        )}
                        {!aiTriviaExpanded && freeTrivia.status === "ready" && (
                          <button
                            type="button"
                            className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold text-slate-600 shadow-[2px_2px_4px_#b8b9be,-2px_-2px_4px_#ffffff]"
                            onClick={() => setAiTriviaExpanded(true)}
                          >
                            <IconSparkles size={12} />
                            More
                          </button>
                        )}
                      </>
                    </div>
                  );
                })()}
                {aiTriviaExpanded && (() => {
                  const display = aiTrivia.status === "ready" ? aiTrivia.trivia : cachedAiTrivia;
                  if (!display && aiTrivia.status !== "loading") return null;
                  return (
                    <div className="mt-2 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-[0_10px_18px_rgba(15,23,42,0.12)] min-h-[64px] md:min-h-0">
                      {aiTrivia.status === "loading" && !cachedAiTrivia && (
                        <Text size="xs" c="slate.5">
                          Loading AI insights…
                        </Text>
                      )}
                      {display?.summary && (
                        <Text size="xs" c="slate.9" fw={700} lineClamp={2}>
                          {display.summary}
                        </Text>
                      )}
                      {(display?.facts ?? []).length > 0 && (
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-700">
                          {(display?.facts ?? []).slice(0, 2).map((fact) => (
                            <span key={fact.label} className="rounded-full bg-white/90 px-2 py-1">
                              <span className="font-semibold text-slate-800">{fact.label}</span>
                              <span className="text-slate-500"> • </span>
                              <span>{fact.value}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Dial + Transport Controls (desktop) */}
            <div className="hidden flex-col items-center gap-4 md:flex md:min-w-[140px] md:justify-start md:pt-2">
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
                  className="relative h-16 w-16 rounded-full bg-[#e0e5ec] shadow-[6px_6px_12px_#b8b9be,-6px_-6px_12px_#ffffff] touch-none"
                  style={{
                    transform: `rotate(${(-135 + dialValue * 270).toFixed(1)}deg)`,
                  }}
                  aria-label="Tuning dial"
                  role="slider"
                  aria-valuemin={0}
                  aria-valuemax={Math.max(0, totalStations - 1)}
                  aria-valuenow={dialIndex}
                >
                  <div className="absolute left-1/2 top-1.5 h-2.5 w-0.5 -translate-x-1/2 rounded-full bg-slate-400" />
                  <div className="absolute inset-2 rounded-full bg-[#d9dee7] shadow-[inset_3px_3px_6px_#b8b9be,inset_-3px_-3px_6px_#ffffff]" />
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
                  className="bg-[#e0e5ec] text-slate-600 shadow-[3px_3px_6px_#b8b9be,-3px_-3px_6px_#ffffff] active:shadow-[inset_3px_3px_6px_#b8b9be,inset_-3px_-3px_6px_#ffffff] border-0"
                >
                  <IconPlayerSkipBackFilled size={20} />
                </ActionIcon>

                <ActionIcon
                  size="xl"
                  radius="xl"
                  onClick={onPlayPause}
                  className="bg-slate-900 text-white hover:bg-slate-800 shadow-[4px_4px_8px_#b8b9be,-4px_-4px_8px_#ffffff] active:scale-95 transition-transform border-0"
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
                  className="bg-[#e0e5ec] text-slate-600 shadow-[3px_3px_6px_#b8b9be,-3px_-3px_6px_#ffffff] active:shadow-[inset_3px_3px_6px_#b8b9be,inset_-3px_-3px_6px_#ffffff] border-0"
                >
                  <IconPlayerSkipForwardFilled size={20} />
                </ActionIcon>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.section>
  );
}
