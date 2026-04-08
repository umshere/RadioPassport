import { useEffect, useMemo, useRef, useState } from "react";
import {
  AnimatePresence,
  type MotionValue,
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import {
  IconDisc,
  IconExternalLink,
  IconBrandWikipedia,
  IconBrandYoutube,
  IconCompass,
  IconHeadphones,
  IconMusic,
  IconSearch,
  IconSparkles,
  IconUser,
  IconX,
} from "@tabler/icons-react";
import { useElementSize, useMediaQuery } from "@mantine/hooks";
import type { TriviaFact, TriviaLink } from "~/types/trivia";
import { CountryFlag } from "~/components/CountryFlag";
import { PretextMeasuredText } from "~/components/PretextMeasuredText";
import { useNowPlayingMetadata } from "~/hooks/useNowPlayingMetadata";
import { useTrackTrivia } from "~/hooks/useTrackTrivia";
import { useUIStore } from "~/state/uiStore";
import {
  fitsPretextWidth,
  getPretextLineCount,
  getPretextLines,
  getPretextTightWidth,
} from "~/utils/pretextLayout";
import type { Country, Station } from "~/types/radio";

const PRETEXT_HERO_FONT =
  '600 13px "General Sans", "SF Pro Text", "Segoe UI", "Helvetica Neue", Arial, sans-serif';
const HERO_CTA_FONT =
  '600 14px "General Sans", "SF Pro Text", "Segoe UI", "Helvetica Neue", Arial, sans-serif';
const HERO_NOTE_HEADER_FONT =
  '600 10px "General Sans", "SF Pro Text", "Segoe UI", "Helvetica Neue", Arial, sans-serif';
const HERO_NOTE_STATUS_FONT =
  '600 9px "General Sans", "SF Pro Text", "Segoe UI", "Helvetica Neue", Arial, sans-serif';
const HERO_SIGNAL_FONT =
  '600 13px "General Sans", "SF Pro Text", "Segoe UI", "Helvetica Neue", Arial, sans-serif';
const HERO_PROOF_FONT =
  '600 11px "General Sans", "SF Pro Text", "Segoe UI", "Helvetica Neue", Arial, sans-serif';
const HERO_CLOUD_TEXT_FONT =
  '600 12px "General Sans", "SF Pro Text", "Segoe UI", "Helvetica Neue", Arial, sans-serif';
const HERO_INSIGHT_TITLE_FONT =
  '600 30px "General Sans", "SF Pro Display", "Segoe UI", "Helvetica Neue", Arial, sans-serif';

type FallingHeroNote = {
  id: number;
  x: number;
  y: number;
  glyph: string;
  driftX: number;
  driftY: number;
  rotation: number;
  size: number;
  duration: number;
};

type HeroManuscriptSnippet = {
  id: string;
  zone: "left" | "center" | "right";
  label: string;
  text: string;
  compactText?: string;
  width: number;
  xPercent: number;
  yPercent: number;
  repulsion: number;
};

type ElasticParticleSpring = {
  stiffness: number;
  damping: number;
  mass: number;
};

type HeroInsightCloudItem = {
  id: string;
  eyebrow: string;
  text: string;
  kind: "relation" | "mood" | "signal" | "source";
  href?: string;
  iconKind?: string;
  width: number;
};

type HeroDisplayFact = TriviaFact & {
  concept: string;
  shortLabel: string;
};

const HERO_INSIGHT_CLOUD_SLOTS = [
  { x: 0.1, y: 0.2 },
  { x: 0.34, y: 0.28 },
  { x: 0.58, y: 0.36 },
  { x: 0.8, y: 0.5 },
  { x: 0.2, y: 0.62 },
  { x: 0.5, y: 0.72 },
  { x: 0.78, y: 0.8 },
  { x: 0.4, y: 0.88 },
];

type GraphemeSegment = { segment: string };

type IntlWithSegmenter = typeof Intl & {
  Segmenter?: new (
    locales?: string | string[],
    options?: { granularity?: "grapheme" | "word" | "sentence" }
  ) => {
    segment(input: string): Iterable<GraphemeSegment>;
  };
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeInsightText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function isInsightDuplicate(value: string, references: string[]) {
  const normalizedValue = normalizeInsightText(value);
  if (!normalizedValue) return true;

  return references.some((reference) => {
    const normalizedReference = normalizeInsightText(reference);
    if (!normalizedReference) return false;
    return (
      normalizedReference === normalizedValue ||
      normalizedReference.includes(normalizedValue) ||
      normalizedValue.includes(normalizedReference)
    );
  });
}

function getInsightConcept(label: string, value: string) {
  const normalizedLabel = normalizeInsightText(label);
  const normalizedValue = normalizeInsightText(value);

  if (/^\d{4}$/.test(value.trim())) return "year";
  if (normalizedLabel.includes("release year") || normalizedLabel === "year") return "year";
  if (normalizedLabel.includes("song title") || normalizedLabel === "title" || normalizedLabel === "track") return "title";
  if (normalizedLabel === "artist" || normalizedLabel.includes("artist name")) return "artist";
  if (normalizedLabel.includes("artist origin")) return "artist_origin";
  if (normalizedLabel === "album") return "album";
  if (normalizedLabel === "genre") return "genre";
  if (normalizedLabel === "style") return "style";
  if (normalizedLabel === "mood") return /^\d{4}$/.test(value.trim()) ? "year" : "mood";
  if (normalizedLabel === "country") return "country";
  if (normalizedLabel === "region" || normalizedLabel === "state") return "region";
  if (normalizedLabel === "language") return "language";
  if (normalizedLabel === "codec") return "codec";
  if (normalizedLabel === "signal" || normalizedValue.includes("kbps")) return "signal";
  if (normalizedLabel === "type") return "type";
  if (normalizedLabel === "release") return "release";
  if (normalizedLabel === "podcast") return "podcast";
  if (normalizedLabel === "episode number") return "episode";
  if (normalizedLabel === "host") return "host";
  if (normalizedLabel === "station") return "station";
  if (normalizedLabel === "origin") return "origin";
  return normalizedLabel || "misc";
}

function getInsightShortLabel(label: string, concept: string) {
  switch (concept) {
    case "artist_origin":
      return "Origin";
    case "release":
      return "Release";
    case "episode":
      return "Episode";
    case "signal":
      return "Signal";
    default:
      return label;
  }
}

const HERO_CARD_CONCEPT_ORDER = [
  "album",
  "genre",
  "style",
  "mood",
  "type",
  "release",
  "artist",
  "artist_origin",
  "origin",
  "podcast",
  "episode",
  "host",
  "misc",
];

function getHeroCardConceptRank(concept: string) {
  const index = HERO_CARD_CONCEPT_ORDER.indexOf(concept);
  return index === -1 ? HERO_CARD_CONCEPT_ORDER.length : index;
}

function renderHeroFactIcon(concept: string) {
  switch (concept) {
    case "album":
    case "release":
    case "year":
      return IconDisc;
    case "genre":
    case "style":
    case "mood":
    case "type":
    case "title":
      return IconMusic;
    case "artist":
    case "artist_origin":
    case "host":
      return IconUser;
    case "origin":
    case "country":
    case "region":
      return IconCompass;
    case "podcast":
    case "episode":
    case "signal":
    case "language":
    case "codec":
      return IconHeadphones;
    default:
      return IconSparkles;
  }
}

function normalizeHeroDisplayText(value: string) {
  if (!value) return value;

  let normalized = value.trim();

  if (/%[0-9A-Fa-f]{2}/.test(normalized)) {
    try {
      normalized = decodeURIComponent(normalized);
    } catch { }
  }

  if (normalized.includes("+")) {
    normalized = normalized.replace(/\+/g, " ");
  }

  normalized = normalized.replace(/[_|]+/g, " ").replace(/\s+/g, " ").trim();

  return normalized;
}

function toSoftTitleCase(value: string) {
  const stopWords = new Set(["a", "an", "and", "at", "by", "de", "for", "feat", "from", "in", "of", "on", "or", "the", "to", "vs"]);
  return value
    .split(/\s+/)
    .map((word, index) => {
      if (!word) return word;
      if (/^[A-Z0-9()&./-]+$/.test(word) && word.length <= 5) return word;
      const lower = word.toLowerCase();
      if (index > 0 && stopWords.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

function formatHeroDisplayTitle(value: string) {
  const normalized = normalizeHeroDisplayText(value);
  if (!normalized) return normalized;

  const letters = normalized.replace(/[^A-Za-z]/g, "");
  const lowercaseRatio = letters ? normalized.replace(/[^a-z]/g, "").length / letters.length : 0;

  if (lowercaseRatio < 0.08 || (!/[A-Z]/.test(normalized) && /\s/.test(normalized))) {
    return toSoftTitleCase(normalized);
  }

  return normalized;
}

function truncateHeroDisplayText(
  text: string,
  font: string,
  maxWidth: number,
  maxLines: number,
  lineHeight: number,
  fallbackCharLimit = 96
) {
  const normalized = text.trim();
  if (!normalized) return normalized;

  let candidate = normalized;

  if (typeof window === "undefined" && candidate.length > fallbackCharLimit) {
    candidate = `${candidate.slice(0, fallbackCharLimit - 1).trimEnd()}…`;
  }

  while (safePretextLineCount(candidate, font, maxWidth, lineHeight, 14.5) > maxLines && candidate.length > 24) {
    const next = candidate.slice(0, -8).trimEnd();
    const breakpoint = Math.max(next.lastIndexOf(" "), next.lastIndexOf("—"), next.lastIndexOf("-"), next.lastIndexOf(","));
    candidate = `${(breakpoint > 16 ? next.slice(0, breakpoint) : next).trimEnd()}…`;
  }

  return candidate;
}

function estimateTextWidth(text: string, perChar = 7.2) {
  return text.trim().length * perChar;
}

function safePretextTightWidth(text: string, font: string, perChar = 7.2) {
  if (typeof window === "undefined") return estimateTextWidth(text, perChar);
  return getPretextTightWidth(text, font);
}

function safePretextLineCount(text: string, font: string, width: number, lineHeight: number, perChar = 7.6) {
  if (!text.trim() || width <= 0) return 0;
  if (typeof window === "undefined") {
    const charsPerLine = Math.max(10, Math.floor(width / perChar));
    return Math.ceil(text.length / charsPerLine);
  }
  return getPretextLineCount(text, font, width, lineHeight);
}

const SegmenterCtor =
  typeof Intl !== "undefined"
    ? (Intl as IntlWithSegmenter).Segmenter ?? null
    : null;

const graphemeSegmenter = SegmenterCtor
  ? new SegmenterCtor(undefined, { granularity: "grapheme" })
  : null;

function splitGraphemes(text: string) {
  if (!text) return [];
  if (!graphemeSegmenter) return Array.from(text);
  return Array.from(graphemeSegmenter.segment(text), (segment) => segment.segment);
}

function ElasticHeroParticle({
  token,
  homeX,
  homeY,
  renderX = homeX,
  renderY = homeY,
  pointerX,
  pointerY,
  pointerVelocity,
  enabled,
  radius,
  strength,
  className,
  spring = { stiffness: 210, damping: 24, mass: 0.32 },
  rotateSpring = { stiffness: 180, damping: 24, mass: 0.34 },
  rotateFactor = 2.4,
  scaleBoost = 0.035,
  velocityBoost = 0,
  lineHeight,
}: {
  token: string;
  homeX: number;
  homeY: number;
  renderX?: number;
  renderY?: number;
  pointerX: MotionValue<number>;
  pointerY: MotionValue<number>;
  pointerVelocity: MotionValue<number>;
  enabled: boolean;
  radius: number;
  strength: number;
  className?: string;
  spring?: ElasticParticleSpring;
  rotateSpring?: ElasticParticleSpring;
  rotateFactor?: number;
  scaleBoost?: number;
  velocityBoost?: number;
  lineHeight?: number;
}) {
  const offsetX = useTransform(() => {
    if (!enabled) return 0;
    const dx = homeX - pointerX.get();
    const dy = homeY - pointerY.get();
    const distance = Math.hypot(dx, dy);
    if (!distance || distance > radius) return 0;
    const velocityMultiplier = 1 + Math.min(1.2, pointerVelocity.get() / 1600) * velocityBoost;
    const force = (1 - distance / radius) * strength * velocityMultiplier;
    return (dx / distance) * force;
  });
  const offsetY = useTransform(() => {
    if (!enabled) return 0;
    const dx = homeX - pointerX.get();
    const dy = homeY - pointerY.get();
    const distance = Math.hypot(dx, dy);
    if (!distance || distance > radius) return 0;
    const velocityMultiplier = 1 + Math.min(1.2, pointerVelocity.get() / 1600) * velocityBoost;
    const force = (1 - distance / radius) * strength * 0.88 * velocityMultiplier;
    return (dy / distance) * force;
  });
  const rotate = useTransform(() => {
    if (!enabled) return 0;
    const dx = homeX - pointerX.get();
    const dy = homeY - pointerY.get();
    const distance = Math.hypot(dx, dy);
    if (!distance || distance > radius) return 0;
    return ((dx + dy) / distance) * rotateFactor;
  });
  const particleX = useSpring(offsetX, spring);
  const particleY = useSpring(offsetY, spring);
  const particleRotate = useSpring(rotate, rotateSpring);
  const particleScale = useSpring(
    useTransform(() => {
      if (!enabled) return 1;
      const dx = homeX - pointerX.get();
      const dy = homeY - pointerY.get();
      const distance = Math.hypot(dx, dy);
      if (!distance || distance > radius) return 1;
      return 1 + (1 - distance / radius) * scaleBoost;
    }),
    spring
  );

  return (
    <motion.span
      className={className}
      style={{
        position: "absolute",
        left: `${renderX}px`,
        top: `${renderY}px`,
        x: particleX,
        y: particleY,
        rotate: particleRotate,
        scale: particleScale,
        lineHeight: lineHeight ? `${lineHeight}px` : undefined,
      }}
    >
      {token}
    </motion.span>
  );
}

function ElasticHeroText({
  as = "div",
  text,
  font,
  lineHeight,
  enabled,
  radius,
  strength,
  className,
  tokenClassName,
  mode = "words",
  letterSpacing = 0,
  spring,
  rotateSpring,
  rotateFactor,
  scaleBoost,
  velocityBoost,
}: {
  as?: "h1" | "p" | "div" | "span";
  text: string;
  font: string;
  lineHeight: number;
  enabled: boolean;
  radius: number;
  strength: number;
  className?: string;
  tokenClassName?: string;
  mode?: "words" | "letters";
  letterSpacing?: number;
  spring?: ElasticParticleSpring;
  rotateSpring?: ElasticParticleSpring;
  rotateFactor?: number;
  scaleBoost?: number;
  velocityBoost?: number;
}) {
  const Tag = as;
  const { ref, width } = useElementSize();
  const [isReady, setIsReady] = useState(false);
  const pointerX = useMotionValue(-10_000);
  const pointerY = useMotionValue(-10_000);
  const pointerVelocity = useMotionValue(0);
  const lastPointerRef = useRef<{ x: number; y: number; time: number } | null>(null);

  useEffect(() => {
    setIsReady(true);
  }, []);

  const lines = useMemo(() => {
    if (!isReady || width <= 0 || !text.trim()) return null;
    return getPretextLines(text, font, width, lineHeight);
  }, [font, isReady, lineHeight, text, width]);
  const canRenderInteractive = Boolean(enabled && isReady && width > 0 && lines?.length);

  const particles = useMemo(() => {
    if (!lines) return [];

    if (mode === "letters") {
      return lines.flatMap((line, lineIndex) => {
        let cursorX = 0;
        const lineY = lineIndex * lineHeight;
        const graphemes = splitGraphemes(line.text);

        return graphemes.flatMap((grapheme, graphemeIndex) => {
          const graphemeWidth = getPretextTightWidth(grapheme, font);
          const advance = graphemeWidth + (graphemeIndex < graphemes.length - 1 ? letterSpacing : 0);

          if (!grapheme.trim()) {
            cursorX += advance;
            return [];
          }

          const particle = {
            kind: "token" as const,
            id: `${lineIndex}-${graphemeIndex}-${grapheme}`,
            token: grapheme,
            x: cursorX,
            y: lineY,
          };
          cursorX += advance;
          return [particle];
        });
      });
    }

    return lines.flatMap((line, lineIndex) => {
      const pieces = line.text.match(/\S+|\s+/g) ?? [line.text];
      let cursorX = 0;
      const lineY = lineIndex * lineHeight;
      const lineParticles: Array<{ kind: "token"; id: string; token: string; x: number; y: number }> = [];

      pieces.forEach((piece, pieceIndex) => {
        const pieceWidth = getPretextTightWidth(piece, font);
        if (/^\s+$/.test(piece)) {
          cursorX += pieceWidth;
          return;
        }

        lineParticles.push({
          kind: "token",
          id: `${lineIndex}-${pieceIndex}-${piece}`,
          token: piece,
          x: cursorX,
          y: lineY,
        });

        cursorX += pieceWidth;
      });

      return lineParticles;
    });
  }, [font, letterSpacing, lineHeight, lines, mode]);

  const handlePointerMove = (event: React.PointerEvent<HTMLElement>) => {
    if (!enabled || event.pointerType !== "mouse") return;
    const nativeEvent = event.nativeEvent as PointerEvent & { offsetX?: number; offsetY?: number };
    const x = nativeEvent.offsetX ?? 0;
    const y = nativeEvent.offsetY ?? 0;
    const now = performance.now();
    const lastPointer = lastPointerRef.current;
    if (lastPointer) {
      const dt = Math.max(16, now - lastPointer.time);
      const velocity = Math.hypot(x - lastPointer.x, y - lastPointer.y) / (dt / 1000);
      pointerVelocity.set(velocity);
    }
    lastPointerRef.current = { x, y, time: now };
    pointerX.set(x);
    pointerY.set(y);
  };

  const handlePointerLeave = () => {
    pointerX.set(-10_000);
    pointerY.set(-10_000);
    pointerVelocity.set(0);
    lastPointerRef.current = null;
  };

  return (
    <Tag
      ref={ref}
      className={className}
      style={
        canRenderInteractive
          ? {
            letterSpacing: letterSpacing ? `${letterSpacing}px` : undefined,
            position: "relative",
            display: as === "span" ? "inline-block" : "block",
            height: `${lines!.length * lineHeight}px`,
          }
          : undefined
      }
      onPointerMove={canRenderInteractive ? handlePointerMove : undefined}
      onPointerLeave={canRenderInteractive ? handlePointerLeave : undefined}
    >
      <span
        style={{
          display: as === "span" ? "inline-block" : "block",
          letterSpacing: letterSpacing ? `${letterSpacing}px` : undefined,
          visibility: canRenderInteractive ? "hidden" : "visible",
          lineHeight: `${lineHeight}px`,
          whiteSpace: "pre-wrap",
        }}
      >
        {text}
      </span>
      {canRenderInteractive ? (
        <span aria-hidden="true">
          {particles.map((particle) => (
            <ElasticHeroParticle
              key={particle.id}
              token={particle.token}
              homeX={particle.x}
              homeY={particle.y}
              pointerX={pointerX}
              pointerY={pointerY}
              pointerVelocity={pointerVelocity}
              enabled={enabled}
              radius={radius}
              strength={strength}
              className={tokenClassName ?? "pointer-events-none inline-block will-change-transform"}
              spring={spring}
              rotateSpring={rotateSpring}
              rotateFactor={rotateFactor}
              scaleBoost={scaleBoost}
              velocityBoost={velocityBoost}
              lineHeight={lineHeight}
            />
          ))}
        </span>
      ) : null}
    </Tag>
  );
}

function HeroSignalSnippet({
  snippet,
  pointerX,
  pointerY,
  fieldWidth,
  fieldHeight,
  activeZone,
  enabled,
}: {
  snippet: HeroManuscriptSnippet;
  pointerX: MotionValue<number>;
  pointerY: MotionValue<number>;
  fieldWidth: number;
  fieldHeight: number;
  activeZone: "left" | "center" | "right" | null;
  enabled: boolean;
}) {
  const isActive = activeZone === snippet.zone;
  const displayText = isActive ? snippet.text : snippet.compactText ?? snippet.text;
  const snippetSafeTop = 116;
  const snippetSafeBottom = 108;
  const getHomeY = () =>
    clamp(
      (fieldHeight * snippet.yPercent) / 100,
      snippetSafeTop,
      Math.max(snippetSafeTop, fieldHeight - snippetSafeBottom)
    );
  const offsetX = useTransform(() => {
    if (!enabled || fieldWidth <= 0 || fieldHeight <= 0) return 0;
    const homeX = (fieldWidth * snippet.xPercent) / 100;
    const homeY = getHomeY();
    const dx = homeX - pointerX.get();
    const dy = homeY - pointerY.get();
    const distance = Math.hypot(dx, dy);
    const radius = 190;
    if (!distance || distance > radius) return 0;
    const strength = (1 - distance / radius) * snippet.repulsion;
    return (dx / distance) * strength;
  });
  const offsetY = useTransform(() => {
    if (!enabled || fieldWidth <= 0 || fieldHeight <= 0) return 0;
    const homeX = (fieldWidth * snippet.xPercent) / 100;
    const homeY = getHomeY();
    const dx = homeX - pointerX.get();
    const dy = homeY - pointerY.get();
    const distance = Math.hypot(dx, dy);
    const radius = 190;
    if (!distance || distance > radius) return 0;
    const strength = (1 - distance / radius) * snippet.repulsion * 0.85;
    return (dy / distance) * strength;
  });
  const snippetX = useSpring(offsetX, { stiffness: 160, damping: 22, mass: 0.42 });
  const snippetY = useSpring(offsetY, { stiffness: 160, damping: 22, mass: 0.42 });
  const snippetOpacityTarget = useTransform((): number => {
    if (!enabled) return isActive ? 0.88 : 0.56;
    return activeZone === null ? 0.6 : isActive ? 1 : 0.22;
  });
  const snippetOpacity = useSpring(snippetOpacityTarget, { stiffness: 180, damping: 24, mass: 0.4 });
  const snippetScaleTarget = useTransform((): number => {
    if (!enabled) return isActive ? 1.03 : 1;
    return isActive ? 1.085 : 0.985;
  });
  const snippetScale = useSpring(snippetScaleTarget, { stiffness: 180, damping: 24, mass: 0.38 });
  const snippetBlurTarget = useTransform((): number => {
    if (!enabled || activeZone === null) return 0;
    return isActive ? 0 : 0.65;
  });
  const snippetBlur = useSpring(snippetBlurTarget, { stiffness: 200, damping: 24, mass: 0.34 });
  const snippetFilter = useMotionTemplate`blur(${snippetBlur}px)`;
  const snippetGlowTarget = useTransform((): number => {
    if (!enabled || activeZone === null) return isActive ? 0.22 : 0.08;
    return isActive ? 0.34 : 0.04;
  });
  const snippetGlow = useSpring(snippetGlowTarget, { stiffness: 180, damping: 24, mass: 0.36 });
  const snippetRotate = useSpring(
    useTransform(() => {
      if (!enabled || fieldWidth <= 0 || fieldHeight <= 0) return 0;
      const homeX = (fieldWidth * snippet.xPercent) / 100;
      const homeY = getHomeY();
      const dx = homeX - pointerX.get();
      const dy = homeY - pointerY.get();
      const distance = Math.hypot(dx, dy);
      const radius = 220;
      if (!distance || distance > radius) return 0;
      return ((dx + dy) / distance) * 3.5;
    }),
    { stiffness: 140, damping: 20, mass: 0.42 }
  );

  return (
    <motion.div
      className="pointer-events-none absolute"
      style={{
        left: `${snippet.xPercent}%`,
        top: fieldHeight > 0 ? `${getHomeY()}px` : `${snippet.yPercent}%`,
        width: `${snippet.width}px`,
        x: snippetX,
        y: snippetY,
        opacity: snippetOpacity,
        scale: snippetScale,
        rotate: snippetRotate,
        filter: snippetFilter,
        zIndex: isActive ? 2 : 1,
        textShadow: useMotionTemplate`0 0 24px rgba(245,177,45,${snippetGlow})`,
      }}
      animate={{
        y: isActive ? [0, -8, 2, 0] : [0, -5, 0],
        x: isActive ? [0, 2, -1, 0] : [0, 1, 0],
      }}
      transition={{ duration: isActive ? 4.8 : 7.4 + snippet.repulsion / 12, repeat: Infinity, ease: "easeInOut" }}
    >
      <div
        className={`mb-1 font-semibold uppercase tracking-[0.24em] ${isActive ? "text-[11px] text-[rgba(245,177,45,0.96)]" : "text-[10px] text-[rgba(245,177,45,0.68)]"
          }`}
      >
        {snippet.label}
      </div>
      <PretextMeasuredText
        text={displayText}
        font={PRETEXT_HERO_FONT}
        lineHeight={20}
        collapsedLines={3}
        className="max-w-none"
        lineClassName={
          isActive
            ? "text-[14px] font-medium leading-5 text-[rgba(244,236,219,0.96)]"
            : "text-[13px] font-medium leading-5 text-[rgba(231,220,198,0.68)]"
        }
        fallbackClassName={
          isActive
            ? "text-[14px] font-medium leading-5 text-[rgba(244,236,219,0.96)]"
            : "text-[13px] font-medium leading-5 text-[rgba(231,220,198,0.68)]"
        }
      />
    </motion.div>
  );
}

function renderHeroLinkIcon(kind?: string) {
  switch (kind) {
    case "youtube":
      return IconBrandYoutube;
    case "artist":
      return IconUser;
    case "release":
      return IconDisc;
    case "track":
      return IconMusic;
    case "info":
      return IconBrandWikipedia;
    default:
      return IconExternalLink;
  }
}

function compactCountryLabel(text: string, width: number) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized || width <= 0) return normalized;
  if (getPretextLineCount(normalized, HERO_NOTE_HEADER_FONT, width, 18) <= 2) {
    return normalized;
  }

  const simplified = normalized
    .replace(/^The\s+/i, "")
    .replace(/\s+and\s+/gi, " & ")
    .replace(/\s+of\s+/gi, " ");

  if (getPretextLineCount(simplified, HERO_NOTE_HEADER_FONT, width, 18) <= 2) {
    return simplified;
  }

  const words = simplified.split(/\s+/);
  for (let count = words.length - 1; count >= 2; count -= 1) {
    const candidate = `${words.slice(0, count).join(" ")}…`;
    if (getPretextLineCount(candidate, HERO_NOTE_HEADER_FONT, width, 18) <= 2) {
      return candidate;
    }
  }

  return `${words.slice(0, 2).join(" ")}…`;
}

type HeroSectionProps = {
  topCountries: Country[];
  totalStations: number;
  continents: number;
  nowPlaying: Station | null;
  isPlaying: boolean;
  searchQueryRaw: string;
  onStartListening: () => void;
  onQuickRetune: () => void;
  onHoverSound?: () => void;
  onSearch?: (query: string) => void;
};

export function HeroSection({
  topCountries,
  totalStations,
  continents,
  nowPlaying,
  isPlaying,
  searchQueryRaw,
  onStartListening,
  onQuickRetune,
  onHoverSound,
  onSearch,
}: HeroSectionProps) {
  const [useFallback, setUseFallback] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [heroSignalText, setHeroSignalText] = useState<string | null>(null);
  const [hoverNotes, setHoverNotes] = useState<FallingHeroNote[]>([]);
  const [activeSignalZone, setActiveSignalZone] = useState<"left" | "center" | "right" | null>(null);
  const [heroInsightExpanded, setHeroInsightExpanded] = useState(false);
  const [heroArtworkFailed, setHeroArtworkFailed] = useState(false);
  const { ref: heroInsightCloudRef, width: heroInsightCloudWidth, height: heroInsightCloudHeight } = useElementSize();
  const { ref: heroFieldRef, width: heroFieldWidth, height: heroFieldHeight } = useElementSize();
  const { ref: ctaRowRef, width: ctaRowWidth } = useElementSize();
  const { ref: heroNoteRef, width: heroNoteWidth } = useElementSize();
  const insightsOpen = useUIStore((state) => state.insightsOpen);
  const aiTriviaExpanded = useUIStore((state) => state.aiTriviaExpanded);
  const setInsightsOpen = useUIStore((state) => state.setInsightsOpen);
  const setAiTriviaExpanded = useUIStore((state) => state.setAiTriviaExpanded);
  const isSm = useMediaQuery("(min-width: 640px)", false, { getInitialValueInEffect: true });
  const isLg = useMediaQuery("(min-width: 1024px)", false, { getInitialValueInEffect: true });
  const shouldReduceMotion = useReducedMotion();
  const noteIdRef = useRef(0);
  const lastPointerPulseRef = useRef(0);
  const lastPointerZoneRef = useRef<string | null>(null);
  const lastPointerPositionRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const signalTextTimerRef = useRef<number | null>(null);
  const pointerX = useMotionValue(760);
  const pointerY = useMotionValue(240);
  const pointerVelocity = useMotionValue(0);
  const spotlightX = useSpring(pointerX, { stiffness: 140, damping: 26, mass: 0.28 });
  const spotlightY = useSpring(pointerY, { stiffness: 140, damping: 26, mass: 0.28 });
  const spotlightOpacity = useMotionValue(0);
  const spotlightOpacitySpring = useSpring(spotlightOpacity, { stiffness: 160, damping: 24, mass: 0.3 });
  const { scrollY } = useScroll();
  const heroShadow = useTransform(scrollY, [0, 280], ["none", "0 18px 40px rgba(0,0,0,0.45)"]);
  const heroTranslate = useTransform(scrollY, [0, 280], [0, -10]);
  const heroOpacity = useTransform(scrollY, [0, 280], [1, 0.98]);
  const heroTopRange = isLg ? [48, 36] : [32, 20];
  const heroBottomRange = isLg ? [64, 52] : [40, 32];
  const heroPaddingTop = useTransform(scrollY, [0, 280], heroTopRange);
  const heroPaddingBottom = useTransform(scrollY, [0, 280], heroBottomRange);
  const heroHeadlineFont = isLg
    ? '600 55px "General Sans", "SF Pro Display", "Segoe UI", "Helvetica Neue", Arial, sans-serif'
    : isSm
      ? '600 49px "General Sans", "SF Pro Display", "Segoe UI", "Helvetica Neue", Arial, sans-serif'
      : '600 38px "General Sans", "SF Pro Display", "Segoe UI", "Helvetica Neue", Arial, sans-serif';
  const heroBodyFont = isLg
    ? '500 17px "General Sans", "SF Pro Text", "Segoe UI", "Helvetica Neue", Arial, sans-serif'
    : '500 15px "General Sans", "SF Pro Text", "Segoe UI", "Helvetica Neue", Arial, sans-serif';
  const hydratedNowPlaying = isHydrated ? nowPlaying : null;
  const hydratedIsPlaying = isHydrated ? isPlaying : false;
  const hydratedInsightsOpen = isHydrated ? insightsOpen : false;
  const hydratedAiTriviaExpanded = isHydrated ? aiTriviaExpanded : false;
  const heroStationKey = useMemo(
    () =>
      hydratedNowPlaying
        ? [
          hydratedNowPlaying.uuid,
          hydratedNowPlaying.streamUrl,
          hydratedNowPlaying.url,
          hydratedNowPlaying.name,
          hydratedNowPlaying.country,
        ]
          .filter(Boolean)
          .join("|")
        : "",
    [
      hydratedNowPlaying?.country,
      hydratedNowPlaying?.name,
      hydratedNowPlaying?.streamUrl,
      hydratedNowPlaying?.url,
      hydratedNowPlaying?.uuid,
    ]
  );

  const heroTickerItems = useMemo(() => {
    const headlineCountry = topCountries[0]?.name ?? "Global";
    const base = [
      `${totalStations.toLocaleString()} verified stations ready to tune`,
      `${continents} continents on the dial`,
      `Spotlight • ${headlineCountry}`,
    ];

    // Removed "Now playing" to prevent overflow in the pill

    return base;
  }, [continents, topCountries, totalStations]);

  const currentHeroTicker = heroTickerItems[0] ?? "Curated live radio updates";
  const nowPlayingMeta = useNowPlayingMetadata(hydratedNowPlaying, hydratedIsPlaying);
  const freeTrivia = useTrackTrivia({
    track: nowPlayingMeta.track,
    source: "free",
    enabled: Boolean(hydratedIsPlaying && nowPlayingMeta.track),
  });
  const aiTrivia = useTrackTrivia({
    track: nowPlayingMeta.track,
    source: "ai",
    enabled: Boolean(hydratedIsPlaying && nowPlayingMeta.track && hydratedInsightsOpen && hydratedAiTriviaExpanded),
    context: {
      summary: freeTrivia.trivia?.summary ?? null,
      facts: freeTrivia.trivia?.facts ?? [],
    },
  });
  const featureCountry = topCountries[0] ?? null;
  const featureCountryLabel = hydratedNowPlaying?.country ?? featureCountry?.name ?? "Japan";
  const featureCountryCode = hydratedNowPlaying?.countryCode ?? featureCountry?.iso_3166_1;
  const heroTrackArtist = useMemo(
    () => normalizeHeroDisplayText(nowPlayingMeta.track?.artist ?? ""),
    [nowPlayingMeta.track?.artist]
  );
  const heroTrackTitle = useMemo(
    () => formatHeroDisplayTitle(nowPlayingMeta.track?.title ?? ""),
    [nowPlayingMeta.track?.title]
  );
  const heroTrackLine = useMemo(
    () =>
      nowPlayingMeta.status === "ready" && nowPlayingMeta.track
        ? [heroTrackArtist, heroTrackTitle].filter(Boolean).join(" — ")
        : null,
    [heroTrackArtist, heroTrackTitle, nowPlayingMeta.status, nowPlayingMeta.track]
  );
  const heroSignalFacts = useMemo(() => {
    const pieces = [
      hydratedNowPlaying?.language ? `language ${hydratedNowPlaying.language}` : null,
      hydratedNowPlaying?.bitrate ? `${hydratedNowPlaying.bitrate} kbps` : null,
      hydratedNowPlaying?.codec ? hydratedNowPlaying.codec.toUpperCase() : null,
      hydratedNowPlaying?.state || null,
    ].filter(Boolean);
    return pieces.slice(0, 3).join(" • ");
  }, [
    hydratedNowPlaying?.bitrate,
    hydratedNowPlaying?.codec,
    hydratedNowPlaying?.language,
    hydratedNowPlaying?.state,
  ]);
  const heroTagLine = useMemo(() => {
    const tags = hydratedNowPlaying?.tagList?.length
      ? hydratedNowPlaying.tagList
      : (hydratedNowPlaying?.tags ?? "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
    return tags.slice(0, 3).join(" • ");
  }, [hydratedNowPlaying?.tagList, hydratedNowPlaying?.tags]);
  const heroStationFacts = useMemo(
    () =>
      [
        featureCountryLabel ? { label: "Country", value: featureCountryLabel } : null,
        hydratedNowPlaying?.state ? { label: "Region", value: hydratedNowPlaying.state } : null,
        hydratedNowPlaying?.language ? { label: "Language", value: hydratedNowPlaying.language } : null,
        hydratedNowPlaying?.bitrate ? { label: "Signal", value: `${hydratedNowPlaying.bitrate} kbps` } : null,
        hydratedNowPlaying?.codec ? { label: "Codec", value: hydratedNowPlaying.codec.toUpperCase() } : null,
      ].filter(Boolean) as Array<{ label: string; value: string }>,
    [
      featureCountryLabel,
      hydratedNowPlaying?.bitrate,
      hydratedNowPlaying?.codec,
      hydratedNowPlaying?.language,
      hydratedNowPlaying?.state,
    ]
  );
  const heroMetadataSummary = useMemo(() => {
    if (heroTrackLine) {
      return `${heroTrackLine} is on air from ${featureCountryLabel}.${heroTagLine ? ` ${heroTagLine}.` : ""}`;
    }
    if (hydratedNowPlaying) {
      return `${hydratedNowPlaying.name} is live from ${featureCountryLabel}.${heroTagLine ? ` ${heroTagLine}.` : ""} The hero adapts to metadata as the signal settles.`;
    }
    return `${featureCountryLabel} is a strong place to begin. Start with a live station, then keep moving through moods, nearby countries, and listening context that sharpen as the signal settles.`;
  }, [featureCountryLabel, heroTagLine, heroTrackLine, hydratedNowPlaying]);
  const heroMergedFacts = useMemo<TriviaFact[]>(() => {
    const facts = [...(aiTrivia.trivia?.facts ?? []), ...(freeTrivia.trivia?.facts ?? []), ...heroStationFacts];
    return facts.filter((fact, index, collection) => {
      return (
        collection.findIndex(
          (candidate) =>
            candidate.label.toLowerCase() === fact.label.toLowerCase() &&
            candidate.value.toLowerCase() === fact.value.toLowerCase()
        ) === index
      );
    });
  }, [aiTrivia.trivia?.facts, freeTrivia.trivia?.facts, heroStationFacts]);
  const heroMergedLinks = useMemo<TriviaLink[]>(() => {
    const links = [
      ...(aiTrivia.trivia?.links ?? []),
      ...(freeTrivia.trivia?.links ?? []),
      ...(hydratedNowPlaying?.homepage
        ? ([{ label: "Station", url: hydratedNowPlaying.homepage, kind: "info" }] satisfies TriviaLink[])
        : []),
    ];
    return links.filter(
      (link, index, collection) => collection.findIndex((candidate) => candidate.url === link.url) === index
    );
  }, [aiTrivia.trivia?.links, freeTrivia.trivia?.links, hydratedNowPlaying?.homepage]);
  const heroInsightSummary =
    aiTrivia.trivia?.summary ?? freeTrivia.trivia?.summary ?? heroMetadataSummary;
  const heroInsightImage = aiTrivia.trivia?.imageUrl ?? freeTrivia.trivia?.imageUrl ?? null;
  const heroArtworkSrc = heroInsightImage ?? hydratedNowPlaying?.favicon ?? null;
  const heroInsightFacts = heroMergedFacts;
  const heroInsightLinks = heroMergedLinks;
  const heroInsightMoodTokens = useMemo(() => {
    const tokens = [
      ...heroInsightFacts
        .filter((fact) => ["genre", "style", "origin", "mood", "release year", "album"].includes(fact.label.toLowerCase()))
        .map((fact) => fact.value),
      ...(heroTagLine ? heroTagLine.split(" • ") : []),
    ]
      .map((value) => value.trim())
      .filter(Boolean);

    return tokens.filter((value, index, collection) => collection.indexOf(value) === index).slice(0, 4);
  }, [heroInsightFacts, heroTagLine]);
  const heroInsightHeadingFull = heroTrackLine ?? formatHeroDisplayTitle(hydratedNowPlaying?.name ?? "Current signal");
  const heroInsightSubline = [
    featureCountryLabel,
    hydratedNowPlaying?.state,
  ]
    .filter(Boolean)
    .join(" • ");
  const heroInsightSourceLabel =
    aiTrivia.trivia
      ? "AI + metadata"
      : freeTrivia.trivia
        ? "Metadata + enrichment"
        : "Live station metadata";
  const heroInsightYear = heroInsightFacts.find((fact) => fact.label.toLowerCase() === "release year")?.value ?? null;
  const heroInsightTopBadges = useMemo(
    () =>
      [heroInsightYear, hydratedNowPlaying?.bitrate ? `${hydratedNowPlaying.bitrate} kbps` : null]
        .filter(Boolean)
        .slice(0, 2) as string[],
    [heroInsightYear, hydratedNowPlaying?.bitrate]
  );
  const heroSignalChainItems = useMemo(() => {
    const pieces = heroSignalFacts ? heroSignalFacts.split(" • ") : [];
    if (!pieces.length) {
      return ["language adapts", "signal settles", "notes reform"];
    }
    return pieces.slice(0, 3);
  }, [heroSignalFacts]);
  const heroInsightHeaderLinks = useMemo(() => heroInsightLinks.slice(0, 3), [heroInsightLinks]);
  const hasMeasuredHeroField = heroFieldWidth > 0 && heroFieldHeight > 0;
  const hasMeasuredInsightCloud = heroInsightCloudWidth > 0 && heroInsightCloudHeight > 0;
  const showHeroInsightCloud =
    hydratedInsightsOpen &&
    Boolean(heroArtworkSrc || hydratedNowPlaying || heroTrackLine || aiTrivia.trivia || freeTrivia.trivia || heroInsightLinks.length);
  const showMobileHeroInsight = showHeroInsightCloud && !isLg;
  const canRenderHeroInsightCloudItems = showHeroInsightCloud && hasMeasuredInsightCloud;
  const hasHeroCardArtwork = Boolean(heroArtworkSrc && !heroArtworkFailed);
  const insightCloudWidth = heroInsightCloudWidth || 640;
  const insightCloudHeight = heroInsightCloudHeight || 620;
  const heroInsightHeading = useMemo(
    () =>
      truncateHeroDisplayText(
        heroInsightHeadingFull,
        HERO_INSIGHT_TITLE_FONT,
        Math.min(520, insightCloudWidth * 0.72),
        4,
        46,
        92
      ),
    [heroInsightHeadingFull, insightCloudWidth]
  );
  const heroDedupedFacts = useMemo<HeroDisplayFact[]>(() => {
    const conceptPriority = [
      "album",
      "genre",
      "style",
      "mood",
      "type",
      "artist_origin",
      "origin",
      "release",
      "podcast",
      "episode",
      "host",
      "artist",
      "country",
      "region",
      "language",
      "signal",
      "codec",
      "year",
      "title",
      "station",
      "misc",
    ];

    const seenValues = new Set<string>();
    const chosenConcepts = new Set<string>();

    return heroInsightFacts
      .map((fact) => {
        const concept = getInsightConcept(fact.label, fact.value);
        return {
          ...fact,
          concept,
          shortLabel: getInsightShortLabel(fact.label, concept),
        };
      })
      .sort((a, b) => {
        const aIndex = conceptPriority.indexOf(a.concept);
        const bIndex = conceptPriority.indexOf(b.concept);
        return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
      })
      .filter((fact) => {
        const normalizedValue = normalizeInsightText(fact.value);
        if (!normalizedValue) return false;
        if (fact.concept === "genre" && /^\d{4}$/.test(fact.value.trim())) return false;
        if (fact.concept === "mood" && /^\d{4}$/.test(fact.value.trim())) return false;
        if (seenValues.has(normalizedValue)) return false;
        if (chosenConcepts.has(fact.concept) && fact.concept !== "misc") return false;
        seenValues.add(normalizedValue);
        chosenConcepts.add(fact.concept);
        return true;
      });
  }, [heroInsightFacts]);
  const heroInsightCoreReferences = useMemo(() => {
    const headingParts = heroInsightHeading
      .split(/[—-]/)
      .map((part) => part.trim())
      .filter(Boolean);

    return [
      heroInsightHeading,
      heroInsightSubline,
      ...headingParts,
      ...heroInsightTopBadges,
      featureCountryLabel,
      hydratedNowPlaying?.state ?? "",
      hydratedNowPlaying?.name ?? "",
      nowPlayingMeta.track?.artist ?? "",
      nowPlayingMeta.track?.title ?? "",
      ...(hydratedNowPlaying?.language ? [hydratedNowPlaying.language] : []),
      ...(hydratedNowPlaying?.codec ? [hydratedNowPlaying.codec.toUpperCase()] : []),
      ...(hydratedNowPlaying?.bitrate ? [`${hydratedNowPlaying.bitrate} kbps`] : []),
      ...(heroTagLine ? heroTagLine.split(" • ") : []),
    ].filter(Boolean);
  }, [
    featureCountryLabel,
    heroInsightHeading,
    heroInsightSubline,
    heroInsightTopBadges,
    heroTagLine,
    hydratedNowPlaying?.bitrate,
    hydratedNowPlaying?.codec,
    hydratedNowPlaying?.language,
    hydratedNowPlaying?.name,
    hydratedNowPlaying?.state,
    nowPlayingMeta.track?.artist,
    nowPlayingMeta.track?.title,
  ]);
  const heroInsightContextReferences = useMemo(
    () => [...heroInsightCoreReferences, heroInsightSummary],
    [heroInsightCoreReferences, heroInsightSummary]
  );
  const heroCardMetadataItems = useMemo(() => {
    const hiddenConcepts = new Set([
      "country",
      "region",
      "year",
      "signal",
      "language",
      "codec",
      "title",
      "station",
    ]);
    const selected = new Map<string, HeroDisplayFact>();
    const sortFacts = (a: HeroDisplayFact, b: HeroDisplayFact) =>
      getHeroCardConceptRank(a.concept) - getHeroCardConceptRank(b.concept);
    const canSurfaceFact = (fact: HeroDisplayFact, references: string[]) => {
      if (hiddenConcepts.has(fact.concept)) return false;
      if (isInsightDuplicate(fact.value, references)) return false;
      if (selected.has(`${fact.concept}:${normalizeInsightText(fact.value)}`)) return false;
      return true;
    };

    const strictItems = heroDedupedFacts.filter((fact) => canSurfaceFact(fact, heroInsightContextReferences)).sort(sortFacts);
    strictItems.forEach((fact) => {
      if (selected.size >= 6) return;
      selected.set(`${fact.concept}:${normalizeInsightText(fact.value)}`, fact);
    });

    if (selected.size < 4) {
      const relaxedItems = heroDedupedFacts
        .filter((fact) => canSurfaceFact(fact, heroInsightCoreReferences))
        .sort(sortFacts);

      relaxedItems.forEach((fact) => {
        if (selected.size >= 6) return;
        selected.set(`${fact.concept}:${normalizeInsightText(fact.value)}`, fact);
      });
    }

    const items = Array.from(selected.values());
    if (items.length) return items.slice(0, 6);

    const fallback: HeroDisplayFact[] = [];
    if (heroInsightMoodTokens[0]) {
      fallback.push({ label: "Mood", value: heroInsightMoodTokens[0], concept: "mood", shortLabel: "Mood" });
    }
    if (heroSignalChainItems[0]) {
      fallback.push({ label: "Signal", value: heroSignalChainItems[0], concept: "signal", shortLabel: "Signal" });
    }
    return fallback.slice(0, 4);
  }, [heroDedupedFacts, heroInsightContextReferences, heroInsightCoreReferences, heroInsightMoodTokens, heroSignalChainItems]);
  const heroInsightCloudItems = useMemo<HeroInsightCloudItem[]>(() => {
    const seen = new Set<string>();
    const items: HeroInsightCloudItem[] = [];

    const pushItem = (
      kind: HeroInsightCloudItem["kind"],
      eyebrow: string,
      text: string | null | undefined,
      extras?: Pick<HeroInsightCloudItem, "href" | "iconKind">
    ) => {
      const normalized = text?.trim();
      if (!normalized) return;
      const dedupeKey = `${kind}:${normalized.toLowerCase()}`;
      if (seen.has(dedupeKey)) return;
      seen.add(dedupeKey);
      const measuredWidth = safePretextTightWidth(normalized, HERO_CLOUD_TEXT_FONT);
      items.push({
        id: `${kind}-${items.length}-${normalized.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        eyebrow,
        text: normalized,
        kind,
        href: extras?.href,
        iconKind: extras?.iconKind,
        width: clamp(measuredWidth + 44, 120, 212),
      });
    };

    heroDedupedFacts
      .filter((fact) => ["album", "genre", "style", "mood", "type", "artist_origin", "release", "podcast", "host", "episode"].includes(fact.concept))
      .slice(0, 4)
      .forEach((fact) => pushItem("relation", fact.shortLabel, fact.value));
    heroInsightMoodTokens
      .filter((token) => !isInsightDuplicate(token, heroInsightContextReferences))
      .slice(0, 2)
      .forEach((token) => pushItem("mood", "Mood", token));
    heroSignalChainItems.slice(0, 2).forEach((item) => pushItem("signal", "Signal", item));
    heroInsightLinks.slice(0, 3).forEach((link) =>
      pushItem("source", "Source", link.label, { href: link.url, iconKind: link.kind })
    );

    return items.slice(0, HERO_INSIGHT_CLOUD_SLOTS.length);
  }, [heroDedupedFacts, heroInsightContextReferences, heroInsightLinks, heroInsightMoodTokens, heroSignalChainItems]);
  const heroInsightFocus = heroInsightExpanded || activeSignalZone === "right";
  const heroInsightCardLayout = useMemo(() => {
    const artworkColumnWidth = hasHeroCardArtwork ? 92 : 0;
    const maxCardWidth = Math.min(hasHeroCardArtwork ? 612 : 560, insightCloudWidth * 0.84);
    const headingWidth = safePretextTightWidth(heroInsightHeading, HERO_INSIGHT_TITLE_FONT, 15);
    const cardWidth = clamp(
      Math.max(428, headingWidth + 84 + artworkColumnWidth * 0.72, heroCardMetadataItems.length > 4 ? 492 : 448),
      416,
      maxCardWidth
    );
    const summaryWidth = Math.max(280, cardWidth - 48);
    const summaryLines = Math.max(
      3,
      safePretextLineCount(heroInsightSummary, PRETEXT_HERO_FONT, summaryWidth, 23, 8.2)
    );
    const metadataRows = Math.max(1, Math.ceil(heroCardMetadataItems.length / 2));
    const metadataTop = clamp(184 + summaryLines * 22 + (hasHeroCardArtwork ? 8 : 0), 250, 372);
    const metadataHeight = metadataRows * 58 + 34;
    const cardHeight = clamp(metadataTop + metadataHeight + 28, 360, Math.min(580, insightCloudHeight * 0.88));
    const cardLeft = clamp(insightCloudWidth * 0.02, 0, insightCloudWidth - cardWidth);
    const cardTop = clamp(insightCloudHeight * 0.1, 0, insightCloudHeight - cardHeight);
    return {
      cardLeft,
      cardTop,
      cardWidth,
      cardHeight,
      metadataTop,
      metadataHeight,
      metadataRows,
    };
  }, [hasHeroCardArtwork, heroCardMetadataItems.length, heroInsightHeading, heroInsightSummary, insightCloudHeight, insightCloudWidth]);
  const heroInsightCloudLayouts = useMemo(
    () =>
      heroInsightCloudItems.map((item, index) => {
        const cloudSlot = HERO_INSIGHT_CLOUD_SLOTS[index % HERO_INSIGHT_CLOUD_SLOTS.length] ?? HERO_INSIGHT_CLOUD_SLOTS[0]!;
        const { cardLeft, cardTop, cardWidth, cardHeight, metadataTop } = heroInsightCardLayout;
        const gridGap = 12;
        const focusWidth = clamp((cardWidth - 48 - gridGap) / 2, 152, 224);
        const column = index % 2;
        const row = Math.floor(index / 2);
        const cloudTopSafe = heroInsightExpanded ? 116 : 212;
        const cloudBottomSafe = heroInsightExpanded ? 118 : 144;
        const cloudLeft = clamp(cloudSlot.x * insightCloudWidth - item.width * 0.5, 0, insightCloudWidth - item.width);
        const focusLeft = clamp(cardLeft + 24 + column * (focusWidth + gridGap), 0, insightCloudWidth - focusWidth);
        return {
          ...item,
          cardLeft,
          cardTop,
          cardWidth,
          cardHeight,
          cloudWidth: item.width,
          focusWidth,
          cloudLeft,
          cloudTop: clamp(cloudSlot.y * insightCloudHeight, cloudTopSafe, insightCloudHeight - cloudBottomSafe),
          focusLeft,
          focusTop: clamp(cardTop + metadataTop + row * 58, 0, insightCloudHeight - 96),
        };
      }),
    [heroInsightCardLayout, heroInsightCloudItems, heroInsightExpanded, insightCloudHeight, insightCloudWidth]
  );
  const canUseInteractiveNotes = isHydrated && !shouldReduceMotion;
  const signalNote =
    heroInsightSummary ||
    `${featureCountryLabel} is a strong place to begin. Start with a live station, then keep moving through moods, nearby countries, and listening context that sharpen as the signal settles.`;

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    setHeroArtworkFailed(false);
  }, [heroArtworkSrc]);
  useEffect(() => {
    if (!hydratedInsightsOpen) {
      setHeroInsightExpanded(false);
      return;
    }
  }, [hydratedInsightsOpen]);
  useEffect(() => {
    if (typeof window === "undefined" || typeof CSS === "undefined") return;
    setUseFallback(!CSS.supports("animation-timeline: scroll()"));
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.sessionStorage.getItem("focusSearch") === "1") {
      window.sessionStorage.removeItem("focusSearch");
      const searchInput = document.getElementById("hero-search-input") as HTMLInputElement | null;
      if (searchInput) {
        searchInput.focus();
        searchInput.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") return;

    const focusHeroSearch = () => {
      const searchInput = document.getElementById("hero-search-input") as HTMLInputElement | null;
      if (!searchInput) return false;
      searchInput.focus();
      searchInput.select();
      searchInput.scrollIntoView({ behavior: "smooth", block: "center" });
      return true;
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const isShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      if (!isShortcut) return;

      event.preventDefault();
      focusHeroSearch();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
  useEffect(() => {
    if (!isHydrated || !heroStationKey) return;
    setHeroInsightExpanded(false);
    setAiTriviaExpanded(false);
    setHeroSignalText(null);
    setActiveSignalZone(null);
  }, [heroStationKey, isHydrated, setAiTriviaExpanded]);
  const quickRetuneLabel = useMemo(() => {
    if (ctaRowWidth <= 0) return "Quick Retune";
    const fullWidthBudget = Math.floor(ctaRowWidth - 32);
    const primaryAllowance = 206;
    const fullFits = fitsPretextWidth("Quick Retune", HERO_CTA_FONT, fullWidthBudget - primaryAllowance, 48);
    return fullFits ? "Quick Retune" : "Retune";
  }, [ctaRowWidth]);
  const toggleHeroInsights = () => {
    if (hydratedInsightsOpen) {
      setInsightsOpen(false);
      setHeroInsightExpanded(false);
      return;
    }
    setAiTriviaExpanded(true);
    setInsightsOpen(true);
  };
  const heroNoteStatus = useMemo(() => {
    if (heroNoteWidth <= 0) return "Live now";
    const chromeAllowance = 26 + 8 + 16 + 18;
    const fullStatusWidth = getPretextTightWidth("Live now", HERO_NOTE_STATUS_FONT) + 12;
    const availableWidth = Math.floor(heroNoteWidth - chromeAllowance - fullStatusWidth);
    const canKeepFullStatus =
      availableWidth > 72 &&
      getPretextLineCount(featureCountryLabel, HERO_NOTE_HEADER_FONT, availableWidth, 18) <= 2;
    return canKeepFullStatus ? "Live now" : "Live";
  }, [featureCountryLabel, heroNoteWidth]);
  const compactHeroCountryLabel = useMemo(() => {
    if (heroNoteWidth <= 0) return featureCountryLabel;
    const chromeAllowance = 26 + 8 + 16 + 18;
    const statusWidth = getPretextTightWidth(heroNoteStatus, HERO_NOTE_STATUS_FONT) + 12;
    const availableWidth = Math.max(96, Math.floor(heroNoteWidth - chromeAllowance - statusWidth));
    return compactCountryLabel(featureCountryLabel, availableWidth);
  }, [featureCountryLabel, heroNoteStatus, heroNoteWidth]);
  const heroSignalOptions = useMemo(() => {
    const country = featureCountryLabel;
    const leftPhrases = [
      hydratedNowPlaying?.name ? `${hydratedNowPlaying.name} is carrying ${heroTagLine || "local radio texture"} from ${country}.` : null,
      heroSignalFacts ? `Signal lane: ${heroSignalFacts}.` : null,
      hydratedNowPlaying?.homepage ? `Station ledger includes a direct station source.` : null,
    ].filter(Boolean) as string[];
    const centerPhrases = [
      heroTrackLine ? `Live track: ${heroTrackLine}.` : null,
      heroInsightSummary,
      nowPlayingMeta.status === "loading" ? "Reading ICY metadata from the active stream…" : null,
    ].filter(Boolean) as string[];
    const rightPhrases = [
      heroInsightFacts[0]
        ? `${heroInsightFacts[0].label}: ${heroInsightFacts[0].value}.`
        : null,
      heroInsightFacts[1]
        ? `${heroInsightFacts[1].label}: ${heroInsightFacts[1].value}.`
        : null,
      `${country} is glowing on the dial right now.`,
    ].filter(Boolean) as string[];
    return {
      left: leftPhrases.length
        ? leftPhrases
        : [
          "Early notes drift in before the route card turns.",
          "Recent picks wake with a soft crate-dig hiss.",
        ],
      center: centerPhrases.length
        ? centerPhrases
        : [
          "The dial moves, the copy reflows, the home feed stays composed.",
          "Live metadata bends through the center lane without shifting the poster.",
        ],
      right: rightPhrases.length
        ? rightPhrases
        : [
          `${country} is glowing on the dial right now.`,
          "Country context lands like a field note instead of a data dump.",
        ],
    };
  }, [
    featureCountryLabel,
    heroInsightFacts,
    heroInsightSummary,
    heroSignalFacts,
    heroTagLine,
    heroTrackLine,
    hydratedNowPlaying?.homepage,
    hydratedNowPlaying?.name,
    nowPlayingMeta.status,
  ]);
  const manuscriptSnippets = useMemo<HeroManuscriptSnippet[]>(() => {
    const trackText = heroTrackLine ?? "Waiting for a clean ICY title from the active stream.";
    const summaryText = heroInsightSummary ?? signalNote;
    const factText =
      heroInsightFacts.slice(0, 2).map((fact) => `${fact.label}: ${fact.value}`).join(" • ")
      || heroSignalFacts
      || "Metadata, tags, and country context will settle into this field.";
    const moodText =
      heroInsightMoodTokens.join(" • ") || heroTagLine || "country notes • live station tags • route context";
    const compactTrackText = nowPlayingMeta.track?.title
      ?? hydratedNowPlaying?.name
      ?? "live track";
    const compactSummaryText = heroInsightFacts[0]
      ? `${heroInsightFacts[0].label}: ${heroInsightFacts[0].value}`
      : "hover for richer note";
    const compactFactText = heroSignalFacts
      ? heroSignalFacts.split(" • ").slice(0, 2).join(" • ")
      : "language • codec";
    return [
      {
        id: "station",
        zone: "left",
        label: "station",
        text: `${featureCountryLabel} • ${hydratedNowPlaying?.name ?? "Global route signal"}`,
        compactText: hydratedNowPlaying?.name ?? featureCountryLabel,
        width: 290,
        xPercent: 46,
        yPercent: 18,
        repulsion: 46,
      },
      {
        id: "track",
        zone: "center",
        label: "track",
        text: trackText,
        compactText: compactTrackText,
        width: 330,
        xPercent: 59,
        yPercent: 31,
        repulsion: 60,
      },
      {
        id: "signal",
        zone: "center",
        label: "signal",
        text: factText,
        compactText: compactFactText,
        width: 270,
        xPercent: 56,
        yPercent: 56,
        repulsion: 50,
      },
      {
        id: "notes",
        zone: "right",
        label: aiTrivia.status === "ready" ? "insights" : "notes",
        text: summaryText,
        compactText: compactSummaryText,
        width: 300,
        xPercent: 61,
        yPercent: 22,
        repulsion: 66,
      },
      {
        id: "dial",
        zone: "right",
        label: heroInsightMoodTokens.length ? "mood" : "dial",
        text: moodText,
        compactText: heroInsightMoodTokens[0] ?? "dial cues",
        width: 220,
        xPercent: 74,
        yPercent: 63,
        repulsion: 44,
      },
    ];
  }, [
    aiTrivia.status,
    featureCountryLabel,
    heroInsightFacts,
    heroInsightSummary,
    heroSignalFacts,
    heroInsightMoodTokens,
    heroTagLine,
    heroTrackLine,
    hydratedNowPlaying?.name,
    nowPlayingMeta.track?.title,
    signalNote,
  ]);
  const manuscriptZoneBounds = useMemo(() => {
    const leftPositions = manuscriptSnippets
      .filter((snippet) => snippet.zone === "left")
      .map((snippet) => snippet.xPercent / 100);
    const centerPositions = manuscriptSnippets
      .filter((snippet) => snippet.zone === "center")
      .map((snippet) => snippet.xPercent / 100);
    const rightPositions = manuscriptSnippets
      .filter((snippet) => snippet.zone === "right")
      .map((snippet) => snippet.xPercent / 100);

    const average = (values: number[], fallback: number) =>
      values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : fallback;

    const leftCenter = average(leftPositions, 0.4);
    const centerCenter = average(centerPositions, 0.58);
    const rightCenter = average(rightPositions, 0.74);

    return {
      leftMax: (leftCenter + centerCenter) / 2,
      centerMax: (centerCenter + rightCenter) / 2,
    };
  }, [manuscriptSnippets]);
  const heroSignalPrompt = "Move through the signal field to wake the manuscript.";
  const heroSignalDisplayText = heroSignalText ?? heroSignalPrompt;
  const heroSpotlight = useMotionTemplate`radial-gradient(240px circle at ${spotlightX}px ${spotlightY}px, rgba(245,177,45,0.18), rgba(245,177,45,0.08) 28%, transparent 72%)`;
  const enableFallback = useFallback && !shouldReduceMotion;

  useEffect(() => {
    return () => {
      if (signalTextTimerRef.current) {
        window.clearTimeout(signalTextTimerRef.current);
      }
    };
  }, []);

  function queueHeroSignalText(text: string) {
    setHeroSignalText(text);
    if (signalTextTimerRef.current) {
      window.clearTimeout(signalTextTimerRef.current);
    }
    signalTextTimerRef.current = window.setTimeout(() => {
      setHeroSignalText(null);
    }, 1800);
  }

  function spawnHeroNote(x: number, y: number) {
    const glyphs = ["♪", "♫", "♩"];
    const note: FallingHeroNote = {
      id: noteIdRef.current++,
      x,
      y,
      glyph: glyphs[Math.floor(Math.random() * glyphs.length)] ?? "♪",
      driftX: (Math.random() - 0.5) * 42,
      driftY: 56 + Math.random() * 42,
      rotation: (Math.random() - 0.5) * 26,
      size: 15 + Math.random() * 7,
      duration: 1.1 + Math.random() * 0.5,
    };
    setHoverNotes((current) => [...current.slice(-10), note]);
    window.setTimeout(() => {
      setHoverNotes((current) => current.filter((item) => item.id !== note.id));
    }, note.duration * 1000 + 160);
  }

  function handleHeroPointerMove(event: React.PointerEvent<HTMLElement>) {
    if (!canUseInteractiveNotes || event.pointerType !== "mouse") return;
    const now = performance.now();
    const nativeEvent = event.nativeEvent as PointerEvent & { offsetX?: number; offsetY?: number };
    const x = nativeEvent.offsetX ?? 0;
    const y = nativeEvent.offsetY ?? 0;
    const ratio = event.currentTarget.clientWidth > 0 ? x / event.currentTarget.clientWidth : 0;
    const lastPointer = lastPointerPositionRef.current;
    if (lastPointer) {
      const dt = Math.max(16, now - lastPointer.time);
      const velocity = Math.hypot(x - lastPointer.x, y - lastPointer.y) / (dt / 1000);
      pointerVelocity.set(velocity);
    }
    lastPointerPositionRef.current = { x, y, time: now };
    pointerX.set(x);
    pointerY.set(y);
    spotlightOpacity.set(1);

    const zone =
      ratio < manuscriptZoneBounds.leftMax
        ? "left"
        : ratio > manuscriptZoneBounds.centerMax
          ? "right"
          : "center";
    if (zone !== lastPointerZoneRef.current) {
      lastPointerZoneRef.current = zone;
      setActiveSignalZone(zone);
      const phrases = heroSignalOptions[zone];
      const text = phrases[Math.floor(Math.random() * phrases.length)] ?? heroSignalPrompt;
      queueHeroSignalText(text);
    }
    if (now - lastPointerPulseRef.current >= 180) {
      lastPointerPulseRef.current = now;
      spawnHeroNote(x, y);
    }
  }

  function handleHeroPointerLeave() {
    spotlightOpacity.set(0);
    pointerVelocity.set(0);
    lastPointerPositionRef.current = null;
    lastPointerZoneRef.current = null;
    setActiveSignalZone(null);
  }

  function openHeroInsightCard() {
    setHeroInsightExpanded(true);
    setAiTriviaExpanded(true);
    setInsightsOpen(true);
  }

  function closeHeroInsightCard() {
    setHeroInsightExpanded(false);
  }

  return (
    <motion.section
      id="home-hero"
      className="hero-morph relative -mt-4 w-full overflow-hidden"
      onPointerMove={handleHeroPointerMove}
      onPointerLeave={handleHeroPointerLeave}
      style={enableFallback ? { boxShadow: heroShadow } : undefined}
    >
      <img
        src="/pretext-atlas-hero.png"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover object-[68%_center]"
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, rgba(8,10,16,0.9) 0%, rgba(8,10,16,0.72) 34%, rgba(8,10,16,0.3) 58%, rgba(8,10,16,0.82) 100%), radial-gradient(circle at 18% 22%, rgba(245, 177, 45, 0.18), transparent 32%), radial-gradient(circle at 80% 12%, rgba(255, 200, 90, 0.1), transparent 24%), linear-gradient(180deg, rgba(11,12,16,0.2) 0%, rgba(11,12,16,0.55) 72%, rgba(15,17,24,0.96) 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[48%]"
        style={{
          background:
            "linear-gradient(180deg, rgba(8,10,16,0) 0%, rgba(8,10,16,0.06) 12%, rgba(8,10,16,0.18) 26%, rgba(8,10,16,0.38) 46%, rgba(8,10,16,0.68) 68%, rgba(8,10,16,0.9) 84%, rgba(8,10,16,1) 100%), radial-gradient(70% 100% at 50% 100%, rgba(8,10,16,0.98) 0%, rgba(8,10,16,0.72) 38%, rgba(8,10,16,0.18) 72%, rgba(8,10,16,0) 100%)",
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(245,177,45,0.16),transparent_26%)]" />
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ backgroundImage: heroSpotlight, opacity: spotlightOpacitySpring }}
      />
      <div className="pointer-events-none absolute inset-0">
        <AnimatePresence>
          {hoverNotes.map((note) => (
            <motion.span
              key={note.id}
              className="absolute text-[var(--rp-gold)] drop-shadow-[0_8px_18px_rgba(245,177,45,0.28)]"
              style={{ left: note.x, top: note.y, fontSize: `${note.size}px` }}
              initial={{ opacity: 0, y: -6, x: 0, rotate: note.rotation * 0.3, scale: 0.86 }}
              animate={{
                opacity: [0, 0.95, 0],
                y: note.driftY,
                x: note.driftX,
                rotate: note.rotation,
                scale: [0.86, 1, 0.96],
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: note.duration, ease: [0.2, 0.65, 0.2, 1] }}
            >
              {note.glyph}
            </motion.span>
          ))}
        </AnimatePresence>
      </div>
      <div className="absolute inset-0 hidden lg:block">
        <motion.div
          initial={false}
          animate={{
            opacity: !hasMeasuredHeroField ? 0 : heroInsightExpanded ? 0.22 : 1,
            scale: heroInsightExpanded ? 0.985 : 1,
            filter: heroInsightExpanded ? "blur(1.5px)" : "blur(0px)",
          }}
          transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
        >
          {hasMeasuredHeroField ? manuscriptSnippets.map((snippet) => (
            <HeroSignalSnippet
              key={snippet.id}
              snippet={snippet}
              pointerX={pointerX}
              pointerY={pointerY}
              fieldWidth={heroFieldWidth}
              fieldHeight={heroFieldHeight}
              activeZone={activeSignalZone}
              enabled={canUseInteractiveNotes}
            />
          )) : null}
        </motion.div>
        {showHeroInsightCloud ? (
          <motion.div
            ref={heroInsightCloudRef}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: heroInsightFocus ? 1 : 0.9, x: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="pointer-events-none absolute bottom-[8%] right-[2%] top-[16%] z-20 w-[43%] min-w-[30rem]"
          >
            {!heroArtworkFailed && heroArtworkSrc ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.92, x: 18, y: 8 }}
                animate={{
                  opacity: heroInsightExpanded ? 0 : 0.88,
                  scale: heroInsightExpanded ? 0.42 : 1,
                  x: heroInsightExpanded ? -108 : 0,
                  y: heroInsightExpanded ? 124 : 0,
                  rotate: heroInsightExpanded ? -8 : 0,
                  filter: heroInsightExpanded ? "blur(3px)" : "blur(0px)",
                }}
                transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                className="pointer-events-auto absolute right-[10%] top-[12%] cursor-pointer"
                style={{ pointerEvents: heroInsightExpanded ? "none" : "auto" }}
                onClick={(event) => {
                  event.stopPropagation();
                  openHeroInsightCard();
                }}
              >
                <img
                  src={heroArtworkSrc}
                  alt="Track or artist artwork"
                  className="h-40 w-40 rounded-[2.2rem] border border-white/14 object-cover shadow-[0_30px_70px_rgba(0,0,0,0.5)]"
                  onError={() => setHeroArtworkFailed(true)}
                />
                <div className="pointer-events-none absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-[rgba(245,177,45,0.18)] bg-[rgba(8,10,16,0.36)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[rgba(247,240,224,0.72)] backdrop-blur-sm">
                  Open listening story
                </div>
              </motion.div>
            ) : (
              <motion.button
                type="button"
                initial={{ opacity: 0, scale: 0.92, x: 18, y: 8 }}
                animate={{
                  opacity: heroInsightExpanded ? 0 : 0.78,
                  scale: heroInsightExpanded ? 0.42 : 1,
                  x: heroInsightExpanded ? -108 : 0,
                  y: heroInsightExpanded ? 124 : 0,
                  rotate: heroInsightExpanded ? -8 : 0,
                  filter: heroInsightExpanded ? "blur(3px)" : "blur(0px)",
                }}
                transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                className="pointer-events-auto absolute right-[10%] top-[12%] flex h-40 w-40 cursor-pointer flex-col items-center justify-center rounded-[2.2rem] border border-white/14 bg-[linear-gradient(180deg,rgba(12,14,18,0.72)_0%,rgba(16,19,26,0.58)_100%)] text-center shadow-[0_30px_70px_rgba(0,0,0,0.46)]"
                style={{ pointerEvents: heroInsightExpanded ? "none" : "auto" }}
                onClick={(event) => {
                  event.stopPropagation();
                  openHeroInsightCard();
                }}
              >
                <IconMusic size={30} className="text-[var(--rp-gold)]" />
                <div className="mt-4 max-w-[8rem] text-[14px] font-medium leading-5 text-[rgba(247,240,224,0.74)]">
                  Open listening story
                </div>
              </motion.button>
            )}

            <motion.div
              className="absolute inset-0 z-30"
              initial={false}
              animate={{
                clipPath: heroInsightExpanded
                  ? `inset(${Math.max(0, heroInsightCardLayout.cardTop + 2)}px ${Math.max(
                    0,
                    insightCloudWidth - (heroInsightCardLayout.cardLeft + heroInsightCardLayout.cardWidth) + 2
                  )
                  }px ${Math.max(
                    0,
                    insightCloudHeight -
                    (heroInsightCardLayout.cardTop + heroInsightCardLayout.cardHeight) +
                    2
                  )
                  }px ${Math.max(0, heroInsightCardLayout.cardLeft + 2)}px round 2rem)`
                  : "inset(0px 0px 0px 0px round 0rem)",
              }}
              transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
            >
              {canRenderHeroInsightCloudItems ? heroInsightCloudLayouts.map((item, index) => {
                const Icon = item.iconKind ? renderHeroLinkIcon(item.iconKind) : null;
                const Component = item.href ? motion.a : motion.div;
                const targetLeft = heroInsightExpanded ? item.focusLeft : item.cloudLeft;
                const targetTop = heroInsightExpanded ? item.focusTop : item.cloudTop;
                const targetWidth = heroInsightExpanded ? item.focusWidth : item.cloudWidth;
                const verticalDrift = heroInsightExpanded ? 0 : (index % 2 === 0 ? -8 : 8);
                const rotation = heroInsightExpanded ? 0 : (index % 2 === 0 ? -4 : 5);

                return (
                  <Component
                    key={item.id}
                    {...(item.href
                      ? {
                        href: item.href,
                        target: "_blank",
                        rel: "noreferrer",
                      }
                      : {})}
                    initial={false}
                    animate={{
                      left: targetLeft,
                      top: targetTop,
                      width: targetWidth,
                      y: verticalDrift,
                      rotate: rotation,
                      scale: heroInsightExpanded ? 0.94 : 1,
                      opacity: heroInsightExpanded ? 0 : 0.8,
                    }}
                    transition={{
                      left: { type: "spring", stiffness: 130, damping: 20, mass: 0.9, delay: index * 0.02 },
                      top: { type: "spring", stiffness: 130, damping: 20, mass: 0.9, delay: index * 0.02 },
                      width: { type: "spring", stiffness: 130, damping: 24, mass: 1, delay: index * 0.02 },
                      y: { type: "spring", stiffness: 90, damping: 18, mass: 0.8, delay: index * 0.02 },
                      rotate: { type: "spring", stiffness: 80, damping: 18, mass: 0.8, delay: index * 0.02 },
                      scale: { duration: 0.28, ease: "easeOut" },
                      opacity: {
                        duration: heroInsightExpanded ? 0.14 : 0.28,
                        delay: heroInsightExpanded ? 0.22 + index * 0.01 : 0,
                        ease: "easeOut",
                      },
                    }}
                    className="pointer-events-auto absolute z-30"
                    onPointerDown={(event: React.PointerEvent<HTMLElement>) => event.stopPropagation()}
                    onClick={(event: React.MouseEvent<HTMLElement>) => event.stopPropagation()}
                  >
                    <div
                      className={`rounded-[1.45rem] border px-3 py-2 shadow-[0_16px_30px_rgba(0,0,0,0.18)] ${heroInsightExpanded
                        ? "border-[rgba(245,177,45,0.1)] bg-[linear-gradient(180deg,rgba(20,22,30,0.74)_0%,rgba(14,16,22,0.6)_100%)] backdrop-blur-[6px]"
                        : "border-[rgba(245,177,45,0.12)] bg-[linear-gradient(180deg,rgba(8,10,16,0.2)_0%,rgba(8,10,16,0.28)_100%)] backdrop-blur-[10px]"
                        }`}
                    >
                      <div className="flex items-center gap-2">
                        {Icon ? <Icon size={12} className="text-[var(--rp-gold)]" /> : null}
                        <div
                          className="text-[9px] font-semibold uppercase tracking-[0.22em] text-[var(--rp-gold)]"
                          style={{ letterSpacing: "0.18em" }}
                        >
                          {item.eyebrow}
                        </div>
                      </div>
                      <PretextMeasuredText
                        text={item.text}
                        font={HERO_CLOUD_TEXT_FONT}
                        lineHeight={17}
                        collapsedLines={2}
                        className="mt-1"
                        lineClassName="text-[12px] font-medium leading-[1.35] text-[rgba(247,240,224,0.84)]"
                        fallbackClassName="text-[12px] font-medium leading-[1.35] text-[rgba(247,240,224,0.84)]"
                      />
                    </div>
                  </Component>
                );
              }) : null}
            </motion.div>

            <AnimatePresence>
              {heroInsightExpanded ? (
                <motion.div
                  initial={{
                    opacity: 0,
                    scale: 0.78,
                    rotateY: 14,
                    x: 42,
                    y: 26,
                    filter: "blur(8px)",
                    clipPath: "inset(34% 10% 16% 56% round 2.8rem)",
                  }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    rotateY: 0,
                    x: 0,
                    y: 0,
                    filter: "blur(0px)",
                    clipPath: "inset(0% 0% 0% 0% round 2.1rem)",
                  }}
                  exit={{
                    opacity: 0,
                    scale: 0.82,
                    rotateY: -10,
                    x: 46,
                    y: 26,
                    filter: "blur(8px)",
                    clipPath: "inset(34% 10% 16% 56% round 2.8rem)",
                  }}
                  transition={{
                    duration: 0.48,
                    delay: 0.08,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="pointer-events-auto absolute z-20 rounded-[2.1rem] border border-[rgba(245,177,45,0.24)] bg-[linear-gradient(180deg,rgba(12,14,18,0.94)_0%,rgba(14,17,24,0.86)_100%)] px-6 py-6 shadow-[0_32px_82px_rgba(0,0,0,0.46)] backdrop-blur-xl"
                  style={{
                    left: `${heroInsightCardLayout.cardLeft}px`,
                    top: `${heroInsightCardLayout.cardTop}px`,
                    width: `${heroInsightCardLayout.cardWidth}px`,
                    minHeight: `${heroInsightCardLayout.cardHeight}px`,
                    transformPerspective: 1400,
                  }}
                >
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.28, delay: 0.22, ease: "easeOut" }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--rp-gold)]">
                          Listening story
                        </div>
                        <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[rgba(247,240,224,0.58)]">
                          {heroInsightSourceLabel}
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        {hasHeroCardArtwork ? (
                          <div className="mr-1 overflow-hidden rounded-[1.15rem] border border-white/12 shadow-[0_16px_30px_rgba(0,0,0,0.32)]">
                            <img
                              src={heroArtworkSrc ?? ""}
                              alt=""
                              aria-hidden="true"
                              className="h-[4.65rem] w-[4.65rem] object-cover"
                            />
                          </div>
                        ) : null}
                        {heroInsightHeaderLinks.length > 0 ? (
                          <div className="rounded-[1rem] border border-white/10 bg-[rgba(255,255,255,0.04)] px-2.5 py-1.5">
                            <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[rgba(247,240,224,0.52)]">
                              Sources
                            </div>
                            <div className="mt-1 flex flex-wrap gap-1.5">
                              {heroInsightHeaderLinks.map((link) => {
                                const Icon = renderHeroLinkIcon(link.kind);
                                return (
                                  <span
                                    key={`header-${link.url}`}
                                    className="inline-flex items-center gap-1 rounded-full border border-[rgba(245,177,45,0.14)] bg-[rgba(255,255,255,0.03)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[rgba(247,240,224,0.72)]"
                                    title={link.label}
                                  >
                                    <Icon size={11} className="text-[var(--rp-gold)]" />
                                    <span>{link.label}</span>
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        ) : null}
                        {featureCountryCode ? (
                          <div className="rounded-[1rem] border border-white/10 bg-[rgba(255,255,255,0.04)] px-2 py-1.5">
                            <div className="flex items-center gap-2">
                              <CountryFlag iso={featureCountryCode} size={16} title={featureCountryLabel} />
                              {heroInsightTopBadges.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5">
                                  {heroInsightTopBadges.map((badge) => (
                                    <span
                                      key={badge}
                                      className="rounded-full border border-[rgba(245,177,45,0.14)] bg-[rgba(255,255,255,0.03)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[rgba(247,240,224,0.72)]"
                                    >
                                      {badge}
                                    </span>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        ) : null}
                        <button
                          type="button"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-[rgba(255,255,255,0.04)] text-[rgba(247,240,224,0.68)] hover:text-[var(--rp-text)]"
                          onClick={(event) => {
                            event.stopPropagation();
                            closeHeroInsightCard();
                          }}
                          aria-label="Close listening story"
                        >
                          <IconX size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 max-w-[36rem] space-y-2">
                      <div
                        className="max-w-[34rem] text-[1.72rem] font-semibold leading-tight text-[var(--rp-text)]"
                        title={heroInsightHeadingFull !== heroInsightHeading ? heroInsightHeadingFull : undefined}
                      >
                        {heroInsightHeading}
                      </div>
                      {heroInsightSubline ? (
                        <div className="text-[12px] font-medium uppercase tracking-[0.16em] text-[rgba(247,240,224,0.48)]">
                          {heroInsightSubline}
                        </div>
                      ) : null}
                    </div>

                    <div className="mt-4 max-w-[36rem]">
                      <PretextMeasuredText
                        text={heroInsightSummary}
                        font={PRETEXT_HERO_FONT}
                        lineHeight={23}
                        collapsedLines={6}
                        lineClassName="text-[15px] font-medium leading-[1.48] text-[rgba(247,240,224,0.9)]"
                        fallbackClassName="text-[15px] font-medium leading-[1.48] text-[rgba(247,240,224,0.9)]"
                      />
                    </div>
                    <div
                      className="mt-5 rounded-[1.6rem] border border-[rgba(245,177,45,0.08)] bg-[rgba(255,255,255,0.02)] px-4 py-4"
                      style={{ minHeight: `${heroInsightCardLayout.metadataHeight}px` }}
                    >
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                        transition={{ duration: 0.24, delay: 0.26, ease: "easeOut" }}
                        className="grid grid-cols-2 gap-3"
                      >
                        {heroCardMetadataItems.map((item) => {
                          const FactIcon = renderHeroFactIcon(item.concept);
                          return (
                            <div
                              key={`card-${item.label}-${item.value}`}
                              className="rounded-[1.2rem] border border-[rgba(245,177,45,0.1)] bg-[linear-gradient(180deg,rgba(20,22,30,0.6)_0%,rgba(14,16,22,0.48)_100%)] px-3 py-2"
                            >
                              <div className="flex items-center gap-2">
                                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-[rgba(245,177,45,0.12)] bg-[rgba(255,255,255,0.03)] text-[var(--rp-gold)]">
                                  <FactIcon size={12} />
                                </span>
                                <div
                                  className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[var(--rp-gold)]"
                                  style={{ letterSpacing: "0.16em" }}
                                >
                                  {item.shortLabel}
                                </div>
                              </div>
                              <PretextMeasuredText
                                text={item.value}
                                font={HERO_CLOUD_TEXT_FONT}
                                lineHeight={17}
                                collapsedLines={2}
                                className="mt-1"
                                lineClassName="text-[12px] font-medium leading-[1.35] text-[rgba(247,240,224,0.84)]"
                                fallbackClassName="text-[12px] font-medium leading-[1.35] text-[rgba(247,240,224,0.84)]"
                              />
                            </div>
                          );
                        })}
                      </motion.div>
                    </div>
                  </motion.div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.div>
        ) : null}
      </div>
      <motion.div
        ref={heroFieldRef}
        className="hero-morph__inner relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 transition-all duration-300"
        style={enableFallback ? { paddingTop: heroPaddingTop, paddingBottom: heroPaddingBottom } : undefined}
      >
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="hero-morph__content grid min-h-[calc(100svh-16rem)] gap-5 py-7 lg:grid-cols-12 lg:items-end lg:py-8"
          style={enableFallback ? { y: heroTranslate, opacity: heroOpacity } : undefined}
        >
          <div className="relative z-10 lg:col-span-7">
            <motion.span
              className="inline-flex h-8 items-center gap-2 rounded-full border border-white/10 bg-black/40 px-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--rp-muted)] shadow-[0_12px_30px_rgba(0,0,0,0.45)] backdrop-blur"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
              role="status"
              aria-live="polite"
            >
              <span className="h-2 w-2 rounded-full bg-[var(--rp-gold)] animate-pulse" />
              <AnimatePresence initial={false} mode="wait">
                <motion.span
                  key={currentHeroTicker}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.32, ease: [0.42, 0, 0.58, 1] }}
                >
                  {currentHeroTicker}
                </motion.span>
              </AnimatePresence>
            </motion.span>

            <div className="mt-6 flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-transparent text-xl font-black tracking-tight text-[var(--rp-gold)] shadow-[0_16px_32px_rgba(0,0,0,0.5)]">
                <img
                  src="/RP180.png"
                  alt="Radio Passport"
                  className="h-full w-full object-cover scale-[1.16] translate-y-0"
                />
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.34em] text-[var(--rp-muted-2)]">
                  Radio Passport
                </div>
                <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--rp-muted-2)]">
                  Curated Live Radio
                </div>
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.16 }}
            >
              <ElasticHeroText
                as="h1"
                text="Live radio, organized around what you want to hear next."
                font={heroHeadlineFont}
                lineHeight={isLg ? 52 : isSm ? 46 : 36}
                enabled={canUseInteractiveNotes}
                radius={190}
                strength={24}
                mode="letters"
                spring={{ stiffness: 156, damping: 18, mass: 0.28 }}
                rotateSpring={{ stiffness: 132, damping: 16, mass: 0.24 }}
                rotateFactor={3.2}
                scaleBoost={0.055}
                velocityBoost={0.92}
                className="mt-5 max-w-[11ch] text-[2.4rem] font-semibold leading-[0.94] tracking-tight text-[var(--rp-text)] sm:text-[3.05rem] lg:text-[3.45rem]"
                tokenClassName="inline-block will-change-transform"
              />
            </motion.div>

            {!showMobileHeroInsight ? (
              <ElasticHeroText
                as="p"
                text="Start with moods, regions, news, and strong live stations, then branch into country pages, recent picks, and deeper listening notes only when you need them."
                font={heroBodyFont}
                lineHeight={isLg ? 28 : 24}
                enabled={canUseInteractiveNotes}
                radius={176}
                strength={20}
                spring={{ stiffness: 110, damping: 18, mass: 0.56 }}
                rotateSpring={{ stiffness: 96, damping: 18, mass: 0.52 }}
                rotateFactor={1.55}
                scaleBoost={0.024}
                velocityBoost={0.22}
                className="mt-3 max-w-xl text-[15px] font-medium leading-6 text-[var(--rp-muted)] sm:text-[17px]"
              />
            ) : null}

            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--rp-muted-2)]">
              <ElasticHeroText
                as="span"
                text={`${topCountries.length.toLocaleString()} countries`}
                font={HERO_PROOF_FONT}
                lineHeight={16}
                mode="letters"
                letterSpacing={2.64}
                enabled={canUseInteractiveNotes}
                radius={120}
                strength={12}
                className="inline-block"
                tokenClassName="pointer-events-none inline-block will-change-transform"
                spring={{ stiffness: 148, damping: 22, mass: 0.44 }}
                rotateSpring={{ stiffness: 132, damping: 22, mass: 0.44 }}
                rotateFactor={1.35}
                scaleBoost={0.018}
              />
              <span className="h-1 w-1 rounded-full bg-[var(--rp-gold)]" />
              <ElasticHeroText
                as="span"
                text={totalStations > 1000
                  ? `${(totalStations / 1000).toFixed(0)}k+ live stations`
                  : `${totalStations.toLocaleString()} live stations`}
                font={HERO_PROOF_FONT}
                lineHeight={16}
                mode="letters"
                letterSpacing={2.64}
                enabled={canUseInteractiveNotes}
                radius={120}
                strength={12}
                className="inline-block"
                tokenClassName="pointer-events-none inline-block will-change-transform"
                spring={{ stiffness: 148, damping: 22, mass: 0.44 }}
                rotateSpring={{ stiffness: 132, damping: 22, mass: 0.44 }}
                rotateFactor={1.35}
                scaleBoost={0.018}
              />
              <span className="h-1 w-1 rounded-full bg-[var(--rp-gold)]" />
              <ElasticHeroText
                as="span"
                text={`${continents} continents on the dial`}
                font={HERO_PROOF_FONT}
                lineHeight={16}
                mode="letters"
                letterSpacing={2.64}
                enabled={canUseInteractiveNotes}
                radius={120}
                strength={12}
                className="inline-block"
                tokenClassName="pointer-events-none inline-block will-change-transform"
                spring={{ stiffness: 148, damping: 22, mass: 0.44 }}
                rotateSpring={{ stiffness: 132, damping: 22, mass: 0.44 }}
                rotateFactor={1.35}
                scaleBoost={0.018}
              />
            </div>

            {!showMobileHeroInsight ? (
              <div className="relative mt-3 h-[3.5rem] max-w-[27rem]">
                <div className="pointer-events-none absolute inset-x-0 top-0 rounded-full border border-[rgba(245,177,45,0.14)] bg-[rgba(8,10,16,0.3)] px-4 py-2 shadow-[0_14px_28px_rgba(0,0,0,0.18)] backdrop-blur-sm">
                  <div className="mb-1 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--rp-gold)]">
                    <span className="text-[11px]">♪</span>
                    Signal script
                  </div>
                  <AnimatePresence initial={false} mode="wait">
                    <motion.div
                      key={heroSignalDisplayText}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.24, ease: "easeOut" }}
                    >
                      <PretextMeasuredText
                        text={heroSignalDisplayText}
                        font={HERO_SIGNAL_FONT}
                        lineHeight={18}
                        collapsedLines={2}
                        lineClassName="text-[13px] font-medium text-[rgba(247,240,224,0.82)]"
                        fallbackClassName="text-[13px] font-medium text-[rgba(247,240,224,0.82)]"
                      />
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            ) : null}

            <div className="mt-5 max-w-2xl">
              <div className="relative group">
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-[rgba(245,177,45,0.4)] to-[rgba(245,177,45,0.12)] blur opacity-40 transition duration-700 group-hover:opacity-70" />
                <div className="relative flex items-center rounded-2xl border border-white/10 bg-[var(--rp-card)] shadow-[0_18px_40px_rgba(0,0,0,0.6)] backdrop-blur-xl focus-within:ring-2 focus-within:ring-[rgba(245,177,45,0.4)]">
                  <div className="pl-5 text-[var(--rp-muted-2)]">
                    <IconSearch size={20} />
                  </div>
                  <input
                    id="hero-search-input"
                    type="text"
                    value={searchQueryRaw}
                    onChange={(e) => onSearch?.(e.target.value)}
                    placeholder="Search stations, moods, countries, or news..."
                    className="w-full bg-transparent px-5 py-4 text-base font-medium text-[var(--rp-text)] focus:outline-none placeholder:text-[var(--rp-muted-2)]"
                  />
                  {searchQueryRaw && (
                    <button
                      type="button"
                      onClick={() => onSearch?.("")}
                      className="mr-2 p-2 text-[var(--rp-muted-2)] transition-colors hover:text-[var(--rp-text)]"
                    >
                      <IconX size={18} />
                    </button>
                  )}
                  <div className="pr-4 hidden sm:block">
                    <button
                      type="button"
                      onClick={() => {
                        const searchInput = document.getElementById("hero-search-input") as HTMLInputElement | null;
                        if (!searchInput) return;
                        searchInput.focus();
                        searchInput.select();
                      }}
                      className="text-[10px] font-semibold text-[var(--rp-muted-2)] bg-black/40 px-2 py-1 rounded border border-white/10 transition-colors hover:text-[var(--rp-text)]"
                      aria-label="Focus search with Command K"
                    >
                      ⌘K
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div ref={ctaRowRef} className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="group flex h-12 items-center gap-3 rounded-full bg-[var(--rp-gold)] px-6 text-sm font-semibold uppercase tracking-[0.2em] text-black shadow-[0_18px_36px_rgba(245,177,45,0.35)] transition-all hover:bg-[var(--rp-gold-strong)] active:scale-[0.98]"
                onClick={onStartListening}
                onMouseEnter={onHoverSound}
              >
                <IconHeadphones size={18} className="text-black" />
                Start Listening
              </button>

              <button
                type="button"
                className="flex h-12 items-center gap-2 rounded-full border border-white/10 bg-black/40 px-5 text-sm font-semibold text-[var(--rp-text)] transition-all hover:bg-black/60"
                onClick={onQuickRetune}
              >
                <IconCompass size={18} className="text-[var(--rp-gold)]" />
                {quickRetuneLabel}
              </button>

              {!isLg && showHeroInsightCloud ? (
                <button
                  type="button"
                  className={`flex h-12 items-center gap-2 rounded-full border px-5 text-sm font-semibold transition-all ${hydratedInsightsOpen
                    ? "border-[rgba(245,177,45,0.42)] bg-[rgba(245,177,45,0.14)] text-[var(--rp-gold)]"
                    : "border-white/10 bg-black/40 text-[var(--rp-text)] hover:bg-black/60"}`}
                  onClick={toggleHeroInsights}
                  aria-pressed={hydratedInsightsOpen}
                >
                  <IconSparkles size={17} className="text-[var(--rp-gold)]" />
                  {hydratedInsightsOpen ? "Hide Story" : "Open Story"}
                </button>
              ) : null}

              {showMobileHeroInsight ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.26, ease: "easeOut" }}
                  className="w-full rounded-[1.65rem] border border-[rgba(245,177,45,0.18)] bg-[linear-gradient(180deg,rgba(12,14,18,0.88)_0%,rgba(14,17,24,0.82)_100%)] p-4 shadow-[0_18px_44px_rgba(0,0,0,0.38)] backdrop-blur-xl"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--rp-gold)]">
                        Listening story
                      </div>
                      <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[rgba(247,240,224,0.56)]">
                        {heroInsightSourceLabel}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-[rgba(255,255,255,0.04)] text-[rgba(247,240,224,0.68)]"
                      onClick={toggleHeroInsights}
                      aria-label="Hide listening story"
                    >
                      <IconX size={14} />
                    </button>
                  </div>

                  <div className="mt-3 flex items-start gap-3">
                    {hasHeroCardArtwork ? (
                      <div className="overflow-hidden rounded-[1rem] border border-white/12 shadow-[0_12px_24px_rgba(0,0,0,0.28)]">
                        <img
                          src={heroArtworkSrc ?? ""}
                          alt=""
                          aria-hidden="true"
                          className="h-14 w-14 object-cover"
                        />
                      </div>
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <PretextMeasuredText
                        text={heroInsightHeadingFull}
                        font={HERO_INSIGHT_TITLE_FONT}
                        lineHeight={34}
                        collapsedLines={2}
                        lineClassName="text-[1.3rem] font-semibold leading-tight text-[var(--rp-text)]"
                        fallbackClassName="text-[1.3rem] font-semibold leading-tight text-[var(--rp-text)]"
                      />
                      {heroInsightSubline ? (
                        <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[rgba(247,240,224,0.48)]">
                          {heroInsightSubline}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-3">
                    <PretextMeasuredText
                      text={heroInsightSummary}
                      font={PRETEXT_HERO_FONT}
                      lineHeight={21}
                      collapsedLines={3}
                      expandable
                      moreLabel="Expand note"
                      lessLabel="Collapse note"
                      lineClassName="text-[14px] font-medium leading-[1.45] text-[rgba(247,240,224,0.88)]"
                      fallbackClassName="text-[14px] font-medium leading-[1.45] text-[rgba(247,240,224,0.88)]"
                    />
                  </div>

                  {heroCardMetadataItems.length > 0 ? (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {heroCardMetadataItems.slice(0, isSm ? 4 : 2).map((item) => {
                        const FactIcon = renderHeroFactIcon(item.concept);
                        return (
                          <div
                            key={`mobile-${item.label}-${item.value}`}
                            className="rounded-[1.1rem] border border-[rgba(245,177,45,0.1)] bg-[rgba(255,255,255,0.03)] px-3 py-2"
                          >
                            <div className="flex items-center gap-2">
                              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-[rgba(245,177,45,0.12)] bg-[rgba(255,255,255,0.03)] text-[var(--rp-gold)]">
                                <FactIcon size={12} />
                              </span>
                              <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--rp-gold)]">
                                {item.shortLabel}
                              </div>
                            </div>
                            <PretextMeasuredText
                              text={item.value}
                              font={HERO_CLOUD_TEXT_FONT}
                              lineHeight={16}
                              collapsedLines={2}
                              className="mt-1"
                              lineClassName="text-[12px] font-medium leading-[1.35] text-[rgba(247,240,224,0.84)]"
                              fallbackClassName="text-[12px] font-medium leading-[1.35] text-[rgba(247,240,224,0.84)]"
                            />
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </motion.div>
              ) : null}

            </div>
          </div>

        </motion.div>
      </motion.div>
    </motion.section>
  );
}
