import type { SolarHour } from "~/utils/localTime";

/** Environment hours on one line: dawn 0, midday 1, dusk 2, night 3. */
export type EnvHour = "dawn" | "midday" | "dusk" | "night";

export const ENV_HOURS: EnvHour[] = ["dawn", "midday", "dusk", "night"];

export function envHour(hour: SolarHour): EnvHour {
  return hour.toLowerCase() as EnvHour;
}

/** The hour before this one on the line, wrapping. The room arrives from it. */
export function envBefore(hour: EnvHour): EnvHour {
  return ENV_HOURS[(ENV_HOURS.indexOf(hour) + ENV_HOURS.length - 1) % ENV_HOURS.length] ?? hour;
}

export function envIndex(hour: EnvHour): number {
  return ENV_HOURS.indexOf(hour);
}

/** 2.6s + 0.7s per step crossed: dawn to night takes 4.7s. */
export function envDurationMs(from: EnvHour, to: EnvHour): number {
  return Math.round(2600 + 700 * Math.abs(envIndex(from) - envIndex(to)));
}

/** How strongly each page lets the light in. The map and the rest stay quiet. */
export function envGain(pathname: string): number {
  if (pathname === "/") return 1;
  if (pathname === "/listen") return 0.9;
  return 0.85;
}

/**
 * The gust: a damped sway. Attack ~0.35s, decay tau ~1.1s, underdamped at
 * ~2.2s per swing, so it lifts, answers, decays and settles. No bounce.
 */
export function gustEnvelope(t: number): number {
  return (1 - Math.exp(-t / 0.35)) * Math.exp(-t / 1.1);
}

export function gustSway(t: number): number {
  return gustEnvelope(t) * Math.sin((2 * Math.PI * t) / 2.2);
}

export type GustFrame = { translate: string; rotate: string };

export function gustFrames(options: {
  seconds: number;
  strength: number;
  direction: 1 | -1;
  scale?: number;
  steps?: number;
}): GustFrame[] {
  const { seconds, strength, direction, scale = 1, steps = 24 } = options;
  const distance = 18 * strength * scale * direction;
  const turn = 1.4 * strength * scale;
  const frames: GustFrame[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * seconds;
    frames.push({
      translate: `${(distance * gustSway(t)).toFixed(2)}px ${(distance * 0.35 * gustSway(t - 0.3)).toFixed(2)}px`,
      rotate: `${(turn * gustSway(t - 0.12)).toFixed(3)}deg`,
    });
  }
  return frames;
}

export const GUST_BREEZE: Record<EnvHour, { strength: number; direction: 1 | -1 }> = {
  dawn: { strength: 0.7, direction: 1 },
  midday: { strength: 0.55, direction: 1 },
  dusk: { strength: 0.9, direction: -1 },
  night: { strength: 0.15, direction: -1 },
};

/** A stable small number from an id, so each station leans the light its own way. */
export function envNudge(id: string | null | undefined, span = 8): number {
  if (!id) return 0;
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return (((h >>> 0) % 1000) / 1000 - 0.5) * 2 * span;
}

/** Each page holds the light at its own small angle. */
export function envPageTilt(pathname: string): number {
  if (pathname === "/") return 0;
  if (pathname === "/listen") return 5;
  if (pathname === "/about") return -5;
  return 3;
}

/**
 * The arrival swing: a much bigger, slower-to-die version of the gust. The light
 * swings wide, overshoots, and settles: attack ~0.15s, decay tau 2.0s, one full
 * swing every 2.8s, plus a small breath of scale on the first push.
 */
export function swingFrames(options: {
  seconds: number;
  turn: number;
  push: number;
  direction: 1 | -1;
  steps?: number;
}): Array<{ translate: string; rotate: string; scale: string }> {
  const { seconds, turn, push, direction, steps = 40 } = options;
  const frames: Array<{ translate: string; rotate: string; scale: string }> = [];
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * seconds;
    const env = (1 - Math.exp(-t / 0.15)) * Math.exp(-t / 2.0);
    const sway = env * Math.cos((2 * Math.PI * t) / 2.8);
    const swayLate = env * Math.cos((2 * Math.PI * (t - 0.25)) / 2.8);
    frames.push({
      translate: `${(direction * push * swayLate).toFixed(2)}px ${(push * 0.4 * sway).toFixed(2)}px`,
      rotate: `${(direction * turn * sway).toFixed(3)}deg`,
      scale: (1 + 0.05 * env).toFixed(4),
    });
  }
  return frames;
}
