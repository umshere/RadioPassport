# Radio Passport Layout Redesign Plan

This document blends the strongest parts of the existing Remix/Mantine implementation with the two HTML mockups in `docs/mockup/generated-page (1).html` (Local/Home emphasis) and `generated-page (2).html` (Atlas/Story emphasis). The goals are to simplify wayfinding, tell a clearer “sound atlas” story, and deliver a Spotify-like mobile feeling without changing backend functionality.

## Inputs Considered

- Current components (`HeroSection.tsx`, `StationCard.tsx`, `CountryOverview.tsx`, `player/NowPlaying.tsx`, `scenes/card_stack.tsx`, `routes/world.$sceneId.tsx`) provide working logic, data wiring, and animation.
- Mockups highlight the desired cinematic gradients, continent chips, stamp cards, and combined journey form.
- Player store + AI routes already exist, so the redesign is purely structural/visual.

## Experience Principles

1. **Story-first header:** Primary navigation must read like a travel story (“Local → World → Atlas → Missions → About”) with room for status chips (Local/Global, Live Beta) and search.
2. **Guided exploration:** Each major page starts with context (Now Playing, hero tagline, stats), followed by clear actions (“Start Journey”, “Quick Retune”, “Chart by Continent”).
3. **Keep the magic, drop the clutter:** Preserve subtle animations (floating notes, stamp transitions, player meters) but group them inside obvious panels to avoid the current noisy header.
4. **Light-first aesthetic:** Move away from a heavy 'passport' dark motif to a lighter, more open discovery aesthetic. This improves legibility for cards, reduces perceived visual clutter, and aligns better with mobile mini player designs.
5. **Mobile = Spotify feel:** Bottom tab bar, sticky mini-player, card-based queues, and swipe gestures keep parity with the native music UX expectations.

> Note: the new experimental "Raptor mini" compact player is being rolled out as a preview — see the Player Dock section below for details. To enable Raptor mini on a local build, add `ENABLE_RAPTOR_MINI=true` to your `.env` during testing. The default for new deployments is controlled by the config in production.

## Page-Level Blueprint

### Status update — 2025-12-08

The design refresh described in this plan has been partially implemented in this sprint. Key updates shipped in this iteration include:

- Hero section: restored frosted glass card with feathered blend into the new wide hero artwork (`RPHERO_WIDE.png`) and improved overlap for a more cinematic composition.
- Floating music notes: redesigned to flow like a natural "music wind", made conditional on playback state and subtler by default.
- Player surfaces: major visual redesign for `PlayerDock`, `MinimalPlayer`, and `PassportPlayerFooter` (warm amber/gold palette, shimmer, sparkles, pulsing play control) to match the hero's energy both on desktop and mobile.
- Station cards: refreshed `StationCard` and mobile `CompactStationCard` with vibrant fallback avatars, warm gradients, glowing active states, and consistent play button treatment.

Follow-ups / next visual polish (short-term):

- Verify color accessibility for foreground contrast across the new warm palettes (buttons, badges, and mini-player).
- Add a lightweight theme token for the warm accent colors to centralize tuning.
- Fine-tune mobile spacing and snapshot tests to avoid visual regression in Playwright screenshots.

### 1. Global App Shell & Header

- **Retain:** Mantine theme shades + gradients from `app/root.tsx`; hero ticker + floating notes from `HeroSection`.
- **Remix:**
  - Convert header to a two-row layout: top row for logo + status chips + utility icons, second row for primary nav and pill-shaped search.
  - Use pill toggles for “Local / World / Atlas / Missions / Favorites” matching mock nav tags.
  - Add a slim “Now playing • station • location” ticker under the nav to reinforce the journey narrative everywhere.
- **New/TODO:**
  - `TODO:` Build `GlobalStatusChip` component (shows Local/Global toggle and Live Beta).
  - `TODO:` Insert “Story of the day” micro-banner once AI copy endpoint is ready.

### 2. Home / Local Explorer (root route)

1. **Hero Slab**
   - Keep `HeroSection` content but reorganize into three stacked cards: (a) “Radio Passport” story card with CTA buttons, (b) stat pill row (Countries / Stations / Continents), (c) “Quick Retune” inline form (reuse `onQuickRetune`).
   - Overlay panoramic art from mock (existing `RG-HERO.png`) with gradient scrim for legibility.
2. **Continent Map & Chips**
   - Use the “Chart your path by continent” strip from the mock as the primary filter row.
   - Chips drive the filters already exposed in `CountryOverview` + `StationCard` list.
3. **Region Spotlight Carousel**
   - Repurpose the current station list into three-card carousels (Europe, Asia, etc.) so each card shows flag, readiness badge, and CTA (“Visit detail”, “Open atlas”).
4. **Pinned Player Panel**
   - Dock the existing `NowPlaying` component to the right on desktop; on mobile it becomes the sticky mini-player (see Mobile plan).

### 3. Atlas / Country Detail (world atlas pages)

- **Retain:** `CountryOverview` hero meta, `StationCard` grid, ranking data from `server/stations/ranking.ts`.
- **Remix:**
  - Split layout into left “Atlas overview” rail (map thumb, listeners count, stamp progress) and right “Country cards”.
  - Integrate the “Showing X of Y spotlight countries” copy from the mock near pagination controls.
  - Add region summary capsules (countries count, listeners, stamp ready) at the top of each accordion section.
- **New/TODO:**
  - `TODO:` Atlas heatmap thumbnail (can be static image placeholder until WebGL globe is wired).
  - `TODO:` “Passport Stamp ready” indicator should come from ranking metadata once available.

### 4. World Scenes / AI Missions (`/world/$sceneId`)

- **Retain:** Scene selection pills, `SceneManager`, `VoiceInput`, and the `card_stack` visualizations.
- **Remix:**
  - Move the mood/prompt form into a side dock that mimics the “combining form” from the mock (text input + mood chips + voice mic).
  - Present AI loading steps as a timeline component (use `LOADING_STEPS` constants) rather than text-only status.
  - Allow the compact player from `card_stack` to collapse into the global mini-player for consistency.
- **New/TODO:**
  - `TODO:` “Mission Log” drawer showing previous AI prompts + generated stations (data already available via `recentStations`).
  - `TODO:` “Atlas vs Story” toggle that swaps between the card stack and atlas heatmap without leaving the route.

### 5. Player Surfaces

- **Retain:** Audio logic in `usePlayerStore`, detailed `NowPlaying` controls, Compact header from `card_stack`.
- **Remix:**
  - Create a `PlayerDock` wrapper that renders: (a) floating mini-player at bottom on mobile, (b) right-rail card on desktop, (c) inline bar on scroll for tablet.
  - Reuse Mantine `Slider` for progress/volume but visually align buttons with the gold/indigo gradient from the mock.
- **New/TODO:**
  - `TODO:` Visual EQ / audio level pill fed by `setAudioLevel`.
  - `TODO:` Queue & favorites quick actions (icons already exist in `StationCard`).

### Implementation notes — recent changes

- `HeroSection.tsx`: implemented glass blend, feathered image fade, larger overlap for cinematic effect; floating notes now conditionally render based on the player state and were tuned to a more organic motion curve.
- `PlayerDock.tsx`: desktop dock and mobile mini-player redesigned to use warm amber gradients and subtle particle and shimmer animations when playing.
- `StationCard.tsx` and `CompactStationList.tsx`: updated to warm vibrant fallback gradients, playing states with glow and shimmer, and improved play/favorite control styling.

**Raptor (Preview)**

- An experimental, ultra-compact mini player optimized for low height screens. The Raptor mini drops decorative gradients and focuses on thumbs and tight controls for easy one-handed use. It is currently opt-in via the `ENABLE_RAPTOR_MINI` environment setting and will be enabled for all clients once verified across platforms.

## Component Retain/Remix Table

| Area         | Keep As-Is                                            | Remix/Refactor                                     | New / TODO                                          |
| ------------ | ----------------------------------------------------- | -------------------------------------------------- | --------------------------------------------------- |
| Hero         | Taglines, ticker animations (`HeroSection.tsx:1`)     | Restructure content columns, add combined CTA row  | Story badge + hero background controller            |
| Station List | Data plumbing + badges (`StationCard.tsx:1`)          | Turn into carousel/grid hybrid, add listeners chip | Inline “Pin to Journey” button                      |
| Atlas Detail | Country header (`CountryOverview.tsx`)                | Add region stats rail, tie chips to filters        | Atlas heatmap component (placeholder image for now) |
| Player       | Audio logic + controls (`player/NowPlaying.tsx:1`)    | Shared dock wrapper, new gradient styling          | Mini-player, EQ meter                               |
| AI Scenes    | SceneManager / card stack (`scenes/card_stack.tsx:1`) | Form dock + mission log                            | Timeline component for loading hints                |

## Mobile / Spotify-Like Guidance

1. **Navigation**
   - Introduce a bottom tab bar (Local, World, Atlas, Library, Profile). The current header collapses into a compact top app bar with search icon.
   - Tabs should drive Remix routes so URL state stays in sync.
2. **Mini-Player**
   - Always visible at bottom, with artwork thumb, station info, play/pause, and swipe-up to open full player (mirrors Spotify).
   - On swipe-up, reuse the existing `NowPlaying` layout but full-bleed with backdrop blur.
3. **Lists & Cards**
   - Convert station cards into pill rows (artwork, title, badges) with slide actions for “Favorite” / “Queue”.
   - Card stack scenes become vertical swipe stacks (use `react-swipeable` already imported in `card_stack.tsx`).
   - Cards are now styled as light panels with reduced transparency so text from previous/next cards does not leak through. Active cards will display full contrast while non-active cards are partially faded to prevent visual overlap.
4. **Gestures & Haptics**
   - Keep the existing `vibrate` helper for tap feedback on important actions.
5. **Performance**
   - Lazy-load heavy backgrounds and Chart.js widgets only on viewport entry to keep mobile smooth.

## Not-Ready Widgets (Mark as TODO in code)

- `TODO: JourneyComposer` – combined prompt + mood + voice form dock (Home + World routes).
- `TODO: AtlasHeatmap` – interactive or static map preview component.
- `TODO: MissionLogDrawer` – recent AI prompts + stations list.
- `TODO: ListenerStatsWidget` – global tuned-in counter badge shown in screenshots.
- `TODO: PassportStampStrip` – horizontal stamp gallery fed by achievements endpoint.

## Implementation Roadmap

1. **Phase 1 – App Shell & Player Dock**
   - Build the new header, status chips, ticker, and responsive player dock.
2. **Phase 2 – Home Layout**
   - Recompose hero, continent chips, and station carousels; add TODO placeholders described above.
3. **Phase 3 – Atlas & Scenes**
   - Apply split layout for atlas, integrate mission log + timeline in `/world/$sceneId`.
4. **Phase 4 – Mobile Polish**
   - Implement bottom tabs, mini-player, gesture interactions, and fine-tune typography for the Spotify-like feel.

Each phase can ship independently because data contracts stay intact; we only rearrange presentational components. Use this plan as the single source of truth while iterating on the refreshed UI.
