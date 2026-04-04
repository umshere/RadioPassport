import type { PointerEvent as ReactPointerEvent } from "react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActionIcon, Text } from "@mantine/core";
import { useElementSize } from "@mantine/hooks";
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
import { PretextMeasuredText } from "~/components/PretextMeasuredText";
import type { Station } from "~/types/radio";
import { useNowPlayingMetadata } from "~/hooks/useNowPlayingMetadata";
import { useTrackTrivia } from "~/hooks/useTrackTrivia";
import { useUIStore } from "~/state/uiStore";
import { fitsPretextWidth, getPretextLineCount } from "~/utils/pretextLayout";

const RETRO_STATION_FONT =
    '500 14px "General Sans", "SF Pro Text", "Segoe UI", "Helvetica Neue", Arial, sans-serif';
const RETRO_STATUS_FONT =
    '500 12px "General Sans", "SF Pro Text", "Segoe UI", "Helvetica Neue", Arial, sans-serif';
const RETRO_SPOTLIGHT_TITLE_FONT =
    '500 12px "IBM Plex Mono", "SFMono-Regular", Menlo, Monaco, Consolas, monospace';
const RETRO_SPOTLIGHT_BODY_FONT =
    '600 15px "IBM Plex Mono", "SFMono-Regular", Menlo, Monaco, Consolas, monospace';
const RETRO_ACTION_FONT =
    '600 11px "General Sans", "SF Pro Text", "Segoe UI", "Helvetica Neue", Arial, sans-serif';

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
    const { ref: stationMetaRef, width: stationMetaWidth } = useElementSize();
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
    const compactStationMeta = useMemo(() => {
        if (stationMetaWidth <= 0) return false;
        const stationLineCount = getPretextLineCount(displayStation.name, RETRO_STATION_FONT, Math.floor(stationMetaWidth), 22);
        const statusFits = fitsPretextWidth(
            isPreviewing ? "Tuning preview" : "Now playing",
            RETRO_STATUS_FONT,
            Math.floor(stationMetaWidth),
            0
        );
        return stationLineCount > 1 || !statusFits;
    }, [displayStation.name, isPreviewing, stationMetaWidth]);

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
        event.preventDefault();
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
            className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-[#0b0c10] text-amber-50"
            style={{ paddingBottom: "env(safe-area-inset-bottom)", touchAction: "none" }}
            onPointerDown={handleSwipeStart}
            onPointerMove={handleSwipeMove}
            onPointerUp={handleSwipeEnd}
            onPointerCancel={handleSwipeEnd}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 md:py-6">
                <ActionIcon
                    variant="transparent"
                    color="yellow"
                    onClick={onClose}
                    className="hidden md:inline-flex opacity-60 hover:opacity-100 text-amber-100"
                >
                    <IconChevronDown size={28} />
                </ActionIcon>
                {/* AM/FM Removed as requested */}
            </div>

            {/* Main Tuner Area */}
            <div className="relative flex-1">
                <div className="flex flex-col items-center gap-5 px-4 pb-36 pt-0 md:gap-8 md:pb-40 md:pt-2">
                    {/* 1. Giant Frequency Number */}
                    <div ref={stationMetaRef} className="flex w-full max-w-[24rem] flex-col items-center">
                        <h1 className="font-mono text-7xl md:text-8xl font-bold tracking-tighter text-amber-50">
                            {frequency.toFixed(1)}
                        </h1>
                        <div className="mt-2 w-full max-w-[18rem] text-center">
                            <PretextMeasuredText
                                text={displayStation.name}
                                font={RETRO_STATION_FONT}
                                lineHeight={22}
                                collapsedLines={compactStationMeta ? 2 : 1}
                                className="w-full"
                                lineClassName="text-sm font-medium uppercase tracking-widest text-amber-100/70"
                                fallbackClassName="text-sm font-medium uppercase tracking-widest text-amber-100/70"
                            />
                        </div>
                        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-amber-100/50">
                            {isPreviewing ? "Tuning preview" : "Now playing"}
                        </p>
                    </div>

                    {/* 2. Radio Tuner Scale & 3. Needle */}
                    <div className="relative w-full max-w-md px-2 md:px-8">
                        {/* Glass Container */}
                        <div className="relative h-28 md:h-32 w-full overflow-hidden rounded-2xl bg-[#1b1f2a] shadow-inner">
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
                                                className={`w-px bg-amber-200/60 ${isMajor ? "h-6 md:h-8" : "h-3 md:h-4"
                                                    }`}
                                            />
                                            {isMajor && (
                                                <span className="text-[9px] md:text-[10px] font-bold text-amber-100/70">
                                                    {Math.floor(tick)}
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Gold Needle */}
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="h-full w-0.5 bg-[#f6c86f] shadow-[0_0_12px_rgba(246,200,111,0.6)]" />
                                {/* Triangle/Marker */}
                                <div className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rotate-45 bg-[#f6c86f]" />
                            </div>
                        </div>

                        {/* Side Actions */}
                        <div className="absolute top-1/2 -translate-y-1/2 left-2 md:left-2">
                            <ActionIcon variant="transparent" color="yellow" className="text-amber-100">
                                <IconHeart size={20} />
                            </ActionIcon>
                        </div>
                        <div className="absolute top-1/2 -translate-y-1/2 right-2 md:right-2">
                            <ActionIcon variant="transparent" color="gray" className="text-amber-100/70">
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
                <div
                    className="absolute inset-x-0 bottom-10 flex flex-col items-center gap-2 md:bottom-12"
                    data-swipe-ignore
                >
                    <div className="flex items-center justify-center gap-6 md:gap-8">
                        <button
                            onClick={onPrev}
                            className="flex h-14 w-14 md:h-16 md:w-16 items-center justify-center rounded-2xl bg-[#161a22] text-amber-100/70 border border-amber-400/20 shadow-[0_10px_30px_rgba(0,0,0,0.4)] active:scale-95"
                        >
                            <IconPlayerSkipBackFilled size={20} />
                        </button>

                        <div
                            ref={dialRef}
                            data-swipe-ignore
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
                            className="relative h-28 w-28 rounded-full bg-[#161a22] border border-amber-400/25 shadow-[0_18px_40px_rgba(0,0,0,0.55)] touch-none"
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
                                <div
                                    className="absolute inset-2 rounded-full shadow-[inset_2px_2px_10px_rgba(0,0,0,0.55)]"
                                    style={{
                                        backgroundImage:
                                            "repeating-linear-gradient(90deg, rgba(255,204,122,0.18) 0px, rgba(255,204,122,0.18) 1px, rgba(20,24,32,0.9) 2px, rgba(20,24,32,0.9) 4px)",
                                    }}
                                />
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
                                className="absolute inset-7 z-10 flex items-center justify-center rounded-full bg-gradient-to-br from-[#f6c86f] to-[#f1aa45] text-slate-900 shadow-[0_12px_24px_rgba(246,200,111,0.5)]"
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
                            className="flex h-14 w-14 md:h-16 md:w-16 items-center justify-center rounded-2xl bg-[#161a22] text-amber-100/70 border border-amber-400/20 shadow-[0_10px_30px_rgba(0,0,0,0.4)] active:scale-95"
                        >
                            <IconPlayerSkipForwardFilled size={20} />
                        </button>
                    </div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-100/50">
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
    const [actionsOpen, setActionsOpen] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    const { ref: spotlightRef, width: spotlightWidth } = useElementSize();
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
    const linkPresets: Array<{ kind: "track" | "youtube" | "artist" | "release" | "info"; label: string }> = [
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
    const aiReady = aiTriviaExpanded && aiTrivia.status === "ready" && aiTrivia.trivia;
    const displayTrivia = aiReady ? aiTrivia.trivia : freeTrivia.trivia;
    const displayFacts = displayTrivia?.facts ?? [];
    const displayImage = displayTrivia?.imageUrl ?? null;
    const displaySummary = displayTrivia?.summary ?? null;
    const hasMetadata =
        Boolean(trackLine) ||
        Boolean(displaySummary) ||
        displayFacts.length > 0;
    const hasMoreContent = availableLinks.length > 0 || hasMetadata;
    const summaryWidth = Math.max(180, spotlightWidth - 48);
    const titleLineCount = useMemo(
        () => getPretextLineCount(triviaTitle, RETRO_SPOTLIGHT_TITLE_FONT, summaryWidth, 18),
        [summaryWidth, triviaTitle]
    );
    const summaryLineCount = useMemo(
        () => (displaySummary ? getPretextLineCount(displaySummary, RETRO_SPOTLIGHT_BODY_FONT, summaryWidth, 22) : 0),
        [displaySummary, summaryWidth]
    );
    const compactSpotlight = spotlightWidth > 0 && (spotlightWidth < 620 || titleLineCount > 1 || summaryLineCount > 4);
    const visibleFactCount = compactSpotlight ? 2 : 3;
    const moreLabel = useMemo(() => {
        if (!hasMoreContent) return "More";
        if (actionsOpen) return compactSpotlight ? "Less" : "Close details";
        const fullFits = fitsPretextWidth("More details", RETRO_ACTION_FONT, 122, 28);
        return compactSpotlight || !fullFits ? "More" : "More details";
    }, [actionsOpen, compactSpotlight, hasMoreContent]);

    useEffect(() => {
        if (!hasMoreContent) {
            setActionsOpen(false);
            setShowDetails(false);
        }
    }, [hasMoreContent]);
    useEffect(() => {
        if (aiTriviaExpanded) {
            setShowDetails(true);
            setActionsOpen(true);
        }
    }, [aiTriviaExpanded]);

    return (
        <div className="w-full max-w-2xl px-5">
            <div className="flex items-stretch gap-3">
                <div
                    ref={spotlightRef}
                    className="relative h-40 md:h-44 flex-1 overflow-hidden rounded-2xl border border-amber-400/20 bg-[#12151c] shadow-[0_18px_40px_rgba(0,0,0,0.5),inset_1px_1px_2px_rgba(255,255,255,0.05)]"
                >
                    <div
                        className="pointer-events-none absolute inset-0 opacity-35"
                        style={{
                            backgroundImage:
                                "repeating-linear-gradient(0deg, rgba(245,193,104,0.08) 0px, rgba(245,193,104,0.08) 1px, rgba(0,0,0,0) 2px, rgba(0,0,0,0) 3px)",
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
                    <div className="pointer-events-none absolute inset-0 rounded-2xl shadow-[inset_1px_1px_2px_rgba(255,255,255,0.06),inset_-2px_-2px_6px_rgba(0,0,0,0.6)]" />
                    <div
                        data-swipe-ignore
                        className="h-full overflow-y-auto px-5 pb-5 pt-4 font-mono text-amber-50 touch-pan-y"
                    >
                    <div className="flex items-center justify-between gap-3 text-amber-100/60">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.3em]">
                            Track Spotlight
                        </div>
                        <div className="text-[10px] font-semibold uppercase tracking-[0.2em]">
                            Highlights
                        </div>
                    </div>

                    <div className="mt-2">
                        <PretextMeasuredText
                            text={triviaTitle}
                            font={RETRO_SPOTLIGHT_TITLE_FONT}
                            lineHeight={18}
                            collapsedLines={compactSpotlight ? 2 : 1}
                            className="w-full"
                            lineClassName="text-xs text-amber-100/70"
                            fallbackClassName="text-xs text-amber-100/70"
                        />
                    </div>
                    {freeTrivia.status === "loading" && (
                        <Text size="xs" className="mt-2 animate-pulse text-amber-100/60">
                            Updating spotlight…
                        </Text>
                    )}
                    {aiTriviaExpanded && aiTrivia.status === "loading" && (
                        <Text size="xs" className="mt-2 animate-pulse text-amber-100/70">
                            Fetching AI insights…
                        </Text>
                    )}

                    {displaySummary && (
                        <div className="mt-3">
                            <PretextMeasuredText
                                text={displaySummary}
                                font={RETRO_SPOTLIGHT_BODY_FONT}
                                lineHeight={22}
                                collapsedLines={compactSpotlight ? 3 : 4}
                                expandable={showDetails && summaryLineCount > (compactSpotlight ? 3 : 4)}
                                className="w-full"
                                lineClassName="text-sm font-semibold text-amber-50"
                                fallbackClassName="text-sm font-semibold text-amber-50"
                                moreLabel="Expand text"
                                lessLabel="Collapse text"
                            />
                        </div>
                    )}
                    {showDetails && (displayFacts.length > 0 || displayImage) ? (
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-amber-100/70">
                            {displayImage && (
                                <img
                                    src={displayImage}
                                    alt="Track artwork"
                                    className="h-9 w-9 rounded-lg border border-amber-400/20 object-cover shadow-[0_6px_14px_rgba(0,0,0,0.45)]"
                                    onError={(event) => {
                                        event.currentTarget.style.display = "none";
                                    }}
                                />
                            )}
                            {displayFacts.slice(0, visibleFactCount).map((fact) => (
                                <span
                                    key={fact.label}
                                    className="rounded-full border border-amber-400/20 px-2 py-0.5 text-amber-100/80"
                                >
                                    <span className="font-semibold">{fact.label}</span>
                                    <span className="text-amber-100/40"> • </span>
                                    <span>{fact.value}</span>
                                </span>
                            ))}
                        </div>
                    ) : null}
                    </div>
                </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
                {actionsOpen && hasMoreContent && (
                    <div className="flex flex-wrap items-center gap-2">
                        {hasMetadata && (
                            <button
                                type="button"
                                className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-100 bg-[#141822] border border-amber-400/20"
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
                        {actionsOpen && displayTrivia && (displayTrivia.links?.length ?? 0) === 0 && availableLinks.length === 0 && (
                            <span className="text-[11px] text-amber-100/60">
                                No extra links available.
                            </span>
                        )}
                        {availableLinks.map((link) => {
                            const Icon = renderLinkIcon(link.kind);
                            return (
                                <a
                                    key={link.url}
                                    href={link.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex h-9 w-9 items-center justify-center rounded-full bg-[#141822] text-amber-100 border border-amber-400/20"
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
                    className={`ml-auto inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] ${
                        hasMoreContent
                            ? "text-amber-100 bg-[#141822] border border-amber-400/20"
                            : "text-amber-100/40 bg-[#10131a] border border-amber-400/10 cursor-not-allowed"
                    }`}
                    onClick={
                        hasMoreContent
                            ? () => {
                                  if (!aiTriviaExpanded && canExpand) {
                                      onExpand();
                                  }
                                  setActionsOpen((prev) => {
                                      const next = !prev;
                                      setShowDetails(next);
                                      return next;
                                  });
                              }
                            : undefined
                    }
                    disabled={!hasMoreContent}
                >
                    {moreLabel}
                </button>
            </div>
        </div>
    );
});
