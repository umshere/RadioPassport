import { Link, useLocation, useNavigate } from "@remix-run/react";
import { SignalWordmark } from "~/components/radio-passport/SignalMark";
import BandNav from "~/components/BandNav";
import {
  homeWithPassportHref,
  openPassportNow,
  requestCloseAtlas,
} from "~/components/radio-passport/productFlow";
import { useHydrated } from "~/hooks/useHydrated";
import { useJourneyStore } from "~/state/journeyStore";
import { Button, ButtonLink, Chip } from "~/components/ui/Button";
import { HeaderShare } from "~/components/share/HeaderShare";

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
        {/* The theater pill lives in the letter under the heading now —
            the bar keeps the wordmark and the tabs. */}
      </div>
      {/* Desktop rail only. The phone band mounts at the root (root.tsx)
          beside the dock — a fixed band inside this sticky header loses its
          paint on WebKit once the Atlas veil opens. */}
      <BandNav variant="rail" />
      <nav className="ew-site-bar-side" aria-label="Site">
        <HeaderShare />
        <Link
          to="/about"
          className="rp-eyebrow text-dust ew-site-room"
          prefetch="intent"
        >
          How it works
        </Link>
        {/* Phones: the text link is hidden, so a square "?" keeps the guide one tap away. */}
        <Link
          to="/about"
          className="ew-site-help"
          prefetch="intent"
          aria-label="How Elsewhere works"
        >
          ?
        </Link>
        <Button
          variant="frame"
          onClick={() =>
            openPassportNow(location.pathname, () =>
              navigate(homeWithPassportHref())
            )
          }
          aria-label={`Open passport, ${count} places stamped`}
        >
          Passport <b>{String(count).padStart(2, "0")}</b>
        </Button>
      </nav>
    </header>
  );
}
