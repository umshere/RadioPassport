import { useMemo } from "react";
import { Link } from "@remix-run/react";
import { ActionIcon, Badge } from "@mantine/core";
import { IconSettings, IconSearch } from "@tabler/icons-react";
import { usePlayerStore } from "~/state/playerStore";

export default function AppHeader() {
  const nowPlaying = usePlayerStore((state) => state.nowPlaying);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const audioLevel = usePlayerStore((state) => state.audioLevel);


  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/70 transition-all duration-300">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
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

        {/* Center: Now Playing Status */}
        <div className="flex-1 flex items-center justify-center overflow-hidden px-2">
          {nowPlaying ? (
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

        {/* Right: Action Icons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <ActionIcon
            variant="transparent"
            color="dark"
            aria-label="Search"
            className="hidden sm:flex"
          >
            <IconSearch size={18} />
          </ActionIcon>
          <ActionIcon variant="transparent" color="dark" aria-label="Settings">
            <IconSettings size={18} />
          </ActionIcon>
        </div>
      </div>
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
