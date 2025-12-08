# Changelog

All notable changes in this iteration (Oct 2025).

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
