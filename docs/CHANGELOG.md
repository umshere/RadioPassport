# Changelog

Newest first. Sections from 2026-08-16 to 2026-09-27 were written afterwards from the commit log; earlier ones were written at the time. The current feature list is [FEATURES.md](./FEATURES.md).

## 2026-09-29 — Departures Hall, tickets, the room's light, the round mark

- **Home is the Departures Hall.** Sky (city flip-clock, Keeper line, Land here), sticky gates (search, Dawn/Midday/Dusk/Night, Atlas door), a departures board, recent stamps. The globe and the phone sheet are gone. Board rows with no coordinates show a rough clock from the country's centre.
- **The desk redesigned** (`/listen`): sky, boarding pass, postcards ("out of my notebook, not the station's word"), Ask the desk, next departures. The change-gate field is square, full width, always on. Nav reads Elsewhere, Atlas, Desk.
- **How it works.** First-visit card on the home, a plain About page with a generated desk scene and numbered cards, a quiet "How it works" link in the site bar and a square "?" on phones. Error and 404 pages now render inside the standard shell.
- **Tickets.** Every share sends a printed boarding pass: `/ticket/<uuid>.png` (1200x630, story 1080x1350), `/t/<uuid>` with per-station link preview tags, a ticket sheet, an arrival card for the friend. Before that, a plain `/?tune=<uuid>` link and `/api/station` (same day).
- **The room's light.** One fixed foliage-light layer that follows the hour: real branch-and-leaf sprites (our own drawing), colours by hour, clipped to the sky panel on desktop, gust on hour, page and station change, gyro parallax on phones, and a landing sweep of about 190 degrees on every load that settles. Tuned several times the same day (visibility at night, phone strength, arrival timing).
- **Round app icon everywhere.** Transparent favicon, Android maskable and any icons, iOS touch icon, lock-screen artwork. No more black square around the mark.
- **Keeper.** The Keeper became a character with one voice file (`keeperVoice.ts`): landed, stamped, off we go; unasked murmurs with grounded facts, a "Worth knowing" feed, topic chips, hush; sheet v2 (ask first, one panel at a time); pixel sprites cut to transparent. A system pause (call, Siri, Bluetooth) now stops the player state; generic programme lines (UK Top 40) are not treated as songs. iOS sheet rows no longer overlap.
- Shell scroll guard so the iOS keyboard cannot leave the header out of view.

## 2026-09-28 — The Keeper arrives, Theater becomes the desk, CSS split

- The floating night clerk and its sheet; dark-launched `/api/keeper/route` and `/api/keeper/ask`, then live behind `KEEPER_ASK_ENABLED`. Questions route through Jev (TypeSafe System One, 1.2s race, keyword fallback). Knowledge mode answers a named artist, genre or place from a Wikipedia snippet, labelled as the Keeper's notebook.
- Theater became the desk; the animated constellation and about 285 lines of dead Theater CSS and their helpers were deleted.
- `tailwind.css` split into ordered files under `app/styles`; tests read the cascade through `readAppCss()`.
- UI primitives (`Button`, `ButtonLink`, `Chip`, `Eyebrow`, `Row`, `Sheet`), one button-state grammar, `--rp-*` tokens retired, 44px phone targets, global focus ring, Mantine dropped from the first-load bundle, `Index()` shrunk from 1,247 to 488 lines by extracting hooks and components.
- Phone: search is a 48px square bar; skeleton rows while loading; probe gives up on a silent host after 2.2s; first-visit hook line; readable station rows. Hour rail marks the listener's own hour.
- Anonymous usage beacon (`/api/usage`); dock shows the cleaned track title; Åland-flag guard (state naming another country wins).

## 2026-09-15 to 2026-09-18 — Secret trail, ring, reliability

- Elsewhere secret room trail (misplaced hour mark, then the room between hours).
- Stamp ring clocks the minute, then rests as the mark; passport book keeps six slots and names each replay; probe-ahead skip lands on a live HTTPS signal; availability honesty pinned to wall-clock.
- Board rides as a sheet on the phone; theater companion tells place, hour and evidence.

## 2026-09-04 to 2026-09-11 — One band, split-flap board, water

- One mobile band on every page (Elsewhere, Atlas, Theater tabs; later renamed Desk). App-shell continuity and intent URLs.
- Split-flap live board with a rotating idle window, drums that churn the charset, capped so it settles in under a second. Hour taps are time travel; Atlas rows wear flags; country land deals the instant board.
- One toast channel for stamps and stream notices; dock owns the transport; one shared seek shell.
- 60-second cache for repeat catalog queries, 5-minute server cache for the home catalog; outages never cached.
- Theater sky moved through dots-and-damping and a "water" phase (both later removed).

## 2026-08-16 to 2026-09-02 — Ship script, Theater knowledge graph, phone home

- `npm run ship` (single Git-triggered build). Seek moved into the sticky bar. Theater as a navigable knowledge graph (later removed). Share card still. A catalog outage says "Signal lost", not a false "No signal". 15s deadline on `/api/ai/recommend` so Surprise always lands. Unmounted legacy files deleted. Graphify knowledge graph wired into agent briefs.

## 2026-08-15 — The letter runs; the sky recedes

The cover sits at four lines. A foil `more` opens the rest; `less` folds it back. Facts still stop at six. As you go, the constellation scales down into a ribbon so the folio has room; scroll back and the night opens again. A shallow page still refuses to fold, so the sky cannot claw the scroll.

## 2026-08-15 — The sky is a galaxy, and the figure reads again

The room leans against a real night: a seeded milky river, ~200 grains of dust in three depths tinted bone, foil and ether, brighter grains carrying a cross flare, a breathing nebula, and a vignette that settles the edges. Home keeps the same night behind the globe.

The figure was drowning in its own gold. A filed sky drew hundreds of faces and every star roped to everything in reach, so the constellation stacked into crumpled foil. Faces are capped at the tightest fourteen and each star keeps at most three threads — the mesh is a figure again, not a web. Crowded families fan on a golden angle instead of queueing down the page in a column.

Scrolling the theater folds the sky, giving the folio room to be read — but only when there is enough page left to reveal, so a shallow room never fights the scroll.

## 2026-08-15 — The sky becomes knowledge

The constellation is a graph now. MusicBrainz relations and the cover AI return real nodes and edges (`wrote`, `composed`, `featured in`). About ten seconds after the dossier files, one second-ring pass may add a few more stars — they keep their seats and ignite with a birth ripple. The lacquer disc prefers those knowledge threads and names the relation mid-edge. Behind the mesh: seeded dust, a faint nebula, a rare meteor. Reduced motion keeps a still sky. Nothing is invented.

## 2026-08-15 — Filed sky stays inhabited

Filing the cover no longer ghosts the constellation. The mesh keeps its glow, place and track names stay on the stars, and the lacquer disc keeps walking. Isolated clusters are spanned so the disc never crosses empty sky. Sentence-length facts do not become labels. Home station rows use the station plate when Radio Browser sent one; otherwise the Elsewhere mark — not a clipart play triangle.

## 2026-08-15 — Theater sky and folio

The constellation is no longer wallpaper behind the type. Desktop gives it the right column, the way home gives the globe the page. Phone puts it first as a sticky sky, so the traveler stays visible while you read. Type stays a letter. Filed facts walk a foil meridian — the same grammar as the sky — and YouTube / Wiki sit as foil marks. Hollow Yes/No facts and artist/title echoes do not file. The cover AI is asked for a journey, not a schema dump.

## 2026-08-15 — One room for the current land

The current land is one object now (`roomStore`), keyed to the station. Land / next / prev opens a new room. Classic Vinyl HD cannot keep talking about New York after Wisconsin is on the air.

The dock is the only writer. Home and Theater only read. An honest template caption sits immediately; AI dispatch may replace it. When ICY sent a title, free trivia files first — Cover Art Archive, then iTunes, then Wikipedia, plus MusicBrainz facts — so the plate does not wait for Gemini. AI cover may upgrade the sentences. No Firecrawl. Leftover insight sheets stay unmounted.

## 2026-08-14 — Hours sit on a horizon

Boxed hour chips are gone. The four hours are stops on one foil hairline; each point's height tells the time — midday above the line, dawn and dusk on it, night below. The chosen hour fills its point in foil. Same grammar as the header Day/Night pin. Atlas stays on that row at every width, marked as a doorway by a 14px CSS globe (ring, meridian, equator) before `ATLAS →`. It is never a fifth stop and never takes its own line. Filter logic is unchanged.

## 2026-08-14 — Land is a stamp

The land control is a customs stamp inked in lacquer: bone hairline frame, mono kicker (`EW · ARRIVAL` / `RE-ENTRY` / `DEPARTURE` / `RETURN`), city in italic Newsreader. Press stamps — a 2px drop. The dock play disc has a foil rim; a needle mark tours it while live. The Theater stage no longer carries a second transport. Atlas and `← Elsewhere` draw a foil meridian on approach.

## 2026-08-14 — Passage

Every room arrives the same way: the page rises out of dusk, the foil rule draws itself, and the name lands last. One settle ease (`--ew-settle`). The station name re-lands when the station changes, not just on navigation; a new ICY title settles the track line the same way. Overlays rise behind a dusk veil. The loading hairline is a foil meridian sweep. Transform and opacity only; reduced motion turns it all off.

## 2026-08-14 — Phone globe is a tap strip

On a phone the city name no longer sits on the globe. The ball is a 180px strip; the coverline and telemetry sit under it, then Land here. The hover tip does not show — tap lands. Desktop is unchanged: the cover still lives in the corner of the page globe.

## 2026-08-14 — Theater files the cover

Opening Theater no longer walks `← Elsewhere` when the track dossier arrives. The back link is sticky; the city stays put above a reserved well. The room itself is a foil constellation of released metadata — place, tags, language, signal, then ICY and facts when they arrive. Missing fields do not get stars. Kindred families connect, so two stations draw different skies. While filing, the lacquer disc walks those edges and names the star it is on. Existing stars keep their seats when a new field arrives. The dock is the only ICY poller; trivia requests join instead of restarting. Not a boxed spinner. Theater reads the dock’s live metadata instead of starting a second ICY poller.

## 2026-08-14 — Atlas fits the phone

Country rows were sizing to their text (~555px) and sliding off a 390px screen. The atlas grid is now `minmax(0, 1fr)` on small viewports; overlay titles wrap.

## 2026-08-14 — Day / Night room

Night stays the default Elsewhere room. Day is a morning-edition paper palette (warm stock, iron-gall type, same lacquer seal). The pin sits with the solar-hour chips and is labeled Night / Day, never Light / Dark.

- Tokens flip on `data-atmosphere="day"`; Tailwind colors read the CSS vars
- Globe becomes a lithograph plate in Day; lacquer cities stay
- Stored in `elsewhere-atmosphere`; boot script prevents a night flash
- 404 wallpaper stays night. Station art discs stay night windows

## 2026-08-14 — First load drops Mantine

The live shell no longer wraps every page in `MantineProvider`, and `app/tailwind.css` no longer imports Mantine or leftover travel-stack / hero CSS. Tailwind only scans the mounted product files.

- Passport stamps stay type (`IN · India`), not flags — see `docs/DESIGN_SPECS.md`
- Leftover screens (`CountryFlag`, AtlasGrid, RetroTuner) stay on disk, unmounted
- Contract: `tests/unit/elsewhereProduct.test.ts` → live stylesheet

## 2026-08-14 — elsewheremusic.com is the live host

- Apex `elsewheremusic.com` serves the app (Cloudflare DNS-only → Vercel)
- `www.elsewheremusic.com` also serves
- `radiopassport.art` and `www` 308 to the apex
- Tailscale MagicDNS can hide the new name locally; public DNS is fine
- Agent runbooks: `AGENTS.md`, `docs/DOMAINS.md`, `docs/DEPLOY.md`, `docs/TROUBLESHOOTING.md`
- Skills: `/elsewhere-deploy`, `/elsewhere-troubleshoot` (Grok + Claude)

## 2026-08-14 — Globe stays lit on every search

Language and tag searches (tamil, malayalam, jazz, a city name) were filling the list and emptying the globe. Radio Browser usually omits `geo_lat` / `geo_long` on those rows. The homepage globe used a geo-only feed; the search globe required real coordinates and went blank.

- Any query of two or more letters keeps the world globe up until the catalog lands
- Stations without coordinates plot on their country center (ISO code, not a Tamil-only list)
- Globe turns to the densest matching country
- Country centers are locator-only — they are never written back onto `Station`
- Contract: `app/components/radio-passport/globePlaces.ts`
- Tests: `tests/unit/elsewhereProduct.test.ts`

Also in this stretch, already on `main`:

- Every on-screen control belongs to the land → intent → tune → inhabit → stamp → next loop (`productFlow.ts`)
- Empty search / atlas / passport / mix surfaces offer a button, not copy-only
- Stamp ring and INKED toast open the passport from `/`, `/listen`, and `/about`
- Globe holds still under the pointer so a city can be landed
- `public/FTS.jpeg` is the 404 wallpaper
- Hour / search / mix / passport no longer leave a leftover intent on the wrong surface

## 2026-08-13 — Elsewhere

The product face is **Elsewhere**. Radio Passport remains the repo / heritage name.

- Editorial home: coverline, night-earth globe, Land here, solar hours, same-hour cities
- Globe intelligence: HTML tooltip (city / region / station / count), rotate-to-face, play lead station
- Intent + voice + Surprise mix; interpret + dispatch APIs
- Heuristics gateway, model locked to `deepseek-v4-flash`
- Intent mic is a thin line-art mark (no emoji)
- Prod Gemini default is `gemini-2.5-flash`; dispatch/trivia use Flash then Gemini, not templates-only
- Theater dossier (summary + facts) only when a station sends a track title
- Country / language catalogs fetch the real set, then keep likely-live streams
- Search names itself in the bar (`Searching` → `N live`) and on the list
- `/listen` theater, honest ICY empty state, 60s passport stamps
- Brand mark, SVG favicon, Issue 01 about; Tuning overlay and old header unmounted
- Mobile dock / cover / theater
- Roadmap (launch + Correspondent): `docs/ROADMAP.md`

## 2025-12-08 — Visual Redesign & Player Improvements

### Improved

- Restored and enhanced Hero glass surface — frosted, feathered, and blended seamlessly with the page background for a cinematic overlap with the new wide hero artwork (`RPHERO_WIDE.png`).
- Reworked floating music notes animation in `HeroSection`: natural "music wind" effect, staggered timing, and now conditionally visible only when audio playback is active.
- Major visual redesign for player surfaces (`PlayerDock`, `MinimalPlayer`, `PassportPlayerFooter`) — warm gold/amber gradient accents, animated shimmer and sparkles, pulsing play controls, and more dynamic progress visuals across desktop and mobile.
- Restyled `StationCard` and the mobile `CompactStationCard` to match the new warm/vibrant aesthetic: glowing active states, warm gradients for fallback art, updated buttons, and responsive polish.
- Improved hero/mini-player blend on mobile and desktop for a cohesive, elevated "wow" experience across pages.

### Docs

- Updated `docs/UI_REDESIGN_PLAN.md` with implementation notes for the new hero, PlayerDock, and card styling changes (visual polish, mobile behavior, and TODOs for follow-ups).

## Fixed

- **SceneManager Module Resolution**: Fixed AtlasScene loading error by replacing dynamic string interpolation with explicit scene registry to ensure Vite alias resolution works properly
- **SSR Hydration Issues**: Resolved infinite loops, hydration mismatches, and client/server rendering differences through comprehensive fixes including Zustand SSR stability, deterministic animations, and client-only rendering utilities
- **Card Layout Improvements**: Enhanced travel log card layouts with better spacing, typography, and visual hierarchy including folder tab badges, metadata optimization, and responsive design
- **Travel Log Simplification**: Streamlined travel log from complex interactive player to clean roadmap view, removing redundant controls and excessive animations for better performance and UX

## Added

- Travel Trail player: horizontal strip with inline controls and journey line
- Station normalisation layer (`utils/stations.ts`) for consistent Radio Browser ingestion
- Docs refresh describing the new player lifecycle and API hygiene
- Reliability badges and trending chips on travel trail + station cards

## Improved

- Quick Retune and atlas transitions updated for the always-on travel trail
- Country/station fetches now pass through the normaliser (country loader, explore, surprise, preview)
- README now highlights stream health opportunities and the new architecture
- Station sorting now prioritises healthy/trending streams across recent, explore, and quick-retune flows
- Travel trail integrates the active card into the strip with dotted progress and keyboard access

## Docs

- Consolidated docs under `docs/` with an index and this changelog
- Updated root README links to documentation

## Notes

- Playwright tests updated areas require alignment (see TESTING_GUIDE for running locally). Before merging to main, run tests and update snapshots if UI changes are intentional.
