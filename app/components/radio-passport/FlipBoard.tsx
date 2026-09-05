import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

export const FLAP_STEP_MS = 32;

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

function glyph(value: string) {
  return value === " " ? "\u00a0" : value;
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
  const [tick, setTick] = useState(0);

  useLayoutEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!booted.current) {
      booted.current = true;
      shown.current = text;
      if (reduce) return;
      setFrom(" ".repeat(Math.max(text.length, 1)));
      setTo(text);
      setTick(1);
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
    setTick((value) => value + 1);
  }, [text]);

  useEffect(() => {
    if (from === to) return;
    const wait = delayMs + Math.max(from.length, to.length) * FLAP_STEP_MS + 320;
    const id = window.setTimeout(() => setFrom(to), wait);
    return () => window.clearTimeout(id);
  }, [delayMs, from, to]);

  const slots = useMemo(() => flapSlots(from, to), [from, to]);

  return (
    <span
      className={`ew-flap-line${className ? ` ${className}` : ""}`}
      aria-hidden="true"
    >
      {slots.map((slot, index) => (
        <span
          key={`${tick}:${index}`}
          className={`ew-flap${slot.from === slot.to ? "" : " is-flip"}`}
          style={{ animationDelay: `${delayMs + index * FLAP_STEP_MS}ms` }}
        >
          <span className="ew-flap-from">{glyph(slot.from)}</span>
          <span className="ew-flap-to">{glyph(slot.to)}</span>
        </span>
      ))}
    </span>
  );
}
