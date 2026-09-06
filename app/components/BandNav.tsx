import { Link, useLocation, useNavigate } from "@remix-run/react";
import { useEffect, useState } from "react";
import {
  ATLAS_SYNC_EVENT,
  atlasRequested,
  homeWithAtlasHref,
  openAtlasNow,
  requestCloseAtlas,
} from "~/components/radio-passport/productFlow";
import { useHydrated } from "~/hooks/useHydrated";
import { usePlayerStore } from "~/state/playerStore";

const SLOTS = [
  { id: "elsewhere", label: "Elsewhere", to: "/" },
  { id: "atlas", label: "Atlas" },
  { id: "theater", label: "Theater", to: "/listen" },
  { id: "room", label: "Room", to: "/about" },
] as const;

export default function BandNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const mounted = useHydrated();
  const nowPlaying = usePlayerStore((state) => state.nowPlaying);
  // Same-URL atlas flips never reach useLocation (home syncs through
  // history.replaceState), so the page announces them and the tabs pin the
  // last announcement until Remix actually navigates again.
  const [atlasPin, setAtlasPin] = useState<boolean | null>(null);
  useEffect(() => {
    setAtlasPin(null);
  }, [location.key]);
  useEffect(() => {
    const sync = (event: Event) => {
      setAtlasPin((event as CustomEvent<boolean>).detail === true);
    };
    window.addEventListener(ATLAS_SYNC_EVENT, sync);
    return () => window.removeEventListener(ATLAS_SYNC_EVENT, sync);
  }, []);
  const atlasOpen = atlasPin ?? atlasRequested(location.search);
  const theaterEmpty = mounted && !nowPlaying;

  const current =
    location.pathname === "/about"
      ? "room"
      : location.pathname === "/listen"
        ? "theater"
        : atlasOpen
          ? "atlas"
          : location.pathname === "/"
            ? "elsewhere"
            : null;

  return (
    <nav className="ew-band-nav" aria-label="Elsewhere">
      {SLOTS.map((slot) => {
        const isCurrent = current === slot.id;
        const className = `ew-band-nav-slot${isCurrent ? " is-current" : ""}`;

        // Standing on home with Atlas open, a Link to "/" is a no-op —
        // home syncs ?atlas=1 through history.replaceState, which Remix never
        // hears. Ask to close instead, and take the page back to the top.
        if (slot.id === "elsewhere" && location.pathname === "/" && atlasOpen) {
          return (
            <button
              key={slot.id}
              type="button"
              className={className}
              onClick={() => {
                requestCloseAtlas();
                window.scrollTo({ top: 0 });
              }}
            >
              {slot.label}
            </button>
          );
        }

        if (slot.id === "atlas") {
          return (
            <button
              key={slot.id}
              type="button"
              className={className}
              aria-current={isCurrent ? "page" : undefined}
              onClick={() =>
                openAtlasNow(location.pathname, () =>
                  navigate(homeWithAtlasHref(), { preventScrollReset: true }),
                )
              }
            >
              {slot.label}
            </button>
          );
        }

        // Current wins over empty: standing on /listen with a quiet room must
        // still show Theater as the page you are on, not as an inert label.
        if (slot.id === "theater" && theaterEmpty && !isCurrent) {
          return (
            <span
              key={slot.id}
              className={`${className} is-disabled`}
              aria-disabled="true"
            >
              {slot.label}
            </span>
          );
        }

        return (
          <Link
            key={slot.id}
            to={slot.to}
            className={className}
            aria-current={isCurrent ? "page" : undefined}
            prefetch="intent"
            preventScrollReset
          >
            {slot.label}
          </Link>
        );
      })}
    </nav>
  );
}
