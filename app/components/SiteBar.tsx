import { Link, useLocation, useNavigate } from "@remix-run/react";
import { SignalWordmark } from "~/components/radio-passport/SignalMark";
import { CoverSlotRail } from "~/components/radio-passport/CoverSlot";
import { TheaterSeek } from "~/components/radio-passport/TheaterSeek";
import BandNav from "~/components/BandNav";
import {
  homeWithPassportHref,
  openPassportNow,
  requestCloseAtlas,
} from "~/components/radio-passport/productFlow";
import { useHydrated } from "~/hooks/useHydrated";
import { useJourneyStore } from "~/state/journeyStore";

export default function SiteBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const mounted = useHydrated();
  const stamps = useJourneyStore((state) => state.stamps);
  const count = mounted ? stamps.length : 0;
  const onTheater = location.pathname === "/listen";

  return (
    <header className={`ew-site-bar${onTheater ? " is-theater" : ""}`}>
      <div className="ew-site-bar-left">
        {/* On home the wordmark Link to "/" is a no-op while Atlas stands open
            (replaceState URL Remix never hears) — close the overlay and take
            the page to the top instead. */}
        <SignalWordmark
          compact
          onHome={() => {
            requestCloseAtlas();
            window.scrollTo({ top: 0 });
          }}
        />
        {onTheater ? <TheaterSeek /> : null}
      </div>
      <BandNav />
      <nav className="ew-site-bar-side" aria-label="Site">
        <Link
          to="/about"
          className="rp-eyebrow text-dust ew-site-room"
          prefetch="intent"
        >
          Room
        </Link>
        <button
          type="button"
          className="rp-passport-button"
          onClick={() =>
            openPassportNow(location.pathname, () =>
              navigate(homeWithPassportHref())
            )
          }
          aria-label={`Open passport, ${count} places stamped`}
        >
          Passport <b>{String(count).padStart(2, "0")}</b>
        </button>
      </nav>
      {/* The condensed cover strip docks here — a real child of the sticky
          bar, so it always stands exactly on the header's bottom edge no
          matter how tall the wordmark stacks or what the safe-area adds. */}
      <CoverSlotRail />
    </header>
  );
}
