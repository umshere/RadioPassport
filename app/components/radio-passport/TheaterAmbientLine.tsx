import { useEffect, useState } from "react";
import type { Station } from "~/types/radio";
import { theaterFragment } from "./theaterFragments";

export function TheaterAmbientLine({ station }: { station: Station }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const fragment = theaterFragment(station, now);
  return (
    <section className="ew-theater-ambient ew-theater-story" aria-label="At this hour">
      <p className="rp-eyebrow text-foil">At this hour · {fragment.place}</p>
      <p className="ew-theater-story-hour">{fragment.hour}</p>
      <p className="ew-theater-story-detail">{fragment.detail}</p>
    </section>
  );
}
