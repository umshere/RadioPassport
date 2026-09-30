# Design specs

Brand: **Elsewhere**. Voice words: land, dusk, hour, stamp, live, cover, elsewhere, now. Banned: discover, seamless, AI-powered, widget, playlist, unlock, explore.

Soul in one line: a night-time passport held by someone who is not where they are. Every screen answers three things: where am I (place), what hour is it there (hour), what did I keep (stamp).

The long rationale for the old globe-era rules is in [archive/DESIGN_SPECS_pre-departures-hall.md](./archive/DESIGN_SPECS_pre-departures-hall.md). Features by surface: [FEATURES.md](./FEATURES.md).

## Where the tokens live

`app/tailwind.css` is only an ordered list of `@import`s of `app/styles/01..15-*.css`. The order is the cascade. Tokens are `--ew-*` in `01-tokens-base.css`: Night on `:root`, Day on `:root[data-atmosphere="day"]`. Tailwind colour names (`ink`, `leather`, `hide`, `bone`, `dust`, `lacquer`, `foil`, `ether`) point at those variables (`tailwind.config.ts`). Never hard-code a hex in a component; name a token.

| File | Mainly owns (some selectors also have later overrides in 08, 10, 11, 14) |
|---|---|
| `01-tokens-base` | tokens, base, global `:focus-visible` ring |
| `02-shell-intro` | page frame, intro and cover shell |
| `03-hours-atlas` | hour rail, Atlas, Night/Day pin |
| `04-cover-globe` | legacy cover and globe rules (globe is unmounted) |
| `05-dock` | player dock |
| `06-rooms` | rooms, passage bar |
| `07-components-b` | assorted components, 404 wallpaper |
| `08-home-board` | site bar, band nav, station board, flaps, stamp disc, passport book, late overrides |
| `09-button-states` | one button-state grammar |
| `10-keeper` | Keeper figure, sheet, murmurs |
| `11-desk` | the sky (`.ew-sky`), the desk, secret room |
| `12-share` | ticket sheet, tune card |
| `13-about` | About |
| `14-home` | Departures Hall, gates |
| `15-env` | room's light |

New rules go in the file that owns the surface. Late blocks outside `@layer` stay in 08, 10 and 11 (Tailwind v3 has dropped rules inside `@layer components`).

## Colour

| Token | Night | Day | Use |
|---|---|---|---|
| `--ew-ink` | `#0C0B09` | `#F2EBE1` | page |
| `--ew-leather` | `#1A1410` | `#E8DFD2` | header, dock, overlays |
| `--ew-hide` | `#241C16` | `#DDD4C6` | hover, card |
| `--ew-bone` | `#E8DFD0` | `#1A1612` | type |
| `--ew-dust` | `#9A8F80` | `#6F675C` | secondary type |
| `--ew-lacquer` | `#C73A3A` | `#C73A3A` | play, land, ink. Never changes |
| `--ew-foil` | `#C6A56A` | `#8A6E3A` | wordmark, hairlines, focus |
| `--ew-ether` | `#7EB8B4` | `#3F7A76` | "live" only |
| `--ew-hour-dawn` | `#E3B76B` | `#8A5A12` | hour tint |
| `--ew-hour-midday` | `#EFE3CE` | `#5F5030` | hour tint |
| `--ew-hour-dusk` | `#E07840` | `#A8461A` | hour tint |
| `--ew-hour-night` | `#A79BEC` | `#4B3FA0` | hour tint |

Also: `--ew-lacquer-text` (small lacquer text with enough contrast), `--ew-on-lacquer`, passport paper and ink tokens (`--ew-passport-*`), postcard tokens, `--ew-rule`, `--ew-lift`, and `--ew-settle` (`cubic-bezier(.22, 1, .36, 1)`, the one ease).

Rules: one lacquer object per view. Foil is the hand-written detail. Ether only means live. Day is a morning edition of the same system, not a white invert.

## Type

- **Newsreader** italic: display (city, coverline, stamps' city).
- **Schibsted Grotesk**: UI.
- **Azeret Mono**: telemetry, eyebrows, clocks, kickers.
- Loaded from Google Fonts in `app/root.tsx`. The ticket image uses local WOFF subsets (`public/fonts/ticket/`).
- Floor for mono labels is 10px.

## Shape and controls

- Square. No rounded corners on controls. The only radii left are 2px on hairline details, and 50% or 999px on dots and discs.
- Hairlines (`--ew-rule`), not boxes.
- Phone targets are at least 44px. The search field is a 48px square bar.
- One global focus ring: 1px foil, 2px offset.
- One button-state grammar (`09-button-states.css`): default, hover (fine pointers only), pressed, focus, selected, busy, disabled. No sticky hover on touch. Every `<button>` carries a `type` (tested).
- Primitives: `Button` (variants land, mono, atlas, frame and more), `ButtonLink`, `Chip`, `Eyebrow`, `Row` (list or tile), `Sheet` (modal layer) in `app/components/ui/`.
- JSX uses literal characters for arrows (`↗`, `→`), not HTML entities.

## Marks and assets

- Mark: the round seal, foil ring and lacquer disc, transparent. Favicon `/elsewhere-favicon.svg`; PNGs and maskable icons in `public/icons/`. No animated favicon.
- The play disc is a lacquer disc with a foil rim. It is also the stamp: a red heart grows over 60 seconds, then slams.
- The land control (`.ew-land`) is a customs stamp: lacquer field, bone inner hairline, mono kicker (`EW · ARRIVAL`, `RE-ENTRY`, `DEPARTURE`, `RETURN`), city in italic Newsreader. Press drops it 2px.
- Station art: the station's own plate when Radio Browser sent one, else the Elsewhere mark. Never a clipart play triangle. Art discs stay night windows in both rooms.
- The Keeper: pixel-art sprites cut out to transparent, no plate or frame (`public/keeper/`).
- Heritage assets and the OG-still drift are in [BRAND_ASSETS.md](./BRAND_ASSETS.md).

## Surfaces

- **The sky** (`.ew-sky`, shared by home and desk, not a fork): tint by the hour at the place, a sun or moon where it stands, stars, grain, split-flap clock and city, the Keeper on the horizon.
- **Split flap** (`FlipBoard`): capped so a board settles in under a second; a station name re-lands when the station changes. Reduced motion shows the final text.
- **Gates**: sticky under the header; field, four hours, Atlas door. Hours are labelled Dawn, Midday, Dusk, Night. The Atlas is a door, not a fifth hour.
- **Board rows** (`Row`): art tile, name, place, local clock on flaps, hour tint, heart.
- **Postcards** (desk, home recent stamps): passport paper with a postmark. They carry the label "Out of my notebook" when they are the Keeper's.
- **Passport**: a book with foil rims. Stamps are type (`IN · India`, city in italic). A flag on a stamp may only be a 12 to 14px foil-tinted customs mark beside the ISO code.
- **Dock**: full width, the only transport. One disc spins per screen.
- **Passage**: every room arrives the same way: the page rises out of dusk (14px, 560ms), the foil rule draws, the name lands last (70ms stagger). Transform and opacity only. Everything is off under `prefers-reduced-motion`.
- **Room's light**: see [ENVIRONMENT_LIGHT.md](./ENVIRONMENT_LIGHT.md).

## Design system artifact

A private Claude Design System artifact holds the components: https://claude.ai/artifact/KKCEZDJp8YyEuvQhSjaJEg (currently v21). It does not yet cover the home Departures Hall, tickets, the environment light or the How-it-works card. Until it is refreshed, this file and the CSS are the source of truth.
