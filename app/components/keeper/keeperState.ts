import type { SolarHour } from "~/utils/localTime";

/**
 * The keeper's animation states. The names are the contract: the SVG figure
 * keys its CSS off `data-state`, and a Rive/Lottie file swapped in later must
 * expose a state machine with exactly these inputs.
 *
 *   idle       awake at the desk, breathing, blinking
 *   listening  the sheet is open and the listener is typing
 *   thinking   a question is out; the keeper looks up and waits
 *   speaking   an answer is on the sheet
 *   sleeping   deep local night, paused, or no station at all
 *   delight    one-shot: a fresh track title or a fresh stamp
 */
export const KEEPER_STATES = [
  "idle",
  "listening",
  "thinking",
  "speaking",
  "sleeping",
  "delight",
] as const;
export type KeeperState = (typeof KEEPER_STATES)[number];

/** The local hour colours the keeper's temper, never its state. */
export type KeeperMood = "drowsy" | "bright" | "awake" | "warm";

/** How long the one-shot delight holds before the keeper settles. */
export const KEEPER_DELIGHT_MS = 1400;

export function isKeeperState(value: unknown): value is KeeperState {
  return (
    typeof value === "string" &&
    (KEEPER_STATES as readonly string[]).includes(value)
  );
}

export function keeperMood(hour: SolarHour | null): KeeperMood {
  switch (hour) {
    case "Dawn":
      return "bright";
    case "Midday":
      return "awake";
    case "Dusk":
      return "warm";
    case "Night":
      return "drowsy";
    default:
      return "awake";
  }
}

/** 00:00–04:59 local: the keeper dozes at the desk until someone asks. */
export function isDeepNight(localHour: number | null): boolean {
  return localHour !== null && localHour >= 0 && localHour < 5;
}

export type KeeperStateInput = {
  hasStation: boolean;
  isPlaying: boolean;
  sheetOpen: boolean;
  typing: boolean;
  /** Where a question is: out to the keeper, or answered on the sheet. */
  exchange: "none" | "thinking" | "speaking";
  /** Hour of day at the station, 0–23; null when the station has no coordinates. */
  localHour: number | null;
  delight: boolean;
  /** The keeper is fetching a fact to tell, or telling one unasked. */
  reading?: boolean;
  murmuring?: boolean;
};

/**
 * One state at a time, in priority order: no signal sleeps; a live exchange
 * beats a one-shot; a one-shot beats the sheet; deep night dozes only while
 * nobody is at the desk.
 */
export function deriveKeeperState(input: KeeperStateInput): KeeperState {
  if (!input.hasStation || !input.isPlaying) return "sleeping";
  if (input.exchange === "thinking") return "thinking";
  if (input.exchange === "speaking") return "speaking";
  if (input.delight) return "delight";
  if (input.reading && !input.sheetOpen) return "thinking";
  if (input.murmuring && !input.sheetOpen) return "speaking";
  if (input.sheetOpen) return input.typing ? "listening" : "idle";
  if (isDeepNight(input.localHour)) return "sleeping";
  return "idle";
}

/**
 * Delight fires when a title arrives that was not there before — the
 * station just told us something. Losing a title, or the same title
 * re-announced, is not news.
 */
export function shouldDelight(
  previousTrackKey: string | null,
  nextTrackKey: string | null,
): boolean {
  if (!nextTrackKey) return false;
  return previousTrackKey !== nextTrackKey;
}

/** Speaking holds roughly as long as the line takes to read, within bounds. */
export function speakingDurationMs(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.min(6000, Math.max(1600, words * 220));
}

/**
 * The little split-flap plate on the keeper's desk. Every glyph is on the
 * FlipBoard drum, so a state change churns it like the departure board.
 */
export function keeperPlate(state: KeeperState): string {
  switch (state) {
    case "listening":
      return "EAR";
    case "thinking":
      return "...";
    case "speaking":
      return "SAY";
    case "sleeping":
      return "ZZZ";
    case "delight":
      return "!!!";
    default:
      return "AIR";
  }
}

/** What a screen reader hears for the figure. */
export function keeperStateLabel(state: KeeperState): string {
  switch (state) {
    case "sleeping":
      return "The keeper is dozing";
    case "thinking":
      return "The keeper is thinking";
    case "speaking":
      return "The keeper is answering";
    case "listening":
      return "The keeper is listening";
    case "delight":
      return "The keeper looks up";
    default:
      return "The keeper is at the desk";
  }
}
