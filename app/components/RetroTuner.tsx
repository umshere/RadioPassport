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
    const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
    const swipeDeltaRef = useRef(0);
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
    useEffect(() => {
        const previousBodyOverflow = document.body.style.overflow;
        const previousBodyHeight = document.body.style.height;
        const previousHtmlOverflow = document.documentElement.style.overflow;
        const previousHtmlHeight = document.documentElement.style.height;
        const previousOverscroll = document.body.style.overscrollBehavior;
        document.body.style.overflow = "hidden";
        document.body.style.height = "100%";
        document.body.style.overscrollBehavior = "none";
        document.documentElement.style.overflow = "hidden";
        document.documentElement.style.height = "100%";
        return () => {
            document.body.style.overflow = previousBodyOverflow;
            document.body.style.height = previousBodyHeight;
            document.body.style.overscrollBehavior = previousOverscroll;
            document.documentElement.style.overflow = previousHtmlOverflow;
            document.documentElement.style.height = previousHtmlHeight;
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

    const handleSwipeStart = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
        if (event.pointerType === "mouse") return;
        const target = event.target as HTMLElement;
        if (target.closest("button, a, [role='slider'], [data-swipe-ignore]")) return;
        swipeStartRef.current = { x: event.clientX, y: event.clientY };
        swipeDeltaRef.current = 0;
    }, []);

    const handleSwipeMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
        if (!swipeStartRef.current) return;
        const dx = event.clientX - swipeStartRef.current.x;
        const dy = event.clientY - swipeStartRef.current.y;
        if (Math.abs(dy) < 12 || Math.abs(dy) < Math.abs(dx) * 1.2) return;
        swipeDeltaRef.current = dy;
    }, []);

    const handleSwipeEnd = useCallback(() => {
        if (!swipeStartRef.current) return;
        const dy = swipeDeltaRef.current;
        swipeStartRef.current = null;
        swipeDeltaRef.current = 0;
        if (dy > 90) {
            onClose();
        }
    }, [onClose]);

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
            className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-[#e0e5ec] text-slate-800"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
            onPointerDown={handleSwipeStart}
            onPointerMove={handleSwipeMove}
            onPointerUp={handleSwipeEnd}
            onPointerCancel={handleSwipeEnd}
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
            <div className="relative flex-1">
                <div className="flex flex-col items-center gap-6 px-4 pb-40 pt-2 md:gap-8">
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
                    <div className="relative w-full max-w-md px-2 md:px-8">
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
                        <div className="absolute top-1/2 -translate-y-1/2 left-2 md:left-2">
                            <ActionIcon variant="transparent" color="red">
                                <IconHeart size={20} />
                            </ActionIcon>
                        </div>
                        <div className="absolute top-1/2 -translate-y-1/2 right-2 md:right-2">
                            <ActionIcon variant="transparent" color="gray">
                                <IconShare size={20} />
                            </ActionIcon>
                        </div>
                    </div>

                <TrackSpotlight
                    triviaTitle={triviaTitle}
                    trackLine={trackLine}
                    freeTrivia={freeTrivia}
                    aiTrivia={aiTrivia}
                    aiTriviaExpanded={aiTriviaExpanded}
                    onExpand={handleExpandTrivia}
                />
                </div>

                {/* Control Cluster */}
                <div className="absolute inset-x-0 bottom-10 flex flex-col items-center gap-2 md:bottom-12">
                    <div className="flex items-center justify-center gap-6 md:gap-8">
                        <button
                            onClick={onPrev}
                            className="flex h-14 w-14 md:h-16 md:w-16 items-center justify-center rounded-2xl bg-[#e0e5ec] text-slate-500 shadow-[6px_6px_12px_#b8b9be,-6px_-6px_12px_#ffffff] active:shadow-[inset_6px_6px_12px_#b8b9be,inset_-6px_-6px_12px_#ffffff]"
                        >
                            <IconPlayerSkipBackFilled size={20} />
                        </button>

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
                            className="relative h-28 w-28 rounded-full bg-[#e0e5ec] shadow-[10px_10px_20px_#b8b9be,-10px_-10px_20px_#ffffff] touch-none"
                            aria-label="Tuning dial"
                            role="slider"
                            aria-valuemin={0}
                            aria-valuemax={totalStations - 1}
                            aria-valuenow={dialIndex}
                        >
                            <div
                                className="absolute inset-0 rounded-full"
                                style={{
                                    transform: `rotate(${(-135 + dialValue * 270).toFixed(1)}deg)`,
                                }}
                            >
                                <div className="absolute inset-2 rounded-full shadow-[inset_6px_6px_12px_#b8b9be,inset_-6px_-6px_12px_#ffffff]" />
                                <div className="absolute left-1/2 top-2 h-4 w-1 -translate-x-1/2 rounded-full bg-slate-400" />
                            </div>
                            <button
                                type="button"
                                onPointerDown={(event) => {
                                    event.stopPropagation();
                                }}
                                onPointerMove={(event) => {
                                    event.stopPropagation();
                                }}
                                onPointerUp={(event) => {
                                    event.stopPropagation();
                                }}
                                onClick={(event) => {
                                    event.stopPropagation();
                                    onPlayPause();
                                }}
                                className="absolute inset-7 z-10 flex items-center justify-center rounded-full bg-[#d9dee7] text-slate-700 shadow-[6px_6px_12px_#b8b9be,-6px_-6px_12px_#ffffff] active:shadow-[inset_4px_4px_8px_#b8b9be,inset_-4px_-4px_8px_#ffffff]"
                                aria-label={isPlaying ? "Pause" : "Play"}
                            >
                                {isPlaying ? (
                                    <IconPlayerPauseFilled size={20} />
                                ) : (
                                    <IconPlayerPlayFilled size={20} />
                                )}
                            </button>
                        </div>

                        <button
                            onClick={onNext}
                            className="flex h-14 w-14 md:h-16 md:w-16 items-center justify-center rounded-2xl bg-[#e0e5ec] text-slate-500 shadow-[6px_6px_12px_#b8b9be,-6px_-6px_12px_#ffffff] active:shadow-[inset_6px_6px_12px_#b8b9be,inset_-6px_-6px_12px_#ffffff]"
                        >
                            <IconPlayerSkipForwardFilled size={20} />
                        </button>
                    </div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-400">
                        Rotate to tune / Press to play
                    </p>
                </div>
            </div>

        </motion.div>
    );
}

type TrackSpotlightProps = {
    triviaTitle: string;
    trackLine: string | null;
    freeTrivia: ReturnType<typeof useTrackTrivia>;
    aiTrivia: ReturnType<typeof useTrackTrivia>;
    aiTriviaExpanded: boolean;
    onExpand: () => void;
};

const TrackSpotlight = memo(function TrackSpotlight({
    triviaTitle,
    trackLine,
    freeTrivia,
    aiTrivia,
    aiTriviaExpanded,
    onExpand,
}: TrackSpotlightProps) {
    const contentRef = useRef<HTMLDivElement | null>(null);
    const wheelRef = useRef<HTMLDivElement | null>(null);
    const wheelStartRef = useRef<number | null>(null);
    const scrollStartRef = useRef(0);
    const [wheelPos, setWheelPos] = useState(0);
    const [wheelNudge, setWheelNudge] = useState(0);
    const [hasOverflow, setHasOverflow] = useState(false);
    const [actionsOpen, setActionsOpen] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    const updateWheelPos = useCallback(() => {
        const content = contentRef.current;
        if (!content) return;
        const maxScroll = content.scrollHeight - content.clientHeight;
        setHasOverflow(maxScroll > 1);
        setWheelPos(maxScroll > 0 ? content.scrollTop / maxScroll : 0);
    }, []);
    useEffect(() => {
        updateWheelPos();
    }, [updateWheelPos, freeTrivia.status, freeTrivia.trivia, aiTrivia.status, aiTrivia.trivia, aiTriviaExpanded, trackLine]);
    useEffect(() => {
        const handleResize = () => updateWheelPos();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, [updateWheelPos]);
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

    const canShowAi =
        !aiTriviaExpanded &&
        (freeTrivia.status === "ready" && freeTrivia.trivia || Boolean(trackLine));
    const linkPresets = [
        { kind: "youtube", label: "YouTube" },
        { kind: "artist", label: "Artist" },
        { kind: "release", label: "Release" },
        { kind: "track", label: "Track" },
        { kind: "info", label: "Info" },
    ];
    const combinedLinks = [
        ...(freeTrivia.trivia?.links ?? []),
        ...(aiTrivia.trivia?.links ?? []),
    ];
    const linkByKind = new Map(combinedLinks.map((link) => [link.kind ?? "info", link]));
    const availableLinks = linkPresets.flatMap(({ kind, label }) => {
        const link = linkByKind.get(kind);
        if (!link) return [];
        return [{ ...link, kind, label }];
    });
    const canExpand =
        !aiTriviaExpanded &&
        (freeTrivia.status === "ready" && freeTrivia.trivia || Boolean(trackLine));
    const hasMetadata =
        Boolean(trackLine) ||
        Boolean(freeTrivia.trivia?.summary) ||
        Boolean(freeTrivia.trivia?.facts?.length);
    const showMoreButton = availableLinks.length > 0 || hasMetadata;

    useEffect(() => {
        if (!showMoreButton) {
            setActionsOpen(false);
            setShowDetails(false);
        }
    }, [showMoreButton]);

    return (
        <div className="w-full max-w-2xl px-5">
            <div className="relative">
                <div className="relative h-40 md:h-44 overflow-hidden rounded-2xl bg-[#8aa77b] shadow-[inset_6px_6px_12px_rgba(40,58,32,0.5),inset_-6px_-6px_12px_rgba(176,204,160,0.55)]">
                    <div
                        className="pointer-events-none absolute inset-0 opacity-35"
                        style={{
                            backgroundImage:
                                "repeating-linear-gradient(0deg, rgba(10,20,10,0.12) 0px, rgba(10,20,10,0.12) 1px, rgba(0,0,0,0) 2px, rgba(0,0,0,0) 3px)",
                        }}
                    />
                    <div
                        className="pointer-events-none absolute inset-0 opacity-20"
                        style={{
                            backgroundImage:
                                "repeating-linear-gradient(90deg, rgba(255,255,255,0.08) 0px, rgba(255,255,255,0.02) 2px, rgba(0,0,0,0.02) 4px)",
                            backgroundSize: "6px 6px",
                        }}
                    />
                    <div className="pointer-events-none absolute inset-0 rounded-2xl shadow-[inset_1px_1px_2px_rgba(230,245,210,0.7),inset_-2px_-2px_4px_rgba(25,32,18,0.45)]" />
                    <div
                        ref={contentRef}
                        onScroll={updateWheelPos}
                        data-swipe-ignore
                        className="h-full overflow-y-auto scrollbar-hide px-5 pb-5 pt-4 font-['Courier_New',Courier,monospace] text-[#eff8e6]"
                    >
                    <div className="flex items-center justify-between gap-3 text-[#e2f1d7]">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.3em]">
                            Track Spotlight
                        </div>
                        <div className="text-[10px] font-semibold uppercase tracking-[0.2em]">
                            Highlights
                        </div>
                    </div>

                    <Text size="xs" className="mt-2 text-[#e5f3dc]">
                        {triviaTitle}
                    </Text>
                    {freeTrivia.status === "loading" && (
                        <Text size="xs" className="mt-2 animate-pulse text-[#d7e6cc]">
                            Updating spotlight…
                        </Text>
                    )}

                    {freeTrivia.status === "ready" && freeTrivia.trivia && (
                        <Text
                            size="sm"
                            fw={600}
                            className="mt-3 text-[#f4ffe9]"
                            style={{
                                display: "-webkit-box",
                                WebkitLineClamp: showDetails ? 4 : 2,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden",
                            }}
                        >
                            {freeTrivia.trivia.summary}
                        </Text>
                    )}
                    {aiTriviaExpanded && aiTrivia.status === "ready" && aiTrivia.trivia && (
                        <Text
                            size="sm"
                            fw={600}
                            className="mt-3 text-[#f4ffe9]"
                            style={{
                                display: "-webkit-box",
                                WebkitLineClamp: showDetails ? 4 : 2,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden",
                            }}
                        >
                            {aiTrivia.trivia.summary}
                        </Text>
                    )}
                    {showDetails && freeTrivia.trivia?.facts?.length ? (
                        <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-[#e2f1d7]">
                            {freeTrivia.trivia.facts.slice(0, 2).map((fact) => (
                                <span
                                    key={fact.label}
                                    className="rounded-full border border-[#c8dab8] px-2 py-0.5 text-[#e7f4dc]"
                                >
                                    <span className="font-semibold">{fact.label}</span>
                                    <span className="text-[#d5e7c8]"> • </span>
                                    <span>{fact.value}</span>
                                </span>
                            ))}
                        </div>
                    ) : null}
                    </div>
                </div>
                <div
                    className="absolute top-1/2 right-2"
                    style={{ transform: "translate(70%, -50%)" }}
                >
                    <div
                        ref={wheelRef}
                        data-swipe-ignore
                        onPointerDown={(event) => {
                            if (!hasOverflow || !contentRef.current) return;
                            event.currentTarget.setPointerCapture(event.pointerId);
                            wheelStartRef.current = event.clientY;
                            scrollStartRef.current = contentRef.current.scrollTop;
                        }}
                        onPointerMove={(event) => {
                            if (wheelStartRef.current === null || !contentRef.current) return;
                            const delta = event.clientY - wheelStartRef.current;
                            const maxScroll = contentRef.current.scrollHeight - contentRef.current.clientHeight;
                            const nextTop = Math.min(maxScroll, Math.max(0, scrollStartRef.current + delta * 1.6));
                            contentRef.current.scrollTop = nextTop;
                            setWheelPos(maxScroll > 0 ? nextTop / maxScroll : 0);
                            setWheelNudge(delta > 0 ? 1 : -1);
                        }}
                        onPointerUp={(event) => {
                            event.currentTarget.releasePointerCapture(event.pointerId);
                            wheelStartRef.current = null;
                            setWheelNudge(0);
                        }}
                        onPointerCancel={(event) => {
                            event.currentTarget.releasePointerCapture(event.pointerId);
                            wheelStartRef.current = null;
                            setWheelNudge(0);
                        }}
                        className={`relative h-20 w-9 rounded-full bg-[#e0e5ec] shadow-[4px_4px_10px_#b8b9be,-4px_-4px_10px_#ffffff] ${hasOverflow ? "cursor-grab" : "opacity-50"}`}
                        style={{
                            transform: `translateY(${wheelNudge * 1.5}px)`,
                            transition: wheelNudge === 0 ? "transform 120ms ease-out" : "transform 80ms ease-in",
                        }}
                        aria-label="Spotlight scroll wheel"
                        role="scrollbar"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={Math.round(wheelPos * 100)}
                    >
                        <div
                            className="absolute inset-1 rounded-full bg-[#d3d8e0] shadow-[inset_2px_2px_4px_#b4b7bf,inset_-2px_-2px_4px_#ffffff]"
                            style={{
                                backgroundImage:
                                    "repeating-linear-gradient(180deg, rgba(120,126,136,0.35) 0px, rgba(120,126,136,0.35) 1px, rgba(255,255,255,0.5) 2px, rgba(255,255,255,0.5) 4px)",
                            }}
                        />
                        <div className="absolute left-2 right-2 top-1 h-2 rounded-full bg-[#b2b7c1] shadow-[inset_1px_1px_2px_rgba(120,126,136,0.7),inset_-1px_-1px_2px_rgba(255,255,255,0.7)]" />
                        <div className="absolute left-2 right-2 bottom-1 h-2 rounded-full bg-[#b2b7c1] shadow-[inset_1px_1px_2px_rgba(120,126,136,0.7),inset_-1px_-1px_2px_rgba(255,255,255,0.7)]" />
                        <div
                            className="absolute left-1.5 right-1.5 h-5 rounded-full bg-[#f0f2f6]"
                            style={{
                                top: `${10 + wheelPos * 60}px`,
                                transform: "translateY(-50%)",
                                boxShadow:
                                    "inset 1px 1px 2px rgba(150,155,165,0.6), inset -1px -1px 2px rgba(255,255,255,0.9), 0 2px 4px rgba(120,125,135,0.35)",
                            }}
                        />
                    </div>
                </div>
            </div>
            {showMoreButton && (
                <div className="mt-3 flex flex-wrap items-center gap-3">
                    {actionsOpen && (
                        <div className="flex flex-wrap items-center gap-2">
                            {hasMetadata && (
                                <button
                                    type="button"
                                    className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600 bg-[#e0e5ec] shadow-[inset_2px_2px_4px_#c5c9d1,inset_-2px_-2px_4px_#ffffff]"
                                    onClick={() => {
                                        setShowDetails((prev) => !prev);
                                        if (canExpand) {
                                            onExpand();
                                        }
                                    }}
                                >
                                    <IconMusic size={12} />
                                    Track
                                </button>
                            )}
                            {availableLinks.map((link) => {
                                const Icon = renderLinkIcon(link.kind);
                                return (
                                    <a
                                        key={link.url}
                                        href={link.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e0e5ec] text-slate-600 shadow-[inset_2px_2px_4px_#c5c9d1,inset_-2px_-2px_4px_#ffffff]"
                                        aria-label={link.label ?? link.kind}
                                        title={link.label ?? link.kind}
                                    >
                                        <Icon size={14} />
                                    </a>
                                );
                            })}
                        </div>
                    )}
                    <button
                        type="button"
                        className="ml-auto inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-600 bg-[#e0e5ec] shadow-[inset_2px_2px_4px_#c5c9d1,inset_-2px_-2px_4px_#ffffff]"
                        onClick={() => setActionsOpen((prev) => !prev)}
                    >
                        More
                    </button>
                </div>
            )}
        </div>
    );
});
