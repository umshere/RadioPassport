import { useMemo } from "react";
import { ActionIcon, Text } from "@mantine/core";
import {
    IconPlayerPauseFilled,
    IconPlayerPlayFilled,
    IconPlayerSkipBackFilled,
    IconPlayerSkipForwardFilled,
    IconChevronDown,
    IconChevronUp,
    IconHeart,
    IconShare,
    IconBrandYoutube,
    IconBrandWikipedia,
    IconUser,
    IconDisc,
    IconMusic,
    IconExternalLink,
    IconSparkles,
} from "@tabler/icons-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Station } from "~/types/radio";
import { useNowPlayingMetadata } from "~/hooks/useNowPlayingMetadata";
import { useTrackTrivia } from "~/hooks/useTrackTrivia";
import { useUIStore } from "~/state/uiStore";

interface RetroTunerProps {
    station: Station;
    isPlaying: boolean;
    onPlayPause: () => void;
    onNext: () => void;
    onPrev: () => void;
    onClose: () => void;
}

export default function RetroTuner({
    station,
    isPlaying,
    onPlayPause,
    onNext,
    onPrev,
    onClose,
}: RetroTunerProps) {
    const { aiTriviaExpanded, setAiTriviaExpanded } = useUIStore();
    const nowPlayingMeta = useNowPlayingMetadata(station, isPlaying);
    const freeTrivia = useTrackTrivia({
        track: nowPlayingMeta.track,
        source: "free",
        enabled: true,
    });
    const aiTrivia = useTrackTrivia({
        track: nowPlayingMeta.track,
        source: "ai",
        enabled: aiTriviaExpanded,
        context: {
            summary: freeTrivia.trivia?.summary ?? null,
            facts: freeTrivia.trivia?.facts ?? [],
        },
    });
    const trackLine =
        nowPlayingMeta.status === "ready" && nowPlayingMeta.track
            ? [nowPlayingMeta.track.artist, nowPlayingMeta.track.title]
                .filter(Boolean)
                .join(" — ")
            : null;
    const statusHint =
        nowPlayingMeta.status === "loading"
            ? "Identifying track…"
            : nowPlayingMeta.status === "empty"
                ? "On-air update soon"
                : nowPlayingMeta.status === "error"
                    ? "Track info unavailable"
                    : null;
    const triviaTitle = trackLine ?? statusHint ?? "Listening live";

    const renderLinkIcon = (kind?: string) => {
        switch (kind) {
            case "youtube":
                return IconBrandYoutube;
            case "artist":
                return IconUser;
            case "release":
                return IconDisc;
            case "track":
                return IconMusic;
            case "info":
                return IconBrandWikipedia;
            default:
                return IconExternalLink;
        }
    };

    // Generate a consistent "frequency" based on station UUID if not real
    const frequency = useMemo(() => {
        // Simple hash to get a number between 88.0 and 108.0
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
        <motion.div
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-50 flex flex-col bg-[#e0e5ec] text-slate-800"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-6">
                <ActionIcon
                    variant="transparent"
                    color="dark"
                    onClick={onClose}
                    className="opacity-60 hover:opacity-100"
                >
                    <IconChevronDown size={28} />
                </ActionIcon>
                {/* AM/FM Removed as requested */}
            </div>

            {/* Main Tuner Area */}
            <div className="flex flex-1 flex-col items-center justify-center gap-8 md:gap-10">
                {/* 1. Giant Frequency Number */}
                <div className="flex flex-col items-center">
                    <h1 className="font-mono text-7xl md:text-8xl font-bold tracking-tighter text-slate-900">
                        {frequency}
                    </h1>
                    <p className="mt-2 text-sm font-medium uppercase tracking-widest text-slate-500">
                        {station.name}
                    </p>
                </div>

                {/* 2. Radio Tuner Scale & 3. Needle */}
                <div className="relative w-full max-w-md px-4 md:px-8">
                    {/* Glass Container */}
                    <div className="relative h-28 md:h-32 w-full overflow-hidden rounded-2xl bg-slate-200/50 shadow-inner backdrop-blur-sm">
                        {/* Scale Ticks */}
                        <div className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-between px-6 md:px-8">
                            {ticks.map((tick, i) => {
                                const isMajor = i % 5 === 0;
                                return (
                                    <div
                                        key={i}
                                        className="flex flex-col items-center gap-2"
                                        style={{ opacity: Math.abs(tick - freqNum) < 1.5 ? 1 : 0.3 }}
                                    >
                                        <div
                                            className={`w-px bg-slate-400 ${isMajor ? "h-6 md:h-8" : "h-3 md:h-4"
                                                }`}
                                        />
                                        {isMajor && (
                                            <span className="text-[9px] md:text-[10px] font-bold text-slate-500">
                                                {Math.floor(tick)}
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Red Needle */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="h-full w-0.5 bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)]" />
                            {/* Triangle/Marker */}
                            <div className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rotate-45 bg-red-500" />
                        </div>
                    </div>

                    {/* Side Actions */}
                    <div className="absolute top-1/2 -translate-y-1/2 left-0 md:left-2">
                        <ActionIcon variant="transparent" color="red">
                            <IconHeart size={20} />
                        </ActionIcon>
                    </div>
                    <div className="absolute top-1/2 -translate-y-1/2 right-0 md:right-2">
                        <ActionIcon variant="transparent" color="gray">
                            <IconShare size={20} />
                        </ActionIcon>
                    </div>
                </div>

                {/* Track Spotlight */}
                <div className="w-full max-w-xl px-5 mb-6">
                    <div className="relative max-h-[240px] overflow-y-auto rounded-3xl bg-[#e4e8ef] px-5 py-4 shadow-[10px_10px_20px_#b8b9be,-10px_-10px_20px_#ffffff] scrollbar-hide">
                        <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-end px-4 pt-2 text-slate-400/70">
                            <IconChevronUp size={16} />
                        </div>
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-end px-4 pb-2 text-slate-400/70">
                            <IconChevronDown size={16} />
                        </div>
                        <div className="flex items-center justify-between gap-3">
                            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                                Track Spotlight
                            </div>
                            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                Highlights
                            </div>
                        </div>

                        <Text size="xs" className="mt-2 text-slate-500">
                            {triviaTitle}
                        </Text>

                        {freeTrivia.status === "loading" && (
                            <Text size="sm" className="mt-3 text-slate-700">
                                Fetching highlights…
                            </Text>
                        )}
                        {freeTrivia.status === "error" && (
                            <Text size="sm" className="mt-3 text-rose-600">
                                {freeTrivia.message ?? "Trivia unavailable."}
                            </Text>
                        )}
                        {freeTrivia.status === "empty" && null}
                        {freeTrivia.status === "ready" && freeTrivia.trivia && (
                            <div className="mt-3 flex flex-col gap-3">
                                <div className="flex items-start gap-3">
                                    {freeTrivia.trivia.imageUrl && (
                                        <img
                                            src={freeTrivia.trivia.imageUrl}
                                            alt="Track artwork"
                                            className="h-16 w-16 rounded-2xl object-cover shadow-[4px_4px_10px_#b8b9be,-4px_-4px_10px_#ffffff]"
                                            onError={(event) => {
                                                event.currentTarget.style.display = "none";
                                            }}
                                        />
                                    )}
                                    <div className="min-w-0">
                                        <Text size="md" fw={600} className="text-slate-900">
                                            {freeTrivia.trivia.summary}
                                        </Text>
                                    </div>
                                </div>
                                <div className="grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                                    {freeTrivia.trivia.facts.map((fact) => (
                                        <div key={fact.label} className="flex items-center gap-2">
                                            <span className="font-semibold text-slate-800">{fact.label}</span>
                                            <span className="text-slate-400">•</span>
                                            <span>{fact.value}</span>
                                        </div>
                                    ))}
                                </div>
                                {freeTrivia.trivia.links && freeTrivia.trivia.links.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {freeTrivia.trivia.links.map((link) => {
                                            const Icon = renderLinkIcon(link.kind);
                                            return (
                                                <a
                                                    key={link.url}
                                                    href={link.url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-600 shadow-[inset_2px_2px_4px_#d1d5db,inset_-2px_-2px_4px_#ffffff]"
                                                    aria-label={link.label}
                                                    title={link.label}
                                                >
                                                    <Icon size={14} />
                                                </a>
                                            );
                                        })}
                                    </div>
                                )}
                                <Text size="xs" className="text-slate-400">
                                    Source: MusicBrainz
                                </Text>
                            </div>
                        )}
                        {aiTriviaExpanded && (
                            <div className="mt-3 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-[0_10px_18px_rgba(15,23,42,0.12)]">
                                {aiTrivia.status === "loading" && (
                                    <Text size="sm" className="text-slate-700">
                                        Fetching AI insights…
                                    </Text>
                                )}
                                {aiTrivia.status === "error" && (
                                    <Text size="sm" className="text-rose-600">
                                        {aiTrivia.message ?? "AI trivia unavailable."}
                                    </Text>
                                )}
                                {aiTrivia.status === "empty" && null}
                                {aiTrivia.status === "ready" && aiTrivia.trivia && (
                                    <div className="flex flex-col gap-2">
                                        <Text size="sm" fw={600} className="text-slate-900">
                                            {aiTrivia.trivia.summary}
                                        </Text>
                                        <div className="grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                                            {aiTrivia.trivia.facts.map((fact) => (
                                                <div key={fact.label} className="flex items-center gap-2">
                                                    <span className="font-semibold text-slate-800">{fact.label}</span>
                                                    <span className="text-slate-400">•</span>
                                                    <span>{fact.value}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <Text size="xs" className="text-slate-400">
                                            Source: AI
                                        </Text>
                                    </div>
                                )}
                            </div>
                        )}
                        {!aiTriviaExpanded && (
                            <button
                                type="button"
                                className="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-[inset_2px_2px_4px_#d1d5db,inset_-2px_-2px_4px_#ffffff]"
                                onClick={() => setAiTriviaExpanded(true)}
                            >
                                <IconSparkles size={12} />
                                More
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* 5. Button Row (Transport) */}
            <div className="mb-12 flex items-center justify-center gap-6 md:gap-8 px-4 md:px-8">
                <button
                    onClick={onPrev}
                    className="flex h-14 w-14 md:h-16 md:w-16 items-center justify-center rounded-2xl bg-[#e0e5ec] text-slate-500 shadow-[6px_6px_12px_#b8b9be,-6px_-6px_12px_#ffffff] active:shadow-[inset_6px_6px_12px_#b8b9be,inset_-6px_-6px_12px_#ffffff]"
                >
                    <IconPlayerSkipBackFilled size={20} />
                </button>

                <button
                    onClick={onPlayPause}
                    className="flex h-20 w-28 md:h-24 md:w-32 items-center justify-center rounded-3xl bg-slate-900 text-white shadow-[6px_6px_12px_#b8b9be,-6px_-6px_12px_#ffffff] active:scale-95 transition-transform"
                >
                    {isPlaying ? (
                        <IconPlayerPauseFilled size={28} />
                    ) : (
                        <IconPlayerPlayFilled size={28} />
                    )}
                    <span className="ml-2 text-xs md:text-sm font-bold uppercase tracking-widest">
                        {isPlaying ? "Pause" : "Play"}
                    </span>
                </button>

                <button
                    onClick={onNext}
                    className="flex h-14 w-14 md:h-16 md:w-16 items-center justify-center rounded-2xl bg-[#e0e5ec] text-slate-500 shadow-[6px_6px_12px_#b8b9be,-6px_-6px_12px_#ffffff] active:shadow-[inset_6px_6px_12px_#b8b9be,inset_-6px_-6px_12px_#ffffff]"
                >
                    <IconPlayerSkipForwardFilled size={20} />
                </button>
            </div>

            {/* Footer Info */}
            <div className="pb-8 text-center">
                <p className="text-lg font-bold text-slate-800">
                    {station.name}
                </p>
                <p className="text-sm text-slate-500">
                    {[station.country, station.state].filter(Boolean).join(" • ")}
                </p>
            </div>
        </motion.div>
    );
}
