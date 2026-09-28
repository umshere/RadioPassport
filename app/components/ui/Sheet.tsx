import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

const FOCUSABLE =
  'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

/**
 * A modal layer above the home: Atlas, a country, the Passport. Owns the
 * dialog contract — role and label, focus moves in, Tab stays inside, Esc
 * closes, focus returns to whatever opened it. Callers only supply content.
 */
export function Sheet({
  children,
  close,
  label,
  hideClose,
  className = "",
}: {
  className?: string;
  children: ReactNode;
  close: () => void;
  label: string;
  /** Atlas is a tab destination now — the tabs dismiss it, so it needs no ×. */
  hideClose?: boolean;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef(close);
  closeRef.current = close;
  if (!triggerRef.current && typeof document !== "undefined") {
    triggerRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
  }
  useEffect(() => {
    if (!triggerRef.current && document.activeElement instanceof HTMLElement) {
      triggerRef.current = document.activeElement;
    }
    const focusTimer = window.setTimeout(() => {
      const dialog = dialogRef.current;
      const first = dialog?.querySelector<HTMLElement>(
        FOCUSABLE
      );
      (first ?? dialog)?.focus();
    }, 0);
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeRef.current();
    };
    window.addEventListener("keydown", key);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", key);
      triggerRef.current?.focus();
    };
  }, []);
  const trapFocus = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab") return;
    const focusable = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        FOCUSABLE
      )
    ).filter((element) => !element.hasAttribute("hidden"));
    if (!focusable.length) {
      event.preventDefault();
      event.currentTarget.focus();
      return;
    }
    const first = focusable[0]!;
    const last = focusable[focusable.length - 1]!;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };
  return (
    <div
      className={`rp-overlay ${className}`}
      role="dialog"
      aria-modal="true"
      aria-label={label}
    >
      <div
        ref={dialogRef}
        className="rp-overlay-inner"
        tabIndex={-1}
        onKeyDown={trapFocus}
      >
        {children}
        {!hideClose ? (
          <button
            type="button"
            className="rp-close"
            onClick={close}
            aria-label={`Close ${label}`}
          >
            ×
          </button>
        ) : null}
      </div>
    </div>
  );
}
