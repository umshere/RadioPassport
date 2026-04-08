# UI Flow

This document summarizes the current user journeys, route surface, and UI composition for Radio Passport.

## Overview

Radio Passport runs one primary route:

- Home / Atlas: `GET /`

Query params:

- `country=<name>`: Switches Classic Mode into Country view
- `q=<query>`: Catalog search in Classic Mode

## Route architecture

| Route             | Purpose              | Notes                           |
| ----------------- | -------------------- | ------------------------------- |
| `/`               | Home / Atlas landing | Atlas + search + country browse |
| `/about`          | Marketing page       | Static content                  |

## Journey 1: Home / Atlas

1. User lands on `/`.
2. Loader fetches countries and initial stations (top clicks).
3. Hero section renders:
   - Search input (`#hero-search-input`)
   - CTA buttons (start listening, quick retune)
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

## Brand features (passport motifs)

These are part of the Home / Atlas experience:

- Stamped countries should surface in Classic atlas to reinforce the passport metaphor.

## Journey 2: AI World Mix

The app invokes `/api/ai/recommend` when the user requests a world mix:

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

Global Shell:

- `AppHeader`
- `PlayerDock`
- `MobileSidebarMenu`
- `TuningOverlay`

## Data sources

- Radio Browser API via `rbFetchJson` for countries and stations
- `/api/ai/recommend` for card stack descriptors
