import { motion } from "framer-motion";
import { Badge, Title, Text, ActionIcon } from "@mantine/core";
import {
  IconBroadcast,
  IconMapPin,
  IconPlayerPauseFilled,
  IconPlayerPlayFilled,
  IconPlayerSkipBackFilled,
  IconPlayerSkipForwardFilled,
} from "@tabler/icons-react";
import { CountryFlag } from "~/components/CountryFlag";
import type { Country, Station } from "~/types/radio";
import { useMemo, useState, useEffect } from "react";

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

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Floating music notes animation
  const floatingNotes = useMemo(
    () =>
      Array.from({ length: 18 }).map((_, i) => {
        const seed = i / 18;
        const isEven = i % 2 === 0;
        return {
          id: i,
          delay: seed * 6,
          duration: 12 + seed * 8,
          startX: (i * 5.5) % 100,
          endX: ((i * 5.5) + (isEven ? 60 : -60)) % 100,
          startY: 115,
          midY: 40 + (seed * 30),
          endY: -25 - (seed * 15),
          rotation: i * 25,
          scale1: 0.6 + (seed * 0.5),
          scale2: 1.1 + (seed * 0.6),
          opacity: 0.5 + (seed * 0.35),
          note: ['🎵', '🎶', '🎼', '🎹', '🎺', '🎸', '🎻', '🎤', '🎧', '🎙️'][i % 10],
          blur: seed * 0.3,
          color: isEven ? 'rgba(99, 102, 241, 0.3)' : 'rgba(168, 85, 247, 0.3)',
        };
      }),
    []
  );

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

  const containerClasses = transparent
    ? "relative overflow-hidden px-6 py-8 md:px-10 md:py-10"
    : "relative overflow-hidden rounded-2xl border border-slate-300/30 bg-[#e0e5ec] px-6 py-8 md:px-10 md:py-10";

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={containerClasses}
    >
      {/* Animated Gradient Orbs Background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-60">
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

      {/* Floating Music Notes Animation - Synced with Playing State */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {isMounted && floatingNotes.map((note) => (
          <motion.div
            key={note.id}
            className="absolute text-2xl md:text-3xl"
            initial={{
              x: `${note.startX}vw`,
              y: `${note.startY}%`,
              rotate: note.rotation,
              scale: note.scale1,
              opacity: 0,
            }}
            animate={isPlaying ? {
              y: [`${note.startY}%`, `${note.midY}%`, `${note.endY}%`],
              x: [`${note.startX}vw`, `${(note.startX + note.endX) / 2}vw`, `${note.endX}vw`],
              rotate: [note.rotation, note.rotation + 180, note.rotation + 360],
              scale: [note.scale1, note.scale2 * 1.2, note.scale1 * 0.6],
              opacity: [0, note.opacity * 1.3, note.opacity, 0],
            } : {
              y: [`${note.startY}%`, `${note.midY + 20}%`, `${note.endY + 30}%`],
              x: [`${note.startX}vw`, `${note.startX}vw`, `${note.startX}vw`],
              rotate: [note.rotation, note.rotation + 90, note.rotation + 180],
              scale: [note.scale1 * 0.6, note.scale2 * 0.7, note.scale1 * 0.4],
              opacity: [0, note.opacity * 0.3, note.opacity * 0.2, 0],
            }}
            transition={{
              duration: isPlaying ? note.duration * 0.8 : note.duration * 1.8,
              delay: note.delay,
              repeat: Infinity,
              ease: isPlaying ? "easeInOut" : "easeOut",
            }}
            style={{
              filter: `blur(${note.blur}px) drop-shadow(0 2px 8px ${note.color})`,
              color: note.color,
            }}
          >
            {note.note}
          </motion.div>
        ))}
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
              <Text size="sm" c="dimmed">
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
