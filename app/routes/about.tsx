import { Link } from "@remix-run/react";
import { BRAND } from "~/constants/brand";
import { SignalWordmark } from "~/components/radio-passport/SignalMark";

export const meta = () => [
  { title: `About · ${BRAND.name}` },
  {
    name: "description",
    content: "Elsewhere is live radio from someone else's now.",
  },
];

export default function About() {
  return (
    <main className="rp-home min-h-screen">
      <header className="rp-home-header">
        <SignalWordmark />
        <Link to="/" className="rp-passport-button" prefetch="intent">
          Land
        </Link>
      </header>
      <article className="mx-auto max-w-3xl px-5 py-16 sm:px-8">
        <p className="rp-eyebrow text-foil">{BRAND.eyebrow}</p>
        <h1 className="ew-coverline mt-4">You are not here.</h1>
        <p className="rp-lede mt-6 max-w-[36ch]">
          {BRAND.name} is a listening room for live radio. A city, an hour, a
          station that is actually on the air. Stay long enough to be stamped.
        </p>
        <img
          src="/elsewhere-colophon.jpg"
          alt=""
          className="mt-12 aspect-[5/4] w-full object-cover"
        />
        <section className="mt-14 space-y-10">
          <div>
            <p className="rp-eyebrow text-foil">The room</p>
            <p className="mt-3 max-w-[42ch] text-[15px] leading-7 text-dust">
              Type a place or a feeling. Land in a city. The globe is a locator,
              not the product. The cover is the product: local time, the live
              line, one caption. We do not invent a song when the station is
              quiet.
            </p>
          </div>
          <div>
            <p className="rp-eyebrow text-foil">The book</p>
            <p className="mt-3 max-w-[42ch] text-[15px] leading-7 text-dust">
              Sixty continuous seconds inks a city. That is a stay, not a score.
              No streaks. No unlocks.
            </p>
          </div>
          <div>
            <p className="rp-eyebrow text-foil">The catalog</p>
            <p className="mt-3 max-w-[42ch] text-[15px] leading-7 text-dust">
              Open radio from the world. Some signals fail. We skip them. The
              air stays free.
            </p>
          </div>
        </section>
        <p className="mt-16 rp-telemetry text-dust">
          Issue 01 · {BRAND.name}
        </p>
      </article>
    </main>
  );
}
