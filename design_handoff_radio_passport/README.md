# Handoff: Radio Passport Redesign

## Overview
Complete redesign of Radio Passport (repo: `umshere/RadioPassport`, Remix + Tailwind + Mantine). Replaces the mixed legacy styles (retro tuner, neumorphic tab bar, beige Mantine theme, AI-generated imagery) with one system: a nocturnal "Signal & Stamp" aesthetic. Covers desktop home, Atlas (country index), country drill-down, passport view, mobile home, and the design-system reference page.

## About the Design Files
The files in this bundle are **design references created in HTML** — prototypes showing intended look and behavior, not production code to copy directly. Recreate them in the existing Remix/React/Tailwind codebase using its established patterns (route modules, Tailwind config tokens, existing player/audio infrastructure). The `.dc.html` files open in a browser; the design markup is inside `<x-dc>` and logic in the trailing script.

## Fidelity
**High-fidelity.** Colors, typography, spacing, and interactions are final. Recreate pixel-perfectly. Demo data (10 cities, 44-country atlas index) is placeholder — wire to the real Radio Browser catalog.

## Design Tokens
Map into `tailwind.config.ts` (replace the existing beige/purple theme):

Colors
- `charcoal` #14120F — app background
- `surface` #1C1915 — cards, dock, inputs
- `surface-2` #26221C — hover
- `paper` #F2EDE4 — primary text
- `muted` #A89F90 — secondary text
- `coral` #E5535F — the ONLY accent: interactive, live, CTA, stamps
- `signal` #6FB5C4 — on-air status dot / active-city dot only
- Borders: rgba(255,255,255,0.07–0.14); coral borders rgba(229,83,95,0.35–0.6)
- Coral fills: rgba(229,83,95,0.04–0.16)

Typography
- Display/UI: **Sora** (400/600/700/800). H1 34–54px w800 ls-0.03em lh1.04; section h2 16px w700; station names 13–14px w700; body 12–14px, muted lh1.6–1.7
- Telemetry: **IBM Plex Mono** (400/500) — bitrates, freqs, country codes, counts, dates, section eyebrows (9–12px, letter-spacing 0.12–0.26em, uppercase)

Radii: chips/buttons 99px; station rows 13–14px; cards 16–18px; dock 20px; artwork tiles 10–13px
Shadows: dock only — `0 18px 50px rgba(0,0,0,0.5)`. No other shadows.
Perforation motif: `border: 1.5px dashed` (coral or white/0.14) = anything passport-related; SVG rings use `stroke-dasharray 2.4 3.4`.

## Logo
Inline SVG (in all files): perforated stamp ring (coral, dashed) + center dot (paper) + two signal arcs (coral = you, paper 55% = the world). Scales 13px→64px. Wordmark: Sora 800 + Plex Mono eyebrow "WORLD · LIVE".

## Screens / Views

### Desktop home (`Radio Passport App v2.dc.html`)
- Sticky header 14/26px pad, blur backdrop: logo, search input (pill, 320px, placeholder "Where do you want to go? Kerala, jazz, rainy night…"), passport chip button (dashed coral border, stamp icon + count).
- Main: flex, max-width 1280, gap 44. Left col (flex 1 1 380, max 480): H1 "The world, on air." + sub; MOOD/PLACE segmented pill toggle (mono 11px, active = coral bg + charcoal text); chip row (moods: Late Night, Slow Morning, Dance, Focus, Road Trip; places: featured cities + dashed "All places →" chip → Atlas); LIVE NOW list (teal pulse dot + mono eyebrow; default shows 3 curated stations, filtered state shows all matches, max-height 352px scroll); "Explore all →" / "← Back to live now" text button. Right col (flex 1.5 1 440): particle globe (min(500px,100%), square) + passport band beneath.
- Station row: 44px artwork tile (radial gradient seeded from station id hue), name w700 (coral when active, 3-bar equalizer animation in tile), tags sub, mono freq, play triangle. Active row: coral 8% bg + coral 50% border.
- Passport band: dashed coral border card — stamp icon, "YOUR PASSPORT" mono, "NN / 10 places", 2px coral progress bar, tilted stamp chips (±3deg), "View passport →".

### Particle globe (canvas, 2D)
- ~300 background particles on a fibonacci sphere, paper white, alpha by depth, twinkle; dashed coral ring outside; rotation 0.0022 rad/frame (pauses on hover over a city).
- City dots at real lat/lon (front hemisphere only): coral 75%; selected/stamped solid coral; playing = signal teal with pulse + ring. Hover: canvas-drawn tooltip (city name + station count, surface bg, coral border); click selects the city. Cap visible prominent dots ~30 at catalog scale.
- Perf rules: DPR ≤ 2, pause when `document.hidden`, respect reduced-motion (motion tweak).

### Atlas overlay
- Full-screen, rgba(20,18,15,0.97) + blur. Header: "Atlas" + mono "44 COUNTRIES · 13,000+ STATIONS", country/language search pill, ✕.
- 6 region sections (mono coral eyebrow) → country rows in auto-fill grid minmax(258px,1fr): mono code, name w700, languages (muted 10.5px, first-class facet), mono station count. Unavailable countries at 40% opacity. Click → country drill-down.

### Country drill-down overlay
- "← Atlas" back link + ✕; country name 30px w800; mono meta "512 STATIONS · Hindi · Malayalam …"; LANGUAGE chip filter (only when >1 language); stations grouped under mono coral city eyebrows (KOCHI, MUMBAI…). Big countries show Top Picks + cities — never a full flat list. Tapping a station plays it (dock appears) and sets the home filter to that country.

### Passport view overlay
- Header: logo 44px, "Your Passport" 26px w800, mono "TRAVELER Nº … · MEMBER SINCE …", ✕.
- 4 stat cards (30px w800 number + mono label): places stamped (coral), countries, signals played, languages heard.
- Stamp grid minmax(178px,1fr): dashed coral cards, tilted ±2.5deg — code+country mono, city 16px w800, station · freq, mono date. Empty slots = dashed numbered placeholders.
- Stamp mechanic: listening to a station in an unstamped city for 60s (prototype tweak: 15s) inks the stamp → toast bottom-right: "PASSPORT STAMPED / City, Country / Station · Freq", dashed coral border, 4s in/out animation.

### Player dock
- Fixed bottom-center, min(860px,100%), rounded 20px, blur, one dock everywhere (replaces mini/premium/compact variants). Artwork = live particle-ring canvas (station-hue bg, 26 orbiting dots whose radius = amplitude; coral every 4th). Name + mono meta "City, Country · 98.3 FM · LIVE", favorite ♡/♥, prev, coral 44px play circle, next.

### Mobile home (`Radio Passport Mobile.dc.html`)
- Single column inside device frame: logo row + passport chip, full-width search (14px, 13px pad), centered 280px tappable globe (26px tap radius), MOOD/PLACE toggle, horizontally scrolling chips (edge-bleed padding), LIVE NOW rows, passport card. Dock floats above home indicator: artwork, meta, play (44px), next. All hit targets ≥44px. Content top padding must clear the OS status bar.

## Interactions & Behavior
- Filters: mood and place are exclusive-ish (mode toggle); chips toggle off on second tap; any filter/search change never interrupts playback.
- Search matches stations, tags, cities, countries, languages, moods; non-empty query shows a "PLACES" quick-jump chip row above station results.
- Transitions: all hovers 0.15s; hover raises borders to coral and bg to surface-2; buttons lift `translateY(-2px)` on stamp tiles only.
- Animations: `rp-pulse` (opacity 0.5↔1) for live dots/equalizer; toast keyframes translateY 12→0→-6 over 4s.
- Empty states: unstamped passport shows guidance copy, never blank.

## State Management
- `mode` (mood|place), `mood`, `place` (city), `country`, `query`, `now` (station+city), `playing`, `favs`, `stamps` (cityId → {station, freq, date}), `played` (station ids), overlays: `atlasOpen`, `countryOpen`, `passportOpen`, `langFilter`, `toast`.
- Stamp timer: 60s of continuous same-station playback; cancel on station change/pause.
- Persist stamps/favs/played per user (existing backend); prototype keeps them in memory.
- Prev/next steps through the currently filtered pool, wrapping.

## Assets
- No image assets. Logo + stamp check are inline SVG; all artwork is generative canvas (station id → hue seed). Fonts from Google Fonts: Sora, IBM Plex Mono.

## Files
- `Radio Passport App v2.dc.html` — desktop home, Atlas, country drill-down, passport view, dock
- `Radio Passport Mobile.dc.html` — mobile home (+ `ios-frame.jsx`, presentation frame only — do not implement)
- `Design System.dc.html` — tokens, logo, type, components, scale rules
- `Radio Passport App.dc.html` — earlier desktop iteration, superseded; kept for reference

## What to remove from the existing codebase
Retro tuner dial screen, neumorphic tab bar, purple glow shadows, beige Mantine theme overrides, AI-generated hero/country images, and the separate mini/premium/compact player variants.
