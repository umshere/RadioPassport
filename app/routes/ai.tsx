import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  IconChevronLeft,
  IconChevronRight,
  IconPlayerPlay,
  IconPlayerPause,
  IconPlayerSkipBack,
  IconPlayerSkipForward,
  IconRefresh,
  IconSparkles,
  IconHeart,
  IconHeartFilled,
  IconWaveSine,
  IconSearch,
  IconSettings,
  IconBell,
  IconWorld,
} from "@tabler/icons-react";

import { loadWorldDescriptor, loadWorldDescriptorPreview } from "~/services/aiOrchestrator";
import { sceneManager } from "~/services/sceneManager";
import { useRadioPlayer } from "~/hooks/useRadioPlayer";
import { useListeningMode } from "~/hooks/useListeningMode";
import { useSceneDescriptor } from "~/hooks/useSceneDescriptor";
import type { SceneDescriptor } from "~/scenes/types";
import type { Station } from "~/types/radio";

export const loader = async (_args: LoaderFunctionArgs) => {
  return json({ ok: true });
};

type RecentMix = {
  id: string;
  mood: string;
  reason: string;
  stations: SceneDescriptor["stations"];
  country?: string | null;
  language?: string | null;
};

// Generate a vibrant gradient for fallback backgrounds
function generateGradient(seed: string, variant: "warm" | "cool" | "purple" = "purple"): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const palettes = {
    warm: [[350, 30], [20, 45], [330, 15]],
    cool: [[200, 220], [180, 210], [220, 250]],
    purple: [[280, 320], [260, 300], [300, 340]],
  };
  const palette = palettes[variant];
  const ranges = palette[Math.abs(hash) % palette.length] ?? [280, 320];
  const h1Range = ranges[0] ?? 280;
  const h2Range = ranges[1] ?? 320;
  const h1 = h1Range + (Math.abs(hash) % 40);
  const h2 = h2Range + (Math.abs(hash >> 4) % 40);
  return `linear-gradient(135deg, hsl(${h1}, 70%, 55%) 0%, hsl(${h2}, 80%, 45%) 100%)`;
}

// Get initials for fallback
function getInitials(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length >= 2 && words[0]?.[0] && words[1]?.[0]) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

// Featured Station Card
function FeaturedCard({
  station,
  isActive,
  onPlay,
  label,
}: {
  station: Station;
  isActive?: boolean;
  onPlay: () => void;
  label?: string;
}) {
  const gradient = useMemo(() => generateGradient(station.name, "cool"), [station.name]);
  const [imgFailed, setImgFailed] = useState(false);
  const initials = useMemo(() => getInitials(station.name), [station.name]);

  return (
    <motion.div
      className="flex-shrink-0 w-32 md:w-40 cursor-pointer group"
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onPlay}
    >
      <div className="relative aspect-square rounded-2xl overflow-hidden shadow-lg mb-3 bg-gray-100">
        {station.favicon && !imgFailed ? (
          <img
            src={station.favicon}
            alt=""
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-3xl font-black text-white"
            style={{ background: gradient }}
          >
            {initials}
          </div>
        )}
        {label && (
          <div className="absolute top-2 left-2 px-2 py-0.5 bg-orange-500 text-white text-[10px] font-bold uppercase rounded">
            {label}
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
          <div className="w-12 h-12 rounded-full bg-white shadow-xl flex items-center justify-center transform scale-75 group-hover:scale-100 transition-transform">
            <IconPlayerPlay size={24} className="text-gray-900 ml-1" fill="currentColor" />
          </div>
        </div>
        {isActive && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-green-500 text-white rounded-full px-2 py-0.5 text-[10px] font-bold">
            <IconWaveSine size={10} />
            LIVE
          </div>
        )}
      </div>
      <h3 className="font-semibold text-gray-900 text-sm truncate">{station.name}</h3>
      <p className="text-xs text-gray-500 truncate">{station.country}</p>
    </motion.div>
  );
}

export default function AiExperience() {
  useLoaderData<typeof loader>();
  const player = useRadioPlayer();
  const mode = useListeningMode();
  const descriptor = useSceneDescriptor();
  const [searchTerm, setSearchTerm] = useState("");

  const [isCurating, setIsCurating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prefetchedDescriptors, setPrefetchedDescriptors] = useState<Record<string, SceneDescriptor>>({});
  const [recentMixes, setRecentMixes] = useState<RecentMix[]>([]);
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [likedStations, setLikedStations] = useState<Set<string>>(new Set());
  const hydratedFromCache = useRef(false);

  const moodSuggestions = useMemo(
    () => ["sunrise drive", "festival energy", "night city jazz", "balcony chill", "desert dusk", "late night radio"],
    []
  );

  const currentStation = player.nowPlaying ?? descriptor?.stations?.[0];

  const heroGradient = useMemo(() =>
    currentStation
      ? generateGradient(currentStation.name, "cool")
      : "linear-gradient(135deg, #0ea5e9 0%, #6366f1 50%, #8b5cf6 100%)",
    [currentStation]
  );

  useEffect(() => {
    setHeroImgFailed(false);
  }, [currentStation?.uuid]);

  const toggleLike = useCallback((stationId: string) => {
    setLikedStations(prev => {
      const next = new Set(prev);
      if (next.has(stationId)) next.delete(stationId);
      else next.add(stationId);
      return next;
    });
  }, []);

  const addRecent = useCallback((mix: RecentMix) => {
    setRecentMixes((prev) => {
      const existing = prev.filter((item) => item.id !== mix.id);
      return [mix, ...existing].slice(0, 8);
    });
  }, []);

  const runWorldMix = useCallback(
    async (mood?: string) => {
      if (isCurating) return;
      setIsCurating(true);
      setError(null);
      try {
        const desc = await loadWorldDescriptor({
          mood,
          visual: "card_stack",
          sceneId: "card_stack",
          currentStationId: player.nowPlaying?.uuid ?? null,
          country: player.nowPlaying?.country ?? null,
          language: player.nowPlaying?.language ?? null,
          preferredCountries: player.nowPlaying?.country ? [player.nowPlaying.country] : [],
          preferredLanguages: player.nowPlaying?.language ? [player.nowPlaying.language] : [],
          onStartStation: (station, { autoPlay }) => {
            player.startStation(station, { autoPlay });
          },
        });
        addRecent({
          id: `${desc.mood ?? "mix"}-${Date.now()}`,
          mood: desc.mood ?? "World mix",
          reason: desc.reason ?? "AI curated set",
          stations: desc.stations ?? [],
          country: desc.stations?.[0]?.country,
          language: desc.stations?.[0]?.language,
        });
      } catch (err) {
        console.error("Failed to curate world mix", err);
        setError(err instanceof Error ? err.message : "Could not curate. Try again.");
      } finally {
        setIsCurating(false);
      }
    },
    [addRecent, isCurating, player]
  );

  const handlePlayStation = useCallback(
    (station: Station) => {
      if (!station) return;
      player.startStation(station, { autoPlay: true });
    },
    [player]
  );

  const handleRefresh = useCallback(
    (mood?: string) => {
      if (mood && prefetchedDescriptors[mood]) {
        const cached = prefetchedDescriptors[mood];
        sceneManager.setDescriptor(cached);
        const first = cached.stations?.[0];
        if (first) player.startStation(first, { autoPlay: true });
        addRecent({
          id: `${cached.mood ?? mood}-${Date.now()}`,
          mood: cached.mood ?? mood ?? "World mix",
          reason: cached.reason ?? "AI curated set",
          stations: cached.stations ?? [],
          country: cached.stations?.[0]?.country,
          language: cached.stations?.[0]?.language,
        });
        runWorldMix(mood);
        return;
      }
      runWorldMix(mood);
    },
    [addRecent, prefetchedDescriptors, player, runWorldMix]
  );

  const playNextStation = useCallback(() => {
    const stations = descriptor?.stations ?? [];
    if (stations.length === 0) return;
    const currentIdx = stations.findIndex(s => s.uuid === player.nowPlaying?.uuid);
    const nextIdx = (currentIdx + 1) % stations.length;
    const nextStation = stations[nextIdx];
    if (nextStation) player.startStation(nextStation, { autoPlay: true });
  }, [descriptor?.stations, player]);

  const playPrevStation = useCallback(() => {
    const stations = descriptor?.stations ?? [];
    if (stations.length === 0) return;
    const currentIdx = stations.findIndex(s => s.uuid === player.nowPlaying?.uuid);
    const prevIdx = (currentIdx - 1 + stations.length) % stations.length;
    const prevStation = stations[prevIdx];
    if (prevStation) player.startStation(prevStation, { autoPlay: true });
  }, [descriptor?.stations, player]);

  useEffect(() => {
    if (typeof window === "undefined" || hydratedFromCache.current) return;
    hydratedFromCache.current = true;
    try {
      const rawPrefetch = localStorage.getItem("ai_prefetch_cache");
      if (rawPrefetch) {
        const cachedPrefetch = JSON.parse(rawPrefetch) as Record<string, SceneDescriptor>;
        setPrefetchedDescriptors(cachedPrefetch);
      }
    } catch (err) {
      console.warn("Failed to read prefetched descriptors cache", err);
    }
    try {
      const rawDescriptor = localStorage.getItem("ai_last_descriptor");
      if (rawDescriptor) {
        const cachedDescriptor = JSON.parse(rawDescriptor) as SceneDescriptor;
        if (cachedDescriptor?.stations?.length) {
          sceneManager.setDescriptor(cachedDescriptor);
        }
      }
    } catch (err) {
      console.warn("Failed to read last descriptor cache", err);
    }
  }, []);

  useEffect(() => {
    mode.setListeningMode("world");
    runWorldMix();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const moodsToPrefetch = moodSuggestions.slice(0, 4);
    moodsToPrefetch.forEach(async (mood) => {
      if (prefetchedDescriptors[mood]) return;
      try {
        const desc = await loadWorldDescriptorPreview({
          mood,
          visual: "card_stack",
          sceneId: "card_stack",
          currentStationId: player.nowPlaying?.uuid ?? null,
          country: player.nowPlaying?.country ?? null,
          language: player.nowPlaying?.language ?? null,
          preferredCountries: player.nowPlaying?.country ? [player.nowPlaying.country] : [],
          preferredLanguages: player.nowPlaying?.language ? [player.nowPlaying.language] : [],
        });
        setPrefetchedDescriptors((prev) => ({ ...prev, [mood]: desc }));
      } catch (err) {
        console.error("Prefetch failed", err);
      }
    });
  }, [moodSuggestions, player.nowPlaying, prefetchedDescriptors]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem("ai_prefetch_cache", JSON.stringify(prefetchedDescriptors));
    } catch (err) {
      console.warn("Failed to persist prefetched descriptors", err);
    }
  }, [prefetchedDescriptors]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!descriptor?.stations?.length) return;
    try {
      localStorage.setItem("ai_last_descriptor", JSON.stringify(descriptor));
    } catch (err) {
      console.warn("Failed to persist last descriptor", err);
    }
  }, [descriptor]);

  const heroMood = typeof descriptor?.mood === "string" && descriptor.mood.trim()
    ? descriptor.mood
    : "World Mix";

  const heroReason = typeof descriptor?.reason === "string" && descriptor.reason.trim()
    ? descriptor.reason
    : "AI is curating your perfect global radio journey...";

  const filteredStations = useMemo(() => {
    const base = descriptor?.stations ?? [];
    const q = searchTerm.trim().toLowerCase();
    if (!q) return base;
    return base.filter((s) => [s.name, s.country, s.language].some((field) => field?.toLowerCase().includes(q)));
  }, [descriptor?.stations, searchTerm]);
  const isLoading = isCurating || !(descriptor?.stations?.length);

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{
        backgroundColor: "#d8e3f2",
        backgroundImage: "url('/RPhero.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="absolute inset-0 bg-white/85 backdrop-blur-sm -z-10" />
      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 py-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100 transition">
              <IconWorld size={18} />
              Back to Classic
            </Link>
          </div>
          <div className="flex-1 w-full max-w-xl md:max-w-2xl">
            <div className="flex items-center gap-2 bg-white rounded-full px-4 py-2.5 shadow-sm border border-gray-200">
              <IconSearch size={18} className="text-gray-400" />
              <input
                type="text"
                placeholder="Search stations, moods..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent text-sm text-gray-900 placeholder:text-gray-400 outline-none flex-1"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="text-xs font-semibold text-gray-500 hover:text-gray-700"
                >
                  Clear
                </button>
              )}
            </div>
            {searchTerm && (
              <p className="text-xs text-gray-500 mt-1">
                {filteredStations.length} match{filteredStations.length === 1 ? "" : "es"} found
              </p>
            )}
          </div>
        </div>

        {/* Hero Banner - Full Width with Large Image */}
        <section className="relative rounded-3xl overflow-hidden mb-8" style={{ height: "380px" }}>
          {/* Background Image */}
          <div className="absolute inset-0">
            {currentStation?.favicon && !heroImgFailed ? (
              <motion.img
                key={currentStation.uuid}
                src={currentStation.favicon}
                alt=""
                className="w-full h-full object-cover"
                initial={{ opacity: 0, scale: 1.1 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8 }}
                onError={() => setHeroImgFailed(true)}
              />
            ) : (
              <div className="w-full h-full" style={{ background: heroGradient }} />
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-black/20" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          </div>

          {/* Navigation arrows */}
          <button className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20 transition border border-white/20">
            <IconChevronLeft size={28} />
          </button>
          <button className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20 transition border border-white/20">
            <IconChevronRight size={28} />
          </button>

          {/* Content overlay */}
          <div className="relative h-full flex flex-col justify-end p-6 md:p-10">
            {isLoading ? (
              <div className="space-y-4 animate-pulse">
                <div className="absolute top-6 right-6 text-right space-y-2">
                  <div className="h-3 w-16 bg-white/20 rounded-full" />
                  <div className="h-8 w-24 bg-white/25 rounded-lg" />
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-7 w-40 bg-white/25 rounded-full" />
                  <div className="h-7 w-16 bg-white/20 rounded-full" />
                </div>
                <div className="h-12 md:h-16 w-64 bg-white/30 rounded-lg" />
                <div className="h-5 w-40 bg-white/25 rounded" />
                <div className="h-4 w-72 max-w-sm bg-white/20 rounded" />
                <div className="flex items-center gap-3 pt-2">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <div
                      key={idx}
                      className={`rounded-full ${idx === 2 ? "w-16 h-16" : "w-12 h-12"} bg-white/15 border border-white/10`}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <>
                {/* Top right badge */}
                <div className="absolute top-6 right-6 text-right">
                  <p className="text-white/50 text-xs uppercase tracking-widest font-medium">Radio</p>
                  <p className="text-white text-4xl font-black drop-shadow-lg">TOP 10</p>
                </div>

                {/* Badges */}
                <div className="flex items-center gap-2 mb-4">
                  <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold uppercase px-3 py-1.5 rounded-full shadow-lg">
                    <IconSparkles size={14} />
                    AI Curator • {heroMood}
                  </span>
                  {player.isPlaying && (
                    <motion.span
                      className="inline-flex items-center gap-1 bg-green-500 text-white text-xs font-bold px-2.5 py-1.5 rounded-full"
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      <IconWaveSine size={12} />
                      LIVE
                    </motion.span>
                  )}
                </div>

                {/* Station Name - Large Typography */}
                <motion.h1
                  className="text-5xl md:text-7xl font-black text-white mb-2 drop-shadow-xl tracking-tight"
                  style={{ textShadow: "0 4px 30px rgba(0,0,0,0.5)" }}
                  key={currentStation?.uuid}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  {currentStation?.name ?? "Radio Passport"}
                </motion.h1>

                {/* Subtitle */}
                <p className="text-white/80 text-xl md:text-2xl font-medium mb-2">
                  {currentStation ? [currentStation.country, currentStation.language].filter(Boolean).join(" • ") : "Global Radio Discovery"}
                </p>

                {/* Description */}
                <p className="text-white/50 text-sm max-w-xl mb-6 line-clamp-1">
                  {heroReason}
                </p>

                {/* Controls */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => currentStation && toggleLike(currentStation.uuid)}
                    className="p-3 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white transition border border-white/10"
                  >
                    {currentStation && likedStations.has(currentStation.uuid)
                      ? <IconHeartFilled size={22} className="text-red-400" />
                      : <IconHeart size={22} />
                    }
                  </button>

                  <button onClick={playPrevStation} className="p-3 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white transition border border-white/10">
                    <IconPlayerSkipBack size={22} />
                  </button>

                  <motion.button
                    onClick={player.playPause}
                    className="p-5 rounded-full bg-white text-gray-900 shadow-2xl hover:scale-105 transition-transform"
                    whileTap={{ scale: 0.95 }}
                  >
                    {player.isPlaying
                      ? <IconPlayerPause size={28} fill="currentColor" />
                      : <IconPlayerPlay size={28} fill="currentColor" className="ml-1" />
                    }
                  </motion.button>

                  <button onClick={playNextStation} className="p-3 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white transition border border-white/10">
                    <IconPlayerSkipForward size={22} />
                  </button>

                  <button
                    onClick={() => handleRefresh()}
                    disabled={isCurating}
                    className="p-3 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white transition border border-white/10 disabled:opacity-50"
                  >
                    <IconRefresh size={22} className={isCurating ? "animate-spin" : ""} />
                  </button>
                </div>

                {error && (
                  <p className="mt-4 text-amber-300 text-sm bg-black/30 rounded-lg px-3 py-1 inline-block">{error}</p>
                )}
              </>
            )}
          </div>
        </section>

        {/* Featured This Week */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-2xl font-bold text-gray-900">Featured this week</h2>
            <button className="text-sm text-orange-600 hover:text-orange-700 font-semibold flex items-center gap-1">
              Show all <IconChevronRight size={16} />
            </button>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-300 -mx-4 px-4">
            {isLoading ? (
              Array.from({ length: 8 }).map((_, idx) => (
                <div key={idx} className="flex-shrink-0 w-32 md:w-40">
                  <div className="aspect-square rounded-2xl bg-gray-200/60 border border-white/40 animate-pulse shadow-inner" />
                  <div className="h-4 w-28 mt-3 bg-gray-200/80 rounded animate-pulse" />
                  <div className="h-3 w-20 mt-1 bg-gray-200/60 rounded animate-pulse" />
                </div>
              ))
            ) : (
              <>
                {(filteredStations ?? []).slice(0, 8).map((station, idx) => (
                  <FeaturedCard
                    key={station.uuid}
                    station={station}
                    isActive={station.uuid === player.nowPlaying?.uuid}
                    onPlay={() => handlePlayStation(station)}
                    label={idx === 0 ? "Featured" : idx === 1 ? "Podcast" : idx === 2 ? "Radio" : undefined}
                  />
                ))}
                {(filteredStations?.length ?? 0) === 0 && (
                  <div className="flex-1 py-16 text-center text-gray-400">
                    {isCurating ? "Curating your mix..." : "No stations yet"}
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        {/* Mood Grid */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-5">Explore Moods</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {moodSuggestions.map((mood, idx) => {
              const cached = prefetchedDescriptors[mood];
              const previewStation = cached?.stations?.[0];
              const gradients = [
                "from-rose-500 to-orange-500",
                "from-violet-500 to-purple-600",
                "from-cyan-500 to-blue-600",
                "from-emerald-500 to-teal-600",
                "from-amber-500 to-orange-600",
                "from-pink-500 to-rose-600",
              ];

              return (
                <motion.button
                  key={mood}
                  onClick={() => handleRefresh(mood)}
                  disabled={isCurating}
                  className="relative h-28 rounded-2xl overflow-hidden group disabled:opacity-50"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {previewStation?.favicon ? (
                    <img
                      src={previewStation.favicon}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-110"
                    />
                  ) : (
                    <div className={`absolute inset-0 bg-gradient-to-br ${gradients[idx % gradients.length]}`} />
                  )}
                  <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition" />
                  <div className="absolute inset-0 flex items-end p-4">
                    <p className="font-bold text-white text-base capitalize drop-shadow">{mood}</p>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                    <div className="w-10 h-10 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center">
                      <IconPlayerPlay size={20} className="text-white ml-0.5" fill="currentColor" />
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </section>

        {/* Recent Journeys */}
        {recentMixes.length > 0 && (
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-5">Recent Journeys</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {recentMixes.slice(0, 6).map((mix) => {
                const previewStation = mix.stations?.[0];
                return (
                  <motion.button
                    key={mix.id}
                    onClick={() => {
                      sceneManager.setDescriptor({
                        visual: "card_stack",
                        mood: mix.mood,
                        reason: mix.reason,
                        stations: mix.stations ?? [],
                        play: { strategy: "autoplay_first" },
                      });
                      const first = mix.stations?.[0];
                      if (first) player.startStation(first, { autoPlay: true });
                    }}
                    className="group text-left"
                    whileHover={{ y: -4 }}
                  >
                    <div className="aspect-square rounded-2xl overflow-hidden mb-2 bg-gray-100 relative shadow">
                      {previewStation?.favicon ? (
                        <img src={previewStation.favicon} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div
                          className="w-full h-full flex items-center justify-center text-2xl font-bold text-white"
                          style={{ background: generateGradient(mix.mood, "purple") }}
                        >
                          {getInitials(mix.mood)}
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-lg">
                          <IconPlayerPlay size={18} fill="currentColor" className="text-gray-900 ml-0.5" />
                        </div>
                      </div>
                    </div>
                    <p className="font-semibold text-gray-900 text-sm capitalize truncate">{mix.mood}</p>
                    <p className="text-xs text-gray-500">{mix.stations?.length ?? 0} stations</p>
                  </motion.button>
                );
              })}
            </div>
          </section>
        )}
      </main>

      {/* Mobile Bottom Player */}
      {currentStation && (
        <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white border-t border-gray-200 shadow-xl">
          <div className="flex items-center gap-3 p-3">
            <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 shadow">
              {currentStation.favicon && !heroImgFailed ? (
                <img src={currentStation.favicon} alt="" className="w-full h-full object-cover" />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center text-sm font-bold text-white"
                  style={{ background: heroGradient }}
                >
                  {getInitials(currentStation.name)}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-sm truncate">{currentStation.name}</p>
              <p className="text-xs text-gray-500 truncate">{currentStation.country}</p>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={playPrevStation} className="p-2 text-gray-400">
                <IconPlayerSkipBack size={20} />
              </button>
              <button
                onClick={player.playPause}
                className="p-2.5 bg-orange-500 rounded-full text-white shadow"
              >
                {player.isPlaying
                  ? <IconPlayerPause size={18} fill="currentColor" />
                  : <IconPlayerPlay size={18} fill="currentColor" className="ml-0.5" />
                }
              </button>
              <button onClick={playNextStation} className="p-2 text-gray-400">
                <IconPlayerSkipForward size={20} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom padding for mobile */}
      <div className="h-20 md:h-0" />
    </div>
  );
}
