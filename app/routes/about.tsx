import { Link } from "@remix-run/react";
import { Eyebrow } from "~/components/ui/Eyebrow";
import { BRAND } from "~/constants/brand";
import { AtmospherePin } from "~/components/radio-passport/AtmospherePin";
import { ButtonLink } from "~/components/ui/Button";
import { InstagramGlyph } from "~/components/ui/InstagramGlyph";
import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from "~/utils/social";

const DESCRIPTION =
  "Elsewhere is live radio from someone else's now. The Keeper of the Passport will stamp you in.";

export const meta = () => [
  { title: `How it works · ${BRAND.name}` },
  { name: "description", content: DESCRIPTION },
  { property: "og:title", content: `How it works · ${BRAND.name}` },
  { property: "og:description", content: DESCRIPTION },
  { property: "og:url", content: "https://elsewheremusic.com/about" },
];


const STEPS = [
  {
    title: "Land",
    body: "Tap Land here, or tell me a place, a language or a mood. Or pick an hour (dawn, midday, dusk or night) and I’ll find a live station where it is that hour right now.",
  },
  {
    title: "Listen, and get stamped",
    body: "It’s a real station on the air in another city. Stay a minute and I’ll stamp the city in your passport. It’s a record of where you listened, not a score. No streaks, nothing to unlock.",
  },
  {
    title: "Send a ticket",
    body: "Found a good one? Send a friend a ticket. One tap, and they land on the same station you’re hearing.",
  },
  {
    title: "Ask me things",
    body: "Tap me any time. I’ll tell you the hour over there, what language you’re hearing, a thing or two about the place. When it comes from my own notebook and not the station, I’ll say so. I never make up a song title. If I don’t know, I’ll say so.",
  },
  {
    title: "Always free",
    body: "The stations come from open radio directories. Some streams fail; I skip them and find you another. The radio stays free.",
  },
];

const WHERE = [
  { name: "Elsewhere", body: "The home. Pick an hour or search, and a board of live stations shows what’s on now." },
  { name: "Atlas", body: "A map to explore. Open it to wander to a city and hear what’s playing there." },
  { name: "Desk", body: "What’s playing right now: the station, the hour there, and my notes. Ask me anything." },
  { name: "Passport", body: "Your stamps: every city you’ve stayed in for a minute." },
];

/**
 * The about page is the Keeper's welcome: he is Elsewhere's host, and the page
 * speaks in his voice (see docs/KEEPER_CHARACTER.md). Plain facts stay plain;
 * only the manner is his.
 */
export default function About() {
  return (
    <main className="rp-home min-h-screen">
      <article className="ew-about">
        <header className="ew-about-head">
          <Eyebrow tone="foil">How it works</Eyebrow>
          <h1 className="ew-coverline mt-4">Live radio from someone else&rsquo;s now.</h1>
          <p className="rp-lede mt-6 max-w-[38ch]">
            {BRAND.name} plays live radio stations from around the world, at the
            hour it is there. Pick a place or a time of day, listen, and I’ll
            stamp the city in your passport. I keep the desk. Come in.
          </p>
        </header>

        <figure className="ew-about-scene">
          <picture>
            <source media="(min-width: 760px)" srcSet="/about/desk-wide.webp" />
            <img
              src="/about/desk.webp"
              alt="The Keeper’s desk at night: an open passport with city stamps, a radio dial, a departures strip, a brass bell and a lamp"
              width={1600}
              height={1200}
            />
          </picture>
          <figcaption className="ew-about-host">
            <img
              className="ew-about-keeper"
              src="/keeper/idle.webp"
              alt="The Keeper of the Passport: a pixel-art clerk in headphones with a red radar for a face"
              width={112}
              height={112}
            />
            <p className="ew-about-hello">Papers, please. Kidding. Come in, you’ve landed.</p>
          </figcaption>
        </figure>

        <section className="ew-about-where" aria-labelledby="ew-about-where-title">
          <Eyebrow tone="foil">
            <span id="ew-about-where-title">Where things are</span>
          </Eyebrow>
          <dl className="ew-about-where-list">
            {WHERE.map((item) => (
              <div key={item.name} className="ew-about-where-item">
                <dt>{item.name}</dt>
                <dd>{item.body}</dd>
              </div>
            ))}
          </dl>
        </section>

        <ol className="ew-about-steps">
          {STEPS.map((step, i) => (
            <li key={step.title} className="ew-about-step">
              <span className="ew-about-no" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
              <Eyebrow tone="foil">{step.title}</Eyebrow>
              <p>{step.body}</p>
            </li>
          ))}
        </ol>

        <section className="ew-about-pass" aria-labelledby="ew-about-pass-title">
          <Eyebrow tone="foil">
            <span id="ew-about-pass-title">Pass it on</span>
          </Eyebrow>
          <p>
            Music is for everyone, and there are more kinds of it than one life can get through. If something here
            moved you, send a friend a ticket or share the picture. It only travels if you carry it.
          </p>
          <p>
            <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">
              <InstagramGlyph size={18} /> {INSTAGRAM_HANDLE}
            </a>
          </p>
        </section>

        <div className="ew-appearance ew-about-appearance">
          <AtmospherePin />
        </div>
        <p className="ew-about-go">
          {/* SURFACE_CONNECTIONS: about-land — the room must lead back to the
              cover. SPA link, so the audio bridge in root keeps playing. */}
          <ButtonLink to="/">Land somewhere →</ButtonLink>
        </p>
        <p className="ew-about-foot rp-telemetry text-dust">
          {BRAND.name} &middot; the Keeper &middot;{" "}
          <Link to="/legal" prefetch="intent">Terms, privacy, credits</Link>
        </p>
      </article>
    </main>
  );
}
