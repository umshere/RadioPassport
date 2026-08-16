import { useEffect, useMemo, useRef } from "react";
import {
  fieldDust,
  fieldDustAlpha,
  fieldDustPoint,
  fieldDustTwinkle,
  fieldMilkyWay,
  fieldNebulaAlpha,
  fieldNebulae,
  fieldShootingStar,
  hexRgb,
  lockSeed,
} from "./theaterLock";

const HOME_SKY_SEED = lockSeed(["elsewhere", "home-sky"]);
const FRAME_MS = 80;

function tintOf(element: HTMLElement) {
  const style = getComputedStyle(element);
  return {
    foil: hexRgb(style.getPropertyValue("--ew-foil")) ?? [198, 165, 106],
    ether: hexRgb(style.getPropertyValue("--ew-ether")) ?? [126, 184, 180],
    bone: hexRgb(style.getPropertyValue("--ew-bone")) ?? [232, 223, 208],
  } as const;
}

function rgba(rgb: readonly [number, number, number], alpha: number) {
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
}

/**
 * The same seeded night the theater sky leans on, behind the land.
 * Dust, the river, a breath of nebula — never the metadata stars.
 */
export function GalaxyBackdrop({
  seed = HOME_SKY_SEED,
  dim = 0.75,
}: {
  seed?: number;
  dim?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dust = useMemo(() => fieldDust(seed), [seed]);
  const band = useMemo(() => fieldMilkyWay(seed), [seed]);
  const nebulae = useMemo(() => fieldNebulae(seed), [seed]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const parent = canvas.parentElement ?? canvas;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let last = 0;

    const resize = () => {
      const rect = parent.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const paint = (now: number) => {
      const reduced = media.matches;
      const rect = parent.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      const time = now / 1000;
      const palette = tintOf(parent);
      context.clearRect(0, 0, width, height);

      const span = Math.hypot(width, height);
      const half = band.width * Math.max(width, height) * 1.6;
      context.save();
      context.translate(band.cx * width, band.cy * height);
      context.rotate(band.angle);
      const river = context.createLinearGradient(0, -half, 0, half);
      river.addColorStop(0, rgba(palette.bone, 0));
      river.addColorStop(0.5, rgba(palette.bone, 0.05 * dim));
      river.addColorStop(1, rgba(palette.bone, 0));
      context.fillStyle = river;
      context.fillRect(-span, -half, span * 2, half * 2);
      context.restore();

      nebulae.forEach((cloud) => {
        const alpha = fieldNebulaAlpha(cloud, time, reduced) * dim;
        if (alpha < 0.006) return;
        const cx = cloud.x * width;
        const cy = cloud.y * height;
        const radius = cloud.radius * Math.max(width, height);
        const tint =
          cloud.tint === "ether"
            ? palette.ether
            : cloud.tint === "bone"
              ? palette.bone
              : palette.foil;
        const wash = context.createRadialGradient(cx, cy, 0, cx, cy, radius);
        wash.addColorStop(0, rgba(tint, alpha));
        wash.addColorStop(1, rgba(tint, 0));
        context.fillStyle = wash;
        context.beginPath();
        context.arc(cx, cy, radius, 0, Math.PI * 2);
        context.fill();
      });

      dust.forEach((grain) => {
        const point = fieldDustPoint(grain, time, true, reduced);
        const twinkle = fieldDustTwinkle(time, grain.freq, grain.phase, reduced);
        const alpha = fieldDustAlpha(grain.depth) * twinkle * dim;
        if (alpha < 0.02) return;
        const tint =
          grain.tint === "bone"
            ? palette.bone
            : grain.tint === "ether"
              ? palette.ether
              : palette.foil;
        const px = point.x * width;
        const py = point.y * height;
        context.fillStyle = rgba(tint, Math.min(0.4, alpha));
        context.beginPath();
        context.arc(px, py, grain.size, 0, Math.PI * 2);
        context.fill();
        if (grain.flare) {
          const ray = grain.size * (4.4 + 1.8 * twinkle);
          context.strokeStyle = rgba(tint, Math.min(0.26, alpha * 0.8));
          context.lineWidth = 0.5;
          context.beginPath();
          context.moveTo(px - ray, py);
          context.lineTo(px + ray, py);
          context.moveTo(px, py - ray);
          context.lineTo(px, py + ray);
          context.stroke();
        }
      });

      const meteor = fieldShootingStar(seed, time, { live: true, reduced });
      if (meteor) {
        const flash = Math.sin(Math.PI * meteor.progress) * dim;
        const hx = (meteor.x0 + (meteor.x1 - meteor.x0) * meteor.progress) * width;
        const hy = (meteor.y0 + (meteor.y1 - meteor.y0) * meteor.progress) * height;
        const tx = hx - (meteor.x1 - meteor.x0) * 0.28 * width;
        const ty = hy - (meteor.y1 - meteor.y0) * 0.28 * height;
        const streak = context.createLinearGradient(tx, ty, hx, hy);
        streak.addColorStop(0, rgba(palette.bone, 0));
        streak.addColorStop(1, rgba(palette.bone, 0.6 * flash));
        context.beginPath();
        context.moveTo(tx, ty);
        context.lineTo(hx, hy);
        context.strokeStyle = streak;
        context.lineWidth = 1;
        context.stroke();
        context.beginPath();
        context.arc(hx, hy, 1.1, 0, Math.PI * 2);
        context.fillStyle = rgba(palette.bone, 0.72 * flash);
        context.fill();
      }
    };

    const loop = (now: number) => {
      if (now - last >= FRAME_MS) {
        last = now;
        paint(now);
      }
      frame = window.requestAnimationFrame(loop);
    };

    resize();
    const observer = new ResizeObserver(() => {
      resize();
      paint(performance.now());
    });
    observer.observe(parent);
    if (media.matches) {
      paint(performance.now());
    } else {
      frame = window.requestAnimationFrame(loop);
    }
    const onMotionChange = () => {
      window.cancelAnimationFrame(frame);
      if (media.matches) paint(performance.now());
      else frame = window.requestAnimationFrame(loop);
    };
    media.addEventListener("change", onMotionChange);
    return () => {
      observer.disconnect();
      media.removeEventListener("change", onMotionChange);
      window.cancelAnimationFrame(frame);
    };
  }, [band, dust, nebulae, seed, dim]);

  return <canvas ref={canvasRef} className="ew-galaxy" aria-hidden="true" />;
}
