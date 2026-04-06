import { motion } from "framer-motion";
import { IconPlayerPlayFilled, IconHeart, IconHeartFilled, IconWaveSine } from "@tabler/icons-react";
import type { Station } from "~/types/radio";
import { StationArtwork } from "./StationArtwork";
import { useEffect, useMemo, useState } from "react";

interface CompactStationCardProps {
    station: Station;
    isPlaying: boolean;
    isFavorite?: boolean;
    onPlay: (station: Station) => void;
    onToggleFavorite?: (station: Station) => void;
    index: number;
    isUnavailable?: boolean;
}

export function CompactStationCard({
    station,
    isPlaying,
    isFavorite = false,
    onPlay,
    onToggleFavorite,
    index,
    isUnavailable = false,
}: CompactStationCardProps) {
    const streamCandidate = (station.streamUrl ?? station.url ?? "").trim().toLowerCase();
    const isHttpStream = streamCandidate.startsWith("http://");
    const isHlsStream = Boolean(station.hls);

    return (
        <motion.button
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: index * 0.04, duration: 0.4, ease: "backOut" }}
            onClick={() => onPlay(station)}
            className="w-full flex items-center gap-4 p-3.5 rounded-2xl relative group mb-3 last:mb-0 overflow-hidden transition-all duration-300"
            style={{
                background: isPlaying
                    ? 'rgba(12, 14, 20, 0.85)'
                    : 'rgba(12, 14, 20, 0.55)',
                backdropFilter: 'blur(14px)',
                WebkitBackdropFilter: 'blur(14px)',
                boxShadow: isPlaying
                    ? '0 12px 36px rgba(245, 177, 45, 0.28), 0 0 0 1px rgba(245, 177, 45, 0.35) inset'
                    : '0 8px 22px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.06) inset',
                border: isPlaying ? '1px solid rgba(245, 177, 45, 0.35)' : '1px solid rgba(255, 255, 255, 0.08)',
                transform: isPlaying ? 'scale(1.02)' : 'scale(1)',
                zIndex: isPlaying ? 10 : 1,
            }}
        >
            {/* Glass Shine Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-40 pointer-events-none" />

            {/* Active Indicator Glow */}
            {isPlaying && (
                <div className="absolute -left-1 top-0 bottom-0 w-1.5 bg-[var(--rp-gold)] shadow-[0_0_12px_rgba(245,177,45,0.7)] rounded-r-full" />
            )}

            {/* Artwork - Floating Glass */}
            <div
                className="h-14 w-14 rounded-xl flex-shrink-0 relative overflow-hidden"
                style={{
                    boxShadow: '0 6px 16px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.12)',
                }}
            >
                <StationArtwork
                    station={station}
                    fallbackClassName="w-full h-full flex items-center justify-center font-bold text-sm text-[var(--rp-muted)] bg-black/40 backdrop-blur"
                />
            </div>

            {/* Station Info */}
            <div className="flex-1 min-w-0 text-left flex flex-col justify-center relative z-10">
                <div className={`text-[0.95rem] font-bold truncate leading-tight ${isPlaying ? 'text-[var(--rp-text)]' : 'text-[var(--rp-text)]'}`}>
                    {station.name}
                </div>
                <div className="text-xs truncate leading-tight mt-1 font-medium text-[var(--rp-muted)]">
                    {[station.country, station.state].filter(Boolean).join(" • ")}
                </div>

                <div className="flex gap-2 mt-1.5 items-center">
                    {station.bitrate > 0 && (
                        <span className="text-[10px] font-bold text-[var(--rp-muted)] bg-black/40 px-1.5 py-0.5 rounded backdrop-blur-sm border border-white/10">
                            {station.bitrate}
                        </span>
                    )}
                    {(isHlsStream || isHttpStream) && (
                        <span className="text-[10px] font-bold text-[var(--rp-muted-2)] opacity-50">•</span>
                    )}
                    {isHlsStream && (
                        <span className="text-[10px] font-bold text-[var(--rp-gold)] bg-[rgba(245,177,45,0.12)] px-1.5 py-0.5 rounded border border-[rgba(245,177,45,0.3)]">HLS</span>
                    )}
                    {isHttpStream && (
                        <span className="text-[10px] font-bold text-[var(--rp-gold)] bg-[rgba(245,177,45,0.12)] px-1.5 py-0.5 rounded border border-[rgba(245,177,45,0.3)]">HTTP</span>
                    )}

                </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3 pl-1 relative z-10">
                {onToggleFavorite && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleFavorite(station);
                        }}
                        className="flex h-10 w-10 items-center justify-center rounded-full transition-all active:scale-95 disabled:opacity-50"
                        style={{
                            background: isFavorite ? 'rgba(245, 177, 45, 0.2)' : 'rgba(0, 0, 0, 0.35)',
                            backdropFilter: 'blur(6px)',
                            borderTop: '1px solid rgba(255,255,255,0.12)',
                            borderLeft: '1px solid rgba(255,255,255,0.12)',
                            borderBottom: '1px solid rgba(0,0,0,0.4)',
                            borderRight: '1px solid rgba(0,0,0,0.4)',
                            boxShadow: isFavorite
                                ? '0 8px 20px rgba(245,177,45,0.3)'
                                : '0 8px 18px rgba(0,0,0,0.45)',
                            color: isFavorite ? 'var(--rp-gold)' : 'rgba(248,243,230,0.7)',
                        }}
                    >
                        {isFavorite ? <IconHeartFilled size={18} /> : <IconHeart size={18} />}
                    </button>
                )}

                {!isPlaying && (
                    <div
                        className="flex h-12 w-12 items-center justify-center rounded-full text-[var(--rp-muted-2)] group-hover:text-[var(--rp-gold)] transition-all duration-300"
                        style={{
                            background: 'rgba(0, 0, 0, 0.4)',
                            backdropFilter: 'blur(6px)',
                            borderTop: '1px solid rgba(255,255,255,0.08)',
                            borderLeft: '1px solid rgba(255,255,255,0.08)',
                            borderBottom: '1px solid rgba(0,0,0,0.5)',
                            borderRight: '1px solid rgba(0,0,0,0.5)',
                            boxShadow: '0 10px 22px rgba(0,0,0,0.5)',
                        }}
                    >
                        <IconPlayerPlayFilled size={20} className="ml-0.5" />
                    </div>
                )}

                {isPlaying && (
                    <div
                        className="flex h-12 w-12 items-center justify-center rounded-full text-white animate-pulse-slow"
                        style={{
                            background: 'linear-gradient(135deg, #fb923c, #ea580c)',
                            boxShadow: 'inset 2px 2px 4px rgba(255,255,255,0.4), inset -2px -2px 4px rgba(0,0,0,0.2), 0 8px 16px rgba(249,115,22,0.4)',
                            border: '1px solid rgba(255,255,255,0.2)',
                            textShadow: '0 2px 4px rgba(0,0,0,0.2)'
                        }}
                    >
                        <IconWaveSine size={22} />
                    </div>
                )}
            </div>
        </motion.button>
    );
}

interface CompactStationListProps {
    stations: Station[];
    nowPlayingId?: string | null;
    favoriteIds?: Set<string>;
    onPlayStation: (station: Station) => void;
    onToggleFavorite?: (station: Station) => void;
    unavailableIds?: Set<string>;
}

export function CompactStationList({
    stations,
    nowPlayingId,
    favoriteIds = new Set(),
    onPlayStation,
    onToggleFavorite,
    unavailableIds,
}: CompactStationListProps) {
    if (stations.length === 0) {
        return (
            <div className="p-12 text-center">
                <div className="text-slate-400 text-sm font-medium">No stations available</div>
            </div>
        );
    }

    const [visibleCount, setVisibleCount] = useState(8);
    useEffect(() => {
        setVisibleCount((prev) => Math.min(prev, stations.length));
    }, [stations.length]);
    const visibleStations = useMemo(() => stations.slice(0, visibleCount), [stations, visibleCount]);
    const hasMore = stations.length > visibleCount;

    return (
        <div
            className="relative overflow-hidden"
            style={{
                background: 'transparent',
            }}
        >
            <div className="flex flex-col relative z-10 gap-2">
                {visibleStations.map((station, index) => (
                    <CompactStationCard
                        key={station.uuid}
                        station={station}
                        isPlaying={station.uuid === nowPlayingId}
                        isFavorite={favoriteIds.has(station.uuid)}
                        onPlay={onPlayStation}
                        onToggleFavorite={onToggleFavorite}
                        index={index}
                        isUnavailable={unavailableIds?.has(station.uuid) ?? false}
                    />
                ))}
            </div>
            <div className="relative z-10 mt-4 flex flex-wrap items-center justify-center gap-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--rp-muted-2)]">
                <span>
                    {Math.min(visibleCount, stations.length)} of {stations.length}
                </span>
                {hasMore && (
                    <button
                        type="button"
                        onClick={() => setVisibleCount((prev) => Math.min(prev + 8, stations.length))}
                        className="inline-flex items-center gap-2 rounded-full border border-[rgba(245,177,45,0.5)] bg-[rgba(245,177,45,0.12)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--rp-gold)]"
                    >
                        Show more
                    </button>
                )}
                {visibleCount > 8 && (
                    <button
                        type="button"
                        onClick={() => setVisibleCount(8)}
                        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--rp-muted)]"
                    >
                        Show less
                    </button>
                )}
            </div>
        </div>
    );
}
