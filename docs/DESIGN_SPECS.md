# Design Specs

Brand: **Elsewhere**. Voice: land · dusk · hour · stamp · live · cover · elsewhere · now.  
Banned: discover · seamless · AI-powered · widget · playlist · unlock · explore.

## Tokens

Night is the default room. Day is a morning edition of the same system — not a white SaaS invert. Lacquer never changes. Live values live on `:root` and `:root[data-atmosphere="day"]` in `app/tailwind.css`. Tailwind color names point at those vars.

| Token | Night | Day | Use |
|---|---|---|---|
| ink | `#0C0B09` | `#F2EBE1` | page |
| leather | `#1A1410` | `#E8DFD2` | header, dock, overlays |
| hide | `#241C16` | `#DDD4C6` | hover / card |
| bone | `#E8DFD0` | `#1A1612` | type |
| dust | `#9A8F80` | `#6F675C` | secondary |
| lacquer | `#C73A3A` | `#C73A3A` | play, ink, land |
| foil | `#C6A56A` | `#8A6E3A` | wordmark, meridian, focus |
| ether | `#7EB8B4` | `#3F7A76` | on-air only |

Control: **Night / Day** pin in the header (not Light / Dark). On a phone it collapses to a 44px meridian (disc high = day, low = night) so the header stays one line. Distinct from the Night hour chip. Default Night. Persist `elsewhere-atmosphere`. Do not follow `prefers-color-scheme`. 404 stays night (`FTS.jpeg`). Station art discs stay night windows.

Type: **Newsreader** italic (display), **Schibsted Grotesk** (UI), **Azeret Mono** (telemetry).

## Mark

- Tab: `/elsewhere-favicon.svg` (foil ring + lacquer disc on ink)
- Wordmark / apple-touch: `/elsewhere-mark.jpg`
- About colophon: `/elsewhere-colophon.jpg`
- Type lockup: `LIVE RADIO` + italic *Elsewhere*

No animated favicon.

## Surfaces

- Home: sticky header, left editorial column, right globe as the page. Mobile: globe + coverline first, Land here full width, compact dock.
- Hour chips are boxed filters. Atlas is a folio link (`ATLAS →` with a foil meridian), not a fifth chip.
- Day globe is a lithograph plate (ink continents, no starfield). Night globe is the current bone starfield.
- Globe tooltip is HTML (not canvas-only). Click rotates, then plays.
- Dock is full-width, not a floating pill. Theater is a link + artwork.
- Passport is a book (foil rims), not dashed stickers. Stamps are type: `IN · India` in foil mono, city in italic Newsreader. No full-color flags — those belong to unmounted leftovers (`CountryFlag`, AtlasGrid, StationInfo). A flag on a stamp is only allowed as a 12–14px customs mark beside the ISO code: no shadow, no glass radius, foil-tinted or faded, omitted when there is no ISO (never the old cyan/violet broadcast fallback).
- Tuning overlay, Mantine about deck, and Radio Passport header are unmounted.
- Live CSS is `app/tailwind.css` only: no Mantine imports, no leftover travel-stack / hero rules. Tailwind scans the mounted routes and `radio-passport/*`, not the unmounted leftovers.

## Motion

Globe 0.0012 rad/frame; focus ease ~0.14 toward facing longitude. Reduced-motion: snap, no pulse. Never bounce.
