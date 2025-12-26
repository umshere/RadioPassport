# UI Testing Guide

Use this checklist to validate the current UI flows for Classic Mode and World Mode.

## Quick start

- Run `npm run dev` and use the host/port shown in the terminal.

## Global shell

- AppHeader stays sticky and shows the view toggle.
- Search button focuses `#hero-search-input` when on Classic Mode.
- PlayerDock appears after a station starts playing and updates track metadata.
- Mobile sidebar menu opens and closes reliably.

## Classic Mode (/) - Atlas

### Landing and atlas

- Hero banner renders, tagline cycles, and CTA buttons respond.
- Stats bar shows countries/stations/continents counts.
- Atlas filters update the grid.
- Search (`q`) switches to catalog results and shows a clear action.

### Country view

- Selecting a country updates URL with `?country=<name>`.
- CountryOverview renders dial navigation and play/pause controls.
- Filter panel/drawer updates results without layout breakage.
- StationGrid plays stations and updates PlayerDock.

## World Mode (/?view=world)

- World header renders and stays sticky within the page.
- AI prompt runs and returns search results (loading state visible).
- Discover/Passport tabs switch correctly.
- Passport entries persist across reloads.
- StationDossier renders on desktop; drawer opens on mobile.

## Mobile checks

- Station list uses `CompactStationList`.
- Filter drawer opens from the filter icon.
- World Mode terminal drawer opens via the floating HUD button.
- PlayerDock remains usable with safe-area padding.
