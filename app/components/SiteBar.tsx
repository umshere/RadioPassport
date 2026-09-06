import { Link, useLocation, useNavigate } from "@remix-run/react";
import { SignalWordmark } from "~/components/radio-passport/SignalMark";
import { TheaterSeek } from "~/components/radio-passport/TheaterSeek";
import BandNav from "~/components/BandNav";
import {
  homeWithPassportHref,
  openPassportNow,
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
        <SignalWordmark compact />
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
    </header>
  );
}
