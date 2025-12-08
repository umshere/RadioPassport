import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tooltip } from "@mantine/core";
import { IconHeadphones, IconCompass, IconBolt, IconSettings } from "@tabler/icons-react";
import type { Country, Station } from "~/types/radio";
import { usePlayerStore } from "~/state/playerStore";

const HERO_TAGLINES = [
  "Where every station is a new destination.",
  "Stamp your way through the world's soundscapes.",
  "Every country, one click away — your global radio passport.",
] as const;

// Top genre chips - shown in hero card
const HERO_GENRE_CHIPS = [
  { id: 'bollywood', label: 'Bollywood', icon: '🎬' },
  { id: 'devotional', label: 'Devotional', icon: '🙏' },
  { id: 'jazz', label: 'Jazz', icon: '🎺' },
] as const;

// Bottom genre chips - shown below the card
const GENRE_CHIPS = [
  { id: 'bollywood', label: 'Bollywood', icon: '🎬' },
  { id: 'devotional', label: 'Devotional', icon: '🙏' },
  { id: 'retro', label: 'Retro', icon: '🎤' },
  { id: 'news', label: 'News', icon: '📰' },
  { id: 'classical', label: 'Classical', icon: '🎻' },
] as const;

type HeroSectionProps = {
  topCountries: Country[];
  totalStations: number;
  continents: number;
  nowPlaying: Station | null;
  searchQueryRaw: string;
  onStartListening: () => void;
  onQuickRetune: () => void;
  onMissionExploreWorld?: () => void;
  onMissionStayLocal?: () => void;
  onHoverSound?: () => void;
  onGenreSelect?: (genre: string) => void;
  selectedGenre?: string | null;
};

export function HeroSection({
  topCountries,
  totalStations,
  continents,
  nowPlaying,
  searchQueryRaw,
  onStartListening,
  onQuickRetune,
  onMissionExploreWorld,
  onMissionStayLocal,
  onHoverSound,
  onGenreSelect,
  selectedGenre,
}: HeroSectionProps) {
  const [heroHovered, setHeroHovered] = useState(false);
  const [heroTaglineIndex, setHeroTaglineIndex] = useState(0);
  const [heroTickerIndex, setHeroTickerIndex] = useState(0);
  const [isMounted, setIsMounted] = useState(false);

  // Get playing state from store
  const isPlaying = usePlayerStore((state) => state.isPlaying);

  // Floating music notes - natural wind-like movement
  const floatingNotes = useMemo(
    () =>
      Array.from({ length: 8 }).map((_, i) => {
        const seed = Math.random();
        return {
          id: i,
          delay: i * 1.2 + seed * 2,
          duration: 8 + seed * 4,
          startX: 10 + (i * 12) % 80,
          note: ['🎵', '🎶', '♪', '♫', '🎵', '🎶', '♪', '♫'][i],
          size: 14 + seed * 10,
        };
      }),
    []
  );

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const heroTickerItems = useMemo(() => {
    const headlineCountry = topCountries[0]?.name ?? "Global";
    const base = [
      `${totalStations.toLocaleString()} verified stations ready to tune`,
      `${continents} continents on the dial`,
      `Spotlight • ${headlineCountry}`,
    ];

    if (nowPlaying) {
      base.unshift(`Now playing • ${nowPlaying.name} — ${nowPlaying.country}`);
    }

    return base;
  }, [continents, nowPlaying, topCountries, totalStations]);

  const currentHeroTicker = heroTickerItems.length
    ? heroTickerItems[heroTickerIndex % heroTickerItems.length]
    : "Global radio passport updates";

  useEffect(() => {
    const interval = window.setInterval(() => {
      setHeroTaglineIndex((prev) => (prev + 1) % HERO_TAGLINES.length);
    }, 6400);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (heroTickerItems.length === 0) return;

    const interval = window.setInterval(() => {
      setHeroTickerIndex((prev) => (prev + 1) % heroTickerItems.length);
    }, 4200);

    return () => window.clearInterval(interval);
  }, [heroTickerItems.length]);

  useEffect(() => {
    setHeroTickerIndex(0);
  }, [heroTickerItems.length]);

  return (
    <div className="flex flex-col -mx-4 md:-mx-6">
      {/* Hero Image - Wide format, blends seamlessly with page background */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="relative w-full overflow-hidden"
        style={{ marginBottom: '-140px', zIndex: 1 }}
      >
        <img
          src="/RPHERO_WIDE.png"
          alt="Radio Passport - Global music discovery"
          className="w-full h-auto object-cover"
          style={{
            minHeight: '320px',
            maxHeight: '450px',
            objectPosition: 'center center',
          }}
        />

        {/* Feathered edges to blend with gray page background */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: `
              linear-gradient(to right, #d1d5db 0%, transparent 8%, transparent 92%, #d1d5db 100%),
              linear-gradient(to bottom, #d1d5db 0%, transparent 15%, transparent 100%)
            `,
          }}
        />

        {/* Floating Music Notes Animation - natural wind flow, only when playing */}
        <AnimatePresence>
          {isMounted && isPlaying && (
            <motion.div
              className="pointer-events-none absolute inset-0 overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
            >
              {floatingNotes.map((note) => (
                <motion.div
                  key={note.id}
                  className="absolute"
                  style={{
                    left: `${note.startX}%`,
                    bottom: '-5%',
                    fontSize: `${note.size}px`,
                    filter: 'drop-shadow(0 1px 4px rgba(99, 102, 241, 0.3))',
                  }}
                  animate={{
                    y: [0, -150, -350, -500],
                    x: [
                      0,
                      Math.sin(note.id) * 25,
                      Math.cos(note.id) * 40,
                      Math.sin(note.id + 1) * 30,
                    ],
                    rotate: [0, 15, -10, 20, -15, 10],
                    opacity: [0, 0.5, 0.7, 0.5, 0],
                  }}
                  transition={{
                    duration: note.duration,
                    delay: note.delay,
                    repeat: Infinity,
                    ease: [0.25, 0.1, 0.25, 1],
                    times: [0, 0.2, 0.5, 1],
                  }}
                >
                  {note.note}
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Main Card Section - Seamless blend with hero image */}
      <motion.section
        id="explore"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
        className="relative overflow-hidden"
        onPointerEnter={() => setHeroHovered(true)}
        onPointerLeave={() => setHeroHovered(false)}
        style={{
          zIndex: 2,
        }}
      >
        {/* Gradient overlay that fades from transparent to glass */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(to bottom, transparent 0%, rgba(255,255,255,0.3) 15%, rgba(255,255,255,0.7) 40%, rgba(255,255,255,0.9) 70%, rgba(255,255,255,0.95) 100%)',
            backdropFilter: 'blur(0px)',
          }}
        />
        {/* Glass layer that intensifies downward */}
        <div
          className="absolute inset-0 pointer-events-none rounded-b-3xl"
          style={{
            background: 'transparent',
            backdropFilter: 'blur(16px) saturate(180%)',
            WebkitBackdropFilter: 'blur(16px) saturate(180%)',
            maskImage: 'linear-gradient(to bottom, transparent 0%, black 30%)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 30%)',
          }}
        />
        <div className="relative px-6 pt-16 pb-6 md:px-10 md:pt-20 md:pb-8">
          {/* Status Ticker */}
          <motion.span
            className="inline-flex h-8 items-center gap-2 rounded-full bg-white/80 px-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-700 shadow-sm border border-white/50"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
            role="status"
            aria-live="polite"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <AnimatePresence initial={false} mode="wait">
              <motion.span
                key={currentHeroTicker}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.32, ease: [0.42, 0, 0.58, 1] }}
              >
                {currentHeroTicker}
              </motion.span>
            </AnimatePresence>
          </motion.span>

          {/* Brand & Tagline */}
          <div className="mt-5 flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold text-xl shadow-lg">
              RP
            </div>
            <motion.h1
              className="text-[2.2rem] font-black tracking-tight text-slate-900 sm:text-[2.6rem]"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.18 }}
            >
              Radio Passport
            </motion.h1>
          </div>

          <AnimatePresence initial={false} mode="wait">
            <motion.p
              key={HERO_TAGLINES[heroTaglineIndex]}
              className="mt-2 text-base font-medium text-slate-500 sm:text-lg"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.5, ease: [0.42, 0, 0.58, 1] }}
            >
              {HERO_TAGLINES[heroTaglineIndex]}
            </motion.p>
          </AnimatePresence>

          {/* CTA Buttons */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Tooltip label="Begin listening with curated picks" position="top" withArrow>
              <button
                type="button"
                className="group flex h-11 items-center gap-2.5 rounded-full bg-slate-900 px-6 text-sm font-semibold text-white shadow-lg transition-all hover:bg-slate-800 hover:scale-[1.02] active:scale-[0.98]"
                onClick={onStartListening}
                onMouseEnter={onHoverSound}
                onFocus={onHoverSound}
              >
                <IconHeadphones size={18} className="opacity-80" />
                Start Your Journey
              </button>
            </Tooltip>
            <Tooltip label="Quickly jump to a region or station" position="top" withArrow>
              <button
                type="button"
                className="flex h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900 active:scale-[0.98]"
                onClick={onQuickRetune}
              >
                <IconCompass size={18} className="opacity-70" />
                Quick Retune
              </button>
            </Tooltip>
          </div>

          {/* Hero Genre Pills + Oracle Actions */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              {HERO_GENRE_CHIPS.map((chip, i) => (
                <motion.button
                  key={chip.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + (i * 0.05) }}
                  type="button"
                  onClick={() => onGenreSelect?.(selectedGenre === chip.id ? '' : chip.id)}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  className={`flex h-9 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition-all ${selectedGenre === chip.id
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                >
                  <span className="text-sm">{chip.icon}</span>
                  <span>{chip.label}</span>
                </motion.button>
              ))}
            </div>

            {/* Oracle Returns Button + Action Icons */}
            <div className="flex items-center gap-2">
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.45 }}
                type="button"
                onClick={onMissionExploreWorld}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="flex h-9 items-center gap-2 rounded-full bg-emerald-500 px-4 text-sm font-semibold text-white shadow-md transition-all hover:bg-emerald-600"
              >
                <IconBolt size={16} />
                Oracle Returns
              </motion.button>
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 }}
                type="button"
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-400 text-white shadow-md transition-all hover:bg-amber-500"
              >
                <IconBolt size={16} />
              </motion.button>
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.55 }}
                type="button"
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-500 text-white shadow-md transition-all hover:bg-indigo-600"
              >
                <IconSettings size={16} />
              </motion.button>
            </div>
          </div>
        </div>

        {/* Bottom Genre Pills Strip */}
        <div className="relative z-10 px-5 py-3 md:px-8">
          <div className="flex flex-wrap items-center gap-2">
            {GENRE_CHIPS.map((chip, i) => (
              <motion.button
                key={chip.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 + (i * 0.04) }}
                type="button"
                onClick={() => onGenreSelect?.(selectedGenre === chip.id ? '' : chip.id)}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className={`flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium transition-all border ${selectedGenre === chip.id
                  ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-sm'
                  }`}
              >
                <span className="text-base">{chip.icon}</span>
                <span>{chip.label}</span>
              </motion.button>
            ))}
          </div>
        </div>
      </motion.section>
    </div>
  );
}
