import { useMemo, useCallback, useState } from "react";
import { ActionIcon, Paper, Text, Tooltip } from "@mantine/core";
import { motion, AnimatePresence } from "framer-motion";
import RetroTuner from "./RetroTuner";
import {
  IconPlayerPauseFilled,
  IconPlayerPlayFilled,
  IconPlayerSkipBackFilled,
  IconPlayerSkipForwardFilled,
  IconMapPin,
} from "@tabler/icons-react";
import { usePlayerStore } from "~/state/playerStore";
import { useUIStore } from "~/state/uiStore";
import { neomorphicButtonSmall, neomorphicButtonPrimary } from "~/utils/buttonStyles";

export default function PlayerDock() {
  const {
    nowPlaying,
    isPlaying,
    togglePlay,
    queue,
    currentStationIndex,
    startStation
  } = usePlayerStore();

  const { toggleQuickRetune } = useUIStore();
  const { raptorMiniEnabled } = useUIStore();

  const title = useMemo(() => nowPlaying?.name ?? "", [nowPlaying?.name]);
  const subtitle = useMemo(
    () => [nowPlaying?.country, nowPlaying?.state].filter(Boolean).join(" • "),
    [nowPlaying?.country, nowPlaying?.state]
  );

  const frequency = useMemo(() => {
    if (!nowPlaying) return "0.0";
    let hash = 0;
    for (let i = 0; i < nowPlaying.uuid.length; i++) {
      hash = nowPlaying.uuid.charCodeAt(i) + ((hash << 5) - hash);
    }
    const range = 108.0 - 88.0;
    const normalized = Math.abs(hash % 1000) / 1000;
    return (88.0 + normalized * range).toFixed(1);
  }, [nowPlaying?.uuid]);

  const frequencyPercent = useMemo(() => {
    const freqNum = parseFloat(frequency);
    return ((freqNum - 88.0) / 20.0) * 100;
  }, [frequency]);

  const ticks = useMemo(() => {
    const freqNum = parseFloat(frequency);
    const tickStart = 88;
    const tickEnd = 108;
    const tickCount = 21;
    return Array.from({ length: tickCount }, (_, i) => ({
      value: tickStart + i,
      isNear: Math.abs((tickStart + i) - freqNum) < 2,
    }));
  }, [frequency]);

  const handleNext = useCallback(() => {
    if (queue.length === 0) return;

    // Calculate next index with proper wrapping
    const nextIndex = (currentStationIndex + 1) % queue.length;
    const nextStation = queue[nextIndex];

    if (nextStation) {
      // Update the index in the store before starting the station
      startStation(nextStation, { preserveQueue: true });
    }
  }, [queue, currentStationIndex, startStation]);

  const handlePrev = useCallback(() => {
    if (queue.length === 0) return;

    // Calculate previous index with proper wrapping
    const prevIndex = (currentStationIndex - 1 + queue.length) % queue.length;
    const prevStation = queue[prevIndex];

    if (prevStation) {
      // Update the index in the store before starting the station
      startStation(prevStation, { preserveQueue: true });
    }
  }, [queue, currentStationIndex, startStation]);

  const handleRetune = useCallback(() => {
    if (queue.length === 0) return;
    // Pick a random station different from current
    let randomIndex = Math.floor(Math.random() * queue.length);
    if (queue.length > 1 && randomIndex === currentStationIndex) {
      randomIndex = (randomIndex + 1) % queue.length;
    }
    const randomStation = queue[randomIndex];
    if (randomStation) {
      startStation(randomStation, { preserveQueue: true });
    }
  }, [queue, currentStationIndex, startStation]);

  const [isExpanded, setIsExpanded] = useState(false);

  if (!nowPlaying) return null;

  // Desktop dock (float bottom-right to avoid covering hero CTAs)
  return (
    <>
      <AnimatePresence>
        {isExpanded && (
          <RetroTuner
            station={nowPlaying}
            isPlaying={isPlaying}
            onPlayPause={togglePlay}
            onNext={handleNext}
            onPrev={handlePrev}
            onClose={() => setIsExpanded(false)}
          />
        )}
      </AnimatePresence>

      <aside className="pointer-events-none fixed bottom-6 left-1/2 -translate-x-1/2 z-30 hidden w-full max-w-3xl px-4 lg:block">
        <motion.div
          className="pointer-events-auto rounded-3xl overflow-hidden transition-transform hover:-translate-y-1 relative"
          onClick={() => setIsExpanded(true)}
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.9) 50%, rgba(255,248,240,0.95) 100%)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.8), inset 0 1px 0 rgba(255,255,255,0.9)',
          }}
        >
          {/* Animated golden shimmer overlay */}
          <motion.div
            className="absolute inset-0 pointer-events-none opacity-30"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,200,100,0.4) 50%, transparent 100%)',
            }}
            animate={{
              x: ['-100%', '200%'],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              repeatDelay: 2,
              ease: 'easeInOut',
            }}
          />

          {/* Floating sparkles when playing */}
          {isPlaying && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 rounded-full"
                  style={{
                    background: 'radial-gradient(circle, rgba(255,180,50,0.9) 0%, transparent 70%)',
                    left: `${15 + i * 15}%`,
                    boxShadow: '0 0 6px 2px rgba(255,180,50,0.4)',
                  }}
                  animate={{
                    y: [60, -20],
                    opacity: [0, 1, 0],
                    scale: [0.5, 1.2, 0.8],
                  }}
                  transition={{
                    duration: 2 + i * 0.3,
                    delay: i * 0.4,
                    repeat: Infinity,
                    ease: 'easeOut',
                  }}
                />
              ))}
            </div>
          )}

          {/* Progress Bar - Vibrant gradient */}
          <div className="relative h-1.5 w-full bg-gradient-to-r from-amber-100 via-orange-100 to-amber-100">
            {isPlaying && (
              <motion.div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400"
                style={{
                  boxShadow: '0 0 12px rgba(251,146,60,0.5)',
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
            {/* Artwork with glow effect */}
            <div className="h-14 w-14 rounded-xl overflow-hidden flex-shrink-0 relative group"
              style={{
                boxShadow: isPlaying ? '0 4px 20px rgba(251,146,60,0.3), 0 0 0 2px rgba(255,255,255,0.8)' : '0 4px 12px rgba(0,0,0,0.1), 0 0 0 2px rgba(255,255,255,0.8)',
              }}
            >
              {nowPlaying.favicon ? (
                <img src={nowPlaying.favicon} alt="artwork" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center text-amber-600 font-mono font-bold text-lg">FM</div>
              )}
              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-amber-500/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-2">
                <IconMapPin size={14} className="text-white drop-shadow" />
              </div>
            </div>

            {/* Station Info & Tuner */}
            <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5">
              <div className="flex items-baseline gap-3">
                <Text size="sm" fw={700} className="truncate text-slate-800">
                  {title}
                </Text>
                <Text size="xs" className="truncate text-slate-500 font-medium">
                  {subtitle}
                </Text>
              </div>

              {/* Minimal Tuner Scale - warm colors */}
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs font-bold text-amber-600 tabular-nums tracking-wider">{frequency} MHz</span>
                <div className="h-1.5 flex-1 bg-gradient-to-r from-amber-100 to-orange-100 rounded-full overflow-hidden relative">
                  <motion.div
                    className="absolute top-0 bottom-0 w-3 rounded-full bg-gradient-to-r from-amber-400 to-orange-500"
                    style={{
                      left: `${frequencyPercent}%`,
                      transform: 'translateX(-50%)',
                      boxShadow: '0 0 8px rgba(251,146,60,0.6)',
                    }}
                    animate={isPlaying ? { scale: [1, 1.2, 1] } : {}}
                    transition={{ duration: 0.5, repeat: Infinity }}
                  />
                  {/* Subtle ticks */}
                  <div className="absolute inset-0 flex justify-between px-1">
                    {[0, 25, 50, 75, 100].map(p => (
                      <div key={p} className="w-px h-full bg-amber-200/50" />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Controls - Vibrant style */}
            <div className="flex items-center gap-2">
              <Tooltip label="Quick Retune" position="top" withArrow>
                <button
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-100 to-purple-100 text-violet-600 hover:from-violet-200 hover:to-purple-200 transition-all active:scale-95 shadow-md"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleQuickRetune();
                  }}
                  aria-label="Quick Retune"
                >
                  <IconMapPin size={18} />
                </button>
              </Tooltip>

              <div className="h-8 w-px bg-slate-200 mx-1" />

              <Tooltip label="Previous" position="top" withArrow>
                <button
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800 transition-all active:scale-95 shadow-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrev();
                  }}
                  aria-label="Previous"
                >
                  <IconPlayerSkipBackFilled size={18} />
                </button>
              </Tooltip>

              <Tooltip label={isPlaying ? "Pause" : "Play"} position="top" withArrow>
                <motion.button
                  className="flex h-14 w-14 items-center justify-center rounded-full text-white transition-all"
                  style={{
                    background: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 50%, #dc2626 100%)',
                    boxShadow: '0 8px 25px -5px rgba(251,146,60,0.5), 0 0 0 3px rgba(255,255,255,0.9)',
                  }}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.95 }}
                  animate={isPlaying ? { boxShadow: ['0 8px 25px -5px rgba(251,146,60,0.5)', '0 8px 35px -5px rgba(251,146,60,0.8)', '0 8px 25px -5px rgba(251,146,60,0.5)'] } : {}}
                  transition={isPlaying ? { duration: 1.5, repeat: Infinity } : {}}
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePlay();
                  }}
                  aria-label={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? <IconPlayerPauseFilled size={24} /> : <IconPlayerPlayFilled size={24} className="ml-0.5" />}
                </motion.button>
              </Tooltip>

              <Tooltip label="Next" position="top" withArrow>
                <button
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800 transition-all active:scale-95 shadow-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNext();
                  }}
                  aria-label="Next"
                >
                  <IconPlayerSkipForwardFilled size={18} />
                </button>
              </Tooltip>
            </div>
          </div>
        </motion.div>
      </aside>

      {/* Mobile mini-player - Vibrant design */}
      <motion.div
        className="lg:hidden fixed left-0 right-0 z-40 px-3"
        style={{
          bottom: "calc(env(safe-area-inset-bottom) + 12px)"
        }}
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      >
        <motion.div
          data-raptor={raptorMiniEnabled ? "true" : "false"}
          onClick={() => setIsExpanded(true)}
          className={`rounded-2xl overflow-hidden active:scale-[0.98] transition-transform cursor-pointer relative ${raptorMiniEnabled ? 'py-2 px-3' : 'py-3 px-3'}`}
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,250,245,0.95) 100%)',
            boxShadow: '0 10px 40px -10px rgba(251,146,60,0.3), 0 0 0 1px rgba(255,255,255,0.9), inset 0 1px 0 rgba(255,255,255,1)',
          }}
        >
          {/* Animated shimmer */}
          {isPlaying && (
            <motion.div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(255,200,100,0.3) 50%, transparent 100%)',
              }}
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 1.5 }}
            />
          )}

          {/* Progress bar at top */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-amber-100/50 overflow-hidden rounded-t-2xl">
            {isPlaying && (
              <motion.div
                className="h-full bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 30, ease: "linear", repeat: Infinity }}
              />
            )}
          </div>

          <div className="flex items-center gap-3 relative z-10">
            <motion.div
              className={`${raptorMiniEnabled ? 'h-10 w-10' : 'h-12 w-12'} rounded-xl overflow-hidden flex items-center justify-center text-sm flex-shrink-0 font-bold`}
              style={{
                background: nowPlaying.favicon ? 'transparent' : 'linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%)',
                color: '#d97706',
                boxShadow: isPlaying ? '0 4px 15px rgba(251,146,60,0.4)' : '0 2px 8px rgba(0,0,0,0.1)',
                border: '2px solid rgba(255,255,255,0.8)',
              }}
              animate={isPlaying ? { scale: [1, 1.05, 1] } : {}}
              transition={{ duration: 1, repeat: Infinity }}
            >
              {nowPlaying.favicon ? (
                <img src={nowPlaying.favicon} alt="artwork" className="w-full h-full object-cover" />
              ) : (
                "FM"
              )}
            </motion.div>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-bold text-slate-800 truncate leading-tight">{title}</div>
              <div className="text-[11px] text-amber-600/80 truncate leading-tight mt-0.5 font-medium">{subtitle}</div>
            </div>

            {/* Mobile Controls - Vibrant */}
            <div className="flex items-center gap-1.5">
              {/* Quick Retune */}
              <button
                className="flex h-9 w-9 items-center justify-center rounded-xl text-violet-600 transition-all active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, #ede9fe 0%, #e0e7ff 100%)',
                  boxShadow: '0 2px 8px rgba(139,92,246,0.2)',
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleQuickRetune();
                }}
                aria-label="Quick Retune"
              >
                <IconMapPin size={16} />
              </button>

              {/* Prev */}
              <button
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 active:scale-95 transition-all shadow-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrev();
                }}
                aria-label="Previous"
              >
                <IconPlayerSkipBackFilled size={16} />
              </button>

              {/* Play/Pause - Vibrant orange */}
              <motion.button
                className="flex h-11 w-11 items-center justify-center rounded-xl text-white active:scale-95 transition-transform"
                style={{
                  background: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
                  boxShadow: '0 4px 15px rgba(251,146,60,0.4)',
                }}
                whileTap={{ scale: 0.95 }}
                animate={isPlaying ? { boxShadow: ['0 4px 15px rgba(251,146,60,0.4)', '0 4px 25px rgba(251,146,60,0.6)', '0 4px 15px rgba(251,146,60,0.4)'] } : {}}
                transition={isPlaying ? { duration: 1.2, repeat: Infinity } : {}}
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlay();
                }}
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? <IconPlayerPauseFilled size={18} /> : <IconPlayerPlayFilled size={18} />}
              </motion.button>

              {/* Next */}
              <button
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 active:scale-95 transition-all shadow-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNext();
                }}
                aria-label="Next"
              >
                <IconPlayerSkipForwardFilled size={16} />
              </button>
            </div>
          </div>

          {/* Mobile Tuner Display - Vibrant warm colors */}
          <div className="mt-2"
            style={{
              position: "relative",
              width: "100%",
              height: "28px",
              background: "linear-gradient(90deg, rgba(254,243,199,0.5) 0%, rgba(254,215,170,0.5) 100%)",
              borderRadius: "8px",
              padding: "0 8px",
              display: "flex",
              alignItems: "center",
            }}
          >
            {/* Simplified tick marks for mobile */}
            <div
              style={{
                position: "absolute",
                inset: "0 8px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              {ticks.filter((_, i) => i % 5 === 0).map((tick, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "2px",
                    opacity: tick.isNear ? 1 : 0.25,
                    transition: "opacity 0.3s ease",
                  }}
                >
                  <div
                    style={{
                      width: "1.5px",
                      height: "12px",
                      background: "#64748b",
                      borderRadius: "999px",
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Red needle indicator */}
            <div
              style={{
                position: "absolute",
                left: `calc(${frequencyPercent}% + 8px - 1.5px)`,
                top: "50%",
                transform: "translateY(-50%)",
                width: "2.5px",
                height: "18px",
                background: "#ef4444",
                borderRadius: "999px",
                zIndex: 10,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: `calc(${frequencyPercent}% + 8px - 4px)`,
                top: "50%",
                transform: "translateY(-50%)",
                width: "8px",
                height: "8px",
                background: "#ef4444",
                borderRadius: "50%",
                zIndex: 11,
              }}
            />

            {/* Frequency Display */}
            <div
              style={{
                position: "absolute",
                right: "8px",
                top: "50%",
                transform: "translateY(-50%)",
                fontFamily: "monospace",
                fontSize: "0.85rem",
                fontWeight: "bold",
                color: "#92400e",
                zIndex: 12,
                display: "flex",
                alignItems: "baseline",
                gap: "2px",
              }}
            >
              <span>{frequency}</span>
              <span style={{ fontSize: "0.55rem", color: "#d97706" }}>MHz</span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </>
  );
}
