# Changelog

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
