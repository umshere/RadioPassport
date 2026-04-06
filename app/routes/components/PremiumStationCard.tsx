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
}: PremiumStationCardProps) {
    const [imageError, setImageError] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    const genre = useMemo(() => detectGenre(station.tagList), [station.tagList]);
    const colors = useMemo(() => getStationColors(station.tagList), [station.tagList]);
    const fallbackGradient = useMemo(() => generateStationGradient(station.name), [station.name]);
    const fallbackImage = useMemo(() => getThemedFallbackImage(genre), [genre]);

    const artworkUrl = station.favicon && !imageError ? station.favicon : fallbackImage;

    const sizeClasses = {
        sm: 'w-32 h-32',
        md: 'w-40 h-40 md:w-44 md:h-44',
        lg: 'w-48 h-48 md:w-56 md:h-56',
    };

    const initials = useMemo(() => {
        const words = station.name.split(/\s+/).filter(w => w.length > 0);
        if (words.length >= 2 && words[0]?.[0] && words[1]?.[0]) {
            return (words[0][0] + words[1][0]).toUpperCase();
        }
        return station.name.slice(0, 2).toUpperCase();
    }, [station.name]);

    return (
        <motion.div
            className="group relative cursor-pointer"
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
                className={`${sizeClasses[size]} relative rounded-2xl overflow-hidden border`}
                style={{
                    borderColor: isCurrent ? 'rgba(245, 177, 45, 0.52)' : isHovered ? 'rgba(245, 177, 45, 0.24)' : 'rgba(255,255,255,0.1)',
                    boxShadow: isCurrent
                        ? `0 18px 38px -16px rgba(245,177,45,0.34), 0 10px 24px -12px rgba(0,0,0,0.56), inset 0 1px 0 rgba(255,214,127,0.08)`
                        : isHovered
                            ? '0 16px 30px -16px rgba(0,0,0,0.48), inset 0 1px 0 rgba(255,255,255,0.04)'
                            : '0 12px 24px -16px rgba(0,0,0,0.42), inset 0 1px 0 rgba(255,255,255,0.03)',
                }}
            >
                <div
                    className="absolute inset-0"
                    style={{
                        background: isCurrent
                            ? 'linear-gradient(180deg, rgba(42,33,20,0.92) 0%, rgba(18,15,12,0.84) 100%)'
                            : 'linear-gradient(180deg, rgba(16,19,26,0.9) 0%, rgba(11,13,18,0.86) 100%)',
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
                            ? 'linear-gradient(to top, rgba(0,0,0,0.74) 0%, rgba(0,0,0,0.22) 44%, transparent 76%)'
                            : 'linear-gradient(to top, rgba(0,0,0,0.76) 0%, rgba(0,0,0,0.26) 40%, transparent 74%)',
                        opacity: isHovered ? 1 : 0.82,
                    }}
                />

                <motion.div
                    className="absolute inset-0 pointer-events-none z-[3]"
                    style={{
                        background: 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 26%, transparent 58%, rgba(245,177,45,0.05) 100%)',
                    }}
                    animate={{ opacity: isCurrent ? 0.9 : isHovered ? 0.72 : 0.46 }}
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
                {onToggleFavorite && (
                    <motion.button
                        className="absolute top-2 right-2 z-10 flex items-center justify-center w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm border border-white/20"
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
            <div className="mt-3 px-1">
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
