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
    <div 
      className="flex flex-col min-h-[calc(100vh-120px)] md:min-h-0" 
      style={{ 
        margin: 0, 
        border: 'none',
        paddingLeft: 'clamp(8px, 3vw, 64px)',
        paddingRight: 'clamp(8px, 3vw, 64px)',
        paddingTop: 'clamp(12px, 3vw, 56px)',
      }}
    >
      {/* Hero Image - Contained with soft corners and depth */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="relative overflow-hidden mb-[-280px] sm:mb-[-240px] md:mb-[-180px] rounded-[12px] md:rounded-[28px]"
        style={{ 
          zIndex: 1, 
          minHeight: '58vh',
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        }}
      >
        <img
          src="/RPHERO_WIDE.png"
          alt="Radio Passport - Global music discovery"
          className="w-full h-full object-cover rounded-[12px] md:rounded-[28px]"
          style={{
            minHeight: '54vh',
            width: '100%',
            objectPosition: 'center center',
          }}
        />

        {/* Edge feather - only top, NO sides or bottom fade */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: 'linear-gradient(to bottom, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.2) 8%, transparent 20%, transparent 100%)',
          }}
        />

        {/* Warm orange glow at bottom right - subtle, no white fade */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: "radial-gradient(ellipse 60% 40% at 85% 95%, rgba(255,140,80,0.25) 0%, rgba(255,180,120,0.1) 40%, transparent 70%)",
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

      {/* Main Card Section - Glassmorphic with more transparent top to show background image */}
      <motion.section
        id="explore"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
        className="relative overflow-hidden rounded-[12px] md:rounded-[20px]"
        onPointerEnter={() => setHeroHovered(true)}
        onPointerLeave={() => setHeroHovered(false)}
        style={{
          zIndex: 2,
          border: '1px solid rgba(255,255,255,0.2)',
          // More transparent glassmorphic gradient to show background image
          background: 'linear-gradient(to bottom, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.35) 20%, rgba(255,255,255,0.6) 40%, rgba(255,255,255,0.85) 60%, rgba(255,255,255,0.95) 100%)',
          marginBottom: '20px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
      >
        {/* Warm orange glow at bottom right - subtle accent */}
        <div
          className="absolute inset-0 pointer-events-none rounded-[12px] md:rounded-[20px]"
          style={{
            background: 'radial-gradient(ellipse 50% 40% at 85% 100%, rgba(255,160,100,0.12) 0%, transparent 70%)',
          }}
        />
        <div className="relative px-4 pt-16 pb-10 sm:px-6 sm:pt-12 md:px-10 md:pt-6 md:pb-12 max-w-7xl mx-auto">
          {/* Status Ticker */}
          <motion.span
            className="inline-flex h-8 items-center gap-2 rounded-full bg-white/90 px-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-700 shadow-sm"
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
              className="mt-2 text-base font-medium sm:text-lg"
              style={{ color: 'hsl(220 15% 28%)' }} // Dark slate - readable, distinct from heading
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

          {/* Hero Genre Pills + World Actions */}
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

            {/* World Explore CTA + Action Icons */}
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
                Explore the world
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
      </motion.section>
    </div>
  );
}
