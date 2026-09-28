import { FLIP_MS } from "~/components/radio-passport/FlipBoard";

/**
 * How the keeper's lines arrive: like a board updating, sentence by
 * sentence, each character a flap that drops into place. Pure plan so the
 * timing rules are tested: every beat stays short, the whole line lands
 * well under two seconds, and the component swaps to plain serif text once
 * `totalMs` has passed (nothing is ever left mid-flip).
 */

/** Each flap's drop, the board's own beat. */
export const FLAP_CHAR_MS = FLIP_MS;
/** Ripple between neighbouring characters inside one line. */
export const FLAP_CHAR_STAGGER_MS = 7;
/** A line's ripple is capped so each beat stays under 600ms. */
export const FLAP_LINE_MAX_MS = 480;
/** Gap between one line starting and the next. */
export const FLAP_LINE_GAP_MS = 140;
/** Longest the whole text may take to land, however long it is. */
export const FLAP_TOTAL_MAX_MS = 1600;

export type FlapChar = { ch: string; delay: number };
export type FlapWord = { chars: FlapChar[] };
export type FlapLine = { words: FlapWord[] };

/** Sentences are the board's lines; a long answer never becomes one line. */
export function flapLines(text: string): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const parts = clean.match(/[^.!?…]+[.!?…]+[”"')\]]*\s*|[^.!?…]+$/g);
  return (parts ?? [clean]).map((part) => part.trim()).filter(Boolean);
}

export function flapTextPlan(text: string): { lines: FlapLine[]; totalMs: number } {
  const lines = flapLines(text);
  const lineGap = lines.length > 1
    ? Math.min(FLAP_LINE_GAP_MS, (FLAP_TOTAL_MAX_MS - FLAP_LINE_MAX_MS - FLAP_CHAR_MS) / (lines.length - 1))
    : 0;
  let totalMs = 0;
  const planned = lines.map((line, lineIndex) => {
    const start = Math.round(lineIndex * lineGap);
    const chars = Array.from(line);
    // Squeeze the stagger for long lines so the ripple fits the cap.
    const stagger = Math.min(
      FLAP_CHAR_STAGGER_MS,
      chars.length > 1 ? FLAP_LINE_MAX_MS / (chars.length - 1) : 0,
    );
    let index = 0;
    const words = line.split(" ").map((word) => {
      const wordChars = Array.from(word).map((ch) => {
        const delay = Math.round(start + index * stagger);
        index += 1;
        totalMs = Math.max(totalMs, delay + FLAP_CHAR_MS);
        return { ch, delay };
      });
      index += 1; // the space between words keeps its slot in the ripple
      return { chars: wordChars };
    });
    return { words };
  });
  return { lines: planned, totalMs };
}
