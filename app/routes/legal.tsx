import { Link } from "@remix-run/react";
import { Eyebrow } from "~/components/ui/Eyebrow";
import { BRAND } from "~/constants/brand";
import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from "~/utils/social";

const DESCRIPTION =
  "Elsewhere's terms, privacy and credits, in plain words: free radio, no accounts, no ads, nothing sold.";
const UPDATED = "2 October 2026";

export const meta = () => [
  { title: `Terms, privacy, credits · ${BRAND.name}` },
  { name: "description", content: DESCRIPTION },
  { property: "og:title", content: `Terms, privacy, credits · ${BRAND.name}` },
  { property: "og:description", content: DESCRIPTION },
  { property: "og:url", content: "https://elsewheremusic.com/legal" },
];

function Source({ href, children }: { href: string; children: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

/**
 * The small print, kept out of the listening path: no banner, no gate, one
 * quiet link in the footers. Each part opens with the Keeper's one-line
 * summary, then says the plain thing. The facts here are the app's real
 * behaviour (see docs/FEATURES.md and docs/ENVIRONMENT.md); change both
 * together.
 */
export default function Legal() {
  return (
    <main className="rp-home min-h-screen">
      <article className="ew-about ew-legal">
        <header className="ew-about-head">
          <Eyebrow tone="foil">The small print</Eyebrow>
          <h1 className="ew-coverline mt-4">Terms, privacy, credits.</h1>
          <p className="ew-legal-hello">Papers, in order. Short version: the radio is free, I keep no account of you, and nothing here is sold.</p>
          <nav className="ew-legal-jump" aria-label="On this page">
            <a href="#terms">Terms</a>
            <a href="#privacy">Privacy</a>
            <a href="#credits">Credits</a>
          </nav>
          <p className="ew-legal-date">Updated {UPDATED}</p>
        </header>

        <section id="terms" className="ew-legal-sec" aria-labelledby="terms-title">
          <Eyebrow tone="foil">
            <span id="terms-title">Terms</span>
          </Eyebrow>
          <p className="ew-legal-keeper">Use it, share it, don’t break it.</p>
          <h2>What Elsewhere is</h2>
          <p>
            Elsewhere is a directory and a player for live internet radio. When you press play, your own browser connects
            straight to the station. We don’t host, record, copy or change any station’s audio. Hearing radio here is free.
          </p>
          <h2>The stations</h2>
          <p>
            Every stream, name and logo belongs to the station that runs it. We can’t vouch for what a station says or
            plays, and we can’t promise a stream stays up; when one fails we try to find you another. If you run a station
            or hold rights to something and want it off the board, message us and we’ll take it down.
          </p>
          <h2>The Keeper’s notes</h2>
          <p>
            The Keeper’s lines and answers are built from the station’s own information and from public sources, and
            sometimes drafted by an AI from those facts. They can be wrong. Anything that came from his notebook and not
            from the station is marked that way. He never invents a song title; if the station sends none, he says so.
            Nothing he says is professional advice.
          </p>
          <h2>Using the site</h2>
          <p>
            It is for your own listening. Please don’t scrape it, flood it with requests, or try to break or probe it. Some
            features have limits (for example, the number of questions the Keeper answers in an hour). We may change, pause
            or end any part of Elsewhere.
          </p>
          <h2>Tickets and sharing</h2>
          <p>
            A ticket is a link and a picture of a station. It names the station and its place, not you. Share what you’re
            happy to share.
          </p>
          <h2>Our marks, and no warranty</h2>
          <p>
            The Elsewhere name, the Keeper and the artwork made for the site belong to us. The site is provided as it is,
            without promises, and to the extent the law allows we aren’t liable for losses from using it. Nothing here
            limits rights you have by law. We may update these terms; the date above says when.
          </p>
          <p>
            Questions, takedowns, anything else: message{" "}
            <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">
              {INSTAGRAM_HANDLE}
            </a>{" "}
            on Instagram.
          </p>
        </section>

        <section id="privacy" className="ew-legal-sec" aria-labelledby="privacy-title">
          <Eyebrow tone="foil">
            <span id="privacy-title">Privacy</span>
          </Eyebrow>
          <p className="ew-legal-keeper">No accounts, no ads, no tracking cookies. I don’t sell anything about you.</p>
          <h2>What stays on your device</h2>
          <p>
            Your passport (stamps), kept stations, last station, Night or Day, whether the Keeper is hushed, where you left
            him, and a few small flags (for example that he has already asked you to pass the radio on) live in your
            browser’s storage on your device. They are not sent to us. Clearing your browser’s site data erases them, and
            so does losing the device: there is no account to restore them from.
          </p>
          <h2>What we count</h2>
          <p>
            We count visits and a few actions (a page type, a ticket shared, the Keeper opened) as anonymous events: just
            the name of the event. No ID, no station, no text you typed. They are written to our server logs and tallied.
          </p>
          <h2>What leaves your device</h2>
          <ul>
            <li>
              <b>Radio.</b> The station’s own server sees your IP address when you stream, as with any radio. We don’t
              control it; it has its own policy.
            </li>
            <li>
              <b>Searches and questions.</b> Words you type into search or to the Keeper may be sent to AI services
              (Google Gemini, TypeSafe’s Jev router, or models reached through OpenRouter) along with the station
              facts they need, to understand or answer you. Don’t type personal details. We don’t attach your identity
              to them.
            </li>
            <li>
              <b>Looking things up.</b> To write the Keeper’s notes our server asks public sources (Wikipedia,
              MusicBrainz, Cover Art Archive, iTunes) about a place, language, genre or the artist on air. Those requests
              come from our server and name the topic, not you. Our server also reads the station’s title feed for the
              song on air.
            </li>
            <li>
              <b>Voice search.</b> Only if you press the microphone: your browser’s own speech recognition listens, and
              depending on the browser it may send the audio to its maker.
            </li>
            <li>
              <b>Phone motion.</b> If you allow it (iPhone asks), the leaves in the background follow your phone’s tilt.
              It stays on the device.
            </li>
            <li>
              <b>Hosting.</b> Our host (Vercel) keeps ordinary request logs (IP address, time, page) for security and to run
              the site. A short-lived counter by IP address limits how many questions the Keeper answers per hour.
            </li>
            <li>
              <b>Links out.</b> Instagram and other sites you open have their own policies.
            </li>
          </ul>
          <h2>Your choices</h2>
          <p>
            Clear site data to wipe everything on your device. Hush the Keeper from his sheet. Since we hold no account and
            no identifier for you, there is usually nothing of yours to look up or delete, but ask us if you wonder.
            Elsewhere isn’t aimed at young children and we don’t knowingly collect anything from them.
          </p>
        </section>

        <section id="credits" className="ew-legal-sec" aria-labelledby="credits-title">
          <Eyebrow tone="foil">
            <span id="credits-title">Credits</span>
          </Eyebrow>
          <p className="ew-legal-keeper">Everyone who made the evening you’re hearing.</p>
          <ul>
            <li>
              <b>The stations and the people who run them.</b> The sound is theirs. Elsewhere only points you to it.
            </li>
            <li>
              <b>
                <Source href="https://www.radio-browser.info/">Radio Browser</Source>
              </b>
              , the community-built directory of stations behind the board and the Atlas.
            </li>
            <li>
              <b>
                <Source href="https://www.wikipedia.org/">Wikipedia</Source>
              </b>
              : short passages about places, languages and artists in the Keeper’s notebook, used under{" "}
              <Source href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</Source>. Each is labelled as
              his notebook.
            </li>
            <li>
              <b>
                <Source href="https://musicbrainz.org/">MusicBrainz</Source>
              </b>{" "}
              and the <Source href="https://coverartarchive.org/">Cover Art Archive</Source> for track details and
              covers; <b>Apple’s iTunes Search</b> for some artwork. Artwork belongs to its rights holders.
            </li>
            <li>
              <b>AI assistance</b> from Google Gemini and models reached through OpenRouter and TypeSafe, working only from
              the facts we give them, never on the audio.
            </li>
            <li>
              <b>Typefaces:</b> Newsreader, Schibsted Grotesk and Azeret Mono, open fonts under the SIL Open Font License, served from this site.
            </li>
            <li>
              <b>The Keeper</b>, the pixel-art figure, and the illustrations were made for Elsewhere.
            </li>
          </ul>
          <p>Where a source has its own terms, its terms apply to what it provided.</p>
        </section>

        <p className="ew-about-go">
          <Link to="/" prefetch="intent">
            Back to the air →
          </Link>
        </p>
      </article>
    </main>
  );
}
