import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IconHeadphones, IconCompass, IconSearch, IconSparkles, IconBook, IconX } from "@tabler/icons-react";
import type { Country, Station } from "~/types/radio";

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
  onOpenPassport?: () => void;
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
  onOpenPassport,
}: HeroSectionProps) {
  const [heroTaglineIndex, setHeroTaglineIndex] = useState(0);
  const [heroTickerIndex, setHeroTickerIndex] = useState(0);
  const [isCondensed, setIsCondensed] = useState(false);

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
  useEffect(() => {
    const onScroll = () => setIsCondensed(window.scrollY > 120);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <section
      className={`relative -mt-4 w-full overflow-hidden transition-shadow duration-300 ${
        isCondensed ? "shadow-[0_18px_40px_rgba(0,0,0,0.45)]" : ""
      }`}
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 20% 20%, rgba(255, 200, 90, 0.18), transparent 55%), radial-gradient(circle at 80% 0%, rgba(255, 200, 90, 0.12), transparent 45%), linear-gradient(180deg, #0b0c10 0%, #0f1118 100%)",
        }}
      />
      <div
        className={`relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 transition-all duration-300 ${
          isCondensed ? "pb-8 pt-5 lg:pb-12 lg:pt-8" : "pb-10 pt-8 lg:pb-16 lg:pt-12"
        }`}
      >
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="grid gap-8 lg:grid-cols-12 lg:items-center"
        >
          <div className="lg:col-span-7">
            <motion.span
              className="inline-flex h-8 items-center gap-2 rounded-full border border-white/10 bg-black/40 px-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--rp-muted)] shadow-[0_12px_30px_rgba(0,0,0,0.45)] backdrop-blur"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
              role="status"
              aria-live="polite"
            >
              <span className="h-2 w-2 rounded-full bg-[var(--rp-gold)] animate-pulse" />
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

            <div className="mt-6 flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--rp-card)] text-[var(--rp-gold)] text-xl font-black tracking-tight shadow-[0_18px_40px_rgba(0,0,0,0.6)]">
                RP
              </div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[var(--rp-muted-2)]">
                Passport Premium
              </div>
            </div>

            <motion.h1
              className="mt-6 text-[2.6rem] font-semibold tracking-tight text-[var(--rp-text)] sm:text-[3.4rem] lg:text-[3.8rem] leading-[1.02]"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.16 }}
            >
              Explore global radio with a passport-worthy listening ritual.
            </motion.h1>

            <AnimatePresence initial={false} mode="wait">
              <motion.p
                key={HERO_TAGLINES[heroTaglineIndex]}
                className="mt-4 text-base font-medium text-[var(--rp-muted)] sm:text-lg"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.5, ease: [0.42, 0, 0.58, 1] }}
              >
                {HERO_TAGLINES[heroTaglineIndex]}
              </motion.p>
            </AnimatePresence>

            <div className="mt-8 max-w-2xl">
              <div className="relative group">
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-[rgba(245,177,45,0.4)] to-[rgba(245,177,45,0.12)] blur opacity-40 transition duration-700 group-hover:opacity-70" />
                <div className="relative flex items-center rounded-2xl border border-white/10 bg-[var(--rp-card)] shadow-[0_18px_40px_rgba(0,0,0,0.6)] backdrop-blur-xl focus-within:ring-2 focus-within:ring-[rgba(245,177,45,0.4)]">
                  <div className="pl-5 text-[var(--rp-muted-2)]">
                    <IconSearch size={20} />
                  </div>
                  <input
                    id="hero-search-input"
                    type="text"
                    value={searchQueryRaw}
                    onChange={(e) => onSearch?.(e.target.value)}
                    placeholder="Search countries, cities, or stations..."
                    className="w-full bg-transparent px-5 py-4 text-base font-medium text-[var(--rp-text)] focus:outline-none placeholder:text-[var(--rp-muted-2)]"
                  />
                  {searchQueryRaw && (
                    <button
                      type="button"
                      onClick={() => onSearch?.("")}
                      className="mr-2 p-2 text-[var(--rp-muted-2)] transition-colors hover:text-[var(--rp-text)]"
                    >
                      <IconX size={18} />
                    </button>
                  )}
                  <div className="pr-4 hidden sm:block">
                    <span className="text-[10px] font-semibold text-[var(--rp-muted-2)] bg-black/40 px-2 py-1 rounded border border-white/10">
                      ⌘K
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="group flex h-12 items-center gap-3 rounded-full bg-[var(--rp-gold)] px-6 text-sm font-semibold uppercase tracking-[0.2em] text-black shadow-[0_18px_36px_rgba(245,177,45,0.35)] transition-all hover:bg-[var(--rp-gold-strong)] active:scale-[0.98]"
                onClick={onStartListening}
                onMouseEnter={onHoverSound}
              >
                <IconHeadphones size={18} className="text-black" />
                Start Listening
              </button>

              <button
                type="button"
                className="flex h-12 items-center gap-2 rounded-full border border-white/10 bg-black/40 px-5 text-sm font-semibold text-[var(--rp-text)] transition-all hover:bg-black/60"
                onClick={onQuickRetune}
              >
                <IconCompass size={18} className="text-[var(--rp-gold)]" />
                Quick Retune
              </button>

              {onOpenPassport && (
                <button
                  type="button"
                  className="flex h-12 items-center gap-2 rounded-full border border-transparent px-4 text-sm font-semibold text-[var(--rp-muted)] transition-all hover:text-[var(--rp-text)]"
                  onClick={onOpenPassport}
                >
                  <IconBook size={18} className="text-[var(--rp-gold)]" />
                  Passport
                </button>
              )}

              {onMissionExploreWorld && (
                <button
                  type="button"
                  className="flex h-12 items-center gap-2 rounded-full border border-transparent px-4 text-sm font-semibold text-[var(--rp-muted)] transition-all hover:text-[var(--rp-text)]"
                  onClick={onMissionExploreWorld}
                >
                  <IconSparkles size={18} className="text-[var(--rp-gold)]" />
                  AI Journey
                </button>
              )}
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="rounded-3xl border border-white/10 bg-[var(--rp-card)] p-4 shadow-[0_24px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl">
              <div className="relative overflow-hidden rounded-2xl">
                <img
                  src="/RPHERO_WIDE.png"
                  alt="Global radio atlas"
                  className="h-48 w-full object-cover object-top sm:h-56"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-full border border-white/10 bg-black/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--rp-text)]">
                  Passport Edition
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.18em] text-[var(--rp-muted-2)]">
                  <span>Listening now</span>
                  <span className="text-[var(--rp-gold)]">Live</span>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3">
                  <div className="text-sm font-semibold text-[var(--rp-text)]">
                    {nowPlaying?.name ?? "Choose a station to start your journey"}
                  </div>
                  <div className="text-xs text-[var(--rp-muted-2)]">
                    {nowPlaying?.country ?? "Global radio atlas"}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--rp-muted-2)]">
                  <div className="rounded-2xl border border-white/10 bg-black/40 px-2 py-2">
                    {topCountries.length.toLocaleString()}<br />Countries
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/40 px-2 py-2">
                    {totalStations > 1000
                      ? `${(totalStations / 1000).toFixed(0)}k+`
                      : totalStations.toLocaleString()}
                    <br />Stations
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/40 px-2 py-2">
                    {continents}<br />Continents
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
