import { Eyebrow } from "~/components/ui/Eyebrow";
import { BRAND } from "~/constants/brand";
import { AtmospherePin } from "~/components/radio-passport/AtmospherePin";
import { ButtonLink } from "~/components/ui/Button";

const DESCRIPTION =
  "Elsewhere is live radio from someone else's now. The Keeper of the Passport will stamp you in.";

export const meta = () => [
  { title: `About · ${BRAND.name}` },
  { name: "description", content: DESCRIPTION },
  { property: "og:title", content: `About · ${BRAND.name}` },
  { property: "og:description", content: DESCRIPTION },
  { property: "og:url", content: "https://elsewheremusic.com/about" },
];


const STEPS = [
  {
    title: "Getting in",
    body: "Tap Land, or tell me a place, a language, a mood. Pick an hour — dawn, midday, dusk or night — and I’ll find where it’s happening. The globe only shows you where you are. And I never make up a song title when a station doesn’t send one. If I don’t know, I’ll say so.",
  },
  {
    title: "Your passport",
    body: "Stay on a station for sixty seconds and I’ll stamp the city in your book. It’s a record of where you listened, not a score. No streaks, nothing to unlock. I don’t keep score, only the book.",
  },
  {
    title: "Ask me things",
    body: "Tap me any time. I’ll tell you the hour over there, what language you’re hearing, a thing or two about the place. When it comes out of my own notebook and not from the station, I’ll tell you that too. If I get chatty and you’d like quiet, say the word.",
  },
  {
    title: "Send a ticket",
    body: "Found a good one? Send a friend a ticket. One tap, and they land on the same station you’re hearing.",
  },
  {
    title: "Always free",
    body: "The stations come from open radio directories. Some streams fail; I skip them and find you another. The radio stays free.",
  },
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
          <Eyebrow tone="foil">About</Eyebrow>
          <h1 className="ew-coverline mt-4">Live radio from someone else&rsquo;s now.</h1>
          <p className="rp-lede mt-6 max-w-[38ch]">
            I keep the passport desk here. {BRAND.name} plays stations that are
            on the air right now, in cities where it is a different hour. You
            are not here. Stay a minute and I’ll stamp you in.
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

        <ol className="ew-about-steps">
          {STEPS.map((step, i) => (
            <li key={step.title} className="ew-about-step">
              <span className="ew-about-no" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
              <Eyebrow tone="foil">{step.title}</Eyebrow>
              <p>{step.body}</p>
            </li>
          ))}
        </ol>

        <div className="ew-appearance ew-about-appearance">
          <AtmospherePin />
        </div>
        <p className="ew-about-go">
          {/* SURFACE_CONNECTIONS: about-land — the room must lead back to the
              cover. SPA link, so the audio bridge in root keeps playing. */}
          <ButtonLink to="/">Land somewhere &rarr;</ButtonLink>
        </p>
        <p className="ew-about-foot rp-telemetry text-dust">
          {BRAND.name} &middot; the Keeper
        </p>
      </article>
    </main>
  );
}
