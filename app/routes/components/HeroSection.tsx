import { type RefObject, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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
import { CountryFlag } from "~/components/CountryFlag";
import { PretextMeasuredText } from "~/components/PretextMeasuredText";
import { useNowPlayingMetadata } from "~/hooks/useNowPlayingMetadata";
import { useTrackTrivia } from "~/hooks/useTrackTrivia";
import { useUIStore } from "~/state/uiStore";
import { fitsPretextWidth, getPretextLineCount, getPretextTightWidth } from "~/utils/pretextLayout";
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

function ElasticHeroParticle({
  token,
  anchorRef,
  measureKey,
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
}: {
  token: string;
  anchorRef: RefObject<HTMLElement | null>;
  measureKey?: number;
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
}) {
  const particleRef = useRef<HTMLSpanElement | null>(null);
  const [home, setHome] = useState<{ x: number; y: number } | null>(null);

  useLayoutEffect(() => {
    const measure = () => {
      const anchor = anchorRef.current;
      const node = particleRef.current;
      if (!anchor || !node) return;
      const anchorRect = anchor.getBoundingClientRect();
      const rect = node.getBoundingClientRect();
      setHome({
        x: rect.left - anchorRect.left + rect.width / 2,
        y: rect.top - anchorRect.top + rect.height / 2,
      });
    };

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [anchorRef, token, measureKey]);

  const offsetX = useTransform(() => {
    if (!enabled || !home) return 0;
    const dx = home.x - pointerX.get();
    const dy = home.y - pointerY.get();
    const distance = Math.hypot(dx, dy);
    if (!distance || distance > radius) return 0;
    const velocityMultiplier = 1 + Math.min(1.2, pointerVelocity.get() / 1600) * velocityBoost;
    const force = (1 - distance / radius) * strength * velocityMultiplier;
    return (dx / distance) * force;
  });
  const offsetY = useTransform(() => {
    if (!enabled || !home) return 0;
    const dx = home.x - pointerX.get();
    const dy = home.y - pointerY.get();
    const distance = Math.hypot(dx, dy);
    if (!distance || distance > radius) return 0;
    const velocityMultiplier = 1 + Math.min(1.2, pointerVelocity.get() / 1600) * velocityBoost;
    const force = (1 - distance / radius) * strength * 0.88 * velocityMultiplier;
    return (dy / distance) * force;
  });
  const rotate = useTransform(() => {
    if (!enabled || !home) return 0;
    const dx = home.x - pointerX.get();
    const dy = home.y - pointerY.get();
    const distance = Math.hypot(dx, dy);
    if (!distance || distance > radius) return 0;
    return ((dx + dy) / distance) * rotateFactor;
  });
  const particleX = useSpring(offsetX, spring);
  const particleY = useSpring(offsetY, spring);
  const particleRotate = useSpring(rotate, rotateSpring);
  const particleScale = useSpring(
    useTransform(() => {
      if (!enabled || !home) return 1;
      const dx = home.x - pointerX.get();
      const dy = home.y - pointerY.get();
      const distance = Math.hypot(dx, dy);
      if (!distance || distance > radius) return 1;
      return 1 + (1 - distance / radius) * scaleBoost;
    }),
    spring
  );

  return (
    <motion.span
      ref={particleRef}
      className={className}
      style={{ x: particleX, y: particleY, rotate: particleRotate, scale: particleScale }}
    >
      {token}
    </motion.span>
  );
}

function ElasticHeroText({
  as = "div",
  text,
  anchorRef,
  measureKey,
  pointerX,
  pointerY,
  pointerVelocity,
  enabled,
  radius,
  strength,
  className,
  tokenClassName,
  mode = "words",
  spring,
  rotateSpring,
  rotateFactor,
  scaleBoost,
  velocityBoost,
}: {
  as?: "h1" | "p" | "div";
  text: string;
  anchorRef: RefObject<HTMLElement | null>;
  measureKey?: number;
  pointerX: MotionValue<number>;
  pointerY: MotionValue<number>;
  pointerVelocity: MotionValue<number>;
  enabled: boolean;
  radius: number;
  strength: number;
  className?: string;
  tokenClassName?: string;
  mode?: "words" | "letters";
  spring?: ElasticParticleSpring;
  rotateSpring?: ElasticParticleSpring;
  rotateFactor?: number;
  scaleBoost?: number;
  velocityBoost?: number;
}) {
  const Tag = as;
  const tokens = useMemo(
    () =>
      text
        .trim()
        .split(/\s+/)
        .map((word, index) => ({
          id: `${word}-${index}`,
          value: word,
        })),
    [text]
  );

  return (
    <Tag className={className}>
      {mode === "letters"
        ? tokens.map((token, tokenIndex) => (
          <span
            key={token.id}
            className="mr-[0.18em] inline-block whitespace-nowrap last:mr-0"
          >
            {Array.from(token.value).map((character, characterIndex) => (
              <ElasticHeroParticle
                key={`${token.id}-${character}-${characterIndex}`}
                token={character}
                anchorRef={anchorRef}
                measureKey={measureKey}
                pointerX={pointerX}
                pointerY={pointerY}
                pointerVelocity={pointerVelocity}
                enabled={enabled}
                radius={radius}
                strength={strength}
                className={tokenClassName ?? "inline-block will-change-transform"}
                spring={spring}
                rotateSpring={rotateSpring}
                rotateFactor={rotateFactor}
                scaleBoost={scaleBoost}
                velocityBoost={velocityBoost}
              />
            ))}
          </span>
        ))
        : tokens.map((token) => (
          <ElasticHeroParticle
            key={token.id}
            token={token.value}
            anchorRef={anchorRef}
            measureKey={measureKey}
            pointerX={pointerX}
            pointerY={pointerY}
            pointerVelocity={pointerVelocity}
            enabled={enabled}
            radius={radius}
            strength={strength}
            className={tokenClassName ?? "mr-[0.18em] inline-block last:mr-0"}
            spring={spring}
            rotateSpring={rotateSpring}
            rotateFactor={rotateFactor}
            scaleBoost={scaleBoost}
            velocityBoost={velocityBoost}
          />
        ))}
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
  const offsetX = useTransform(() => {
    if (!enabled || fieldWidth <= 0 || fieldHeight <= 0) return 0;
    const homeX = (fieldWidth * snippet.xPercent) / 100;
    const homeY = (fieldHeight * snippet.yPercent) / 100;
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
    const homeY = (fieldHeight * snippet.yPercent) / 100;
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
  const snippetOpacity = useSpring(
    useTransform(() => {
      if (!enabled) return isActive ? 0.88 : 0.56;
      return activeZone === null ? 0.6 : isActive ? 1 : 0.22;
    }),
    { stiffness: 180, damping: 24, mass: 0.4 }
  );
  const snippetScale = useSpring(
    useTransform(() => {
      if (!enabled) return isActive ? 1.03 : 1;
      return isActive ? 1.085 : 0.985;
    }),
    { stiffness: 180, damping: 24, mass: 0.38 }
  );
  const snippetBlur = useSpring(
    useTransform(() => {
      if (!enabled || activeZone === null) return 0;
      return isActive ? 0 : 0.65;
    }),
    { stiffness: 200, damping: 24, mass: 0.34 }
  );
  const snippetFilter = useMotionTemplate`blur(${snippetBlur}px)`;
  const snippetGlow = useSpring(
    useTransform(() => {
      if (!enabled || activeZone === null) return isActive ? 0.22 : 0.08;
      return isActive ? 0.34 : 0.04;
    }),
    { stiffness: 180, damping: 24, mass: 0.36 }
  );
  const snippetRotate = useSpring(
    useTransform(() => {
      if (!enabled || fieldWidth <= 0 || fieldHeight <= 0) return 0;
      const homeX = (fieldWidth * snippet.xPercent) / 100;
      const homeY = (fieldHeight * snippet.yPercent) / 100;
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
        top: `${snippet.yPercent}%`,
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
        className={`mb-1 font-semibold uppercase tracking-[0.24em] ${
          isActive ? "text-[11px] text-[rgba(245,177,45,0.96)]" : "text-[10px] text-[rgba(245,177,45,0.68)]"
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
  onMissionExploreWorld?: () => void;
  onMissionStayLocal?: () => void;
  onHoverSound?: () => void;
  onSearch?: (query: string) => void;
  onOpenPassport?: () => void;
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
  const [heroTickerIndex, setHeroTickerIndex] = useState(0);
  const [useFallback, setUseFallback] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [measureVersion, setMeasureVersion] = useState(0);
  const [heroSignalText, setHeroSignalText] = useState<string | null>(null);
  const [hoverNotes, setHoverNotes] = useState<FallingHeroNote[]>([]);
  const [activeSignalZone, setActiveSignalZone] = useState<"left" | "center" | "right" | null>(null);
  const heroSectionRef = useRef<HTMLElement | null>(null);
  const { ref: heroFieldRef, width: heroFieldWidth, height: heroFieldHeight } = useElementSize();
  const { ref: ctaRowRef, width: ctaRowWidth } = useElementSize();
  const { ref: heroNoteRef, width: heroNoteWidth } = useElementSize();
  const insightsOpen = useUIStore((state) => state.insightsOpen);
  const aiTriviaExpanded = useUIStore((state) => state.aiTriviaExpanded);
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
  const hydratedNowPlaying = isHydrated ? nowPlaying : null;
  const hydratedIsPlaying = isHydrated ? isPlaying : false;
  const hydratedInsightsOpen = isHydrated ? insightsOpen : false;
  const hydratedAiTriviaExpanded = isHydrated ? aiTriviaExpanded : false;

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

  const currentHeroTicker = heroTickerItems.length
    ? heroTickerItems[heroTickerIndex % heroTickerItems.length]
    : "Global radio passport updates";
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
  const displayTrivia = aiTrivia.status === "ready" && aiTrivia.trivia ? aiTrivia.trivia : freeTrivia.trivia;
  const heroInsightLinks = useMemo(() => (displayTrivia?.links ?? []).slice(0, 4), [displayTrivia?.links]);
  const heroInsightImage = displayTrivia?.imageUrl ?? null;
  const heroTrackLine = useMemo(
    () =>
      nowPlayingMeta.status === "ready" && nowPlayingMeta.track
        ? [nowPlayingMeta.track.artist, nowPlayingMeta.track.title].filter(Boolean).join(" — ")
        : null,
    [nowPlayingMeta.status, nowPlayingMeta.track]
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
  const signalNote = displayTrivia?.summary
    ?? (heroTrackLine
      ? `${heroTrackLine} is on air from ${featureCountryLabel}. ${heroSignalFacts ? `${heroSignalFacts}.` : ""} This note field is driven by live station and track metadata.`
      : hydratedNowPlaying
        ? `${hydratedNowPlaying.name} is live from ${featureCountryLabel}. ${heroTagLine ? `${heroTagLine}.` : ""} The hero can adapt to live metadata without losing its composition.`
        : `${featureCountryLabel} is a strong first stop. Pick a station, then move through the atlas with route cards, country notes, and live context that adapt to the signal.`);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (heroTickerItems.length === 0) return;

    const interval = window.setInterval(() => {
      setHeroTickerIndex((prev) => (prev + 1) % heroTickerItems.length);
    }, 4200);

    return () => window.clearInterval(interval);
  }, [heroTickerItems.length]);

  useEffect(() => {
    setHeroTickerIndex(0);
  }, [heroTickerItems.length]);
  useEffect(() => {
    if (typeof window === "undefined" || !isHydrated) return;
    const bump = () => {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          setMeasureVersion((value) => value + 1);
        });
      });
    };

    bump();
    window.addEventListener("load", bump);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && heroSectionRef.current) {
      resizeObserver = new ResizeObserver(() => bump());
      resizeObserver.observe(heroSectionRef.current);
    }

    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    if (fonts?.ready) {
      void fonts.ready.then(() => bump()).catch(() => {});
    }

    return () => {
      window.removeEventListener("load", bump);
      resizeObserver?.disconnect();
    };
  }, [isHydrated]);
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
  const quickRetuneLabel = useMemo(() => {
    if (ctaRowWidth <= 0) return "Quick Retune";
    const fullWidthBudget = Math.floor(ctaRowWidth - 32);
    const primaryAllowance = 206;
    const fullFits = fitsPretextWidth("Quick Retune", HERO_CTA_FONT, fullWidthBudget - primaryAllowance, 48);
    return fullFits ? "Quick Retune" : "Retune";
  }, [ctaRowWidth]);
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
  const canUseInteractiveNotes = !shouldReduceMotion;
  const heroSignalOptions = useMemo(() => {
    const country = featureCountryLabel;
    const leftPhrases = [
      hydratedNowPlaying?.name ? `${hydratedNowPlaying.name} is carrying ${heroTagLine || "local radio texture"} from ${country}.` : null,
      heroSignalFacts ? `Signal lane: ${heroSignalFacts}.` : null,
      hydratedNowPlaying?.homepage ? `Station ledger includes a direct station source.` : null,
    ].filter(Boolean) as string[];
    const centerPhrases = [
      heroTrackLine ? `Live track: ${heroTrackLine}.` : null,
      displayTrivia?.summary ?? null,
      nowPlayingMeta.status === "loading" ? "Reading ICY metadata from the active stream…" : null,
    ].filter(Boolean) as string[];
    const rightPhrases = [
      displayTrivia?.facts?.[0]
        ? `${displayTrivia.facts[0].label}: ${displayTrivia.facts[0].value}.`
        : null,
      displayTrivia?.facts?.[1]
        ? `${displayTrivia.facts[1].label}: ${displayTrivia.facts[1].value}.`
        : null,
      `${country} is glowing on the dial right now.`,
    ].filter(Boolean) as string[];
    return {
      left: leftPhrases.length
        ? leftPhrases
        : [
            "Early notes drift in before the route card turns.",
            "Passport stamps wake with a soft crate-dig hiss.",
          ],
      center: centerPhrases.length
        ? centerPhrases
        : [
            "The dial moves, the copy reflows, the atlas stays composed.",
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
    displayTrivia?.facts,
    displayTrivia?.summary,
    heroSignalFacts,
    heroTagLine,
    heroTrackLine,
    hydratedNowPlaying?.homepage,
    hydratedNowPlaying?.name,
    nowPlayingMeta.status,
  ]);
  const manuscriptSnippets = useMemo<HeroManuscriptSnippet[]>(() => {
    const trackText = heroTrackLine ?? "Waiting for a clean ICY title from the active stream.";
    const summaryText = displayTrivia?.summary ?? signalNote;
    const factText =
      displayTrivia?.facts?.slice(0, 2).map((fact) => `${fact.label}: ${fact.value}`).join(" • ")
      || heroSignalFacts
      || "Metadata, tags, and country context will settle into this field.";
    const tagOrLinkText = heroInsightLinks.length
      ? heroInsightLinks.map((link) => link.label).join(" • ")
      : heroTagLine || "country notes • live station tags • route context";
    const compactTrackText = nowPlayingMeta.track?.title
      ?? hydratedNowPlaying?.name
      ?? "live track";
    const compactSummaryText = displayTrivia?.facts?.[0]
      ? `${displayTrivia.facts[0].label}: ${displayTrivia.facts[0].value}`
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
        width: 320,
        xPercent: 73,
        yPercent: 20,
        repulsion: 66,
      },
      {
        id: "dial",
        zone: "right",
        label: heroInsightLinks.length ? "links" : "dial",
        text: tagOrLinkText,
        compactText: heroInsightLinks[0]?.label ?? "dial cues",
        width: 220,
        xPercent: 74,
        yPercent: 63,
        repulsion: 44,
      },
    ];
  }, [
    aiTrivia.status,
    displayTrivia?.facts,
    displayTrivia?.summary,
    featureCountryLabel,
    heroSignalFacts,
    heroInsightLinks,
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
      glyph: glyphs[Math.floor(Math.random() * glyphs.length)],
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

    const bounds = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;
    const ratio = bounds.width > 0 ? x / bounds.width : 0;
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
      const text = phrases[Math.floor(Math.random() * phrases.length)];
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

  return (
    <motion.section
      ref={heroSectionRef}
      className="hero-morph relative -mt-4 w-full overflow-hidden"
      onPointerMove={handleHeroPointerMove}
      onPointerLeave={handleHeroPointerLeave}
      style={enableFallback ? { boxShadow: heroShadow } : undefined}
    >
      <img
        src="/pretext-atlas-hero.png"
        alt=""
        aria-hidden="true"
        onLoad={() => setMeasureVersion((value) => value + 1)}
        className="absolute inset-0 h-full w-full object-cover object-[68%_center]"
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, rgba(8,10,16,0.9) 0%, rgba(8,10,16,0.72) 34%, rgba(8,10,16,0.3) 58%, rgba(8,10,16,0.82) 100%), radial-gradient(circle at 18% 22%, rgba(245, 177, 45, 0.18), transparent 32%), radial-gradient(circle at 80% 12%, rgba(255, 200, 90, 0.1), transparent 24%), linear-gradient(180deg, rgba(11,12,16,0.2) 0%, rgba(11,12,16,0.55) 72%, rgba(15,17,24,0.96) 100%)",
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
        {manuscriptSnippets.map((snippet) => (
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
        ))}
        <AnimatePresence>
          {displayTrivia && heroInsightImage ? (
            <motion.img
              key={heroInsightImage}
              initial={{ opacity: 0, scale: 0.9, x: 16, y: 8 }}
              animate={{ opacity: activeSignalZone === "right" ? 0.95 : 0.72, scale: activeSignalZone === "right" ? 1.02 : 1, x: 0, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, x: 12, y: 6 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              src={heroInsightImage}
              alt="Track or artist artwork"
              className="pointer-events-none absolute left-[69%] top-[44%] h-16 w-16 rounded-2xl border border-white/12 object-cover shadow-[0_14px_32px_rgba(0,0,0,0.34)]"
            />
          ) : null}
        </AnimatePresence>
        {heroInsightLinks.length > 0 ? (
          <motion.div
            animate={{ opacity: activeSignalZone === "right" ? 0.95 : 0.62, y: activeSignalZone === "right" ? -2 : 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="pointer-events-auto absolute left-[72%] top-[58%] flex items-center gap-2"
          >
            {heroInsightLinks.map((link) => {
              const Icon = renderHeroLinkIcon(link.kind);
              return (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(245,177,45,0.18)] bg-[rgba(8,10,16,0.42)] text-[var(--rp-gold)] shadow-[0_10px_22px_rgba(0,0,0,0.24)] backdrop-blur-sm"
                  aria-label={link.label}
                  title={link.label}
                >
                  <Icon size={16} />
                </a>
              );
            })}
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
                  Global Sound Atlas
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
                text="A listening atlas for people who travel by sound."
                anchorRef={heroSectionRef}
                measureKey={measureVersion}
                pointerX={pointerX}
                pointerY={pointerY}
                pointerVelocity={pointerVelocity}
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

            <ElasticHeroText
              as="p"
              text="Tune into live radio from every country, then follow a clear route into local stations, listening notes, and country-level discovery."
              anchorRef={heroSectionRef}
              measureKey={measureVersion}
              pointerX={pointerX}
              pointerY={pointerY}
              pointerVelocity={pointerVelocity}
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

            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--rp-muted-2)]">
              <ElasticHeroText
                as="div"
                text={`${topCountries.length.toLocaleString()} countries`}
                anchorRef={heroSectionRef}
                measureKey={measureVersion}
                pointerX={pointerX}
                pointerY={pointerY}
                pointerVelocity={pointerVelocity}
                enabled={canUseInteractiveNotes}
                radius={120}
                strength={12}
                className="contents"
                tokenClassName="mr-[0.14em] inline-block last:mr-0"
                spring={{ stiffness: 148, damping: 22, mass: 0.44 }}
                rotateSpring={{ stiffness: 132, damping: 22, mass: 0.44 }}
                rotateFactor={1.35}
                scaleBoost={0.018}
              />
              <span className="h-1 w-1 rounded-full bg-[var(--rp-gold)]" />
              <ElasticHeroText
                as="div"
                text={totalStations > 1000
                  ? `${(totalStations / 1000).toFixed(0)}k+ live stations`
                  : `${totalStations.toLocaleString()} live stations`}
                anchorRef={heroSectionRef}
                measureKey={measureVersion}
                pointerX={pointerX}
                pointerY={pointerY}
                pointerVelocity={pointerVelocity}
                enabled={canUseInteractiveNotes}
                radius={120}
                strength={12}
                className="contents"
                tokenClassName="mr-[0.14em] inline-block last:mr-0"
                spring={{ stiffness: 148, damping: 22, mass: 0.44 }}
                rotateSpring={{ stiffness: 132, damping: 22, mass: 0.44 }}
                rotateFactor={1.35}
                scaleBoost={0.018}
              />
              <span className="h-1 w-1 rounded-full bg-[var(--rp-gold)]" />
              <ElasticHeroText
                as="div"
                text={`${continents} continents on the dial`}
                anchorRef={heroSectionRef}
                measureKey={measureVersion}
                pointerX={pointerX}
                pointerY={pointerY}
                pointerVelocity={pointerVelocity}
                enabled={canUseInteractiveNotes}
                radius={120}
                strength={12}
                className="contents"
                tokenClassName="mr-[0.14em] inline-block last:mr-0"
                spring={{ stiffness: 148, damping: 22, mass: 0.44 }}
                rotateSpring={{ stiffness: 132, damping: 22, mass: 0.44 }}
                rotateFactor={1.35}
                scaleBoost={0.018}
              />
            </div>

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
                    placeholder="Search countries, cities, or stations..."
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
                    <span className="text-[10px] font-semibold text-[var(--rp-muted-2)] bg-black/40 px-2 py-1 rounded border border-white/10">
                      ⌘K
                    </span>
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

            </div>
          </div>

        </motion.div>
      </motion.div>
    </motion.section>
  );
}
