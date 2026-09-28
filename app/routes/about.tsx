import { Link } from "@remix-run/react";
import { BRAND } from "~/constants/brand";
import { AtmospherePin } from "~/components/radio-passport/AtmospherePin";
import { ButtonLink } from "~/components/ui/Button";

export const meta = () => [
  { title: `About · ${BRAND.name}` },
  {
    name: "description",
    content: "Elsewhere is live radio from someone else's now.",
  },
  { property: "og:title", content: `About · ${BRAND.name}` },
  {
    property: "og:description",
    content: "Elsewhere is live radio from someone else's now.",
  },
  { property: "og:url", content: "https://elsewheremusic.com/about" },
];

export default function About() {
  return (
    <main className="rp-home min-h-screen">
      <article className="mx-auto max-w-3xl px-5 py-16 sm:px-8">
        <p className="rp-eyebrow text-foil">About</p>
        <h1 className="ew-coverline mt-4">Live radio from someone else&rsquo;s now.</h1>
        <p className="rp-lede mt-6 max-w-[36ch]">
          {BRAND.name} plays stations that are on the air right now, in cities
          where it is a different hour. You are not here. Stay a minute and you
          will be stamped.
        </p>
        <img
          src="/elsewhere-colophon.jpg"
          alt=""
          className="mt-12 aspect-[5/4] w-full object-cover"
        />
        <section className="mt-14 space-y-10">
          <div>
            <p className="rp-eyebrow text-foil">How it works</p>
            <p className="mt-3 max-w-[42ch] text-[15px] leading-7 text-dust">
              Tap Land, or type a place, a language or a mood. Pick an hour
              &mdash; dawn, midday, dusk or night &mdash; to hear where it is
              happening. The globe only shows you where you are. We never make
              up a song title when a station does not send one.
            </p>
          </div>
          <div>
            <p className="rp-eyebrow text-foil">Your passport</p>
            <p className="mt-3 max-w-[42ch] text-[15px] leading-7 text-dust">
              Stay on a station for sixty seconds and the city is stamped in
              your passport. It is a record of where you listened, not a score.
              No streaks, nothing to unlock.
            </p>
          </div>
          <div>
            <p className="rp-eyebrow text-foil">Always free</p>
            <p className="mt-3 max-w-[42ch] text-[15px] leading-7 text-dust">
              The stations come from open radio directories. Some streams fail;
              we skip them and find another. The radio stays free.
            </p>
          </div>
          <div className="ew-appearance">
            <AtmospherePin />
          </div>
        </section>
        <p className="mt-16">
          {/* SURFACE_CONNECTIONS: about-land — the room must lead back to the
              cover. SPA link, so the audio bridge in root keeps playing. */}
          <ButtonLink to="/">Land somewhere &rarr;</ButtonLink>
        </p>
        <p className="mt-16 rp-telemetry text-dust">
          {BRAND.name}
        </p>
      </article>
    </main>
  );
}
