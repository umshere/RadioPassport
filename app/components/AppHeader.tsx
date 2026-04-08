import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "@remix-run/react";
import { ActionIcon, Badge } from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { CountryFlag } from "~/components/CountryFlag";
import { usePlayerStore } from "~/state/playerStore";

export default function AppHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const nowPlaying = usePlayerStore((state) => state.nowPlaying);
  const [isMounted, setIsMounted] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  const { scrollY } = useScroll();
  const headerShadow = useTransform(scrollY, [0, 160], ["none", "0 12px 30px rgba(0,0,0,0.45)"]);
  const headerHeight = useTransform(scrollY, [0, 160], [56, 48]);
  const logoSize = useTransform(scrollY, [0, 160], [40, 32]);
  const logoScale = useTransform(scrollY, [0, 160], [1, 0.96]);
  const titleScale = useTransform(scrollY, [0, 160], [1, 0.94]);
  const titleOpacity = useTransform(scrollY, [0, 160], [1, 0.9]);
  const subtitleOpacity = useTransform(scrollY, [0, 160], [1, 0.75]);
  const subtitleY = useTransform(scrollY, [0, 160], [0, -2]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || typeof CSS === "undefined") return;
    setUseFallback(!CSS.supports("animation-timeline: scroll()"));
  }, []);

  const enableFallback = useFallback && !shouldReduceMotion;

  return (
    <motion.header
      className="scroll-morph-header sticky top-0 z-50 backdrop-blur-xl bg-[var(--rp-surface)]/90 border-b border-white/10"
      style={enableFallback ? { boxShadow: headerShadow } : undefined}
    >
      <motion.div
        className="app-header__inner mx-auto max-w-7xl px-4 pr-12 sm:px-6 sm:pr-6 lg:px-8 lg:pr-8 flex items-center justify-between gap-4 transition-all duration-300"
        style={enableFallback ? { height: headerHeight } : undefined}
      >
        {/* Logo Area */}
        <Link to="/" className="flex items-center gap-3 flex-shrink-0 group" prefetch="intent" aria-label="Radio Passport">
          <motion.div
            className="app-header__logo relative flex items-center justify-center rounded-xl bg-transparent shadow-[0_10px_20px_rgba(0,0,0,0.4)] ring-1 ring-white/5 overflow-hidden transition-transform group-hover:scale-105"
            style={enableFallback ? { width: logoSize, height: logoSize, scale: logoScale } : undefined}
          >
            <img
              src="/RP180.png"
              alt="Radio Passport"
              className="h-full w-full object-cover scale-[1.16] translate-y-0"
            />
          </motion.div>
          <div className="flex flex-col">
            <motion.span
              className="app-header__title font-black tracking-tight text-[var(--rp-text)] leading-tight whitespace-nowrap text-sm sm:text-base"
              style={enableFallback ? { scale: titleScale, opacity: titleOpacity } : undefined}
            >
              Radio Passport
            </motion.span>
            <motion.span
              className="app-header__subtitle hidden sm:block text-[9px] text-[var(--rp-muted-2)] font-bold uppercase tracking-widest leading-tight whitespace-nowrap"
              style={enableFallback ? { opacity: subtitleOpacity, y: subtitleY } : undefined}
            >
              Curated live radio
            </motion.span>
          </div>
        </Link>

        {/* Center: Now Playing Status - Gated by isMounted to prevent hydration mismatch */}
        <div className="flex-1 flex items-center justify-center overflow-hidden px-2">
          {isMounted && nowPlaying ? (
            <div className="flex items-center gap-2 text-[11px] text-[var(--rp-muted)] max-w-full">
              <CountryFlag
                iso={nowPlaying.countryCode ?? undefined}
                title={nowPlaying.country}
                width={20}
                height={15}
                className="rounded-[4px] border border-white/10 shadow-[0_4px_10px_rgba(0,0,0,0.24)]"
              />
              <div className="flex flex-col leading-tight overflow-hidden">
                <span className="truncate font-bold text-[var(--rp-text)]">{nowPlaying.name}</span>
                <span className="truncate text-[10px] text-[var(--rp-muted-2)] opacity-80">{nowPlaying.country}</span>
              </div>
              <Badge variant="dot" color="yellow" radius="xl" size="xs" className="font-mono ml-2 hidden sm:flex">LIVE</Badge>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 opacity-70">
              <span className="text-[11px] font-bold tracking-wide uppercase text-[var(--rp-muted-2)]">Radio Passport</span>
            </div>
          )}
        </div>

        {/* Right: Discovery Status & Actions */}
        <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
          <div className="hidden sm:flex items-center rounded-full border border-white/10 bg-black/45 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.24em] text-[var(--rp-muted-2)] shadow-[0_10px_24px_rgba(0,0,0,0.45)]">
            Home discovery
          </div>

          <div className="flex items-center gap-1">
            <ActionIcon
              variant="subtle"
              color="gray"
              onClick={() => {
                // Focus search or trigger overlay
                const searchInput = document.getElementById('hero-search-input') as HTMLInputElement | null;
                if (searchInput) {
                  searchInput.focus();
                  searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  return;
                }
                if (typeof window !== "undefined") {
                  window.sessionStorage.setItem("focusSearch", "1");
                }
                navigate("/", { preventScrollReset: true });
              }}
              title="Search"
              className="text-[var(--rp-muted)] hover:text-[var(--rp-gold)]"
            >
              <IconSearch size={20} />
            </ActionIcon>
          </div>
        </div>
      </motion.div>
    </motion.header>
  );
}
