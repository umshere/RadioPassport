# Design Specs (Current UI)

This document captures the current, implemented UI and route surface for Radio Passport, with a designer-facing inventory of flows, layout, and visual language. It is intended as a reference for gap-finding and future refinement.

## Scope and sources

- Code scanned: `app/routes/_index.tsx`, `app/components/*`, `app/components/WorldMode/*`, `app/routes/components/*`, `app/root.tsx`.
- Routes reflect the Remix file-based routes in `app/routes`.

## Route inventory

### UI routes

- `/` with optional search params
  - `view=world` toggles World Mode (dark terminal aesthetic).
  - `view` absent or not `world` shows Classic Mode (light atlas aesthetic).
  - `country=<name>` switches to Country view within Classic Mode.
  - `q=<query>` triggers catalog search in Classic Mode.
- `/about` (marketing/brand page).
- `/world` -> redirect to `/?view=world`.
- `/world/:sceneId` -> redirect to `/?view=world`.
- `/ai` -> redirect to `/?view=world`.

### API routes

- `/api/ai/recommend`
- `/api/now-playing`
- `/api/now-playing-trivia`
- `/api/radio-catalog`

## UI flow (clear, current)

This section captures the current user journey and what the UI shows at each step.

### Flow A — Classic Mode (default landing)

1) User lands on `/`.
2) Global shell renders: `AppHeader` + `MobileSidebarMenu` + `PlayerDock`.
3) Hero + Atlas sections appear:
   - Primary attention zone: hero image, tagline, and the search input.
   - Primary action: start listening / quick retune.
   - Secondary action: switch to World Mode.
4) User actions:
   - Search (`q`): shows catalog results list.
   - Click country: adds `country=<name>` and opens Country View.
5) Country View:
   - `CountryOverview` (dial + queue navigation).
   - Filters + Station list.
6) Play a station:
   - `PlayerDock` becomes active and persists across routes.

### Flow B — World Mode (terminal view)

1) User switches to `/?view=world`.
2) World header + AI prompt appear (WorldHome).
3) User types a prompt → geminiService → stations list.
4) User taps a station → playback starts (shared PlayerDock).
5) Passport tab shows saved stations (localStorage).

### Flow C — AI World Mix inside Classic Mode

1) User triggers world mix from Classic Mode CTA.
2) `/api/ai/recommend` returns a card_stack descriptor.
3) Explore queue updates and feeds PlayerDock.

## Global app shell

Defined in `app/root.tsx` and shared by all routes.

- Header: `AppHeader` (sticky, light surface) with logo, now-playing micro status, and view toggle (Classic/World). Includes a search focus button that targets `#hero-search-input`.
- Mobile navigation: `MobileSidebarMenu` (hamburger + slide-in drawer). `MobileTabBar` exists but is not currently mounted.
- Player: `PlayerDock` (persistent bottom player with mini/expanded modes, station artwork, playback controls, tuning meter, trivia popover, and quick-retune triggers).
- Overlay: `TuningOverlay` for global player feedback.
- Theme: Mantine theme with brand palettes (ocean, passport, stamp, horizon) and fonts (Inter, Roboto Mono).

## Mode overview

### Classic Mode (light atlas)

Primary experience on `/` when `view` is not `world`.

Visual language:

- Light, paper-like surfaces with blurred glass cards.
- Warm travel motifs (passport stamps, atlas grids, station cards).
- Gradient page background and soft shadows.
- Mixed typography: bold uppercase microcopy and mono accents.

Core layout states:

1) Landing / Atlas view (no `country` param)

- Hero banner (`HeroSection`) with:
  - Wide image, floating music notes (when audio plays), changing tagline ticker.
  - Search input (`#hero-search-input`) for query `q`.
  - CTA buttons: start listening, quick retune, and toggle to World Mode.
- Stats bar (countries, stations, continents).
- Atlas section:
  - `AtlasFilters` (continent chips).
  - `AtlasGrid` (country stamps grid).
  - Empty state when search has no matches.
- Catalog search results (when `q` has length >= 2): `StationGrid` with clear button.
- Footer at the end of the page.

2) Country view (when `country` param exists)

- `CountryOverview` (top card) with:
  - Country badge, stations count, back button.
  - Dial-based station browsing tied to queue and now-playing.
  - Player controls (play/pause, next/prev).
- Filters:
  - `StationFilterQuickBar` (desktop) and `StationFiltersPanel` (advanced).
  - `MobileFilterDrawer` for small screens.
- Station list:
  - `StationGrid` (desktop grid) or `CompactStationList` (mobile list).

3) Search within Classic Mode

- `q` triggers catalog search (server call via `/api/radio-catalog`).
- When search is active, atlas query is suppressed in favor of search results.

### World Mode (dark terminal)

Rendered inside `/` when `view=world`. Uses `WorldHome`.

Visual language:

- Dark terminal-inspired UI with neon yellow accents.
- Strong contrast, uppercase typography, mono text blocks.
- Scanline overlays, glowing borders, and HUD style cards.

Core layout sections:

- World Mode header (sticky inside the page):
  - World logo, global travel status via `SonicFlightTracker`.
  - Tab toggles: Discover, Passport, and on mobile a Terminal toggle.
- AI search input:
  - Large prompt bar ("Where to next?") with AI loading state.
  - Agent status message below the input.
- Main content grid:
  - Left: Discover or Passport tab content.
    - Discover shows either curated rows or search results.
    - Search results render a grid of station tiles.
  - Right (desktop only): `StationDossier` (live station context, track trivia, AI deep scan).
- Mobile terminal drawer:
  - `StationDossier` rendered inside a bottom drawer.
  - Floating HUD button to open the terminal.
- Footer is still rendered by the page.

## Component inventory (by function)

- Navigation: `AppHeader`, `MobileSidebarMenu`, `MobileTabBar` (unused).
- Playback: `PlayerDock`, `RetroTuner`, `StationArtwork`, `TuningOverlay`.
- Classic Mode UI: `HeroSection`, `AtlasFilters`, `AtlasGrid`, `CountryOverview`, `StationFiltersPanel`, `StationFilterQuickBar`, `StationGrid`, `StationCard`, `CompactStationList`, `QuickRetuneWidget`.
- World Mode UI: `WorldHome`, `SonicFlightTracker`, `StationDossier`, `PassportView`.
- Marketing: `about.tsx` (standalone page with cards and CTA).

## Interaction and state notes

- View mode is controlled by `?view=world`; switching toggles URL search params.
- Country selection uses `?country=Name` and reloads loader data.
- Search uses `?q=query` and loads catalog stations when length >= 2.
- Player queue is global (Zustand store), with PlayerDock controls and dial-based navigation in Country view.
- Quick Retune is triggered from PlayerDock and `HeroSection` CTAs.

## Mobile vs desktop

- Classic Mode:
  - Station list switches to `CompactStationList` on small screens.
  - Filters move to `MobileFilterDrawer` with a top-right icon button.
  - Hero image is taller and uses a mobile-specific fade.
- World Mode:
  - Right-side `StationDossier` becomes a drawer.
  - Floating HUD button appears for terminal access.
- Global:
  - `MobileSidebarMenu` provides primary nav.
  - `MobileTabBar` exists but is not mounted.

## Prioritized backlog (gaps and improvements)

P0 — Unify the split experience (reduce repeated UI between Classic and World)

- Decide whether World Mode should be a full-screen shell without the global header/player, or a skin of the same shell; current double header causes friction. Refs: `app/components/AppHeader.tsx`, `app/components/WorldMode/WorldHome.tsx`.
- Standardize the search and exploration flow so users don’t see two different “AI search” experiences with overlapping intent. Choose one primary input pattern and re-skin the other. Refs: `app/routes/components/HeroSection.tsx`, `app/components/WorldMode/WorldHome.tsx`.
- Align navigation labels and routes to a single mental model: “Classic” vs “World” or “Atlas” vs “World,” but not both. Refs: `app/components/AppHeader.tsx`, `app/components/MobileSidebarMenu.tsx`, `app/components/Footer.tsx`.

P1 — Visual cohesion (brand and lighting consistency)

- Build a shared palette map for both modes so the jump from light (Classic) to dark (World) doesn’t feel like a different product. Provide a transitional surface style that can be reused. Refs: `app/root.tsx`, `app/components/WorldMode/StationDossier.tsx`.
- Normalize typography system across modes (heading scale, uppercase usage, mono accents). Refs: `app/routes/components/HeroSection.tsx`, `app/components/WorldMode/WorldHome.tsx`.
- Reduce redundant “status” components: Now Playing appears in header, player, and World Mode terminal. Decide which two are essential and remove one. Refs: `app/components/AppHeader.tsx`, `app/components/PlayerDock.tsx`, `app/components/WorldMode/StationDossier.tsx`.

P2 — Mobile navigation clarity

- Choose a single mobile nav model: sidebar only or bottom tabs. If tabs are the desired model, mount `MobileTabBar` and design its interaction with the sidebar. Refs: `app/components/MobileSidebarMenu.tsx`, `app/components/MobileTabBar.tsx`.
- Remove or move the floating World Mode terminal HUD if it conflicts with PlayerDock gestures. Refs: `app/components/WorldMode/WorldHome.tsx`, `app/components/PlayerDock.tsx`.

P3 — Feature clean-up and scope clarity

- Either remove or formally scope “Premium” components and provide a product narrative for them. Refs: `app/routes/components/PremiumHero.tsx`, `app/routes/components/PremiumSections.tsx`, `app/routes/components/PremiumStationCard.tsx`, `app/components/PremiumPlayerDock.tsx`.
- Audit legacy scene navigation and ensure no UI links reference `/world/*`. Refs: `app/components/Footer.tsx`.

## Design rationale (what’s missing)

- A single, cohesive “discovery engine” experience: today Classic Mode and World Mode overlap in search, curation, and listening context but feel like separate products.
- A consistent navigation vocabulary: “Classic,” “Atlas,” and “World” are all used; this creates confusion during mode switches.
- A unified state story: queue, passport/history, and AI recommendations are split across two mental models without a clear hierarchy.

## Flow gaps to address

- Two separate AI entry points (Classic Mix vs World Mode prompt) can feel redundant; needs one primary discovery flow.
- Dual headers (AppHeader + World header) create hierarchy conflict and split attention.
- Navigation labels are inconsistent (Classic/Atlas/World Map); clarify terminology across header, sidebar, and footer.
- Player visibility and context: now playing appears in header and player, and again in World Mode terminal; reduce repetition.
- World Mode is visually dark but the global shell remains light; decide on a single visual wrapper per mode.

## Passport brand features (coverage check)

Accounted for today (World Mode only):

- Departure/Arrival tracker: `SonicFlightTracker` (World Mode header).
- Passport history: `PassportView` (World Mode tab).

Missing in Classic Mode (recommended):

- Stamped countries visible in the atlas grid.
- A compact Journey module that mirrors departure → arrival → next cue.
- A shared passport history surface accessible in both modes.

## Journey module spec (Classic Mode)

Purpose: bring the passport narrative into Classic Mode by surfacing “where you came from,” “where you are now,” and “where to go next.”

### Placement

- Home (Atlas view): directly under the Hero CTA row, above the Atlas grid.
- Country view: under `CountryOverview`, above filters.
- Mobile: full-width card, single-row stack; avoid sticky behavior to reduce overlap with PlayerDock.

### Layout

- Three segments in a single line: Departure → Now Playing → Next.
- Each segment contains: flag + country name + small station label.
- Center segment (Now Playing) has the strongest visual weight.
- A thin “flight path” line connects the three segments (subtle dotted or dashed).

### States

1) Empty (no playback yet)
   - Copy: “Start your journey to stamp your first destination.”
   - CTA: “Start Listening” (scrolls to Atlas or triggers Quick Retune).

2) Playing (single station)
   - Departure: last played country (or “Home Base”).
   - Now Playing: current station + country.
   - Next: recommended country (based on adjacent continent or AI mix).

3) Traveling (station change)
   - Animate the path indicator from Departure to Now Playing.
   - Reduce motion on mobile (fade + micro-shift only).

4) Offline / Error
   - Show “Signal lost” chip in Now Playing segment.
   - Provide “Retry” or “Pick another station.”

### Interactions

- Click Departure: opens passport history drawer (or jumps to Passport section once added).
- Click Now Playing: scrolls to the current station card in the StationGrid.
- Click Next: quick retune to the suggested country.
- Long-press on mobile: opens a mini menu with “Pin destination” and “Hide journey.”

### Data source (current + future)

- Current:
  - Now Playing from `playerStore`.
  - Last station from recent stations store.
- Next suggestion:
  - Use top countries list or quick retune suggestion (current logic).
  - Later: AI-driven recommendation from `/api/ai/recommend`.

### Visual tone (passport premium modern)

- Soft embossed card with a subtle paper texture.
- Accent color used only on “Now Playing.”
- Minimal uppercase microcopy for labels (Departure / Arrival / Next).
