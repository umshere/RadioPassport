import { useMemo, useState, useEffect } from "react";
import { Link, useSearchParams } from "@remix-run/react";
import { ActionIcon, Badge, SegmentedControl, Group } from "@mantine/core";
import { IconSettings, IconSearch, IconWorld, IconRadio } from "@tabler/icons-react";
import { usePlayerStore } from "~/state/playerStore";

export default function AppHeader() {
  const [searchParams, setSearchParams] = useSearchParams();
  const nowPlaying = usePlayerStore((state) => state.nowPlaying);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const audioLevel = usePlayerStore((state) => state.audioLevel);
  const [isMounted, setIsMounted] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);
  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const currentView = searchParams.get("view") === "world" ? "world" : "classical";

  const handleViewChange = (value: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value === "world") {
        next.set("view", "world");
        next.delete("country");
        next.delete("q");
      } else {
        next.delete("view");
      }
      return next;
    }, { preventScrollReset: true });
  };

  return (
    <header
      className={`sticky top-0 z-50 backdrop-blur-xl bg-[var(--rp-surface)]/90 border-b border-white/10 transition-all duration-300 ${
        isScrolled ? "shadow-[0_12px_30px_rgba(0,0,0,0.45)]" : ""
      }`}
    >
      <div className={`mx-auto max-w-7xl px-4 pr-12 sm:px-6 sm:pr-6 lg:px-8 lg:pr-8 flex items-center justify-between gap-4 transition-all duration-300 ${isScrolled ? "h-12" : "h-14"}`}>
        {/* Logo Area */}
        <Link to="/" className="flex items-center gap-3 flex-shrink-0 group" prefetch="intent" aria-label="Radio Passport">
          <div className={`relative flex items-center justify-center rounded-xl bg-transparent shadow-[0_10px_20px_rgba(0,0,0,0.4)] ring-1 ring-white/5 overflow-hidden transition-transform group-hover:scale-105 ${isScrolled ? "h-8 w-8" : "h-10 w-10"}`}>
            <img
              src="/RP180.png"
              alt="Radio Passport"
              className="h-full w-full object-cover scale-[1.16] translate-y-0"
            />
          </div>
          <div className="flex flex-col">
            <span className={`font-black tracking-tight text-[var(--rp-text)] leading-tight whitespace-nowrap ${isScrolled ? "text-xs sm:text-sm" : "text-sm sm:text-base"}`}>Radio Passport</span>
            <span className={`hidden sm:block text-[9px] text-[var(--rp-muted-2)] font-bold uppercase tracking-widest leading-tight whitespace-nowrap ${isScrolled ? "opacity-70" : ""}`}>Global sound atlas</span>
          </div>
        </Link>

        {/* Center: Now Playing Status - Gated by isMounted to prevent hydration mismatch */}
        <div className="flex-1 flex items-center justify-center overflow-hidden px-2">
          {isMounted && nowPlaying ? (
            <div className="flex items-center gap-2 text-[11px] text-[var(--rp-muted)] max-w-full">
              <HeaderAudioMeter level={audioLevel} active={isPlaying} />
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

        {/* Right: Mode Toggle & Action Icons */}
        <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
          <div className="flex items-center">
            <SegmentedControl
              value={currentView}
              onChange={handleViewChange}
              data={[
                { label: <Group gap={4} wrap="nowrap"><IconRadio size={14} /><span className="hidden xs:inline">Classic</span></Group>, value: 'classical' },
                { label: <Group gap={4} wrap="nowrap"><IconWorld size={14} /><span className="hidden xs:inline">World</span></Group>, value: 'world' },
              ]}
              size="xs"
              radius="xl"
              transitionDuration={300}
              classNames={{
                root: "bg-black/50 p-0.5 sm:p-1 border border-white/10 shadow-[0_10px_24px_rgba(0,0,0,0.5)]",
                label: "font-black uppercase tracking-widest text-[9px] sm:text-[10px] px-2 sm:px-3 text-[var(--rp-muted-2)] data-[active=true]:text-black",
                indicator: "bg-[var(--rp-gold)]"
              }}
            />
          </div>

          <div className="flex items-center gap-1">
            <ActionIcon
              variant="subtle"
              color="gray"
              onClick={() => {
                // Focus search or trigger overlay
                const searchInput = document.getElementById('hero-search-input');
                if (searchInput) {
                  searchInput.focus();
                  searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              }}
              title="Search"
              className="text-[var(--rp-muted)] hover:text-[var(--rp-gold)]"
            >
              <IconSearch size={20} />
            </ActionIcon>
          </div>
        </div>
      </div>
    </header>
  );
}

function HeaderAudioMeter({ level, active }: { level: number; active: boolean }) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const meterLevel = (isMounted && active) ? Math.min(1, Math.max(0, level)) : 0;
  const heights = useMemo(() => {
    // Standard baseline seeds
    const seeds = [0.35, 0.85, 0.55];
    return seeds.map((base, index) => {
      const variance = (index + 1) * 0.08;
      const calculated = 8 + (base + meterLevel * (0.8 - variance)) * 18;
      return `${calculated}px`;
    });
  }, [meterLevel, isMounted]);

  // Always render the container to preserve structure, but bars are static on server
  return (
    <div className="header-meter" aria-hidden="true">
      {(isMounted ? heights : ["8px", "8px", "8px"]).map((height: string, index: number) => (
        <span
          key={index}
          className="header-meter__bar"
          style={{
            height,
            opacity: (isMounted && active) ? 1 : 0.35,
            transition: 'height 0.2s ease, opacity 0.2s ease'
          }}
        />
      ))}
    </div>
  );
}
