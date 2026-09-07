import { useEffect, useRef } from "react";
import {
  MOTION_PHASE_SPEED,
  MOTION_SCROLL_GAIN,
  decayBoost,
  dotFalloff,
  hypotrochoidPoint,
} from "./motionField";
import { hexRgb } from "./theaterLock";

type Tint = readonly [number, number, number];

const FALLBACK_TINT: { foil: Tint; ether: Tint; bone: Tint } = {
  foil: [198, 165, 106],
  ether: [126, 184, 180],
  bone: [232, 223, 208],
};

function tintOf(element: HTMLElement) {
  const style = getComputedStyle(element);
  return {
    foil: hexRgb(style.getPropertyValue("--ew-foil")) ?? FALLBACK_TINT.foil,
    ether: hexRgb(style.getPropertyValue("--ew-ether")) ?? FALLBACK_TINT.ether,
    bone: hexRgb(style.getPropertyValue("--ew-bone")) ?? FALLBACK_TINT.bone,
  };
}

function rgba(tint: Tint, alpha: number) {
  return `rgba(${tint[0]}, ${tint[1]}, ${tint[2]}, ${alpha})`;
}

/** Deterministic shimmer seed per dot — the field breathes, never pulses. */
function hash01(index: number) {
  const x = Math.sin(index * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

const CURVES = [
  { bigR: 5, rollerR: 3, penD: 2.1, dots: 220, delta: 0 },
  { bigR: 7, rollerR: 4, penD: 2.6, dots: 180, delta: Math.PI / 3 },
] as const;

const FRAME_MS = 50;
const MAX_BOOST = 3.2;

/**
 * Ambient dotted spirograph — the Tusi field from docs/MOTION_DESIGN.md.
 * Breathes on its own, winds with scroll, settles after. Sits behind
 * content (z-0, pointer-events none), pauses offscreen, paints one static
 * frame under prefers-reduced-motion.
 */
export function TusiField({ className = "ew-tusi" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const parent = canvas.parentElement ?? canvas;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let phase = hash01(7) * Math.PI * 2;
    let boost = 0;
    let lastY = window.scrollY;
    let lastNow = performance.now();
    let lastPaint = 0;
    let raf = 0;
    let onscreen = true;

    const resize = () => {
      const rect = parent.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const nextWidth = Math.max(1, Math.floor(rect.width * dpr));
      const nextHeight = Math.max(1, Math.floor(rect.height * dpr));
      if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
        canvas.width = nextWidth;
        canvas.height = nextHeight;
      }
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const paint = (now: number) => {
      const reduced = media.matches;
      const dt = Math.min(0.1, Math.max(0, (now - lastNow) / 1000));
      lastNow = now;
      if (!reduced) {
        phase += (MOTION_PHASE_SPEED + boost) * dt;
        boost = decayBoost(boost, dt);
      }
      const rect = parent.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      if (width < 2 || height < 2) return;
      const time = now / 1000;
      const palette = tintOf(parent);
      const tints = [palette.foil, palette.ether, palette.bone] as const;
      context.clearRect(0, 0, width, height);
      const cx = width / 2;
      const cy = height / 2;
      const scale = Math.min(width, height) * 0.44;
      CURVES.forEach((curve, curveIndex) => {
        for (let i = 0; i < curve.dots; i++) {
          const theta =
            (i / curve.dots) * Math.PI * 2 + phase + curve.delta;
          const [nx, ny] = hypotrochoidPoint(
            curve.bigR,
            curve.rollerR,
            curve.penD,
            theta
          );
          const radius01 = Math.min(1, Math.hypot(nx, ny));
          const size = dotFalloff(radius01, 1.6, 3.2);
          if (size <= 0) continue;
          const shimmer = reduced
            ? 0.7
            : 0.45 + 0.4 * Math.sin(time * 0.7 + hash01(i * 3 + curveIndex) * Math.PI * 2);
          const tint = tints[(i + curveIndex) % tints.length]!;
          context.fillStyle = rgba(tint, 0.26 * shimmer);
          context.beginPath();
          context.arc(cx + nx * scale, cy + ny * scale, size, 0, Math.PI * 2);
          context.fill();
        }
      });
    };

    const loop = (now: number) => {
      if (now - lastPaint >= FRAME_MS) {
        lastPaint = now;
        if (onscreen) paint(now);
        else lastNow = now;
      }
      raf = window.requestAnimationFrame(loop);
    };

    const onScroll = () => {
      const y = window.scrollY;
      const dy = y - lastY;
      lastY = y;
      if (media.matches || !onscreen) return;
      // Scrolling winds the figure (scrub) and flares its speed (boost).
      phase += dy * MOTION_SCROLL_GAIN;
      boost = Math.min(MAX_BOOST, boost + Math.abs(dy) * 0.004);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        onscreen = entries[0]?.isIntersecting ?? true;
      },
      { root: null, threshold: 0 }
    );
    const onMotionChange = () => {
      lastNow = performance.now();
      paint(lastNow);
    };

    resize();
    paint(performance.now());
    const resizeObserver = new ResizeObserver(() => {
      resize();
      paint(performance.now());
    });
    resizeObserver.observe(parent);
    observer.observe(canvas);
    window.addEventListener("scroll", onScroll, { passive: true });
    media.addEventListener("change", onMotionChange);
    if (!media.matches) raf = window.requestAnimationFrame(loop);
    return () => {
      window.cancelAnimationFrame(raf);
      observer.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener("scroll", onScroll);
      media.removeEventListener("change", onMotionChange);
    };
  }, []);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
