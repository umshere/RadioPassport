import { Link, useLocation, useNavigate } from "@remix-run/react";
import {
  atlasRequested,
  homeWithAtlasHref,
  openAtlasNow,
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
  const atlasOpen = atlasRequested(location.search);
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

        if (slot.id === "atlas") {
          return (
            <button
              key={slot.id}
              type="button"
              className={className}
              aria-current={isCurrent ? "page" : undefined}
              onClick={() =>
                openAtlasNow(location.pathname, () =>
                  navigate(homeWithAtlasHref()),
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
          >
            {slot.label}
          </Link>
        );
      })}
    </nav>
  );
}
