import { useMemo, useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    IconPlayerPauseFilled,
    IconPlayerPlayFilled,
    IconPlayerSkipBackFilled,
    IconPlayerSkipForwardFilled,
    IconHeart,
    IconHeartFilled,
    IconVolume,
    IconChevronUp,
} from "@tabler/icons-react";
import { usePlayerStore } from "~/state/playerStore";
import {
    generateStationGradient,
    getStationColors
} from "~/utils/colorExtraction";

export function PremiumPlayerDock() {
    const {
        nowPlaying,
        isPlaying,
        togglePlay,
        queue,
        currentStationIndex,
        startStation
    } = usePlayerStore();

    const [isExpanded, setIsExpanded] = useState(false);

    const colors = useMemo(() => {
        return getStationColors(nowPlaying?.tagList ?? null);
    }, [nowPlaying?.tagList]);

    const fallbackGradient = useMemo(() => {
        return generateStationGradient(nowPlaying?.name || 'Radio');
    }, [nowPlaying?.name]);

    const handleNext = useCallback(() => {
        if (queue.length === 0) return;
        const nextIndex = (currentStationIndex + 1) % queue.length;
        const nextStation = queue[nextIndex];
        if (nextStation) {
            startStation(nextStation, { preserveQueue: true });
        }
    }, [queue, currentStationIndex, startStation]);

    const handlePrev = useCallback(() => {
        if (queue.length === 0) return;
        const prevIndex = (currentStationIndex - 1 + queue.length) % queue.length;
        const prevStation = queue[prevIndex];
        if (prevStation) {
            startStation(prevStation, { preserveQueue: true });
        }
    }, [queue, currentStationIndex, startStation]);

    if (!nowPlaying) return null;

    return (
        <>
            {/* Desktop Player */}
            <aside className="pointer-events-none fixed bottom-6 left-1/2 -translate-x-1/2 z-30 hidden w-full max-w-4xl px-4 lg:block">
                <motion.div
                    className="pointer-events-auto rounded-3xl overflow-hidden relative cursor-pointer"
                    onClick={() => setIsExpanded(true)}
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    style={{
                        background: 'linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(30,41,59,0.9) 100%)',
                        backdropFilter: 'blur(40px) saturate(180%)',
                        WebkitBackdropFilter: 'blur(40px) saturate(180%)',
                        boxShadow: `0 25px 50px -12px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1), 0 0 80px -20px ${colors.accent}40`,
                    }}
                >
                    {/* Artwork texture background */}
                    {nowPlaying.favicon && (
                        <div
                            className="absolute inset-0 opacity-20"
                            style={{
                                backgroundImage: `url(${nowPlaying.favicon})`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                filter: 'blur(30px)',
                            }}
                        />
                    )}

                    {/* Animated progress bar */}
                    <div className="relative h-1 w-full bg-white/10">
                        {isPlaying && (
                            <motion.div
                                className="absolute inset-y-0 left-0"
                                style={{
                                    background: `linear-gradient(90deg, ${colors.accent}, ${colors.primary})`,
                                    boxShadow: `0 0 15px ${colors.accent}80`,
                                }}
                                initial={{ width: "0%" }}
                                animate={{ width: "100%" }}
                                transition={{
                                    duration: 60,
                                    ease: "linear",
                                    repeat: Infinity
                                }}
                            />
                        )}
                    </div>

                    <div className="flex items-center gap-5 p-4 pr-6 relative z-10">
                        {/* Artwork */}
                        <motion.div
                            className="h-14 w-14 rounded-xl overflow-hidden flex-shrink-0 relative"
                            animate={isPlaying ? { scale: [1, 1.02, 1] } : {}}
                            transition={{ duration: 2, repeat: Infinity }}
                            style={{
                                boxShadow: `0 8px 25px -5px ${colors.accent}50, 0 0 0 2px rgba(255,255,255,0.1)`,
                            }}
                        >
                            {nowPlaying.favicon ? (
                                <img src={nowPlaying.favicon} alt="artwork" className="w-full h-full object-cover" />
                            ) : (
                                <div
                                    className="w-full h-full flex items-center justify-center text-white font-bold text-lg"
                                    style={{ background: fallbackGradient }}
                                >
                                    {nowPlaying.name.slice(0, 2).toUpperCase()}
                                </div>
                            )}
                        </motion.div>

                        {/* Station Info */}
                        <div className="flex-1 min-w-0">
                            <h4 className="text-white font-semibold truncate">{nowPlaying.name}</h4>
                            <p className="text-white/50 text-sm truncate">
                                {[nowPlaying.country, nowPlaying.tagList?.[0]].filter(Boolean).join(' • ')}
                            </p>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center gap-2">
                            <button
                                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-all"
                                onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                                aria-label="Previous"
                            >
                                <IconPlayerSkipBackFilled size={18} />
                            </button>

                            <motion.button
                                className="flex h-14 w-14 items-center justify-center rounded-full text-white"
                                style={{
                                    background: `linear-gradient(135deg, ${colors.accent} 0%, ${colors.primary} 100%)`,
                                    boxShadow: `0 8px 25px -5px ${colors.accent}60`,
                                }}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                                aria-label={isPlaying ? "Pause" : "Play"}
                            >
                                {isPlaying ? <IconPlayerPauseFilled size={24} /> : <IconPlayerPlayFilled size={24} className="ml-0.5" />}
                            </motion.button>

                            <button
                                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-all"
                                onClick={(e) => { e.stopPropagation(); handleNext(); }}
                                aria-label="Next"
                            >
                                <IconPlayerSkipForwardFilled size={18} />
                            </button>

                            <div className="w-px h-8 bg-white/10 mx-2" />

                            <button
                                className="flex h-10 w-10 items-center justify-center rounded-full text-white/50 hover:text-rose-400 transition-colors"
                                onClick={(e) => e.stopPropagation()}
                                aria-label="Favorite"
                            >
                                <IconHeart size={20} />
                            </button>

                            <button
                                className="flex h-10 w-10 items-center justify-center rounded-full text-white/50 hover:text-white transition-colors"
                                onClick={(e) => e.stopPropagation()}
                                aria-label="Volume"
                            >
                                <IconVolume size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Sound wave visualization */}
                    {isPlaying && (
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex items-end justify-center gap-0.5 h-4 pb-1 opacity-50">
                            {[...Array(20)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    className="w-0.5 rounded-full"
                                    style={{ background: colors.accent }}
                                    animate={{
                                        height: [2, 8 + Math.random() * 6, 2],
                                    }}
                                    transition={{
                                        duration: 0.4 + Math.random() * 0.3,
                                        repeat: Infinity,
                                        delay: i * 0.03,
                                    }}
                                />
                            ))}
                        </div>
                    )}
                </motion.div>
            </aside>

            {/* Mobile Player */}
            <motion.div
                className="lg:hidden fixed left-0 right-0 z-40 px-3"
                style={{ bottom: "calc(env(safe-area-inset-bottom) + 12px)" }}
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: 'spring', damping: 25 }}
            >
                <motion.div
                    onClick={() => setIsExpanded(true)}
                    className="rounded-2xl overflow-hidden active:scale-[0.98] transition-transform cursor-pointer relative p-3"
                    style={{
                        background: 'linear-gradient(135deg, rgba(15,23,42,0.98) 0%, rgba(30,41,59,0.95) 100%)',
                        backdropFilter: 'blur(40px)',
                        WebkitBackdropFilter: 'blur(40px)',
                        boxShadow: `0 15px 40px -10px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1), 0 0 50px -15px ${colors.accent}30`,
                    }}
                >
                    {/* Progress bar */}
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-white/10 rounded-t-2xl overflow-hidden">
                        {isPlaying && (
                            <motion.div
                                className="h-full"
                                style={{ background: colors.accent }}
                                initial={{ width: "0%" }}
                                animate={{ width: "100%" }}
                                transition={{ duration: 30, ease: "linear", repeat: Infinity }}
                            />
                        )}
                    </div>

                    <div className="flex items-center gap-3 relative z-10">
                        {/* Artwork */}
                        <motion.div
                            className="h-12 w-12 rounded-xl overflow-hidden flex-shrink-0"
                            animate={isPlaying ? { scale: [1, 1.03, 1] } : {}}
                            transition={{ duration: 1.5, repeat: Infinity }}
                            style={{
                                boxShadow: `0 4px 15px ${colors.accent}40`,
                            }}
                        >
                            {nowPlaying.favicon ? (
                                <img src={nowPlaying.favicon} alt="artwork" className="w-full h-full object-cover" />
                            ) : (
                                <div
                                    className="w-full h-full flex items-center justify-center text-white font-bold"
                                    style={{ background: fallbackGradient }}
                                >
                                    {nowPlaying.name.slice(0, 2).toUpperCase()}
                                </div>
                            )}
                        </motion.div>

                        {/* Info */}
                        <div className="min-w-0 flex-1">
                            <h4 className="text-white text-sm font-semibold truncate">{nowPlaying.name}</h4>
                            <p className="text-white/50 text-xs truncate">{nowPlaying.country}</p>
                        </div>

                        {/* Mobile Controls */}
                        <div className="flex items-center gap-1">
                            <button
                                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/70"
                                onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                            >
                                <IconPlayerSkipBackFilled size={16} />
                            </button>

                            <motion.button
                                className="flex h-11 w-11 items-center justify-center rounded-full text-white"
                                style={{
                                    background: `linear-gradient(135deg, ${colors.accent} 0%, ${colors.primary} 100%)`,
                                    boxShadow: `0 4px 15px ${colors.accent}50`,
                                }}
                                whileTap={{ scale: 0.95 }}
                                onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                            >
                                {isPlaying ? <IconPlayerPauseFilled size={18} /> : <IconPlayerPlayFilled size={18} />}
                            </motion.button>

                            <button
                                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/70"
                                onClick={(e) => { e.stopPropagation(); handleNext(); }}
                            >
                                <IconPlayerSkipForwardFilled size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Sound bars */}
                    {isPlaying && (
                        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex items-end justify-center gap-0.5 h-3 opacity-40">
                            {[...Array(12)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    className="w-0.5 rounded-full"
                                    style={{ background: colors.accent }}
                                    animate={{ height: [2, 6 + Math.random() * 4, 2] }}
                                    transition={{ duration: 0.3 + Math.random() * 0.2, repeat: Infinity, delay: i * 0.04 }}
                                />
                            ))}
                        </div>
                    )}
                </motion.div>
            </motion.div>
        </>
    );
}
