import { useEffect, useState } from "react";

const MOBILE = "(max-width: 960px)";
const ROOT_MARGIN = "-52px 0px 0px 0px";

export function CoverStrip({
  land,
  live,
  clock,
  overlay,
  coverKey,
}: {
  land: string;
  live: boolean;
  clock: string | null;
  overlay: boolean;
  coverKey: string;
}) {
  const [condensed, setCondensed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.IntersectionObserver) return;

    const media = window.matchMedia(MOBILE);
    let io: IntersectionObserver | null = null;

    const disconnect = () => {
      io?.disconnect();
      io = null;
    };

    const watch = () => {
      disconnect();
      if (!media.matches) {
        setCondensed(false);
        return;
      }
      const line = document.querySelector(".rp-home .ew-coverline");
      if (!line) return;
      io = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (!entry) return;
          setCondensed(!entry.isIntersecting);
        },
        { root: null, rootMargin: ROOT_MARGIN },
      );
      io.observe(line);
    };

    watch();
    media.addEventListener("change", watch);
    return () => {
      media.removeEventListener("change", watch);
      disconnect();
    };
  }, [coverKey]);

  const show = condensed && !overlay;
  const meta = [live ? "LIVE" : "LAND", clock].filter(Boolean).join(" · ");

  return (
    <div
      className={`ew-cover-strip${show ? " is-on" : ""}`}
      aria-hidden={show ? undefined : true}
    >
      <i className="ew-cover-strip-dot" aria-hidden="true" />
      <p className="ew-cover-strip-land">{land}</p>
      <p className="ew-cover-strip-meta">· {meta}</p>
      <button
        type="button"
        className="ew-cover-strip-seek"
        aria-label="Search"
        tabIndex={show ? 0 : -1}
        onClick={() => {
          const rail = document.querySelector(".ew-home-seek");
          const field = rail?.querySelector<HTMLInputElement>("input");
          rail?.scrollIntoView({ block: "start" });
          field?.focus();
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="6.5" />
          <path d="M16 16l4.5 4.5" />
        </svg>
      </button>
    </div>
  );
}
