import { useMemo } from "react";
import { ActionIcon, Text } from "@mantine/core";
import {
    IconPlayerPauseFilled,
    IconPlayerPlayFilled,
    IconPlayerSkipBackFilled,
    IconPlayerSkipForwardFilled,
} from "@tabler/icons-react";
import type { Station } from "~/types/radio";

interface CompactRetroTunerProps {
    station: Station;
    isPlaying: boolean;
    onPlayPause: () => void;
    onNext: () => void;
    onPrev: () => void;
}

export default function CompactRetroTuner({
    station,
    isPlaying,
    onPlayPause,
    onNext,
    onPrev,
}: CompactRetroTunerProps) {
    // Generate a consistent "frequency" based on station UUID
    const frequency = useMemo(() => {
        let hash = 0;
        for (let i = 0; i < station.uuid.length; i++) {
            hash = station.uuid.charCodeAt(i) + ((hash << 5) - hash);
        }
        const range = 108.0 - 88.0;
        const normalized = Math.abs(hash % 1000) / 1000;
        return (88.0 + normalized * range).toFixed(1);
    }, [station.uuid]);

    const freqNum = parseFloat(frequency);
    const tickStart = Math.floor(freqNum) - 2;
    const ticks = Array.from({ length: 25 }, (_, i) => tickStart + i * 0.2);

    return (
        <div className="rounded-3xl border border-amber-400/20 bg-[#12151c] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.45)]">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:gap-8">
                {/* Left: Frequency Display */}
                <div className="flex flex-col items-center md:items-start">
                    <Text size="xs" fw={600} tt="uppercase" className="mb-2 text-amber-100/60">
                        Now Playing
                    </Text>
                    <h2 className="font-mono text-6xl font-bold tracking-tighter text-amber-50 md:text-7xl">
                        {frequency}
                    </h2>
                    <Text size="sm" fw={500} className="mt-1 text-amber-100/60">
                        MHz
                    </Text>
                </div>

                {/* Center: Tuner Scale */}
                <div className="flex-1">
                    <div className="relative h-24 w-full overflow-hidden rounded-2xl bg-[#1b202b] shadow-inner">
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
                                            className={`w-px bg-amber-200/60 ${isMajor ? "h-6" : "h-3"
                                                }`}
                                        />
                                        {isMajor && (
                                            <span className="text-[9px] font-bold text-amber-100/70">
                                                {Math.floor(tick)}
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Red Needle */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="h-full w-0.5 bg-[#f6c86f] shadow-[0_0_10px_rgba(246,200,111,0.6)]" />
                            <div className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rotate-45 bg-[#f6c86f]" />
                        </div>
                    </div>

                    {/* Station Info */}
                    <div className="mt-4 text-center">
                        <Text fw={700} size="lg" lineClamp={1} className="text-amber-50">
                            {station.name}
                        </Text>
                        <Text size="sm" className="text-amber-100/60">
                            {[station.country, station.state].filter(Boolean).join(" • ")}
                        </Text>
                    </div>
                </div>

                {/* Right: Transport Controls */}
                <div className="flex items-center justify-center gap-3">
                    <ActionIcon
                        size="lg"
                        radius="xl"
                        onClick={onPrev}
                        className="bg-[#161a22] text-amber-100/70 hover:text-amber-100 border border-amber-400/20"
                    >
                        <IconPlayerSkipBackFilled size={20} />
                    </ActionIcon>

                    <ActionIcon
                        size="xl"
                        radius="xl"
                        onClick={onPlayPause}
                        className="bg-gradient-to-br from-[#f6c86f] to-[#f1aa45] text-slate-900 shadow-[0_10px_24px_rgba(246,200,111,0.45)]"
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
                        onClick={onNext}
                        className="bg-[#161a22] text-amber-100/70 hover:text-amber-100 border border-amber-400/20"
                    >
                        <IconPlayerSkipForwardFilled size={20} />
                    </ActionIcon>
                </div>
            </div>
        </div>
    );
}
