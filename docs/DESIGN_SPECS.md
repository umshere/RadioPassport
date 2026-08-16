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

- Home: sticky header, left editorial column, right globe as the page. Mobile: globe first, coverline under it (not on it), Land here full width, compact dock. The phone globe is a short tap strip; the hover tip does not show. Station rows use the station plate when Radio Browser sent one; otherwise the Elsewhere mark (foil ring + lacquer disc). Never a clipart play triangle. A live row overlays the eq on the plate. Station art discs stay night windows.
- Hours are stops on the horizon line (`.ew-horizon`): one foil hairline, four mono labels, each with a point whose height tells the time — midday above the line, dawn and dusk on it, night below. The chosen hour fills its point in foil. Same grammar as the header's Day/Night pin. Not boxed chips.
- Atlas is not a fifth hour: it stands apart from the horizon with its own denote — a small foil globe glyph (ring + meridian) before `ATLAS →`, plus the folio spine. It is a doorway, not a filter. It stays on the horizon row at every width — it never takes its own line (vertical space on the phone is precious).
- The land control (`.ew-land`) is a customs stamp inked in lacquer: solid lacquer field (the punch stays red — lacquer is the land color), bone inner hairline frame, mono kicker (`EW · ARRIVAL` / `EW · RE-ENTRY` / `EW · DEPARTURE` / `EW · RETURN`), city in italic Newsreader. Pressing it stamps — a 2px drop into the page. Landing is what inks the passport; the control is the stamp.
- The play control (`.rp-dock-play`) is a lacquer disc with a foil rim; a foil needle mark tours the rim while live (`.is-live`). Spinning means live. Press is a settle-in (`scale(.96)`), never a grow. The dock is the only transport — the Theater stage carries no second set of controls; one disc spins per screen.
- Wayfinding links (Atlas folio, `← Elsewhere`) draw a foil meridian under themselves on hover/focus — same settle ease, no dot, no bounce.
- Day globe is a lithograph plate (ink continents, no starfield). Night globe is the current bone starfield.
- Globe tooltip is HTML (not canvas-only). Click rotates, then plays. On a phone there is no tip — tap lands.
- Dock is full-width, not a floating pill. Theater is a link + artwork.
- Theater (`/listen`): `← Elsewhere` is sticky. The constellation is a room, not wallpaper — desktop gives it the right column (same grammar as the home globe); phone puts it first as a sticky sky (`38vh`, min `16.75rem`) so the traveler stays visible. Type is a letter, not a dashboard: ether eyebrow, city in Newsreader, station as the lede, then a foil rule and the Room. Dispatch is italic caption. When a title files, the plate sits as a print beside the cover title; facts walk a foil meridian (value first, like the stars); YouTube and Wiki are foil marks, not leftover words. Hollow Yes/No facts and artist/title echoes do not file. No cards, no live chip on the sky, no second transport, no waveform. The well reads the Room — one object keyed to the station on the air. Land / next / prev opens a new room; the previous caption, plate, and facts are gone on the next frame. An honest template caption sits immediately; AI dispatch may replace it. When ICY sent a title, free trivia files first (Cover Art Archive, then iTunes, then Wikipedia, plus MusicBrainz facts and verified relations) so the plate does not wait for Gemini. AI cover may upgrade the sentences and return a knowledge graph. About ten seconds after filing, one deepening pass may add 3–6 related stars; they fade in with a birth ripple and keep the old seats. Up to six facts and three source meridians. Story: the disc walks everything the station has told you, then the notes we found. Filing does not empty the sky — the mesh stays lit, place and track names stay, and the disc keeps touring knowledge edges first (`wrote`, `composed`). Only quiet goes dark. The constellation is the metadata becoming knowledge: one node per released field, plus verified graph stars. Missing fields do not get stars. Families cluster; knowledge edges are the figure, proximity is the faint web. Isolated clusters are spanned so the hop is never empty sky. Fact stars name the value (`2007`), not the schema (`YEAR`); sentence facts stay unnamed. Dispatch/cover stay unnamed; they already speak in the well. The room leans against a seeded milky river (~200 grains, three parallax depths, bone/foil/ether). Faces cap at the tightest fourteen; each star keeps at most three kinship threads. Crowded families fan on a golden angle. Scrolling the theater folds the sky only when there is real page left to reveal. Home Night uses the same river behind the globe. Not a boxed spinner. Not cyan tech wallpaper. Not “AI loading”.
- Passport is a book (foil rims), not dashed stickers. Stamps are type: `IN · India` in foil mono, city in italic Newsreader. No full-color flags — those belong to unmounted leftovers (`CountryFlag`, AtlasGrid, StationInfo). A flag on a stamp is only allowed as a 12–14px customs mark beside the ISO code: no shadow, no glass radius, foil-tinted or faded, omitted when there is no ISO (never the old cyan/violet broadcast fallback).
- Tuning overlay, Mantine about deck, and Radio Passport header are unmounted.
- Live CSS is `app/tailwind.css` only: no Mantine imports, no leftover travel-stack / hero rules. Tailwind scans the mounted routes and `radio-passport/*`, not the unmounted leftovers.

## Motion

Globe 0.0012 rad/frame; focus ease ~0.14 toward facing longitude. Theater field blooms only when a real field arrives, not on a fake star count. The lacquer mark travels the real edges; it does not bounce. Reduced-motion: snap, still mesh, mark rests on the first star.

**Passage.** Every room arrives the same way: the page rises out of dusk (`.ew-page`, 14px, 560ms), the foil rule draws itself (`.ew-cover-rule`), and the name lands last (`.ew-arrive` + `-2/-3/-4` stagger, 70ms steps). One ease for everything: `--ew-settle` (`cubic-bezier(.22,1,.36,1)`) — a settle, never a bounce. The station name re-lands whenever the station changes (elements keyed by station uuid), not just on navigation; a new ICY title settles the track line the same way. Overlays (Atlas / Country / Passport) are the same gesture behind a veil (`ew-veil` fade + inner rise). While a route loads, a foil meridian sweeps the top hairline (`.ew-passage-bar`). Transform/opacity only; all of it is off under `prefers-reduced-motion`.
