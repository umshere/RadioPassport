import { motion, AnimatePresence } from "framer-motion";
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
import { useMemo, useState, useEffect } from "react";
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
  transparent = false,
}: CountryOverviewProps) {
  const [isMounted, setIsMounted] = useState(false);
  const { aiTriviaExpanded, setAiTriviaExpanded } = useUIStore();

  useEffect(() => {
    setIsMounted(true);
  }, []);



  // Generate frequency for now playing station
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

  const freqNum = parseFloat(frequency);
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
                Now Playing
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
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
            {/* Tuner Scale */}
            <div className="flex-1">
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

              {/* Station Info */}
              <div className="mt-3 text-center md:text-left">
                <Text fw={700} size="md" c="slate.9" lineClamp={1}>
                  {nowPlaying.name}
                </Text>
                <Text size="sm" c="dimmed">
                  {[nowPlaying.country, nowPlaying.state].filter(Boolean).join(" • ")}
                </Text>
                <Text size="sm" c="slate.9" lineClamp={1}>
                  {trackLine}
                </Text>
                <AnimatePresence initial={false}>
                  {(freeSummary || freeFacts.length > 0 || freeLinks.length > 0 || freeImage) && (
                    <motion.div
                      key="spotlight-free"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                      className="mt-3 rounded-2xl bg-white/85 px-4 py-3 shadow-[4px_4px_10px_#b8b9be,-4px_-4px_10px_#ffffff]"
                    >
                      {freeSummary && (
                        <Text size="xs" c="slate.9" fw={600} lineClamp={2}>
                          {freeSummary}
                        </Text>
                      )}
                      {(freeImage || freeFacts.length > 0) && (
                        <div className="mt-2 flex flex-wrap items-center gap-3">
                          {freeImage && (
                            <img
                              src={freeImage}
                              alt="Track artwork"
                              className="h-10 w-10 rounded-xl object-cover shadow-[2px_2px_4px_#b8b9be,-2px_-2px_4px_#ffffff]"
                              onError={(event) => {
                                event.currentTarget.style.display = "none";
                              }}
                            />
                          )}
                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-700">
                            {freeFacts.slice(0, 3).map((fact) => (
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
                      {freeLinks.length > 0 && (
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {freeLinks.map((link) => {
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
                      {!aiTriviaExpanded && (
                        <button
                          type="button"
                          className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold text-slate-600 shadow-[2px_2px_4px_#b8b9be,-2px_-2px_4px_#ffffff]"
                          onClick={() => setAiTriviaExpanded(true)}
                        >
                          <IconSparkles size={12} />
                          More
                        </button>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
                <AnimatePresence initial={false}>
                  {aiTriviaExpanded && aiSummary && (
                    <motion.div
                      key="spotlight-ai"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                      className="mt-2 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-[0_10px_18px_rgba(15,23,42,0.12)]"
                    >
                      <Text size="xs" c="slate.9" fw={700} lineClamp={2}>
                        {aiSummary}
                      </Text>
                      {aiFacts.length > 0 && (
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-700">
                          {aiFacts.slice(0, 2).map((fact) => (
                            <span key={fact.label} className="rounded-full bg-white/90 px-2 py-1">
                              <span className="font-semibold text-slate-800">{fact.label}</span>
                              <span className="text-slate-500"> • </span>
                              <span>{fact.value}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Transport Controls */}
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
        )}
      </div>
    </motion.section>
  );
}
