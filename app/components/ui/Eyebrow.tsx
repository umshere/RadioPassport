import { createElement } from "react";
import type { HTMLAttributes } from "react";

/**
 * The small mono label that names a section or a state — “LIVE NOW”,
 * “HOW IT WORKS”. Case, tracking and size live in `.rp-eyebrow`; tone is the
 * only choice a caller makes: foil (a heading), ether (live), dust (quiet).
 */
export type EyebrowTone = "foil" | "ether" | "dust";

const TONE_CLASS: Record<EyebrowTone, string> = {
  foil: "text-foil",
  ether: "text-ether",
  dust: "text-dust",
};

type Props = HTMLAttributes<HTMLElement> & {
  as?: "p" | "span" | "div";
  tone?: EyebrowTone;
};

export function eyebrowClass(tone?: EyebrowTone, className?: string) {
  return ["rp-eyebrow", tone ? TONE_CLASS[tone] : "", className ?? ""]
    .filter(Boolean)
    .join(" ");
}

export function Eyebrow({ as = "p", tone, className, ...rest }: Props) {
  return createElement(as, { ...rest, className: eyebrowClass(tone, className) });
}
