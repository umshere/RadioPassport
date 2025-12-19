import type { PointerEvent as ReactPointerEvent } from "react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActionIcon, Text } from "@mantine/core";
import {
    IconPlayerPauseFilled,
    IconPlayerPlayFilled,
    IconPlayerSkipBackFilled,
    IconPlayerSkipForwardFilled,
    IconChevronDown,
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
import { motion } from "framer-motion";
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
    queue: Station[];
    currentIndex: number;
    onSelectStation: (station: Station) => void;
}

export default function RetroTuner({
    station,
    isPlaying,
    onPlayPause,
    onNext,
    onPrev,
    onClose,
    queue,
    currentIndex,
    onSelectStation,
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
    const handleExpandTrivia = useCallback(() => {
        setAiTriviaExpanded(true);
    }, [setAiTriviaExpanded]);

    // Reset AI panel when the track or station changes so the 'More' button reappears
    const trackKey = nowPlayingMeta.track
        ? `${nowPlayingMeta.track.artist ?? ""}|${nowPlayingMeta.track.title ?? ""}`
        : "";
    const lastTrackKeyRef = useRef<string>("");
    const lastStationRef = useRef<string | null>(null);
    useEffect(() => {
        const stationId = station.uuid ?? null;
        if (stationId !== lastStationRef.current) {
            setAiTriviaExpanded(false);
            lastStationRef.current = stationId;
            if (trackKey) {
                lastTrackKeyRef.current = trackKey;
            }
            return;
        }
        if (trackKey && trackKey !== lastTrackKeyRef.current) {
            setAiTriviaExpanded(false);
            lastTrackKeyRef.current = trackKey;
        }
        // Keep AI trivia expanded during temporary metadata gaps to avoid UI flicker.
    }, [station.uuid, trackKey, setAiTriviaExpanded]);

    const dialRef = useRef<HTMLDivElement | null>(null);
    const settleTimerRef = useRef<number | null>(null);
    const inertiaRef = useRef<number | null>(null);
    const lastAngleRef = useRef<number | null>(null);
    const lastTimeRef = useRef<number | null>(null);
    const velocityRef = useRef(0);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const [dialValue, setDialValue] = useState(0);
    const [dialIndex, setDialIndex] = useState(0);
    const [isDialing, setIsDialing] = useState(false);
    const lastIndexRef = useRef<number>(0);
    const dialValueRef = useRef(0);

    const deriveFrequency = useCallback((target: Station) => {
        let hash = 0;
        for (let i = 0; i < target.uuid.length; i++) {
            hash = target.uuid.charCodeAt(i) + ((hash << 5) - hash);
        }
        const range = 108.0 - 88.0;
        const normalized = Math.abs(hash % 1000) / 1000;
        return 88.0 + normalized * range;
    }, []);

    const boundedQueue = queue.length > 0 ? queue : [station];
    const totalStations = boundedQueue.length;
    const clampedIndex = Math.max(0, Math.min(currentIndex, totalStations - 1));
    const displayStation = boundedQueue[dialIndex] ?? station;
    const isPreviewing = displayStation.uuid !== station.uuid;

    const syncDialFromIndex = useCallback((index: number) => {
        const bounded = Math.max(0, Math.min(index, totalStations - 1));
        setDialIndex(bounded);
        lastIndexRef.current = bounded;
        if (totalStations <= 1) {
            setDialValue(0);
            dialValueRef.current = 0;
            return;
        }
        const nextValue = bounded / (totalStations - 1);
        setDialValue(nextValue);
        dialValueRef.current = nextValue;
    }, [totalStations]);

    useEffect(() => {
        if (isDialing) return;
        syncDialFromIndex(clampedIndex);
    }, [clampedIndex, isDialing, syncDialFromIndex]);

    useEffect(() => {
        return () => {
            if (settleTimerRef.current) {
                window.clearTimeout(settleTimerRef.current);
            }
            if (inertiaRef.current) {
                window.cancelAnimationFrame(inertiaRef.current);
            }
        };
    }, []);

    const playClick = useCallback(() => {
        try {
            const context = audioCtxRef.current ?? new AudioContext();
            audioCtxRef.current = context;
            if (context.state === "suspended") {
                context.resume();
            }
            const osc = context.createOscillator();
            const gain = context.createGain();
            osc.type = "square";
            osc.frequency.value = 1200;
            gain.gain.value = 0.0001;
            osc.connect(gain);
            gain.connect(context.destination);
            const now = context.currentTime;
            gain.gain.exponentialRampToValueAtTime(0.08, now + 0.005);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);
            osc.start(now);
            osc.stop(now + 0.04);
        } catch {
            // Ignore audio errors on unsupported platforms.
        }
    }, []);

    const tickFeedback = useCallback((nextIndex: number) => {
        if (nextIndex !== lastIndexRef.current) {
            lastIndexRef.current = nextIndex;
            playClick();
            if (navigator.vibrate) {
                navigator.vibrate(8);
            }
        }
    }, [playClick]);

    const scheduleTune = useCallback((index: number) => {
        if (!onSelectStation) return;
        if (settleTimerRef.current) {
            window.clearTimeout(settleTimerRef.current);
        }
        settleTimerRef.current = window.setTimeout(() => {
            const nextStation = boundedQueue[index];
            if (!nextStation || nextStation.uuid === station.uuid) return;
            onSelectStation(nextStation);
        }, 650);
    }, [boundedQueue, onSelectStation, station.uuid]);

    const handleDialValue = useCallback((value: number) => {
        if (totalStations <= 1) return;
        const clamped = Math.min(1, Math.max(0, value));
        const nextIndex = Math.round(clamped * (totalStations - 1));
        setDialValue(clamped);
        dialValueRef.current = clamped;
        setDialIndex(nextIndex);
        tickFeedback(nextIndex);
        scheduleTune(nextIndex);
    }, [scheduleTune, tickFeedback, totalStations]);

    const handleDialPointer = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
        if (!dialRef.current || totalStations <= 1) return;
        const rect = dialRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const angle = Math.atan2(event.clientY - centerY, event.clientX - centerX);
        const angleDeg = (angle * 180) / Math.PI;
        const minAngle = -135;
        const maxAngle = 135;
        const clamped = Math.min(maxAngle, Math.max(minAngle, angleDeg));
        const normalized = (clamped - minAngle) / (maxAngle - minAngle);
        const now = performance.now();
        if (lastTimeRef.current !== null && lastAngleRef.current !== null) {
            const dt = now - lastTimeRef.current;
            if (dt > 0) {
                velocityRef.current = (clamped - lastAngleRef.current) / dt;
            }
        }
        lastAngleRef.current = clamped;
        lastTimeRef.current = now;
        handleDialValue(normalized);
    }, [handleDialValue, totalStations]);

    const frequency = useMemo(() => deriveFrequency(displayStation), [deriveFrequency, displayStation.uuid]);

    const freqNum = frequency;
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
                        {frequency.toFixed(1)}
                    </h1>
                    <p className="mt-2 text-sm font-medium uppercase tracking-widest text-slate-500">
                        {displayStation.name}
                    </p>
                    <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                        {isPreviewing ? "Tuning preview" : "Now playing"}
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

                    <div className="mt-6 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-2">
                            <div
                                ref={dialRef}
                                onPointerDown={(event) => {
                                    event.currentTarget.setPointerCapture(event.pointerId);
                                    if (inertiaRef.current) {
                                        window.cancelAnimationFrame(inertiaRef.current);
                                    }
                                    setIsDialing(true);
                                    lastAngleRef.current = null;
                                    lastTimeRef.current = null;
                                    velocityRef.current = 0;
                                    handleDialPointer(event);
                                }}
                                onPointerMove={(event) => {
                                    if (!isDialing) return;
                                    handleDialPointer(event);
                                }}
                                onPointerUp={(event) => {
                                    event.currentTarget.releasePointerCapture(event.pointerId);
                                    setIsDialing(false);
                                    const angleRange = 270;
                                    let velocity = velocityRef.current / angleRange;
                                    if (Math.abs(velocity) < 0.00005) return;
                                    let lastFrame = performance.now();
                                    const animate = () => {
                                        const now = performance.now();
                                        const dt = now - lastFrame;
                                        lastFrame = now;
                                        velocity *= 0.92;
                                        const nextValue = Math.min(1, Math.max(0, dialValueRef.current + velocity * dt));
                                        handleDialValue(nextValue);
                                        if (Math.abs(velocity) > 0.00003 && nextValue > 0 && nextValue < 1) {
                                            inertiaRef.current = window.requestAnimationFrame(animate);
                                        }
                                    };
                                    inertiaRef.current = window.requestAnimationFrame(animate);
                                }}
                                onPointerCancel={(event) => {
                                    event.currentTarget.releasePointerCapture(event.pointerId);
                                    setIsDialing(false);
                                }}
                                className="relative h-24 w-24 rounded-full bg-[#e0e5ec] shadow-[8px_8px_16px_#b8b9be,-8px_-8px_16px_#ffffff] touch-none"
                                style={{
                                    transform: `rotate(${(-135 + dialValue * 270).toFixed(1)}deg)`,
                                }}
                                aria-label="Tuning dial"
                                role="slider"
                                aria-valuemin={0}
                                aria-valuemax={totalStations - 1}
                                aria-valuenow={dialIndex}
                            >
                                <div className="absolute left-1/2 top-2 h-4 w-1 -translate-x-1/2 rounded-full bg-slate-400" />
                                <div className="absolute inset-3 rounded-full bg-[#d9dee7] shadow-[inset_4px_4px_8px_#b8b9be,inset_-4px_-4px_8px_#ffffff]" />
                            </div>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-400">
                                Rotate to tune
                            </p>
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

                <TrackSpotlight
                    triviaTitle={triviaTitle}
                    freeTrivia={freeTrivia}
                    aiTrivia={aiTrivia}
                    aiTriviaExpanded={aiTriviaExpanded}
                    onExpand={handleExpandTrivia}
                />
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
                <p className="text-lg font-bold text-slate-800">{station.name}</p>
                <p className="text-sm font-semibold text-slate-700">
                    {[station.country, station.state].filter(Boolean).join(" • ")}
                </p>
            </div>
        </motion.div>
    );
}

type TrackSpotlightProps = {
    triviaTitle: string;
    freeTrivia: ReturnType<typeof useTrackTrivia>;
    aiTrivia: ReturnType<typeof useTrackTrivia>;
    aiTriviaExpanded: boolean;
    onExpand: () => void;
};

const TrackSpotlight = memo(function TrackSpotlight({
    triviaTitle,
    freeTrivia,
    aiTrivia,
    aiTriviaExpanded,
    onExpand,
}: TrackSpotlightProps) {
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

    return (
        <div className="w-full max-w-xl px-5 mb-6">
            <div className="relative max-h-[240px] overflow-hidden rounded-3xl bg-[#e8ecf2] shadow-[12px_12px_24px_#b8b9be,-12px_-12px_24px_#ffffff]">
                <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-10 rounded-t-3xl bg-gradient-to-b from-[#e8ecf2] via-[#e8ecf2]/80 to-transparent" />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-10 rounded-b-3xl bg-gradient-to-t from-[#e8ecf2] via-[#e8ecf2]/80 to-transparent" />
                <div className="pointer-events-none absolute inset-0 rounded-3xl shadow-[inset_1px_1px_2px_#ffffff,inset_-1px_-1px_2px_#cbd2dc]" />
                <div className="max-h-[240px] overflow-y-auto px-6 pb-6 pt-6 scrollbar-hide">
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
                        <Text size="xs" className="mt-2 animate-pulse text-slate-400">
                            Updating spotlight…
                        </Text>
                    )}

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
                    {aiTriviaExpanded && aiTrivia.status === "ready" && aiTrivia.trivia && (
                        <div className="mt-3 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-[0_10px_18px_rgba(15,23,42,0.12)]">
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
                        </div>
                    )}
                    {!aiTriviaExpanded && freeTrivia.status === "ready" && freeTrivia.trivia && (
                        <button
                            type="button"
                            className="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-[inset_2px_2px_4px_#d1d5db,inset_-2px_-2px_4px_#ffffff]"
                            onClick={onExpand}
                        >
                            <IconSparkles size={12} />
                            More
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
});
