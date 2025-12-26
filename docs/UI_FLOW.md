# UI Flow

This document summarizes the current user journeys, route surface, and UI composition for Radio Passport. It reflects the live implementation (Classic Mode + World Mode in a single route).

## Overview

Radio Passport runs two primary modes on the same route:

- Classic Mode: `GET /` (default)
- World Mode: `GET /?view=world`

Query params:

- `country=<name>`: Switches Classic Mode into Country view
- `q=<query>`: Catalog search in Classic Mode
- `view=world`: World Mode

## Route architecture

| Route             | Purpose              | Notes                           |
| ----------------- | -------------------- | ------------------------------- |
| `/`               | Classic Mode landing | Atlas + search + country browse |
| `/?view=world`    | World Mode           | Dark terminal UI (`WorldHome`)  |
| `/about`          | Marketing page       | Static content                  |
| `/world`          | Redirect             | Sends to `/?view=world`         |
| `/world/:sceneId` | Redirect             | Sends to `/?view=world`         |
| `/ai`             | Redirect             | Sends to `/?view=world`         |

## Journey 1: Classic Mode (Atlas)

1. User lands on `/`.
2. Loader fetches countries and initial stations (top clicks).
3. Hero section renders:
   - Search input (`#hero-search-input`)
   - CTA buttons (start listening, quick retune, switch to World Mode)
4. Atlas grid shows countries by continent.
5. User action:
   - Click a country stamp -> `?country=<name>`
   - Type search `q` -> catalog results
6. Passport cues (brand feature proposal for Classic):
   - Stamped countries appear directly on the atlas grid.
   - A compact “Journey” module shows last departure → current station → next suggestion.

### Country view flow

1. Loader fetches stations for the selected country.
2. Country header (`CountryOverview`) renders dial-based browsing tied to the global queue.
3. Filters appear (quick bar + advanced panel on desktop, drawer on mobile).
4. Station list renders (`StationGrid` or `CompactStationList`).
5. Play a station -> global PlayerDock updates and persists queue.

## Journey 2: World Mode (Terminal)

1. User switches view to `/?view=world` (AppHeader toggle or CTA).
2. `WorldHome` renders:
   - World header + `SonicFlightTracker`
   - AI prompt bar
   - Discover/Passport tabs
3. AI prompt flow:
   - `geminiService.processPrompt` interprets the prompt.
   - `rbFetchJson` fetches matching stations.
   - Results render as station tiles.
4. Station selection starts playback (shared PlayerDock).
5. Passport tab reads and writes visit history to `localStorage`.

## Brand features (passport motifs)

These are present today in World Mode, and should be shared with Classic Mode for a cohesive brand experience:

- Departure/Arrival tracker (`SonicFlightTracker`) shows journey continuity.
- Passport stamps/history (`PassportView`) log the countries you’ve listened to.
- Stamped countries should surface in Classic atlas to reinforce the passport metaphor.

## Journey 3: AI World Mix (Classic Mode)

Classic Mode still invokes `/api/ai/recommend` when the user requests a world mix:

- `useEventHandlers` calls `loadWorldDescriptor` with `visual: card_stack`.
- `/api/ai/recommend` returns a `SceneDescriptor`.
- `useListeningMode` updates the explore queue and player state.

## Component map

Classic Mode:

- `HeroSection`
- `AtlasFilters`, `AtlasGrid`
- `CountryOverview`
- `StationFiltersPanel`, `StationFilterQuickBar`, `MobileFilterDrawer`
- `StationGrid`, `StationCard`, `CompactStationList`

World Mode:

- `WorldHome`
- `SonicFlightTracker`
- `StationDossier`
- `PassportView`

Global Shell:

- `AppHeader`
- `PlayerDock`
- `MobileSidebarMenu`
- `TuningOverlay`

## Data sources

- Radio Browser API via `rbFetchJson` for countries and stations
- `/api/ai/recommend` for card stack descriptors (Classic Mode world mix)
- `geminiService` for World Mode curation and station context
