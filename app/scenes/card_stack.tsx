import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, WheelEvent as ReactWheelEvent } from "react";
import { motion } from "framer-motion";
import { useSwipeable } from "react-swipeable";
import {
  IconAlertTriangle,
  IconPlayerPauseFilled,
  IconPlayerPlayFilled,
  IconPlayerTrackNext,
  IconPlayerTrackPrev,
  IconShieldCheck,
} from "@tabler/icons-react";

import type { SceneComponent } from "./types";
import type { Station } from "~/types/radio";
import { deriveStationHealth, getHealthBadgeStyle } from "~/utils/stationMeta";
import { usePlayerStore } from "~/state/playerStore";

const MOOD_BACKGROUNDS: Record<string, string> = {
  night: "linear-gradient(135deg, #f1f5f9, #e2e8f0)",
  sunrise: "linear-gradient(135deg, #fff1eb, #ace0f9)",
  lush: "linear-gradient(135deg, #f0f9ff, #cbebff)",
  ocean: "linear-gradient(135deg, #e0c3fc, #8ec5fc)",
};

const TAG_LIMIT = 2;
const CARD_STACK_LIMIT = 8;
const CARD_BASE_WIDTH = 440;
const CARD_BASE_HEIGHT = 320;
const CARD_STAGE_HEIGHT = CARD_BASE_HEIGHT + 160;
const CARD_WIDTH_STYLE = `min(${CARD_BASE_WIDTH}px, 90vw)`;
const CARD_HEIGHT_STYLE = `clamp(240px, 42vh, ${CARD_BASE_HEIGHT}px)`;
const SCENE_MIN_HEIGHT = "auto";
const DEFAULT_REASON = "The Passport sequenced stations that best fit this mood.";
const BASE_BACKGROUND = "transparent";
const FREQUENCY_BASE = 87.5;
const FREQUENCY_RANGE = 18.5;

const FAN_CONFIG = {
  spread: 28, // Tighter spread for better containment
  verticalLift: 0,
  rotation: 0,
  depthScale: 0.04,
  depthFade: 0.12,
  maxVisibleOffset: 3,
};

const MOBILE_FAN_CONFIG = {
  spread: 100, // Full width for mobile slider
  verticalLift: 0,
  rotation: 0,
  depthScale: 0,
  depthFade: 0,
  maxVisibleOffset: 0, // Show only active card on mobile
};

const CARD_CENTER_LEFT = 47;
const CARD_ACCENTS = [
  "linear-gradient(135deg, #1d2671, #c33764)",
  "linear-gradient(135deg, #09203f, #537895)",
  "linear-gradient(135deg, #0f2027, #203a43, #2c5364)",
  "linear-gradient(135deg, #42275a, #734b6d)",
  "linear-gradient(135deg, #283c86, #45a247)",
  "linear-gradient(135deg, #134e5e, #71b280)",
];

interface RetroTunerDisplayProps {
  station: Station | null;
  activeIndex: number;
  totalStations: number;
}

const RetroTunerDisplay = ({ station, activeIndex, totalStations }: RetroTunerDisplayProps) => {
  if (!station) return null;

  const frequency = useMemo(() => {
    // Generate frequency based on station index
    const range = 20.0; // 88-108 FM range
    const normalized = activeIndex / Math.max(totalStations - 1, 1);
    return (88.0 + normalized * range).toFixed(1);
  }, [activeIndex, totalStations]);

  const freqNum = parseFloat(frequency);
  const freqPercent = ((freqNum - 88.0) / 20.0) * 100;

  // Generate tick marks for the tuner (88-108 MHz)
  const tickStart = 88;
  const tickEnd = 108;
  const tickCount = 21; // One tick every MHz
  const ticks = Array.from({ length: tickCount }, (_, i) => tickStart + i);

  return (
    <div
      className="retro-tuner-display"
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: "1.5rem",
        padding: "1.5rem 2rem",
        borderRadius: "1.5rem",
        background: "#e0e5ec",
        border: "none",
        boxShadow: "inset 8px 8px 16px #b8b9be, inset -8px -8px 16px #ffffff",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Left Side: Station Info */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
          minWidth: 0,
          flex: 1,
        }}
      >
        <div
          style={{
            fontSize: "0.6rem",
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            color: "rgba(100,116,139,0.6)",
            fontWeight: 600,
          }}
        >
          Now Playing
        </div>
        <p
          style={{
            margin: 0,
            fontSize: "1.25rem",
            fontWeight: 700,
            color: "#0f172a",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {station.name}
        </p>
        <p
          style={{
            margin: 0,
            fontSize: "0.85rem",
            color: "rgba(71,85,105,0.8)",
          }}
        >
          {[station.country, station.state].filter(Boolean).join(" • ") || "Global"}
        </p>
      </div>

      {/* Center: Horizontal Tuner Slider */}
      <div
        style={{
          flex: 2,
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
          alignItems: "center",
          minWidth: "200px",
        }}
      >
        {/* Tuner Scale */}
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "60px",
            background: "rgba(203,213,225,0.3)",
            borderRadius: "12px",
            padding: "0 1rem",
            display: "flex",
            alignItems: "center",
            boxShadow: "inset 4px 4px 8px rgba(184,185,190,0.4), inset -4px -4px 8px rgba(255,255,255,0.5)",
          }}
        >
          {/* Tick marks */}
          <div
            style={{
              position: "absolute",
              inset: "0 1rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            {ticks.map((tick, i) => {
              const isMajor = tick % 5 === 0;
              const isNearCurrent = Math.abs(tick - freqNum) < 2;
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "4px",
                    opacity: isNearCurrent ? 1 : 0.3,
                    transition: "opacity 0.3s ease",
                  }}
                >
                  <div
                    style={{
                      width: "2px",
                      height: isMajor ? "20px" : "12px",
                      background: "#64748b",
                      borderRadius: "999px",
                    }}
                  />
                  {isMajor && (
                    <span
                      style={{
                        fontSize: "0.65rem",
                        fontWeight: 600,
                        color: "#64748b",
                      }}
                    >
                      {tick}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Red needle indicator */}
          <div
            style={{
              position: "absolute",
              left: `calc(${freqPercent}% + 1rem - 2px)`,
              top: "50%",
              transform: "translateY(-50%)",
              width: "4px",
              height: "40px",
              background: "#ef4444",
              borderRadius: "999px",
              boxShadow: "0 0 12px rgba(239,68,68,0.6), 0 0 24px rgba(239,68,68,0.3)",
              zIndex: 10,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: `calc(${freqPercent}% + 1rem - 8px)`,
              top: "50%",
              transform: "translateY(-50%)",
              width: "16px",
              height: "16px",
              background: "#ef4444",
              borderRadius: "50%",
              boxShadow: "0 0 8px rgba(239,68,68,0.5)",
              zIndex: 11,
            }}
          />
        </div>

        {/* Station Counter */}
        <div
          style={{
            fontSize: "0.6rem",
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            color: "rgba(100,116,139,0.6)",
            fontWeight: 600,
          }}
        >
          Station {activeIndex + 1} of {totalStations}
        </div>
      </div>

      {/* Right Side: Large Frequency Display */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: "0.25rem",
        }}
      >
        <div
          style={{
            fontFamily: "monospace",
            fontSize: "4rem",
            fontWeight: 700,
            letterSpacing: "-0.04em",
            color: "#0f172a",
            lineHeight: 0.9,
          }}
        >
          {frequency}
        </div>
        <div
          style={{
            fontSize: "0.75rem",
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            color: "rgba(100,116,139,0.7)",
            fontWeight: 600,
          }}
        >
          MHz
        </div>
      </div>
    </div>
  );
};

function getCardAccent(index: number): string {
  const accent = CARD_ACCENTS[index % CARD_ACCENTS.length];
  return accent ?? "linear-gradient(135deg, #1d2671, #c33764)";
}

function getFallbackInitials(name: string | null | undefined): string {
  if (!name) return "FM";
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join("")
    .trim()
    .toUpperCase();
  return initials || "FM";
}

function getDisplayLanguage(station: Station): string {
  if (station.language && station.language.trim().length > 0) return station.language;
  if (station.languageCodes && station.languageCodes.length > 0) return station.languageCodes.join(" / ");
  return "Multi-lingual";
}

function extractTags(station: Station): string[] {
  if (Array.isArray(station.tagList) && station.tagList.length > 0) {
    return station.tagList.slice(0, TAG_LIMIT);
  }

  if (typeof station.tags === "string" && station.tags.trim().length > 0) {
    return station.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, TAG_LIMIT);
  }

  return [];
}

function formatCountryLabel(station: Station): string {
  const country = station.country?.trim() ?? "Global";
  if (station.state && station.state.trim().length > 0) {
    return `${station.state.trim()} · ${country}`;
  }
  return country;
}

function getDecorativeFrequency(index: number): { label: string; percent: number } {
  const rawValue = FREQUENCY_BASE + ((index * 1.75) % FREQUENCY_RANGE);
  const clamped = Math.max(FREQUENCY_BASE, Math.min(FREQUENCY_BASE + FREQUENCY_RANGE, rawValue));
  const percent = ((clamped - FREQUENCY_BASE) / FREQUENCY_RANGE) * 100;
  return { label: `${clamped.toFixed(1)} FM`, percent };
} interface StationCardFanItemProps {
  station: Station;
  index: number;
  activeIndex: number;
  activeStationId: string | null;
  localActiveId: string | null;
  hoveredId: string | null;
  totalStations: number;
  descriptorReason: string;
  moodLabel: string;
  onHover: (id: string | null) => void;
  onClick: (station: Station) => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  fanConfig: typeof FAN_CONFIG;
}

const StationCardFanItem = memo(
  ({
    station,
    index,
    activeIndex,
    activeStationId,
    localActiveId,
    hoveredId,
    totalStations,
    descriptorReason,
    moodLabel,
    onHover,
    onClick,
    onSwipeLeft,
    onSwipeRight,
    fanConfig,
  }: StationCardFanItemProps) => {
    const isActive = station.uuid === (activeStationId ?? localActiveId);
    const isHovered = hoveredId === station.uuid;
    const offset = index - activeIndex;
    const clampedOffset = Math.max(-fanConfig.maxVisibleOffset, Math.min(fanConfig.maxVisibleOffset, offset));
    const depth = Math.abs(clampedOffset);
    const isMobile = fanConfig === MOBILE_FAN_CONFIG;

    // Swipe handlers for individual cards (mobile only)
    const cardSwipeHandlers = useSwipeable({
      onSwipedLeft: () => {
        if (isMobile && isActive && onSwipeLeft) {
          onSwipeLeft();
        }
      },
      onSwipedRight: () => {
        if (isMobile && isActive && onSwipeRight) {
          onSwipeRight();
        }
      },
      preventScrollOnSwipe: true,
      trackTouch: true,
      delta: 50, // Minimum swipe distance
    });

    // Desktop Stack Logic
    let translateX: number | string = clampedOffset * fanConfig.spread;
    let translateY = depth * fanConfig.verticalLift;
    let rotate = clampedOffset * fanConfig.rotation;
    const baseScale = 1 - depth * fanConfig.depthScale;
    let scale = isActive ? 1 : Math.max(0.84, baseScale);
    let depthOpacity = isActive ? 1 : 1 - Math.min(fanConfig.depthFade * depth, 0.45);
    let zIndex = isActive ? 120 : 90 - depth * 10;
    let cardPadding = "1.8rem";
    let cardGap = "1.25rem";
    let artworkSize = "110px";

    // Mobile Slider Logic
    if (isMobile) {
      // On mobile, simplified single-card view
      translateX = `${offset * 100}%`;
      translateY = 0;
      rotate = 0;
      scale = 1;
      depthOpacity = offset === 0 ? 1 : 0;
      zIndex = offset === 0 ? 10 : 1;
      cardPadding = "1.2rem";
      cardGap = "1rem";
      artworkSize = "85px";
    }

    const accent = getCardAccent(index);
    const fallbackInitials = getFallbackInitials(station.name);
    const stationOrder = index + 1;
    const tags = extractTags(station);
    const displayTags = tags.length > 0 ? tags : ["curated", moodLabel];
    const primaryTag = displayTags[0];
    const remainingTagCount = Math.max(displayTags.length - 1, 0);
    const bitrateChip = station.bitrate > 0 ? `${station.bitrate} kbps` : "Live stream";
    const healthMeta = deriveStationHealth(station);
    const healthColor =
      healthMeta?.status === "warning" || healthMeta?.status === "error"
        ? "rgba(239,68,68,0.85)"
        : "rgba(34,197,94,0.85)";
    const reliabilityLabel =
      healthMeta?.status === "warning" || healthMeta?.status === "error" ? "Signal spotty" : "Signal steady";
    const reliabilityIcon =
      healthMeta?.status === "warning" || healthMeta?.status === "error" ? (
        <IconAlertTriangle size={12} />
      ) : (
        <IconShieldCheck size={12} />
      );
    const description = (station.highlight?.trim() || descriptorReason).trim();
    const locationLine =
      [station.state?.trim(), station.country?.trim()].filter(Boolean).join(" / ") ||
      formatCountryLabel(station) ||
      "Global broadcast";
    const { label: frequencyLabel, percent: frequencyPercent } = getDecorativeFrequency(index);

    const cardBackground = isActive
      ? "#ffffff"
      : "#f1f5f9";
    const borderColor = isActive ? "rgba(148,163,184,0.28)" : "rgba(148,163,184,0.12)";
    const glowShadow = isActive
      ? "0 25px 50px -12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(148,163,184,0.1)"
      : isHovered
        ? "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
        : "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)";
    const artBorderColor = isActive ? "rgba(148,163,184,0.28)" : "rgba(148,163,184,0.15)";
    const playLabel = isActive ? "On Air" : "Play";

    // Content opacity for non-active cards to prevent visual clutter
    const contentOpacity = isActive ? 1 : 0.1;

    return (
      <motion.button
        key={station.uuid}
        className="station-list-card"
        type="button"
        initial={{ opacity: 0, y: 16 }}
        animate={{
          opacity: isActive ? 1 : depthOpacity,
          x: translateX,
          y: translateY,
          rotate,
          scale,
        }}
        whileHover={{ scale: Math.min(scale + 0.02, 1.02) }}
        transition={{
          type: "spring",
          stiffness: 200,
          damping: 24,
          mass: 0.8,
        }}
        style={{
          position: "absolute",
          top: "50%",
          left: isMobile ? "0" : `${CARD_CENTER_LEFT}%`,
          transform: isMobile ? "translateY(-50%)" : "translate(-50%, -50%)",
          width: isMobile ? "100%" : CARD_WIDTH_STYLE,
          height: isMobile ? "auto" : CARD_HEIGHT_STYLE,
          minHeight: isMobile ? "280px" : undefined,
          borderRadius: isMobile ? "1.25rem" : "1.6rem",
          border: `1px solid ${borderColor}`,
          background: cardBackground,
          boxShadow: glowShadow,
          flexDirection: isMobile ? "column" : "row",
          alignItems: "stretch",
          padding: cardPadding,
          gap: cardGap,
          cursor: "pointer",
          overflow: "hidden",
          zIndex: isActive ? 110 : zIndex,
          pointerEvents: Math.abs(offset) > fanConfig.maxVisibleOffset ? "none" : "auto",
          opacity: Math.abs(offset) > fanConfig.maxVisibleOffset ? 0 : undefined,
          display: Math.abs(offset) > fanConfig.maxVisibleOffset + 1 ? "none" : "flex",
          backdropFilter: "blur(18px)",
          color: "#334155",
        }}
        {...(isMobile && isActive ? cardSwipeHandlers : {})}
        onMouseEnter={() => onHover(station.uuid)}
        onMouseLeave={() => onHover(null)}
        onFocus={() => onHover(station.uuid)}
        onBlur={() => onHover(null)}
        onClick={(event) => {
          event.stopPropagation();
          onClick(station);
        }}
        aria-pressed={isActive}
        aria-label={`Play ${station.name}`}
      >
        <span
          aria-hidden
          style={{
            position: "absolute",
            left: "1.2rem",
            top: "1.2rem",
            bottom: "1.2rem",
            width: "2px",
            borderRadius: "999px",
            background: `linear-gradient(180deg, rgba(148,163,184,0.2), ${accent})`,
            opacity: isActive ? 0.9 : 0.45,
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "relative",
            zIndex: 2,
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: "1.2rem",
            minWidth: 0,
            opacity: contentOpacity,
            transition: "opacity 0.3s ease",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: "1.2rem",
              alignItems: "center",
              minWidth: 0,
            }}
          >
            <div
              style={{
                width: artworkSize,
                minWidth: artworkSize,
                height: artworkSize,
                borderRadius: "1.25rem",
                overflow: "hidden",
                border: `1px solid ${artBorderColor}`,
                background: station.favicon ? "rgba(241,245,249,0.7)" : accent,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 15px 45px rgba(148,163,184,0.25)",
                flexShrink: 0,
                margin: isMobile ? "0 auto" : 0,
              }}
            >
              {station.favicon ? (
                <img
                  src={station.favicon}
                  alt={`Artwork for ${station.name}`}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    background: accent,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "rgba(255,255,255,0.9)",
                    fontSize: "2.1rem",
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                  }}
                >
                  {fallbackInitials}
                </div>
              )}
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.65rem", minWidth: 0 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "0.75rem",
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    fontSize: "0.55rem",
                    letterSpacing: "0.5em",
                    textTransform: "uppercase",
                    color: "rgba(100,116,139,0.8)",
                  }}
                >
                  Station card
                </span>
                <span
                  style={{
                    fontSize: "0.7rem",
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: "rgba(100,116,139,0.7)",
                  }}
                >
                  #{stationOrder}/{totalStations}
                </span>
              </div>
              <h3
                style={{
                  margin: 0,
                  fontSize: "1.4rem",
                  fontWeight: 700,
                  letterSpacing: "-0.01em",
                  color: "#0f172a",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {station.name}
              </h3>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: "0.6rem",
                  color: "rgba(71,85,105,0.84)",
                  fontSize: "0.85rem",
                }}
              >
                <span>{locationLine}</span>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.35rem",
                    fontSize: "0.72rem",
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: healthColor,
                  }}
                >
                  <span
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "999px",
                      background: healthColor,
                      boxShadow: `0 0 10px ${healthColor}`,
                    }}
                  />
                  {reliabilityIcon}
                  {reliabilityLabel}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "0.45rem",
                  alignItems: "center",
                }}
              >
                {primaryTag && (
                  <span
                    style={{
                      fontSize: "0.7rem",
                      padding: "0.35rem 0.85rem",
                      borderRadius: "999px",
                      background: "rgba(241,245,249,0.5)",
                      border: "1px solid rgba(226,232,240,0.8)",
                      textTransform: "uppercase",
                      letterSpacing: "0.2em",
                    }}
                  >
                    {primaryTag}
                  </span>
                )}
                {remainingTagCount > 0 && (
                  <span
                    style={{
                      fontSize: "0.7rem",
                      padding: "0.35rem 0.85rem",
                      borderRadius: "999px",
                      border: "1px dashed rgba(148,163,184,0.4)",
                      color: "rgba(100,116,139,0.8)",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                    }}
                  >
                    +{remainingTagCount} tag{remainingTagCount > 1 ? "s" : ""}
                  </span>
                )}
                <span
                  style={{
                    fontSize: "0.7rem",
                    padding: "0.35rem 0.85rem",
                    borderRadius: "999px",
                    border: "1px solid rgba(226,232,240,0.8)",
                    background: "rgba(241,245,249,0.5)",
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                  }}
                >
                  {bitrateChip}
                </span>
              </div>
            </div>
          </div>
          <div
            style={{
              width: "100%",
              height: "1px",
              background: "linear-gradient(90deg, transparent, rgba(226,232,240,0.8), transparent)",
              opacity: 0.6,
            }}
          />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              flexWrap: "wrap",
            }}
          >
            <p
              style={{
                flex: 1,
                margin: 0,
                fontSize: "0.95rem",
                lineHeight: 1.5,
                color: "rgba(51,65,85,0.92)",
                minWidth: 0,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {description}
            </p>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.5rem 1.3rem",
                borderRadius: "12px",
                border: "none",
                background: isActive ? "#1e293b" : "#e0e5ec",
                color: isActive ? "#ffffff" : "#0f172a",
                textTransform: "uppercase",
                fontSize: "0.7rem",
                letterSpacing: "0.25em",
                boxShadow: isActive
                  ? "6px 6px 12px #0a0e14, -6px -6px 12px #323f56"
                  : "6px 6px 12px #b8b9be, -6px -6px 12px #ffffff",
                fontWeight: 600,
              }}
            >
              <IconPlayerPlayFilled size={14} />
              {playLabel}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.8rem",
              fontSize: "0.65rem",
              letterSpacing: "0.35em",
              textTransform: "uppercase",
              color: "rgba(100,116,139,0.8)",
            }}
          >
            <span>Dial</span>
            <div
              style={{
                position: "relative",
                flex: 1,
                height: "6px",
                borderRadius: "999px",
                background: "rgba(226,232,240,0.8)",
                overflow: "hidden",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: `${Math.max(10, frequencyPercent)}%`,
                  background: "linear-gradient(90deg, rgba(59,130,246,0.3), rgba(94,234,212,0.7))",
                }}
              />
              <span
                style={{
                  position: "absolute",
                  left: `calc(${frequencyPercent}% - 6px)`,
                  top: "50%",
                  width: "12px",
                  height: "12px",
                  borderRadius: "999px",
                  background: "rgba(14,165,233,0.85)",
                  boxShadow: "0 0 12px rgba(14,165,233,0.4)",
                  transform: "translateY(-50%)",
                }}
              />
            </div>
            <span
              style={{
                fontSize: "0.85rem",
                letterSpacing: "0.15em",
                color: "#475569",
              }}
            >
              {frequencyLabel}
            </span>
          </div>
        </div>

        {/* Swipe indicators for mobile */}
        {isMobile && isActive && (
          <>
            <div
              style={{
                position: "absolute",
                left: "0.5rem",
                top: "50%",
                transform: "translateY(-50%)",
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: "rgba(148,163,184,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "none",
                opacity: 0.6,
              }}
            >
              <span
                style={{
                  width: "0",
                  height: "0",
                  borderTop: "6px solid transparent",
                  borderBottom: "6px solid transparent",
                  borderRight: "8px solid rgba(100,116,139,0.7)",
                }}
              />
            </div>
            <div
              style={{
                position: "absolute",
                right: "0.5rem",
                top: "50%",
                transform: "translateY(-50%)",
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: "rgba(148,163,184,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "none",
                opacity: 0.6,
              }}
            >
              <span
                style={{
                  width: "0",
                  height: "0",
                  borderTop: "6px solid transparent",
                  borderBottom: "6px solid transparent",
                  borderLeft: "8px solid rgba(100,116,139,0.7)",
                }}
              />
            </div>
          </>
        )}
      </motion.button>
    );
  }
);
StationCardFanItem.displayName = "StationCardFanItem";

const CardStackScene: SceneComponent = ({ descriptor, onStationSelect, activeStationId, className, sceneStatus }) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [localActiveId, setLocalActiveId] = useState<string | null>(descriptor.stations[0]?.uuid ?? null);
  const [visibleStations, setVisibleStations] = useState(() => descriptor.stations.slice(0, CARD_STACK_LIMIT));
  const [isMobile, setIsMobile] = useState(false);
  const wheelDeltaRef = useRef(0);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const fanConfig = isMobile ? MOBILE_FAN_CONFIG : FAN_CONFIG;

  const activeStation = useMemo(() => {
    const id = activeStationId || localActiveId;
    return visibleStations.find((s) => s.uuid === id) || visibleStations[0];
  }, [activeStationId, localActiveId, visibleStations]);

  const activeIndex = useMemo(() => {
    const id = activeStation?.uuid ?? activeStationId ?? localActiveId;
    if (!id) return 0;
    const index = visibleStations.findIndex((station) => station.uuid === id);
    return index >= 0 ? index : 0;
  }, [activeStation?.uuid, activeStationId, localActiveId, visibleStations]);

  useEffect(() => {
    // Ensure we have enough cards for the stack effect, but don't duplicate if we have a valid list
    // The issue "repeated data" likely comes from the carousel logic wrapping around or duplicating items for the infinite effect
    // If the user sees "repeated data" visually, it might be because we are showing the same station multiple times in the stack

    const uniqueStations = descriptor.stations.filter((station, index, self) =>
      index === self.findIndex((s) => s.uuid === station.uuid)
    );

    // If we have very few stations, we might need to duplicate to fill the stack, 
    // BUT if the user complains about it, we should probably just show what we have.
    // Let's just use the unique list.
    setVisibleStations(uniqueStations);

    if (uniqueStations[0] && !activeStationId) {
      setLocalActiveId(uniqueStations[0].uuid);
    }
  }, [descriptor.stations, activeStationId]);

  const setActiveStation = useCallback(
    (station: Station | undefined, options?: { autoplay?: boolean }) => {
      if (!station) return;
      setLocalActiveId(station.uuid);
      if (options?.autoplay && station.uuid !== activeStationId) {
        onStationSelect?.(station);
      }
    },
    [activeStationId, onStationSelect]
  );

  const stepActiveStation = useCallback(
    (delta: number, options?: { autoplay?: boolean }) => {
      if (visibleStations.length === 0) return;
      const nextIndex = (activeIndex + delta + visibleStations.length) % visibleStations.length;
      const target = visibleStations[nextIndex];
      setActiveStation(target, options);
    },
    [activeIndex, setActiveStation, visibleStations]
  );

  const handleWheel = useCallback(
    (event: ReactWheelEvent<HTMLDivElement>) => {
      if (visibleStations.length <= 1) return;
      const dominantDelta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      if (Math.abs(dominantDelta) < 6) return;
      wheelDeltaRef.current += dominantDelta;
      if (Math.abs(wheelDeltaRef.current) >= 60) {
        const direction = wheelDeltaRef.current > 0 ? 1 : -1;
        wheelDeltaRef.current = 0;
        stepActiveStation(direction);
      }
    },
    [stepActiveStation, visibleStations.length]
  );

  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => stepActiveStation(1),
    onSwipedRight: () => stepActiveStation(-1),
    preventScrollOnSwipe: true,
    trackMouse: true,
  });


  useEffect(() => {
    if (visibleStations.length === 0) return;

    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.altKey || event.metaKey || event.ctrlKey) return;
      if (visibleStations.length === 0) return;

      const target = event.target as HTMLElement | null;
      if (target) {
        const tagName = target.tagName?.toLowerCase();
        const isEditable = target.isContentEditable;
        if (
          tagName === "input" ||
          tagName === "textarea" ||
          isEditable ||
          target.getAttribute("role") === "textbox"
        ) {
          return;
        }
      }

      const forwardKeys = ["ArrowRight", "ArrowDown"];
      const backwardKeys = ["ArrowLeft", "ArrowUp"];

      if (forwardKeys.includes(event.key)) {
        event.preventDefault();
        const nextIndex = (activeIndex + 1) % visibleStations.length;
        setActiveStation(visibleStations[nextIndex]);
      } else if (backwardKeys.includes(event.key)) {
        event.preventDefault();
        const nextIndex = (activeIndex - 1 + visibleStations.length) % visibleStations.length;
        setActiveStation(visibleStations[nextIndex]);
      } else if (event.key === "Home") {
        event.preventDefault();
        setActiveStation(visibleStations[0]);
      } else if (event.key === "End") {
        event.preventDefault();
        setActiveStation(visibleStations[visibleStations.length - 1]);
      } else if (event.key === " " || event.key === "Spacebar" || event.key === "Enter") {
        event.preventDefault();
        const target = visibleStations[activeIndex] ?? visibleStations[0];
        setActiveStation(target, { autoplay: true });
      }
    };

    window.addEventListener("keydown", handleKeyPress, true);
    document.addEventListener("keydown", handleKeyPress, true);
    return () => {
      window.removeEventListener("keydown", handleKeyPress, true);
      document.removeEventListener("keydown", handleKeyPress, true);
    };
  }, [activeIndex, setActiveStation, visibleStations]);

  const moodBackground = useMemo(() => {
    if (!descriptor.mood) return MOOD_BACKGROUNDS.night;
    const moodKey = descriptor.mood.toLowerCase();
    return MOOD_BACKGROUNDS[moodKey] ?? MOOD_BACKGROUNDS.night;
  }, [descriptor.mood]);

  const descriptorReason =
    typeof descriptor.reason === "string" && descriptor.reason.trim().length > 0
      ? descriptor.reason.trim()
      : DEFAULT_REASON;
  const totalStations = descriptor.stations.length;
  const countryCount = useMemo(() => {
    const lookup = new Set(
      descriptor.stations
        .map((station) => station.countryCode ?? station.country)
        .filter((value): value is string => Boolean(value))
    );
    if (lookup.size > 0) {
      return lookup.size;
    }
    return totalStations > 0 ? 1 : 0;
  }, [descriptor.stations, totalStations]);

  const moodLabel = descriptor.mood ?? "AI-curated journey";

  const sceneStats = useMemo(
    () => [
      { label: "Stations", value: totalStations.toString() },
      { label: "Countries", value: countryCount.toString() },
      { label: "Mix", value: descriptor.animation?.replace(/[_-]+/g, " ") || "slow reveal" },
    ],
    [countryCount, descriptor.animation, totalStations]
  );
  const isSceneLoading = sceneStatus?.isLoading ?? false;
  const loadingTitle = sceneStatus?.title ?? moodLabel;
  const loadingHint = sceneStatus?.hint ?? "Analyzing vibes…";
  const loadingSteps = sceneStatus?.steps ?? [];
  const curatedMoodSection = (
    <motion.div
      key={isSceneLoading ? "loading" : "curated"}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      style={{
        width: "100%",
        maxWidth: "min(960px, 95vw)",
        color: "rgba(51,65,85,0.95)",
        display: isSceneLoading ? "flex" : "none", // HIDE WHEN LOADED
        flexDirection: "column",
        gap: "0.65rem",
        textAlign: "left",
        minHeight: isSceneLoading ? "200px" : undefined,
        justifyContent: isSceneLoading ? "center" : "flex-start",
        background: "rgba(255,255,255,0.5)",
        borderRadius: "1.25rem",
        border: "1px solid rgba(226,232,240,0.8)",
        padding: "1.35rem 1.6rem",
        margin: "0 auto",
      }}
    >
      {isSceneLoading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <span
            style={{
              fontSize: "0.6rem",
              letterSpacing: "0.4em",
              textTransform: "uppercase",
              color: "rgba(100,116,139,0.65)",
              fontWeight: 600,
            }}
          >
            Curating your musical journey
          </span>
          <h2
            style={{
              margin: 0,
              fontSize: "1.2rem",
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#0f172a",
            }}
          >
            {loadingTitle}
          </h2>
          <p style={{ margin: 0, fontSize: "0.92rem", lineHeight: 1.5, color: "rgba(71,85,105,0.85)" }}>{loadingHint}</p>
          {loadingSteps.length > 0 && (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "0.8rem",
                fontSize: "0.62rem",
                letterSpacing: "0.32em",
                textTransform: "uppercase",
                color: "rgba(100,116,139,0.75)",
              }}
            >
              {loadingSteps.map((step) => (
                <span key={step}>{step}</span>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </motion.div>
  );

  if (visibleStations.length === 0) {
    return (
      <div
        className={className}
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          background: BASE_BACKGROUND,
          padding: "3rem 2.5rem",
          borderRadius: "1.5rem",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "rgba(51,65,85,0.85)",
          fontSize: "1rem",
          letterSpacing: "0.3em",
          textTransform: "uppercase",
          boxShadow: "0 25px 60px rgba(148,163,184,0.15)",
        }}
      >
        Awaiting AI curation…
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{
        position: "relative",
        width: "100%",
        minHeight: SCENE_MIN_HEIGHT,
        background: BASE_BACKGROUND,
        padding: "0.5rem 0.75rem 1rem",
        borderRadius: "1.5rem",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        gap: "0.5rem",
        boxShadow: "0 30px 80px rgba(148,163,184,0.25)",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `${moodBackground}, radial-gradient(circle at 20% 20%, rgba(255,255,255,0.8), transparent 48%)`,
          opacity: 0.45,
          pointerEvents: "none",
        }}
        aria-hidden={true}
      />
      <div
        style={{
          position: "relative",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "0.35rem",
          maxWidth: "1200px",
        }}
      >
        <motion.div
          initial={{ opacity: 0.85, y: 0 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.05 }}
          style={{
            fontSize: "0.6rem",
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "rgba(100,116,139,0.55)",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.6rem",
            padding: "0.25rem 0",
          }}
        >
          <span style={{ width: "20px", height: "1px", background: "rgba(148,163,184,0.25)" }} />
          Arrow Keys · Click · Swipe
          <span style={{ width: "20px", height: "1px", background: "rgba(148,163,184,0.25)" }} />
        </motion.div>

        <motion.section
          initial={{ opacity: 0, scale: 0.97, y: 35 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.15 }}
          className="card-stack-shell"
          onWheel={handleWheel}
          {...swipeHandlers}
          style={{
            position: "relative",
            width: "100%",
            background: "rgba(255,255,255,0.6)",
            borderRadius: "1.4rem",
            border: "1.5px solid rgba(226,232,240,0.8)",
            boxShadow: "0 45px 120px rgba(148,163,184,0.25)",
            overflow: "visible",
            padding: "0.75rem 1rem 1rem",
            minHeight: "0",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-start",
            touchAction: "pan-y",
            overscrollBehaviorY: "contain",
            gap: "0.5rem",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "radial-gradient(circle at 20% 25%, rgba(59,130,246,0.05), transparent 60%)",
              pointerEvents: "none",
            }}
          />
          {activeStation && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              style={{
                width: "min(960px, 100%)",
                margin: "0 auto",
                position: "sticky",
                top: "1rem",
                zIndex: 5,
              }}
            >
              <RetroTunerDisplay
                station={activeStation}
                activeIndex={activeIndex}
                totalStations={totalStations}
              />
            </motion.div>
          )}
          <div style={{ width: "100%" }}>{curatedMoodSection}</div>
          <div
            className="card-fan-stage"
            aria-label="AI curated stations"
            role="listbox"
            style={{
              position: "relative",
              width: "100%",
              maxWidth: "min(980px, 92vw)",
              margin: "0 auto 0.1rem",
              minHeight: isMobile ? "340px" : `${CARD_STAGE_HEIGHT}px`,
            }}
          >
            {visibleStations.map((station, index) => (
              <StationCardFanItem
                key={`${station.uuid}-${index}`}
                station={station}
                index={index}
                activeIndex={activeIndex}
                activeStationId={activeStationId ?? null}
                localActiveId={localActiveId}
                hoveredId={hoveredId}
                totalStations={totalStations}
                descriptorReason={descriptorReason}
                moodLabel={moodLabel}
                onHover={setHoveredId}
                onClick={(candidate) => setActiveStation(candidate, { autoplay: true })}
                onSwipeLeft={() => stepActiveStation(1)}
                onSwipeRight={() => stepActiveStation(-1)}
                fanConfig={fanConfig}
              />
            ))}
          </div>
        </motion.section>

        <style>
          {`
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.45; }
            }

            @keyframes equalize {
              0% { transform: scaleY(0.4); opacity: 0.6; }
              50% { transform: scaleY(1.2); opacity: 1; }
              100% { transform: scaleY(0.4); opacity: 0.6; }
            }

            .now-playing-eq {
              display: inline-flex;
              align-items: flex-end;
              gap: 2px;
              height: 12px;
            }

            .now-playing-eq span {
              width: 3px;
              height: 10px;
              border-radius: 999px;
              background: rgba(34,211,238,0.9);
              animation: equalize 0.9s ease-in-out infinite;
            }

            .now-playing-eq span:nth-child(2) {
              animation-delay: 0.15s;
            }

            .now-playing-eq span:nth-child(3) {
              animation-delay: 0.3s;
            }

            .compact-now-playing button:enabled:hover {
              transform: translateY(-1px);
              border-color: rgba(248,250,252,0.4);
            }

            @media (max-width: 768px) {
              .station-list-card {
                flex-direction: column;
                align-items: center;
                left: 0 !important;
                transform: translateY(-50%) !important;
                padding: 1.2rem !important;
                gap: 1rem !important;
                touch-action: pan-y;
                user-select: none;
                -webkit-user-select: none;
                -webkit-touch-callout: none;
              }
              .station-list-card:active {
                cursor: grabbing;
              }
              .retro-tuner-display {
                flex-direction: column !important;
                gap: 1rem !important;
                padding: 1.25rem 1.5rem !important;
                align-items: center !important;
              }
              .retro-tuner-display > div:first-child {
                text-align: center;
                width: 100%;
              }
              .retro-tuner-display > div:last-child {
                align-items: center !important;
              }
            }

            @media (min-width: 769px) and (max-width: 1100px) {
              .station-list-card {
                left: 49% !important;
              }
            }
          `}
        </style>
      </div>
    </div>
  );
};

export default CardStackScene;
