import { useCallback, useEffect, useId, useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { ReactNode } from "react";

/**
 * SeekShell — the presentational expanding pill (Bencho seek DNA, Phase 0).
 *
 * One object whose width is the state: closed it is a 64px circle with the
 * lens at its fixed inset; open it springs wider and the field rises inside
 * — the field stays mounted (inert while closed), nothing unmount-swaps.
 * Owns the width spring, press settle, magnet-while-closed, lens, and the
 * inert field region. Containers own open state + submit logic:
 * - TheaterSeek toggles it under the letter heading.
 * - Home holds it open in the SiteSeek rail (lens focuses the field).
 */
export function SeekShell({
  open,
  toggleable = false,
  onLensClick,
  lensLabel,
  collapseLabel = "Collapse seek",
  busy = false,
  seedLabel = "Ask for a place, language, mood, or station",
  children,
}: {
  open: boolean;
  toggleable?: boolean;
  onLensClick?: () => void;
  lensLabel?: string;
  collapseLabel?: string;
  busy?: boolean;
  seedLabel?: string;
  children: ReactNode;
}) {
  const panelId = useId();
  const pillRef = useRef<HTMLDivElement>(null);
  const sayRef = useRef<HTMLDivElement>(null);
  const magnetOk = useRef(false);

  useEffect(() => {
    magnetOk.current =
      window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  // The field stays mounted so open/close is one object changing — inert
  // (not unmounted) while closed. React 18 has no inert prop; the DOM does.
  // The lean vars are frame dressing: drop them whenever the pill opens.
  useEffect(() => {
    if (sayRef.current) sayRef.current.toggleAttribute("inert", !open);
    if (open) {
      pillRef.current?.style.removeProperty("--ew-seek-x");
      pillRef.current?.style.removeProperty("--ew-seek-y");
    }
  }, [open ]);

  // Magnet lean, closed only: the pill tips a few px toward the pointer.
  // Transform-only, desktop fine pointers, never under reduced motion.
  const lean = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const pill = pillRef.current;
      if (!pill || open || !magnetOk.current) return;
      const rect = pill.getBoundingClientRect();
      const dx = event.clientX - (rect.left + rect.width / 2);
      const dy = event.clientY - (rect.top + rect.height / 2);
      const clamp = (value: number) =>
        Math.max(-6, Math.min(6, value / 8)).toFixed(1);
      pill.style.setProperty("--ew-seek-x", `${clamp(dx)}px`);
      pill.style.setProperty("--ew-seek-y", `${clamp(dy)}px`);
    },
    [open ],
  );
  const unleash = useCallback(() => {
    pillRef.current?.style.removeProperty("--ew-seek-x");
    pillRef.current?.style.removeProperty("--ew-seek-y");
  }, []);

  const focusField = useCallback(() => {
    sayRef.current?.querySelector("input")?.focus();
  }, []);

  return (
    <div
      ref={pillRef}
      className={`ew-seek${open ? " is-open" : ""}${busy ? " is-busy" : ""}`}
      onPointerMove={lean}
      onPointerLeave={unleash}
    >
      <button
        type="button"
        className="ew-seek-lens"
        aria-expanded={toggleable ? open : undefined}
        aria-controls={toggleable ? panelId : undefined}
        aria-label={
          toggleable && open ? collapseLabel : (lensLabel ?? seedLabel)
        }
        onClick={() => {
          if (onLensClick) onLensClick();
          else focusField();
        }}
      >
        <svg
          viewBox="0 0 28 28"
          width="28"
          height="28"
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        >
          <circle cx="12" cy="12" r="7" />
          <path d="M17.5 17.5 24 24" />
        </svg>
      </button>
      <div ref={sayRef} className="ew-seek-say" aria-hidden={!open}>
        {children}
      </div>
      <span id={panelId} className="sr-only">
        {seedLabel}
      </span>
    </div>
  );
}
