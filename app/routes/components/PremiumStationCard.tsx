import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { IconPlayerPlayFilled, IconHeart, IconHeartFilled } from "@tabler/icons-react";
import type { Station } from "~/types/radio";
import {
    generateStationGradient,
    detectGenre,
    getThemedFallbackImage,
    getStationColors
} from "~/utils/colorExtraction";

function getProbeBadgeCopy(status: Station["probeStatus"]) {
    switch (status) {
        case "ok":
            return "Live";
        case "slow":
            return "Slow";
        case "down":
            return "Retry";
        default:
            return null;
    }
}

function getProbeBadgeClass(status: Station["probeStatus"], isCurrent: boolean) {
    if (status === "ok") {
        return isCurrent
            ? "border-emerald-300/35 bg-emerald-500/18 text-emerald-100"
            : "border-emerald-500/30 bg-emerald-500/15 text-emerald-200";
    }
    if (status === "slow") {
        return isCurrent
            ? "border-amber-300/35 bg-amber-400/20 text-amber-50"
            : "border-amber-500/35 bg-amber-500/14 text-amber-100";
    }
    if (status === "down") {
        return isCurrent
            ? "border-rose-300/35 bg-rose-500/18 text-rose-50"
            : "border-rose-500/35 bg-rose-500/15 text-rose-100";
    }
    return "border-white/15 bg-black/35 text-white/70";
}

function formatProbeAge(checkedAt?: string | null) {
    if (!checkedAt) return null;
    const timestamp = Date.parse(checkedAt);
    if (Number.isNaN(timestamp)) return null;

    const deltaMs = Date.now() - timestamp;
    if (deltaMs < 45_000) return "checked now";

    const minutes = Math.round(deltaMs / 60_000);
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.round(hours / 24);
    return `${days}d ago`;
}

type PremiumStationCardProps = {
    station: Station;
    index?: number;
    isPlaying?: boolean;
    isCurrent?: boolean;
    isFavorite?: boolean;
    onPlay: (station: Station) => void;
    onToggleFavorite?: (station: Station) => void;
    size?: 'sm' | 'md' | 'lg';
    showGenre?: boolean;
    fillWidth?: boolean;
};

export function PremiumStationCard({
    station,
    index = 0,
    isPlaying = false,
    isCurrent = false,
    isFavorite = false,
    onPlay,
    onToggleFavorite,
    size = 'md',
    showGenre = true,
    fillWidth = false,
}: PremiumStationCardProps) {
    const [imageError, setImageError] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    const genre = useMemo(() => detectGenre(station.tagList), [station.tagList]);
    const colors = useMemo(() => getStationColors(station.tagList), [station.tagList]);
    const fallbackGradient = useMemo(() => generateStationGradient(station.name), [station.name]);
    const fallbackImage = useMemo(() => getThemedFallbackImage(genre), [genre]);
    const probeBadge = useMemo(() => getProbeBadgeCopy(station.probeStatus), [station.probeStatus]);
    const probeAge = useMemo(() => formatProbeAge(station.probeCheckedAt), [station.probeCheckedAt]);

    const artworkUrl = station.favicon && !imageError ? station.favicon : fallbackImage;

    const sizeClasses = {
        sm: 'w-32 h-32',
        md: 'w-40 h-40 md:w-44 md:h-44',
        lg: 'w-48 h-48 md:w-56 md:h-56',
    };
    const artworkSizeClass = fillWidth ? 'w-full aspect-square' : sizeClasses[size];

    const initials = useMemo(() => {
        const words = station.name.split(/\s+/).filter(w => w.length > 0);
        if (words.length >= 2 && words[0]?.[0] && words[1]?.[0]) {
            return (words[0][0] + words[1][0]).toUpperCase();
        }
        return station.name.slice(0, 2).toUpperCase();
    }, [station.name]);

    return (
        <motion.div
            className={`group relative cursor-pointer ${fillWidth ? 'w-full' : ''}`}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: index * 0.03 }}
            onHoverStart={() => setIsHovered(true)}
            onHoverEnd={() => setIsHovered(false)}
            whileHover={{ y: -5 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onPlay(station)}
        >
            {/* Card Container */}
            <div
                className={`${artworkSizeClass} relative rounded-2xl overflow-hidden border`}
                style={{
                    borderColor: isCurrent ? 'rgba(245, 177, 45, 0.42)' : isHovered ? 'rgba(245, 177, 45, 0.18)' : 'rgba(255,255,255,0.08)',
                    boxShadow: isCurrent
                        ? `0 14px 30px -18px rgba(245,177,45,0.28), 0 8px 18px -14px rgba(0,0,0,0.42)`
                        : isHovered
                            ? '0 14px 24px -18px rgba(0,0,0,0.34)'
                            : '0 10px 18px -18px rgba(0,0,0,0.28)',
                }}
            >
                <div
                    className="absolute inset-0"
                    style={{
                        background: isCurrent
                            ? 'linear-gradient(180deg, rgba(34,28,20,0.56) 0%, rgba(12,14,18,0.28) 100%)'
                            : 'linear-gradient(180deg, rgba(12,14,18,0.3) 0%, rgba(10,12,16,0.12) 100%)',
                    }}
                />

                {/* Artwork Image */}
                {station.favicon && !imageError ? (
                    <img
                        src={station.favicon}
                        alt={station.name}
                        className="relative z-[1] w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        onError={() => setImageError(true)}
                        loading="lazy"
                    />
                ) : (
                    <div
                        className="relative z-[1] w-full h-full flex items-center justify-center"
                        style={{ background: fallbackGradient }}
                    >
                        <span className="text-white/90 text-3xl font-bold">{initials}</span>
                    </div>
                )}

                {/* Gradient Overlay */}
                <div
                    className="absolute inset-0 pointer-events-none transition-opacity duration-300 z-[2]"
                    style={{
                        background: isCurrent
                            ? 'linear-gradient(to top, rgba(0,0,0,0.56) 0%, rgba(0,0,0,0.16) 42%, transparent 72%)'
                            : 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.12) 38%, transparent 68%)',
                        opacity: isHovered ? 0.92 : 0.68,
                    }}
                />

                <motion.div
                    className="absolute inset-0 pointer-events-none z-[3]"
                    style={{
                        background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.005) 24%, transparent 56%, rgba(245,177,45,0.03) 100%)',
                    }}
                    animate={{ opacity: isCurrent ? 0.64 : isHovered ? 0.4 : 0.22 }}
                />

                {isCurrent && (
                    <div
                        className="absolute inset-x-4 bottom-0 h-px pointer-events-none z-[4]"
                        style={{
                            background: 'linear-gradient(90deg, transparent 0%, rgba(245,177,45,0.76) 18%, rgba(255,213,129,0.9) 50%, rgba(245,177,45,0.76) 82%, transparent 100%)',
                            boxShadow: '0 0 12px rgba(245,177,45,0.36)',
                        }}
                    />
                )}

                {/* Play Button Overlay */}
                <motion.div
                    className="absolute inset-0 z-[5] flex items-center justify-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: isHovered || isCurrent ? 1 : 0 }}
                >
                    <motion.div
                        className="flex items-center justify-center w-14 h-14 rounded-full text-white"
                        style={{
                            background: `linear-gradient(135deg, ${colors.accent} 0%, ${colors.primary} 100%)`,
                            boxShadow: isCurrent
                                ? `0 10px 26px -8px ${colors.accent}80`
                                : `0 8px 20px -8px ${colors.accent}55`,
                        }}
                        animate={isCurrent && isPlaying ? { scale: [1, 1.1, 1] } : {}}
                        transition={{ duration: 1, repeat: Infinity }}
                    >
                        <IconPlayerPlayFilled size={24} className="ml-0.5" />
                    </motion.div>
                </motion.div>

                {/* Favorite Button */}
                {probeBadge && (
                    <div
                        className={`absolute top-2 left-2 z-10 rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] backdrop-blur-sm ${getProbeBadgeClass(station.probeStatus, isCurrent)}`}
                    >
                        {probeBadge}
                    </div>
                )}

                {onToggleFavorite && (
                    <motion.button
                        className="absolute top-2 right-2 z-10 flex items-center justify-center w-8 h-8 rounded-full bg-black/28 backdrop-blur-sm border border-white/14"
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleFavorite(station);
                        }}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: isHovered || isFavorite ? 1 : 0, scale: 1 }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                    >
                        {isFavorite ? (
                            <IconHeartFilled size={16} className="text-rose-500" />
                        ) : (
                            <IconHeart size={16} className="text-white/80" />
                        )}
                    </motion.button>
                )}

                {/* Now Playing Indicator */}
                {isCurrent && isPlaying && (
                    <div className="absolute bottom-2 left-2 flex items-end gap-0.5 h-4">
                        {[...Array(4)].map((_, i) => (
                            <motion.div
                                key={i}
                                className="w-1 rounded-full"
                                style={{ background: colors.accent }}
                                animate={{
                                    height: [4, 12 + Math.random() * 4, 4],
                                }}
                                transition={{
                                    duration: 0.4 + Math.random() * 0.2,
                                    repeat: Infinity,
                                    delay: i * 0.1,
                                }}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Station Info */}
            <div className="mt-2.5 px-1">
                <h3 className={`font-semibold text-sm truncate transition-colors ${isCurrent ? 'text-[var(--rp-gold)]' : 'text-white group-hover:text-white/92'}`}>
                    {station.name}
                </h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                    {station.country && (
                        <span className={`text-xs truncate ${isCurrent ? 'text-white/72' : 'text-white/50'}`}>{station.country}</span>
                    )}
                    {showGenre && station.tagList?.[0] && (
                        <>
                            <span className="text-white/30 text-xs">•</span>
                            <span className={`text-xs truncate capitalize ${isCurrent ? 'text-white/62' : 'text-white/40'}`}>{station.tagList[0]}</span>
                        </>
                    )}
                </div>
                {(probeBadge || probeAge) && (
                    <div className={`mt-1 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] ${isCurrent ? 'text-white/58' : 'text-white/38'}`}>
                        {probeAge && <span>{probeAge}</span>}
                        {probeAge && typeof station.probeLatencyMs === "number" && station.probeStatus !== "down" && (
                            <span className="text-white/24">•</span>
                        )}
                        {typeof station.probeLatencyMs === "number" && station.probeStatus !== "down" && (
                            <span>{station.probeLatencyMs}ms</span>
                        )}
                    </div>
                )}
            </div>
        </motion.div>
    );
}

// Horizontal scrollable station list
type PremiumStationRowProps = {
    title: string;
    subtitle?: string;
    stations: Station[];
    nowPlaying: Station | null;
    isPlaying?: boolean;
    favoriteIds?: Set<string>;
    onPlayStation: (station: Station) => void;
    onToggleFavorite?: (station: Station) => void;
};

export function PremiumStationRow({
    title,
    subtitle,
    stations,
    nowPlaying,
    isPlaying = false,
    favoriteIds,
    onPlayStation,
    onToggleFavorite,
}: PremiumStationRowProps) {
    if (stations.length === 0) return null;

    return (
        <section className="py-6">
            {/* Section Header */}
            <div className="px-4 md:px-0 mb-4">
                <h2 className="text-white font-bold text-xl md:text-2xl">{title}</h2>
                {subtitle && (
                    <p className="text-white/50 text-sm mt-0.5">{subtitle}</p>
                )}
            </div>

            {/* Scrollable Row */}
            <div className="flex gap-4 overflow-x-auto pb-4 px-4 md:px-0 scrollbar-hide snap-x snap-mandatory">
                {stations.map((station, index) => (
                    <div key={station.uuid} className="snap-start">
                        <PremiumStationCard
                            station={station}
                            index={index}
                            isPlaying={isPlaying && nowPlaying?.uuid === station.uuid}
                            isCurrent={nowPlaying?.uuid === station.uuid}
                            isFavorite={favoriteIds?.has(station.uuid)}
                            onPlay={onPlayStation}
                            onToggleFavorite={onToggleFavorite}
                            size="md"
                        />
                    </div>
                ))}
            </div>
        </section>
    );
}

// Grid layout for stations
type PremiumStationGridProps = {
    stations: Station[];
    nowPlaying: Station | null;
    isPlaying?: boolean;
    favoriteIds?: Set<string>;
    onPlayStation: (station: Station) => void;
    onToggleFavorite?: (station: Station) => void;
    emptyMessage?: string;
};

export function PremiumStationGrid({
    stations,
    nowPlaying,
    isPlaying = false,
    favoriteIds,
    onPlayStation,
    onToggleFavorite,
    emptyMessage,
}: PremiumStationGridProps) {
    if (stations.length === 0) {
        return (
            <div
                className="rounded-3xl p-12 text-center"
                style={{
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255,255,255,0.1)',
                }}
            >
                <p className="text-white/50 text-sm">
                    {emptyMessage || "No stations found. Try exploring a different region."}
                </p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
            {stations.map((station, index) => (
                <PremiumStationCard
                    key={station.uuid}
                    station={station}
                    index={index}
                    isPlaying={isPlaying && nowPlaying?.uuid === station.uuid}
                    isCurrent={nowPlaying?.uuid === station.uuid}
                    isFavorite={favoriteIds?.has(station.uuid)}
                    onPlay={onPlayStation}
                    onToggleFavorite={onToggleFavorite}
                    size="sm"
                />
            ))}
        </div>
    );
}
