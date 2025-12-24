import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tooltip } from "@mantine/core";
import { IconHeadphones, IconCompass, IconBolt, IconSettings, IconSearch, IconX } from "@tabler/icons-react";
import type { Country, Station } from "~/types/radio";
import { usePlayerStore } from "~/state/playerStore";

const HERO_TAGLINES = [
  "Where every station is a new destination.",
  "Stamp your way through the world's soundscapes.",
  "Every country, one click away — your global radio passport.",
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
  onSearch?: (query: string) => void;
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
  onSearch,
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

    // Removed "Now playing" to prevent overflow in the pill

    return base;
  }, [continents, topCountries, totalStations]);

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
      className="-mt-4 flex w-full flex-col min-h-0 md:min-h-[calc(100vh-120px)]"
      style={{
        margin: 0,
        border: 'none',
        background: 'transparent',
        paddingTop: 0,
      }}
    >
      {/* Hero Image - More visible on mobile, proper aspect ratio */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="relative overflow-hidden mb-[-180px] sm:mb-[-200px] md:mb-[-180px] rounded-none sm:rounded-[10px] md:rounded-[20px] min-h-[26vh] sm:min-h-[40vh] md:min-h-[45vh]"
        style={{
          zIndex: 1,
          border: 'none',
          outline: 'none',
        }}
      >
        {/* Mobile: no shadow, Desktop: subtle shadow */}
        <style dangerouslySetInnerHTML={{
          __html: `
          @media (min-width: 640px) {
            .hero-image-container { box-shadow: 0 12px 40px rgba(0,0,0,0.18); }
          }
        `}} />
        <img
          src="/RPHERO_WIDE.png"
          alt="Radio Passport - Global music discovery"
          className="block w-full h-full min-h-[26vh] sm:min-h-[40vh] md:min-h-[45vh] object-cover object-top rounded-none sm:rounded-[10px] md:rounded-[20px]"
          style={{
            height: 'auto',
            width: '100%',
            aspectRatio: '16 / 9',
          }}
        />

        {/* Edge feather - only top, NO sides or bottom fade */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: 'linear-gradient(to bottom, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.2) 8%, transparent 20%, transparent 100%)',
          }}
        />

        {/* Subtle bottom fade on mobile to smooth the transition */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white/40 sm:hidden" />

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

      {/* Main Card Section - Glassmorphic, no frame on mobile */}
      <motion.section
        id="explore"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
        className="relative overflow-hidden rounded-none sm:rounded-[10px] md:rounded-[16px]"
        onPointerEnter={() => setHeroHovered(true)}
        onPointerLeave={() => setHeroHovered(false)}
        style={{
          zIndex: 2,
          marginBottom: '16px',
        }}
      >
        {/* Frosted gradient overlay: clear at top, stronger toward content */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0) 22%, rgba(255,255,255,0.12) 38%, rgba(255,255,255,0.32) 58%, rgba(255,255,255,0.62) 78%, rgba(255,255,255,0.9) 100%)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            maskImage:
              "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 25%, rgba(0,0,0,0.2) 40%, rgba(0,0,0,0.6) 65%, rgba(0,0,0,1) 100%)",
            WebkitMaskImage:
              "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 25%, rgba(0,0,0,0.2) 40%, rgba(0,0,0,0.6) 65%, rgba(0,0,0,1) 100%)",
          }}
        />
        {/* Mobile: no border/shadow, Desktop: subtle border/shadow via CSS */}
        <style dangerouslySetInnerHTML={{
          __html: `
          @media (min-width: 640px) {
            #explore { 
              border: 1px solid rgba(255,255,255,0.15); 
              box-shadow: 0 6px 24px rgba(0,0,0,0.08);
            }
          }
        `}} />
        {/* Warm orange glow at bottom right - subtle accent */}
        <div
          className="absolute inset-0 pointer-events-none rounded-none sm:rounded-[10px] md:rounded-[16px]"
          style={{
            background: 'radial-gradient(ellipse 50% 40% at 85% 100%, rgba(255,160,100,0.12) 0%, transparent 70%)',
          }}
        />
        <div className="relative -mt-2 px-4 pt-16 pb-10 sm:mt-0 sm:px-6 sm:pt-12 md:px-10 md:pt-6 md:pb-12 max-w-7xl mx-auto">
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
          <div className="mt-8 flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 text-white font-black text-2xl shadow-xl border-2 border-white/20">
              RP
            </div>
            <div>
              <motion.h1
                className="text-[2.6rem] font-black tracking-tighter text-slate-900 sm:text-[3.2rem] leading-[0.9]"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut", delay: 0.18 }}
              >
                Radio Passport
              </motion.h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Live Frequency Atlas</span>
              </div>
            </div>
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

          {/* Search Bar Consolidation - The Hero Search is now the primary entry */}
          <div className="mt-10 max-w-2xl">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
              <div className="relative flex items-center bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xl focus-within:ring-2 focus-within:ring-indigo-500/50 transition-all">
                <div className="pl-5 text-slate-400">
                  <IconSearch size={20} />
                </div>
                <input
                  id="hero-search-input"
                  type="text"
                  value={searchQueryRaw}
                  onChange={(e) => onSearch?.(e.target.value)}
                  placeholder="Find countries, cities, or stations..."
                  className="w-full bg-transparent px-5 py-5 text-lg font-medium focus:outline-none placeholder:text-slate-300 text-slate-800"
                />
                {searchQueryRaw && (
                  <button
                    type="button"
                    onClick={() => onSearch?.('')}
                    className="mr-2 p-2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <IconX size={18} />
                  </button>
                )}
                <div className="pr-4 hidden sm:block">
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-100">⌘K</span>
                </div>
              </div>
            </div>
          </div>

          {/* CTA Buttons - Simplified */}
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <button
              type="button"
              className="group flex h-14 items-center gap-3 rounded-full bg-slate-900 px-8 text-base font-black uppercase tracking-widest text-white shadow-2xl transition-all hover:bg-black hover:scale-[1.03] active:scale-[0.97]"
              onClick={onStartListening}
              onMouseEnter={onHoverSound}
            >
              <IconHeadphones size={20} className="text-indigo-400" />
              Tune In Now
            </button>

            <button
              type="button"
              className="flex h-14 items-center gap-3 rounded-full border-2 border-slate-200 bg-white/50 backdrop-blur-sm px-6 text-base font-bold text-slate-700 transition-all hover:bg-white hover:border-slate-300 active:scale-[0.97]"
              onClick={onQuickRetune}
            >
              <IconCompass size={20} className="text-slate-400" />
              Quick Retune
            </button>
          </div>
        </div>
      </motion.section>
    </div>
  );
}
