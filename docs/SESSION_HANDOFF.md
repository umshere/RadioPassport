# Session handoff — Elsewhere

Saved so this conversation can be compacted. Next turn: read this file + `docs/ROADMAP.md`.

## Identity

- **Product name:** Elsewhere
- **Tagline:** You are not here.
- **Promise:** Stay long enough to be stamped.
- **Repo / heritage name:** Radio Passport (`umshere/RadioPassport`)
- **Positioning:** live radio as a fashion cover of a city that is awake without you
- **Hard rule:** never charge to hear the radio. Public streams stay public.

## Git

- Branch: `main`
- Remote: `https://github.com/umshere/RadioPassport.git`
- Head at last product push: `e318f7e` — universal bar, seam transitions, night desk, stamp dispatch, up-next prefetch. Passport stamp rule is in `docs/DESIGN_SPECS.md`. Domain + agent docs follow.
- Do not commit `.env`
- `public/FTS.jpeg` is the 404 wallpaper. Ship it with the app.
- Live host: **https://elsewheremusic.com**. Radio Passport 308s there. Facts: `docs/DOMAINS.md`. Ship: `docs/DEPLOY.md`. Breaks: `docs/TROUBLESHOOTING.md`. Agents: `AGENTS.md`.

## Shipped 2026-08-21 (`e318f7e`, live on prod)

- **The seam** — home ⇄ theater navigations run through the View Transitions API (`viewTransition` on the four nav triggers). Globe dissolves into the theater sky (`vt-globe-sky`), city name carries across (`vt-city`). Browsers without VT fall back to the Passage rise untouched.
- **Universal site bar** — `app/components/SiteBar.tsx`, mounted in `root.tsx` above `<Outlet />`. One sticky rail everywhere: wordmark → `/`, Room → `/about`, Passport (opens overlay on home, else routes to `/?passport=1`). Home/about/theater headers pruned; `.rp-home-header` is now `position: relative` — only the site bar sticks. Mobile-safe at 390px.
- **Night desk** — AI dispatch letters sign `— night desk` in the theater letter; facts list gets a "the desk found" byline. Template letters stay unsigned. Gate: `room.captionSource === "ai"` → `deskSigned` prop through `listen.tsx` → `TheaterWell` → `TheaterLetter`.
- **Stamp dispatch toast** — when a 60s stamp lands, `JourneyBridge` fires `/api/ai/dispatch` for that place and grows the INKED toast a one-line headline (toast holds 6.5s instead of 4s).
- **No more dead air** — stations that send no ICY titles get a fresh ambient dispatch every 90s while playing (`useRoom.ts`); captions already refreshed per track change via `dispatchCacheKey` (station|track|hour).
- **Up next** — dock prefetches the next queue station's dispatch into `upNextStore` (10-min TTL, shared tags/language computed locally, no extra AI call for similarity); theater shows a non-interactive `UP NEXT` row. Deliberately not clickable — new interactive controls must be declared in `SURFACE_CONNECTIONS`.

Gotchas discovered this session:

- **Tailwind v3 nondeterministically drops rules inside `@layer components`** (hit the site-bar block: whole rule vanished from served CSS depending on declarations like `-webkit-backdrop-filter` / `color-mix`, and even re-appearing on identical input). The site-bar CSS therefore lives **outside any `@layer`**, at the end of `app/tailwind.css`, with a comment saying why. If you add styles there, keep them outside the layer.
- The dev server serves `/app/tailwind.css` (postcss pipeline) differently from `/app/tailwind.css?direct` (raw). After CSS edits, verify against the plain URL.
- Full page reloads do not restore playback (`nowPlaying` is not persisted) — empty theater after reload is expected, not a bug.
- `HeroSection.tsx` fails lint (`no-empty`) on clean `main`; file is unimported legacy. Pre-existing, not ours.

## What shipped (live product)

- Home `/`: coverline, night-earth globe, Land here / Continue, solar hours, same-hour cities
- Globe is **not a mock**: real Radio Browser cities. HTML tooltip = city, region, country code, lead station, live count. Click rotates the earth to face that longitude, then plays the strongest station there.
- Search (any language, tag, city — not Tamil-only) keeps the globe live. Missing Radio Browser geo falls back to the country center. Globe faces the densest match. Contract: `app/components/radio-passport/globePlaces.ts`.
- Intent bar + voice + Surprise mix
- `/listen` theater: constellation is a sky (right column / phone-first sticky strip) and a knowledge graph on a seeded galaxy river. Type is a letter. Honest ICY. Filing keeps the sky inhabited (disc + place/track names). After filing, one deepening pass may add stars. Faces cap at 14; each star keeps at most 3 threads so a filed film track stays a figure, not crumpled foil. The letter sits at four lines; a foil `more` opens the rest. Scroll recedes the sky (figure scales) when there is page left to reveal. Home keeps the same night behind the globe (`GalaxyBackdrop`). Station rows use the station plate or the Elsewhere mark — never a clipart play.
- Atlas + country drill-down overlays
- Passport stamps after **60s continuous** listen; favorites; localStorage only
- Mobile: globe first, full-width Land here, compact dock, theater via art / Theater link
- Brand: lacquer seal + foil ring. Favicon `/elsewhere-favicon.svg`. Wordmark `/elsewhere-mark.jpg`. About colophon `/elsewhere-colophon.jpg`
- Day / Night pin on the cover chips. Default Night. Persist `elsewhere-atmosphere`. Day is paper, not a white invert. 404 stays night.
- Tuning overlay, old Radio Passport header/sidebar, Mantine about deck: **unmounted** (files may still exist — do not import them)
- Live stylesheet does not import Mantine or leftover travel CSS. Tailwind scans mounted files only.

## AI (cost lock)

- Local: Heuristics gateway, model hardcoded to `deepseek-v4-flash`
- Vercel prod (as of this session): `AI_PROVIDER=gemini`, `GEMINI_MODEL=gemini-2.5-flash` (free tier; better writing than Flash-Lite). No Heuristics URL. Needs a **redeploy** after the env fix.
- Dispatch and trivia try Flash first, then Gemini 2.5 Flash, then template / hide
- The Room owns the current land. Theater files free trivia (plate + facts + verified relations) first, then AI cover + graph, then one deepen, only when ICY sent a title
- Never put AI on the audio path
- Never `AbortController.abort()` Remix fetch (it can kill the process). Use `Promise.race`

## Audio

- Only `<audio>` is `GlobalAudioBridge` in `app/root.tsx`
- Filters / search / overlays must not `stop()` playback
- Radio Browser + CORS / mixed-content failures are real. Retry then skip. Do not fake a healthy catalog.

## Voice (use these words)

land · dusk · hour · stamp · live · cover · elsewhere · now

**Ban:** discover · seamless · AI-powered · widget · playlist · unlock · explore

## Monetization (not built)

- Paid object: **Correspondent** — **$6/mo or $60/yr**. Never call it Premium.
- Sell the desk: unlimited mix, filed dispatch, probe-ahead skip, synced passport book
- Do not paywall streams, globe, atlas, or Land here
- Account: magic link. Stripe. Flag `ELSEWHERE_BILLING=1`
- Kill if ≥200 qualified users and checkout start <1.5%, or AI COGS >35% of MRR

## Launch (not started)

- Campaign: *Someone else's now*
- Viral frame is `/listen`, not the globe
- Public domain **live**: `elsewheremusic.com` (Cloudflare DNS-only → Vercel). Apex serves. `www` serves. `radiopassport.art` + `www` 308 to the apex. See `docs/DOMAINS.md`.
- Tailscale MagicDNS can hide the new name on this laptop. Public DNS is fine. See `docs/TROUBLESHOOTING.md`.
- 14-day sequence is in `docs/ROADMAP.md`
- Do not turn on billing during launch week
- Animated favicon: **overkill**. Still seal only.

## Next work (in order)

### 1. Stamp ink progress — Pass 2 core

The 60-second stamp timer is invisible; make it seen.

- The dock stamp ring is `.ew-stamp-ring` in `PlayerDock.tsx` (inline styles ~line 156). Fill it with ink over the continuous minute: conic-gradient driven by a CSS var (`--stamp-ink: 0..1`) that `JourneyBridge` already owns the clock for (`startedAtRef`). Write the var once per second while playing, reset on station change / pause / stamp.
- At full ink it becomes the existing "stamped" state. Reduced motion: skip animation, show static ring + existing title copy ("Stay 60 seconds to ink this city").
- Keep the contract tests green: `isStampReady` semantics must not move (`elsewhereFlow`, `radioPassportRedesign`).

### 2. Ticket-stub passport — Inspora pick

Ums chose boarding-pass/ticket-stub language as the primary creative direction (Inspora board), plus dither/halftone as texture layer.

- Restyle `PassportOverlay` stamps (`Overlays.tsx` ~392–520) as ticket stubs: perforated edge, big city + country code, local time at stamp moment, telemetry small, slight rotation. Stamps already store `stampedAt`, `telemetry`.
- Dither/halftone shading pass on the canvas atmosphere washes (`ParticleGlobe`, `TheaterField` dust/nebulae). Perf-first: no per-pixel work on hot loops without measuring.
- Voice gate before shipping any new copy: land · dusk · hour · stamp · live · cover · elsewhere · now. Ban list still applies.

### 3. Intent echo (small)

When `/api/ai/interpret` rewrites the typed query (`submitIntent` in `_index.tsx`), whisper back what was understood via the existing seek status line (`seek.spoken` → IntentBar `statusLabel`/`statusSpoken`). One transient state, cleared on next keystroke.

### 4. Sky draws connections (small)

When the trivia graph lands in the theater, pulse the knowledge-edge alpha once. `TheaterField` already eases glow/reach toward phase targets and has star-birth bloom constants in `theaterLock.ts`. Keep everything seeded/deterministic — `theaterLock.test.ts` locks that down.

### 5. Flow audit + loops — Pass 3

Walk every entry in `SURFACE_CONNECTIONS` (`productFlow.ts` ~106–380) by hand on desktop + mobile; log friction; fix. Then design the retention loops on top of a clean floor: passport milestones (10th stamp, continents complete), dusk-hour return nudges ("it's dusk in Kochi"), stamps-as-next-city pull (already half-built via `resolveStampReplay`).

### 6. Android (parked by Ums until web feels done)

TWA → Play Store via Bubblewrap/PWABuilder was the chosen path (near-zero code). Revisit only after 1–5. Background-audio/media-session quality is the thing to evaluate when deciding TWA vs Capacitor.

### Still open (business track, unchanged)

- OG still from `/listen` on the new host
- 14-day *Someone else's now* campaign (`docs/ROADMAP.md`)
- Correspondent ($6/mo) — magic link + Stripe + quotas + probe-ahead; billing flag stays off during launch

## Housekeeping

- `.playwright-mcp/` test artifacts are untracked; add to `.gitignore` if they annoy.
- Legacy dead files fail lint (`HeroSection.tsx` `no-empty`) and are unimported; safe to delete in a cleanup pass (`RetroTuner`, `Premium*`, `AppHeader`, `MobileSidebarMenu`, scenes/*).

## Key files

- `app/routes/_index.tsx` — home
- `app/components/radio-passport/*` — globe, `globePlaces.ts`, overlays, intent, stamps
- `app/components/PlayerDock.tsx`
- `app/state/roomStore.ts` — current land
- `app/hooks/useRoom.ts` — dock writer
- `app/routes/listen.tsx`
- `app/components/SiteBar.tsx` — universal bar (root-mounted)
- `app/state/upNextStore.ts` + `app/components/radio-passport/UpNextRow.tsx`
- `app/constants/brand.ts` + `app/tailwind.css`
- `app/services/ai/gateway.ts`
- `docs/ROADMAP.md`

## Tests

`npm test` — 181 passing (22 files; `upNext.test.ts` added 2026-08-21). Keep those exports (`titleCasePlaceName`, `toggleSelection`, `shouldAnimateDock`, `aggregateCountryStationContext`, `applyAiPreviewPool` returns the descriptor, `stampForContinuousSession`, `sharedSignals`).
