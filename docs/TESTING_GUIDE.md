# UI Testing Guide

Use this checklist to validate the current Home / Atlas UI flows.

## Quick start

- Run `npm run dev` and use the host/port shown in the terminal.

## Global shell

- AppHeader stays sticky.
- Search button focuses `#hero-search-input` when on Home / Atlas.
- PlayerDock appears after a station starts playing and updates track metadata.
- Mobile sidebar menu opens and closes reliably.

## Home / Atlas (/)

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

## Mobile checks

- Station list uses `CompactStationList`.
- Filter drawer opens from the filter icon.
- PlayerDock remains usable with safe-area padding.
