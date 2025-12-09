import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IconPlayerPlayFilled, IconPlayerPauseFilled, IconArrowsShuffle, IconHeart } from "@tabler/icons-react";
import type { Station } from "~/types/radio";
import { usePlayerStore } from "~/state/playerStore";
import {
    getStationColors,
    generateStationGradient,
    detectGenre,
    getThemedFallbackImage,
    type ExtractedColors
} from "~/utils/colorExtraction";

// Featured moods for quick access
const MOOD_CHIPS = [
    { id: 'chill', label: 'Chill', emoji: '🌙' },
    { id: 'jazz', label: 'Jazz', emoji: '🎺' },
    { id: 'electronic', label: 'Electronic', emoji: '🎧' },
    { id: 'world', label: 'World', emoji: '🌍' },
    { id: 'rock', label: 'Rock', emoji: '🎸' },
    { id: 'classical', label: 'Classical', emoji: '🎻' },
] as const;

type PremiumHeroProps = {
    nowPlaying: Station | null;
    isPlaying?: boolean;
    onPlay: () => void;
    onPause: () => void;
    onShuffle: () => void;
    onMoodSelect?: (mood: string) => void;
    selectedMood?: string | null;
    recentStations?: Station[];
    featuredStations?: Station[];
    onStationSelect?: (station: Station) => void;
};

export function PremiumHero({
    nowPlaying,
    isPlaying = false,
    onPlay,
    onPause,
    onShuffle,
    onMoodSelect,
    selectedMood,
    recentStations = [],
    featuredStations = [],
    onStationSelect,
}: PremiumHeroProps) {
    const [colors, setColors] = useState<ExtractedColors | null>(null);
    const [imageLoaded, setImageLoaded] = useState(false);

    // Get colors from current station
    const stationColors = useMemo(() => {
        if (nowPlaying?.tagList) {
            return getStationColors(nowPlaying.tagList);
        }
        return getStationColors(null);
    }, [nowPlaying?.tagList]);

    // Artwork URL - use station favicon or genre-based fallback
    const artworkUrl = useMemo(() => {
        if (nowPlaying?.favicon) return nowPlaying.favicon;
        const genre = detectGenre(nowPlaying?.tagList);
        return getThemedFallbackImage(genre);
    }, [nowPlaying?.favicon, nowPlaying?.tagList]);

    // Gradient fallback
    const fallbackGradient = useMemo(() => {
        return generateStationGradient(nowPlaying?.name || 'Radio Passport');
    }, [nowPlaying?.name]);

    return (
        <div className="relative w-full overflow-hidden">
            {/* Full-bleed background artwork */}
            <div className="absolute inset-0 z-0">
                {/* Background Image with blur */}
                <motion.div
                    className="absolute inset-0"
                    initial={{ opacity: 0, scale: 1.1 }}
                    animate={{ opacity: imageLoaded ? 1 : 0, scale: 1 }}
                    transition={{ duration: 0.8 }}
                >
                    <img
                        src={artworkUrl}
                        alt=""
                        className="w-full h-full object-cover"
                        style={{ filter: 'blur(60px) saturate(1.5)' }}
                        onLoad={() => setImageLoaded(true)}
                        onError={() => setImageLoaded(false)}
                    />
                </motion.div>

                {/* Fallback gradient when no image */}
                {!imageLoaded && (
                    <div
                        className="absolute inset-0"
                        style={{ background: stationColors.gradient }}
                    />
                )}

                {/* Cinematic dark overlay gradients */}
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        background: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.2) 30%, rgba(0,0,0,0.3) 70%, rgba(0,0,0,0.8) 100%)',
                    }}
                />
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        background: 'radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.4) 100%)',
                    }}
                />
            </div>

            {/* Content */}
            <div className="relative z-10 px-4 pt-6 pb-8 md:px-8 md:pt-10 md:pb-12 lg:px-12 lg:pt-16 lg:pb-16 min-h-[70vh] md:min-h-[65vh] flex flex-col">
                {/* Top Section - Brand + Mood Pills */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-auto">
                    {/* Logo */}
                    <motion.div
                        className="flex items-center gap-3"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <div className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-xl border border-white/30 text-white font-bold text-lg shadow-lg">
                            🌍
                        </div>
                        <div>
                            <h1 className="text-white font-bold text-lg md:text-xl tracking-tight">Radio Passport</h1>
                            <p className="text-white/60 text-xs font-medium">Global Radio Discovery</p>
                        </div>
                    </motion.div>

                    {/* Mood Pills - Horizontal scroll on mobile */}
                    <motion.div
                        className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        {MOOD_CHIPS.map((mood) => (
                            <button
                                key={mood.id}
                                onClick={() => onMoodSelect?.(selectedMood === mood.id ? '' : mood.id)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${selectedMood === mood.id
                                        ? 'bg-white text-slate-900 shadow-lg'
                                        : 'bg-white/15 text-white/90 hover:bg-white/25 backdrop-blur-sm border border-white/20'
                                    }`}
                            >
                                <span>{mood.emoji}</span>
                                <span>{mood.label}</span>
                            </button>
                        ))}
                    </motion.div>
                </div>

                {/* Center - Now Playing Glass Card */}
                <div className="flex-1 flex items-center justify-center py-6 md:py-8">
                    <motion.div
                        className="w-full max-w-xl"
                        initial={{ opacity: 0, y: 30, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ delay: 0.4, type: 'spring', damping: 25 }}
                    >
                        {/* Glass Card */}
                        <div
                            className="relative overflow-hidden rounded-3xl p-6 md:p-8"
                            style={{
                                background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 100%)',
                                backdropFilter: 'blur(40px) saturate(150%)',
                                WebkitBackdropFilter: 'blur(40px) saturate(150%)',
                                border: '1px solid rgba(255,255,255,0.2)',
                                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.2)',
                            }}
                        >
                            {/* Animated reflection */}
                            <motion.div
                                className="absolute -inset-full pointer-events-none"
                                style={{
                                    background: 'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.1) 50%, transparent 70%)',
                                }}
                                animate={{ x: ['0%', '200%'] }}
                                transition={{ duration: 3, repeat: Infinity, repeatDelay: 2, ease: 'easeInOut' }}
                            />

                            <div className="relative z-10 flex flex-col md:flex-row gap-6 items-center">
                                {/* Artwork */}
                                <motion.div
                                    className="relative flex-shrink-0"
                                    animate={isPlaying ? { scale: [1, 1.02, 1] } : {}}
                                    transition={{ duration: 2, repeat: Infinity }}
                                >
                                    <div
                                        className="w-32 h-32 md:w-40 md:h-40 rounded-2xl overflow-hidden"
                                        style={{
                                            boxShadow: `0 20px 40px -10px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1)`,
                                        }}
                                    >
                                        {nowPlaying?.favicon ? (
                                            <img
                                                src={nowPlaying.favicon}
                                                alt={nowPlaying.name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div
                                                className="w-full h-full flex items-center justify-center text-white/80 text-4xl font-bold"
                                                style={{ background: fallbackGradient }}
                                            >
                                                {nowPlaying?.name?.slice(0, 2).toUpperCase() || '🎵'}
                                            </div>
                                        )}
                                    </div>

                                    {/* Playing indicator ring */}
                                    {isPlaying && (
                                        <motion.div
                                            className="absolute -inset-2 rounded-3xl border-2 border-white/30"
                                            animate={{
                                                scale: [1, 1.05, 1],
                                                opacity: [0.5, 1, 0.5],
                                            }}
                                            transition={{ duration: 1.5, repeat: Infinity }}
                                        />
                                    )}
                                </motion.div>

                                {/* Station Info */}
                                <div className="flex-1 text-center md:text-left">
                                    <p className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-1">
                                        {isPlaying ? 'Now Playing' : 'Ready to Play'}
                                    </p>
                                    <h2 className="text-white text-xl md:text-2xl font-bold tracking-tight mb-2 line-clamp-2">
                                        {nowPlaying?.name || 'Select a Station'}
                                    </h2>
                                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-white/70 text-sm">
                                        {nowPlaying?.country && (
                                            <span className="flex items-center gap-1">
                                                <span>📍</span>
                                                <span>{nowPlaying.country}</span>
                                            </span>
                                        )}
                                        {nowPlaying?.tagList?.[0] && (
                                            <>
                                                <span className="text-white/30">•</span>
                                                <span>{nowPlaying.tagList[0]}</span>
                                            </>
                                        )}
                                    </div>

                                    {/* Play Controls */}
                                    <div className="flex items-center justify-center md:justify-start gap-3 mt-5">
                                        <motion.button
                                            onClick={isPlaying ? onPause : onPlay}
                                            className="flex items-center justify-center h-14 w-14 rounded-full text-white"
                                            style={{
                                                background: `linear-gradient(135deg, ${stationColors.accent} 0%, ${stationColors.primary} 100%)`,
                                                boxShadow: `0 10px 30px -5px ${stationColors.accent}80`,
                                            }}
                                            whileHover={{ scale: 1.08 }}
                                            whileTap={{ scale: 0.95 }}
                                        >
                                            {isPlaying ? (
                                                <IconPlayerPauseFilled size={24} />
                                            ) : (
                                                <IconPlayerPlayFilled size={24} className="ml-0.5" />
                                            )}
                                        </motion.button>

                                        <motion.button
                                            onClick={onShuffle}
                                            className="flex items-center justify-center h-11 w-11 rounded-full bg-white/10 text-white/80 hover:bg-white/20 border border-white/20"
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                        >
                                            <IconArrowsShuffle size={18} />
                                        </motion.button>

                                        <motion.button
                                            className="flex items-center justify-center h-11 w-11 rounded-full bg-white/10 text-white/80 hover:bg-white/20 border border-white/20"
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                        >
                                            <IconHeart size={18} />
                                        </motion.button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Bottom - Featured/Recent Stations Carousel */}
                {(recentStations.length > 0 || featuredStations.length > 0) && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        className="mt-auto"
                    >
                        <h3 className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-3">
                            {recentStations.length > 0 ? 'Recently Played' : 'Featured Stations'}
                        </h3>
                        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
                            {(recentStations.length > 0 ? recentStations : featuredStations).slice(0, 8).map((station, index) => (
                                <motion.button
                                    key={station.uuid}
                                    onClick={() => onStationSelect?.(station)}
                                    className="flex-shrink-0 group"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.7 + index * 0.05 }}
                                    whileHover={{ scale: 1.05, y: -4 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <div
                                        className="w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden transition-shadow"
                                        style={{
                                            boxShadow: '0 8px 20px -4px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1)',
                                        }}
                                    >
                                        {station.favicon ? (
                                            <img
                                                src={station.favicon}
                                                alt={station.name}
                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                            />
                                        ) : (
                                            <div
                                                className="w-full h-full flex items-center justify-center text-white/80 text-lg font-bold"
                                                style={{ background: generateStationGradient(station.name) }}
                                            >
                                                {station.name.slice(0, 2).toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-white/70 text-[10px] font-medium mt-1.5 truncate w-16 md:w-20 text-center">
                                        {station.name}
                                    </p>
                                </motion.button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Sound wave animation at bottom when playing */}
            {isPlaying && (
                <div className="absolute bottom-0 left-0 right-0 h-1 flex items-end justify-center gap-0.5 px-4">
                    {[...Array(50)].map((_, i) => (
                        <motion.div
                            key={i}
                            className="w-1 rounded-full"
                            style={{
                                background: `linear-gradient(to top, ${stationColors.accent}, transparent)`,
                            }}
                            animate={{
                                height: [4, Math.random() * 20 + 4, 4],
                            }}
                            transition={{
                                duration: 0.5 + Math.random() * 0.5,
                                repeat: Infinity,
                                delay: i * 0.02,
                            }}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
