import { motion } from "framer-motion";
import { IconPlayerPlayFilled, IconHeart, IconHeartFilled } from "@tabler/icons-react";
import type { Station } from "~/types/radio";
import { StationArtwork } from "./StationArtwork";

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
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03, duration: 0.3 }}
            onClick={() => onPlay(station)}
            className="w-full flex items-center gap-3 p-3 rounded-xl transition-all relative overflow-hidden"
            style={{
                background: isPlaying
                    ? 'linear-gradient(135deg, rgba(255,250,240,0.98) 0%, rgba(254,243,199,0.95) 100%)'
                    : 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,250,245,0.9) 100%)',
                boxShadow: isPlaying
                    ? '0 8px 25px -6px rgba(251,146,60,0.35), 0 0 0 2px rgba(251,146,60,0.25), inset 0 1px 0 rgba(255,255,255,1)'
                    : '0 4px 15px -4px rgba(0,0,0,0.1), 0 0 0 1px rgba(255,255,255,0.8), inset 0 1px 0 rgba(255,255,255,1)',
            }}
        >
            {/* Warm shimmer for playing state */}
            {isPlaying && (
                <motion.div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        background: 'linear-gradient(90deg, transparent 0%, rgba(255,200,100,0.2) 50%, transparent 100%)',
                    }}
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                />
            )}

            {/* Artwork/Icon */}
            <div
                className="h-12 w-12 rounded-xl overflow-hidden flex-shrink-0 relative"
                style={{
                    boxShadow: isPlaying
                        ? '0 4px 15px -4px rgba(251,146,60,0.4), 0 0 0 2px rgba(255,255,255,0.9)'
                        : '0 3px 10px -4px rgba(0,0,0,0.15), 0 0 0 2px rgba(255,255,255,0.8)',
                }}
            >
                <StationArtwork
                    station={station}
                    fallbackClassName="w-full h-full flex items-center justify-center font-bold text-xs text-white"
                />
            </div>

            {/* Station Info */}
            <div className="flex-1 min-w-0 text-left relative z-10">
                <div className="text-sm font-bold truncate leading-tight text-slate-800">
                    {station.name}
                </div>
                <div className={`text-xs truncate leading-tight mt-0.5 font-medium ${isPlaying ? 'text-amber-600/80' : 'text-slate-500'}`}>
                    {[station.country, station.state].filter(Boolean).join(" • ")}
                </div>
                {/* Tags/Bitrate */}
                <div className="flex gap-1.5 mt-1">
                    {isUnavailable && (
                        <span
                            className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold"
                            style={{
                                background: 'rgba(254,226,226,0.9)',
                                color: '#b91c1c',
                            }}
                        >
                            UNAVAILABLE
                        </span>
                    )}
                    {station.bitrate > 0 && (
                        <span
                            className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold"
                            style={{
                                background: isPlaying ? 'rgba(251,191,36,0.15)' : 'rgba(241,245,249,0.8)',
                                color: isPlaying ? '#b45309' : '#64748b',
                            }}
                        >
                            {station.bitrate}kbps
                        </span>
                    )}
                    {station.language && (
                        <span
                            className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold truncate max-w-20"
                            style={{
                                background: isPlaying ? 'rgba(251,191,36,0.15)' : 'rgba(241,245,249,0.8)',
                                color: isPlaying ? '#b45309' : '#64748b',
                            }}
                        >
                            {station.language}
                        </span>
                    )}
                    {isHlsStream && (
                        <span
                            className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold"
                            style={{
                                background: isPlaying ? 'rgba(251,191,36,0.15)' : 'rgba(241,245,249,0.8)',
                                color: isPlaying ? '#b45309' : '#64748b',
                            }}
                        >
                            HLS
                        </span>
                    )}
                    {isHttpStream && (
                        <span
                            className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold"
                            style={{
                                background: 'rgba(239, 68, 68, 0.08)',
                                color: '#b91c1c',
                            }}
                        >
                            HTTP
                        </span>
                    )}
                </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2 flex-shrink-0 relative z-10">
                {onToggleFavorite && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleFavorite(station);
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-lg transition-all"
                        style={{
                            background: isFavorite
                                ? 'linear-gradient(135deg, #fef2f2 0%, #ffe4e6 100%)'
                                : 'rgba(255,255,255,0.8)',
                            color: isFavorite ? '#f43f5e' : '#9ca3af',
                            boxShadow: isFavorite
                                ? '0 3px 10px -3px rgba(244,63,94,0.3)'
                                : '0 2px 6px -2px rgba(0,0,0,0.1)',
                        }}
                        aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
                    >
                        {isFavorite ? <IconHeartFilled size={14} /> : <IconHeart size={14} />}
                    </button>
                )}

                <div
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-white"
                    style={{
                        background: isPlaying
                            ? 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)'
                            : 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                        boxShadow: isPlaying
                            ? '0 4px 15px -4px rgba(251,146,60,0.5)'
                            : '0 4px 12px -4px rgba(15,23,42,0.3)',
                    }}
                >
                    <IconPlayerPlayFilled size={14} />
                </div>
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
            <div className="p-8 text-center">
                <div className="text-slate-400 text-sm">No stations available</div>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {stations.map((station, index) => (
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
    );
}
