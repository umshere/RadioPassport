import { useEffect, useMemo } from "react";
import { Link, NavLink, useLocation } from "@remix-run/react";
import { ActionIcon, Badge } from "@mantine/core";
import { IconBell, IconSettings, IconSearch } from "@tabler/icons-react";
import { usePlayerStore } from "~/state/playerStore";

const NAV_LINKS = [
  { to: "/", label: "Home" },
  { to: "/world/cards", label: "World" },
  { to: "/about", label: "About" },
];

export default function AppHeader() {
  const location = useLocation();
  const nowPlaying = usePlayerStore((state) => state.nowPlaying);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const audioLevel = usePlayerStore((state) => state.audioLevel);


  const tickerText = nowPlaying
    ? `Now ${isPlaying ? "playing" : "queued"} • ${nowPlaying.name} — ${nowPlaying.country || nowPlaying.language || "Unknown"
    }`
    : "Exploring the global sound atlas…";

  const isActive = (to: string) => {
    if (to === "/") return location.pathname === "/";
    return location.pathname === to || location.pathname.startsWith(`${to}/`);
  };



  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-[#e0e5ec]/80 border-b border-slate-200/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Logo Area */}
        <Link to="/" className="flex items-center gap-4 flex-shrink-0" prefetch="intent" aria-label="Radio Passport">
          <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-[#e0e5ec] shadow-[4px_4px_8px_#b8b9be,-4px_-4px_8px_#ffffff] overflow-hidden">
            <span className="relative text-sm font-black tracking-wider z-10 text-slate-700">RP</span>
          </div>
          <div className="hidden sm:flex flex-col">
            <span className="text-lg font-black tracking-tight text-slate-800 leading-tight whitespace-nowrap">Radio Passport</span>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-tight whitespace-nowrap">Global sound atlas</span>
          </div>
        </Link>

        {/* Mobile Now Playing Ticker (Visible on Mobile) */}
        <div className="flex md:hidden flex-1 items-center justify-center overflow-hidden px-2">
          {nowPlaying ? (
            <div className="flex items-center gap-2 text-[11px] text-slate-600 max-w-full">
              <HeaderAudioMeter level={audioLevel} active={isPlaying} />
              <div className="flex flex-col leading-tight overflow-hidden">
                <span className="truncate font-bold text-slate-800">{nowPlaying.name}</span>
                <span className="truncate text-[10px] text-slate-500 opacity-80">{nowPlaying.country}</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 opacity-50">
              <span className="text-[11px] font-bold tracking-wide uppercase text-slate-400">Radio Passport</span>
            </div>
          )}
        </div>

        <div className="mr-14 md:mr-0">
          <Badge variant="dot" color="red" radius="xl" className="font-mono">LIVE</Badge>
        </div>

        <div className="flex items-center gap-1 md:gap-3 flex-shrink-0">
          <div className="hidden items-center gap-1 md:flex">
            <ActionIcon variant="transparent" color="dark" aria-label="Search">
              <IconSearch size={20} />
            </ActionIcon>
            <ActionIcon variant="transparent" color="dark" aria-label="Notifications">
              <IconBell size={20} />
            </ActionIcon>
            <ActionIcon variant="transparent" color="dark" aria-label="Settings">
              <IconSettings size={20} />
            </ActionIcon>
          </div>
        </div>
      </div>

      <div className="hidden md:flex mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-12 items-center gap-2">
        <nav aria-label="Primary" className="flex items-center gap-1">
          {NAV_LINKS.map(({ to, label }) => {
            const active = isActive(to);
            return (
              <NavLink
                key={to}
                to={to}
                prefetch="intent"
                aria-current={active ? "page" : undefined}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${active
                  ? "text-slate-900 bg-slate-200/50 shadow-sm"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                  }`}
              >
                {label}
              </NavLink>
            );
          })}
        </nav>
        <div className="ml-auto hidden items-center gap-2 text-[12px] text-slate-500 truncate md:flex font-mono" aria-live="polite">
          <HeaderAudioMeter level={audioLevel} active={isPlaying} />
          <span className="truncate">{tickerText}</span>
        </div>
      </div>

      {/* Mobile Nav Removed - using MobileSidebarMenu instead */}
    </header>
  );
}

function HeaderAudioMeter({ level, active }: { level: number; active: boolean }) {
  const meterLevel = active ? Math.min(1, Math.max(0, level)) : 0;
  const heights = useMemo(() => {
    const seeds = [0.35, 0.85, 0.55];
    return seeds.map((base, index) => {
      const variance = (index + 1) * 0.08;
      const calculated = 8 + (base + meterLevel * (0.8 - variance)) * 18;
      return `${calculated}px`;
    });
  }, [meterLevel]);

  return (
    <div className="header-meter" aria-hidden="true">
      {heights.map((height, index) => (
        <span
          key={index}
          className="header-meter__bar"
          style={{ height, opacity: active ? 1 : 0.35 }}
        />
      ))}
    </div>
  );
}
