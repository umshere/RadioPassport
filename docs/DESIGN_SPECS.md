# Design Specs

Brand: **Elsewhere**. Voice: land · dusk · hour · stamp · live · cover · elsewhere · now.  
Banned: discover · seamless · AI-powered · widget · playlist · unlock · explore.

## Tokens

| Token | Hex | Use |
|---|---|---|
| ink | `#0C0B09` | page |
| leather | `#1A1410` | header, dock, overlays |
| bone | `#E8DFD0` | type |
| dust | `#9A8F80` | secondary |
| lacquer | `#C73A3A` | play, ink, land |
| foil | `#C6A56A` | wordmark, meridian, focus |
| ether | `#7EB8B4` | on-air only |

Type: **Newsreader** italic (display), **Schibsted Grotesk** (UI), **Azeret Mono** (telemetry).

## Mark

- Tab: `/elsewhere-favicon.svg` (foil ring + lacquer disc on ink)
- Wordmark / apple-touch: `/elsewhere-mark.jpg`
- About colophon: `/elsewhere-colophon.jpg`
- Type lockup: `LIVE RADIO` + italic *Elsewhere*

No animated favicon.

## Surfaces

- Home: sticky header, left editorial column, right globe as the page. Mobile: globe + coverline first, Land here full width, compact dock.
- Globe tooltip is HTML (not canvas-only). Click rotates, then plays.
- Dock is full-width, not a floating pill. Theater is a link + artwork.
- Passport is a book (foil rims), not dashed stickers. Stamps are type: `IN · India` in foil mono, city in italic Newsreader. No full-color flags — those belong to unmounted leftovers (`CountryFlag`, AtlasGrid, StationInfo). A flag on a stamp is only allowed as a 12–14px customs mark beside the ISO code: no shadow, no glass radius, foil-tinted or faded, omitted when there is no ISO (never the old cyan/violet broadcast fallback).
- Tuning overlay, Mantine about deck, and Radio Passport header are unmounted.

## Motion

Globe 0.0012 rad/frame; focus ease ~0.14 toward facing longitude. Reduced-motion: snap, no pulse. Never bounce.
