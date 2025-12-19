import { motion } from "framer-motion";
import { IconPlayerPlayFilled, IconHeart, IconHeartFilled, IconWaveSine } from "@tabler/icons-react";
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
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: index * 0.04, duration: 0.4, ease: "backOut" }}
            onClick={() => onPlay(station)}
            className="w-full flex items-center gap-4 p-3.5 rounded-2xl relative group mb-3 last:mb-0 overflow-hidden transition-all duration-300"
            style={{
                background: isPlaying
                    ? 'rgba(255, 255, 255, 0.85)'
                    : 'rgba(255, 255, 255, 0.4)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)', // Safari support
                boxShadow: isPlaying
                    ? '0 8px 32px rgba(251, 146, 60, 0.25), 0 0 0 1px rgba(251, 146, 60, 0.4) inset'
                    : '0 4px 16px rgba(0, 0, 0, 0.03), 0 0 0 1px rgba(255, 255, 255, 0.6) inset',
                border: isPlaying ? '1px solid rgba(251, 146, 60, 0.1)' : '1px solid rgba(255, 255, 255, 0.4)',
                transform: isPlaying ? 'scale(1.02)' : 'scale(1)',
                zIndex: isPlaying ? 10 : 1,
            }}
        >
            {/* Glass Shine Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent opacity-50 pointer-events-none" />

            {/* Active Indicator Glow */}
            {isPlaying && (
                <div className="absolute -left-1 top-0 bottom-0 w-1.5 bg-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.8)] rounded-r-full" />
            )}

            {/* Artwork - Floating Glass */}
            <div
                className="h-14 w-14 rounded-xl flex-shrink-0 relative overflow-hidden"
                style={{
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1), 0 0 0 1px rgba(255,255,255,0.5)',
                }}
            >
                <StationArtwork
                    station={station}
                    fallbackClassName="w-full h-full flex items-center justify-center font-bold text-sm text-slate-500 bg-white/80 backdrop-blur"
                />
            </div>

            {/* Station Info */}
            <div className="flex-1 min-w-0 text-left flex flex-col justify-center relative z-10">
                <div className={`text-[0.95rem] font-bold truncate leading-tight ${isPlaying ? 'text-slate-900' : 'text-slate-800'}`}>
                    {station.name}
                </div>
                <div className="text-xs truncate leading-tight mt-1 font-medium text-slate-500 mix-blend-multiply">
                    {[station.country, station.state].filter(Boolean).join(" • ")}
                </div>

                <div className="flex gap-2 mt-1.5 items-center">
                    {station.bitrate > 0 && (
                        <span className="text-[10px] font-bold text-slate-400 bg-white/50 px-1.5 py-0.5 rounded backdrop-blur-sm border border-white/30">
                            {station.bitrate}
                        </span>
                    )}
                    {(isHlsStream || isHttpStream) && (
                        <span className="text-[10px] font-bold text-slate-400 opacity-50">•</span>
                    )}
                    {isHlsStream && (
                        <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50/50 px-1.5 py-0.5 rounded border border-indigo-100/50">HLS</span>
                    )}
                    {isHttpStream && (
                        <span className="text-[10px] font-bold text-rose-500 bg-rose-50/50 px-1.5 py-0.5 rounded border border-rose-100/50">HTTP</span>
                    )}
                    {isPlaying && (
                        <div className="ml-auto flex items-center gap-1.5 text-[10px] font-bold text-orange-600 bg-orange-50/80 px-2 py-0.5 rounded-full border border-orange-100 backdrop-blur-sm shadow-sm">
                            <IconWaveSine size={12} className="animate-pulse" />
                            LIVE
                        </div>
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
                            background: isFavorite ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.3)',
                            backdropFilter: 'blur(4px)',
                            borderTop: '1px solid rgba(255,255,255,0.9)',
                            borderLeft: '1px solid rgba(255,255,255,0.9)',
                            borderBottom: '1px solid rgba(0,0,0,0.05)',
                            borderRight: '1px solid rgba(0,0,0,0.05)',
                            boxShadow: isFavorite
                                ? 'inset 2px 2px 5px rgba(0,0,0,0.05), 0 1px 0 rgba(255,255,255,1)'
                                : '6px 6px 12px rgba(0,0,0,0.06), -4px -4px 8px rgba(255,255,255,0.8), inset 0 0 0 1px rgba(255,255,255,0.4)',
                            color: isFavorite ? '#f43f5e' : '#94a3b8',
                        }}
                    >
                        {isFavorite ? <IconHeartFilled size={18} /> : <IconHeart size={18} />}
                    </button>
                )}

                {!isPlaying && (
                    <div
                        className="flex h-12 w-12 items-center justify-center rounded-full text-slate-400 group-hover:text-orange-500 transition-all duration-300"
                        style={{
                            background: 'rgba(255, 255, 255, 0.35)',
                            backdropFilter: 'blur(4px)',
                            borderTop: '1px solid rgba(255,255,255,0.8)',
                            borderLeft: '1px solid rgba(255,255,255,0.8)',
                            borderBottom: '1px solid rgba(0,0,0,0.08)',
                            borderRight: '1px solid rgba(0,0,0,0.08)',
                            boxShadow: '8px 8px 16px rgba(0,0,0,0.06), -6px -6px 12px rgba(255,255,255,0.8), inset 0 0 0 1px rgba(255,255,255,0.3)',
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

    return (
        <div
            className="p-5 rounded-[2.5rem] relative overflow-hidden"
            style={{
                background: 'rgba(255, 255, 255, 0.25)', // More transparent
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
                border: '1px solid rgba(255, 255, 255, 0.6)',
            }}
        >
            {/* Subtle noise texture or gradient highlight could go here for extra "scrubbed" feel */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent opacity-70" />

            <div className="flex flex-col relative z-10 gap-2">
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
        </div>
    );
}
