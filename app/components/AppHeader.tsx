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

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const currentView = searchParams.get("view") === "world" ? "world" : "classical";

  const handleViewChange = (value: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value === "world") {
        next.set("view", "world");
      } else {
        next.delete("view");
      }
      return next;
    }, { preventScrollReset: true });
  };

  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/70 transition-all duration-300">
      <div className="mx-auto max-w-7xl px-4 pr-12 sm:px-6 sm:pr-6 lg:px-8 lg:pr-8 h-14 flex items-center justify-between gap-4">
        {/* Logo Area */}
        <Link to="/" className="flex items-center gap-3 flex-shrink-0 group" prefetch="intent" aria-label="Radio Passport">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-900/5 overflow-hidden transition-transform group-hover:scale-105">
            <span className="relative text-sm font-black tracking-wider z-10 text-slate-800">RP</span>
          </div>
          <div className="hidden lg:flex flex-col">
            <span className="text-base font-black tracking-tight text-slate-800 leading-tight whitespace-nowrap">Radio Passport</span>
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest leading-tight whitespace-nowrap">Global sound atlas</span>
          </div>
        </Link>

        {/* Center: Now Playing Status - Gated by isMounted to prevent hydration mismatch */}
        <div className="flex-1 flex items-center justify-center overflow-hidden px-2">
          {isMounted && nowPlaying ? (
            <div className="flex items-center gap-2 text-[11px] text-slate-600 max-w-full">
              <HeaderAudioMeter level={audioLevel} active={isPlaying} />
              <div className="flex flex-col leading-tight overflow-hidden">
                <span className="truncate font-bold text-slate-800">{nowPlaying.name}</span>
                <span className="truncate text-[10px] text-slate-500 opacity-80">{nowPlaying.country}</span>
              </div>
              <Badge variant="dot" color="red" radius="xl" size="xs" className="font-mono ml-2 hidden sm:flex">LIVE</Badge>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 opacity-50">
              <span className="text-[11px] font-bold tracking-wide uppercase text-slate-400">Radio Passport</span>
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
              color="indigo"
              classNames={{
                root: "bg-slate-100 p-0.5 sm:p-1 border border-slate-200 shadow-inner",
                label: "font-black uppercase tracking-widest text-[9px] sm:text-[10px] px-2 sm:px-3"
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
