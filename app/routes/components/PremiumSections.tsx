import { motion } from "framer-motion";
import { useMemo } from "react";
import type { Station, Country } from "~/types/radio";
import { PremiumStationRow } from "./PremiumStationCard";
import { getGenrePalette } from "~/utils/colorExtraction";

// Mood/Genre categories with visual styling
const MOOD_CATEGORIES = [
    { id: 'chill', label: 'Chill & Ambient', emoji: '🌙', description: 'Relaxing vibes' },
    { id: 'jazz', label: 'Jazz & Blues', emoji: '🎺', description: 'Smooth classics' },
    { id: 'electronic', label: 'Electronic', emoji: '🎧', description: 'Beats & bass' },
    { id: 'world', label: 'World Music', emoji: '🌍', description: 'Global sounds' },
    { id: 'rock', label: 'Rock & Alternative', emoji: '🎸', description: 'Guitar driven' },
    { id: 'classical', label: 'Classical', emoji: '🎻', description: 'Timeless' },
    { id: 'pop', label: 'Pop & Hits', emoji: '💫', description: 'Chart toppers' },
    { id: 'hiphop', label: 'Hip-Hop & R&B', emoji: '🎤', description: 'Urban beats' },
] as const;

type MoodSelectorProps = {
    selectedMood?: string | null;
    onMoodSelect: (mood: string) => void;
};

export function MoodSelector({ selectedMood, onMoodSelect }: MoodSelectorProps) {
    return (
        <section className="py-6">
            <div className="px-4 md:px-0 mb-4">
                <h2 className="text-white font-bold text-xl md:text-2xl">Browse by Mood</h2>
                <p className="text-white/50 text-sm mt-0.5">Find stations that match your vibe</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4 px-4 md:px-0">
                {MOOD_CATEGORIES.map((mood, index) => {
                    const colors = getGenrePalette(mood.id);
                    const isSelected = selectedMood === mood.id;

                    return (
                        <motion.button
                            key={mood.id}
                            onClick={() => onMoodSelect(isSelected ? '' : mood.id)}
                            className="relative overflow-hidden rounded-2xl p-4 md:p-5 text-left group"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            whileHover={{ scale: 1.02, y: -4 }}
                            whileTap={{ scale: 0.98 }}
                            style={{
                                background: isSelected ? colors.gradient : 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)',
                                border: isSelected ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.1)',
                                boxShadow: isSelected ? `0 10px 30px -10px ${colors.accent}50` : '0 8px 25px -10px rgba(0,0,0,0.3)',
                            }}
                        >
                            {/* Gradient overlay on hover */}
                            <motion.div
                                className="absolute inset-0 pointer-events-none"
                                style={{ background: colors.gradient }}
                                initial={{ opacity: 0 }}
                                whileHover={{ opacity: 0.3 }}
                            />

                            <div className="relative z-10">
                                <span className="text-2xl md:text-3xl">{mood.emoji}</span>
                                <h3 className="text-white font-semibold text-sm md:text-base mt-2">{mood.label}</h3>
                                <p className="text-white/50 text-xs mt-0.5">{mood.description}</p>
                            </div>

                            {/* Selection indicator */}
                            {isSelected && (
                                <motion.div
                                    className="absolute top-2 right-2 w-3 h-3 rounded-full"
                                    style={{ background: colors.accent }}
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    layoutId="mood-selected"
                                />
                            )}
                        </motion.button>
                    );
                })}
            </div>
        </section>
    );
}

// Featured Countries Row
type FeaturedCountriesProps = {
    countries: Country[];
    onCountrySelect: (country: string) => void;
};

export function FeaturedCountries({ countries, onCountrySelect }: FeaturedCountriesProps) {
    const topCountries = useMemo(() => {
        return [...countries]
            .sort((a, b) => b.stationcount - a.stationcount)
            .slice(0, 12);
    }, [countries]);

    if (topCountries.length === 0) return null;

    // Country flag emojis (simplified)
    const getCountryEmoji = (name: string): string => {
        const flags: Record<string, string> = {
            'United States': '🇺🇸', 'Germany': '🇩🇪', 'France': '🇫🇷', 'United Kingdom': '🇬🇧',
            'Spain': '🇪🇸', 'Italy': '🇮🇹', 'Brazil': '🇧🇷', 'Japan': '🇯🇵',
            'Australia': '🇦🇺', 'Canada': '🇨🇦', 'Netherlands': '🇳🇱', 'India': '🇮🇳',
            'Russia': '🇷🇺', 'Mexico': '🇲🇽', 'Argentina': '🇦🇷', 'Poland': '🇵🇱',
        };
        return flags[name] || '🌍';
    };

    return (
        <section className="py-6">
            <div className="px-4 md:px-0 mb-4">
                <h2 className="text-white font-bold text-xl md:text-2xl">Explore by Country</h2>
                <p className="text-white/50 text-sm mt-0.5">Discover radio from around the world</p>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-4 px-4 md:px-0 scrollbar-hide snap-x">
                {topCountries.map((country, index) => (
                    <motion.button
                        key={country.name}
                        onClick={() => onCountrySelect(country.name)}
                        className="flex-shrink-0 snap-start group"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.04 }}
                        whileHover={{ y: -6 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <div
                            className="w-28 h-28 md:w-32 md:h-32 rounded-2xl overflow-hidden flex flex-col items-center justify-center gap-2 transition-shadow"
                            style={{
                                background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
                                backdropFilter: 'blur(10px)',
                                border: '1px solid rgba(255,255,255,0.15)',
                                boxShadow: '0 10px 30px -10px rgba(0,0,0,0.3)',
                            }}
                        >
                            <span className="text-4xl group-hover:scale-110 transition-transform">{getCountryEmoji(country.name)}</span>
                            <div className="text-center px-2">
                                <p className="text-white font-medium text-xs truncate w-full">{country.name}</p>
                                <p className="text-white/40 text-[10px]">{country.stationcount} stations</p>
                            </div>
                        </div>
                    </motion.button>
                ))}
            </div>
        </section>
    );
}

// AI Curated Section
type AICuratedSectionProps = {
    stations: Station[];
    nowPlaying: Station | null;
    isPlaying?: boolean;
    favoriteIds?: Set<string>;
    onPlayStation: (station: Station) => void;
    onToggleFavorite?: (station: Station) => void;
    onRefresh?: () => void;
};

export function AICuratedSection({
    stations,
    nowPlaying,
    isPlaying = false,
    favoriteIds,
    onPlayStation,
    onToggleFavorite,
    onRefresh,
}: AICuratedSectionProps) {
    if (stations.length === 0) return null;

    return (
        <section className="py-6">
            <div className="px-4 md:px-0 mb-4 flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="text-lg">✨</span>
                        <h2 className="text-white font-bold text-xl md:text-2xl">AI Curated For You</h2>
                    </div>
                    <p className="text-white/50 text-sm mt-0.5">Personalized picks based on your listening</p>
                </div>
                {onRefresh && (
                    <motion.button
                        onClick={onRefresh}
                        className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold text-white/70 hover:text-white transition-colors"
                        style={{
                            background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
                            border: '1px solid rgba(255,255,255,0.1)',
                        }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <span>🔄</span>
                        <span>Refresh</span>
                    </motion.button>
                )}
            </div>

            <PremiumStationRow
                title=""
                stations={stations}
                nowPlaying={nowPlaying}
                isPlaying={isPlaying}
                favoriteIds={favoriteIds}
                onPlayStation={onPlayStation}
                onToggleFavorite={onToggleFavorite}
            />
        </section>
    );
}

// Stats bar with glass effect
type StatsBarProps = {
    countries: number;
    stations: number;
    continents: number;
};

export function GlassStatsBar({ countries, stations, continents }: StatsBarProps) {
    const stats = [
        { value: countries, label: 'Countries' },
        { value: `${Math.floor(stations / 1000)}k+`, label: 'Stations' },
        { value: continents, label: 'Continents' },
    ];

    return (
        <motion.div
            className="mx-4 md:mx-0 rounded-2xl overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.1)',
            }}
        >
            <div className="grid grid-cols-3 divide-x divide-white/10">
                {stats.map((stat, index) => (
                    <motion.div
                        key={stat.label}
                        className="py-5 text-center"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 + index * 0.1 }}
                    >
                        <p className="text-white font-bold text-2xl md:text-3xl">
                            {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                        </p>
                        <p className="text-white/40 text-xs font-semibold uppercase tracking-widest mt-1">
                            {stat.label}
                        </p>
                    </motion.div>
                ))}
            </div>
        </motion.div>
    );
}
