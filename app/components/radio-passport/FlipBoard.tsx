import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

/**
 * Solari mechanics, not a typewriter: each cell is a drum with a fixed
 * charset that only spins forward. Changing a letter means stepping through
 * every intermediate character (wrapping if needed), one two-beat flip per
 * step. Columns ripple left-to-right; cells that don't change stay parked.
 */
export const DRUM = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,:;!?-'’&()";
export const FLIP_MS = 140;
export const COL_STAGGER_MS = 40;

export function drumIndex(value: string): number {
  const found = DRUM.indexOf(value.toUpperCase());
  return found < 0 ? 0 : found;
}

/** Forward-only drum distance — hardware spins one way. */
export function drumSteps(from: string, to: string): number {
  return (drumIndex(to) - drumIndex(from) + DRUM.length) % DRUM.length;
}

export function flapSlots(from: string, to: string) {
  const width = Math.max(from.length, to.length, 1);
  const a = from.padEnd(width, " ");
  const b = to.padEnd(width, " ");
  return Array.from({ length: width }, (_, index) => ({
    from: a[index] ?? " ",
    to: b[index] ?? " ",
  }));
}

export function boardShift<T>(items: readonly T[], seed: number): T[] {
  if (items.length <= 1) return [...items];
  const offset = ((seed % items.length) + items.length) % items.length;
  return [...items.slice(offset), ...items.slice(0, offset)];
}

export type FlipCell = {
  from: string;
  to: string;
  /** Drum steps this cell must churn (0 = parked). */
  steps: number;
  /** Ms timestamp at which this cell starts, for the left-to-right ripple. */
  startMs: number;
};

/** Pure plan: which cells move, how far, and when — unit-testable. */
export function flipPlan(
  from: string,
  to: string,
  delayMs = 0,
): { cells: FlipCell[]; totalMs: number } {
  const cells = flapSlots(from, to).map((slot, index) => {
    if (slot.from === slot.to) return { ...slot, steps: 0, startMs: 0 };
    const dist = drumSteps(slot.from, slot.to);
    return {
      ...slot,
      steps: Math.max(dist, 1),
      startMs: delayMs + index * COL_STAGGER_MS,
    };
  });
  const totalMs = cells.reduce(
    (most, cell) => Math.max(most, cell.startMs + cell.steps * FLIP_MS),
    0,
  );
  return { cells, totalMs };
}

/** Glyph a cell shows at a timestamp while churning. */
export function flipGlyph(cell: FlipCell, nowMs: number): string {
  if (cell.steps === 0) return cell.from;
  const elapsed = nowMs - cell.startMs;
  if (elapsed < 0) return cell.from;
  const step = Math.floor(elapsed / FLIP_MS);
  if (step >= cell.steps) return cell.to;
  // Out-of-drum glyphs (é, →, …) have no drum path: hop straight over.
  if (drumSteps(cell.from, cell.to) === 0) return cell.to;
  return DRUM[(drumIndex(cell.from) + step + 1) % DRUM.length] ?? " ";
}

/** True while a cell is mid-churn at a timestamp. */
export function flipLive(cell: FlipCell, nowMs: number): boolean {
  return (
    cell.steps > 0 &&
    nowMs >= cell.startMs &&
    nowMs < cell.startMs + cell.steps * FLIP_MS
  );
}

function glyph(value: string) {
  return value === " " ? " " /* nbsp: keep blank flaps from collapsing */ : value;
}

export function FlipBoard({
  text,
  className,
  delayMs = 0,
}: {
  text: string;
  className?: string;
  delayMs?: number;
}) {
  const shown = useRef(text);
  const booted = useRef(false);
  const [from, setFrom] = useState(text);
  const [to, setTo] = useState(text);
  const [nowMs, setNowMs] = useState(0);

  useLayoutEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!booted.current) {
      booted.current = true;
      shown.current = text;
      if (reduce) return;
      // Opening churn: every drum spins up from blank.
      setFrom(" ".repeat(Math.max(text.length, 1)));
      setTo(text);
      setNowMs(0);
      return;
    }
    if (text === shown.current) return;
    const previous = shown.current;
    shown.current = text;
    if (reduce) {
      setFrom(text);
      setTo(text);
      return;
    }
    setFrom(previous);
    setTo(text);
    setNowMs(0);
  }, [text]);

  const plan = useMemo(() => flipPlan(from, to, delayMs), [from, to, delayMs]);

  // One global clock drives every cell; each cell reads its own progress
  // (start offset + steps) so the row ripples while cells churn.
  useEffect(() => {
    if (plan.totalMs === 0 || nowMs >= plan.totalMs) return;
    const id = window.setTimeout(
      () => setNowMs((value) => value + FLIP_MS),
      FLIP_MS,
    );
    return () => window.clearTimeout(id);
  }, [plan, nowMs]);

  // Park the drums once everything lands so idle rows render static glyphs.
  useEffect(() => {
    if (plan.totalMs === 0 || nowMs < plan.totalMs) return;
    const id = window.setTimeout(() => setFrom(to), FLIP_MS * 2);
    return () => window.clearTimeout(id);
  }, [plan.totalMs, nowMs, to]);

  return (
    <span
      className={`ew-flap-line${className ? ` ${className}` : ""}`}
      aria-hidden="true"
    >
      {plan.cells.map((cell, index) => {
        const live = flipLive(cell, nowMs);
        return (
          <span
            key={
              cell.steps === 0 ? `parked:${index}` : `flip:${nowMs}:${index}`
            }
            className={`ew-flap${live ? " is-flip" : ""}`}
          >
            <span className="ew-flap-to">{glyph(flipGlyph(cell, nowMs))}</span>
          </span>
        );
      })}
    </span>
  );
}
