# UI Flow

Elsewhere is one loop: **land → intent → tune → inhabit → stamp → next**.

## First 20 seconds

1. Globe is already live. Coverline is a city (from the catalog, with geo).
2. **Land here** (or **Continue** if this browser has a last city) starts audio. Browsers block silent autoplay — the tap is the gesture.
3. Place identity fills: city, country, local clock from longitude, solar hour.
4. ICY title if the station sends one. Otherwise: *This station sends no track titles.*
5. Intent bar is in the site bar: type, speak, or Surprise. On a phone the field sits on its own row so it stays tappable; the list is the page, not the dispatch.

## Primary actions

| Action | Result |
|---|---|
| Land here | Plays the featured (or last) station. Globe turns to face it. |
| Hover / tap a globe dot | Card: city, region, country code, that list station. |
| Click a globe dot | Plays that same list row. Globe rotates to face it. Does not filter the list. |
| Intent (short query) | Catalog search. The bar says Searching, then N live. The list below is titled with the query. The globe is that list, drawn (capped). It stays the world globe while the catalog arrives. Stations without Radio Browser coordinates still land near that country, spread so they do not stack as one blob. |
| Intent (sentence) | `POST /api/ai/interpret`. May fire a mix. |
| Surprise | AI mix, then autotune the first station. |
| Solar hour chip | Filters by the city's local hour. Does not stop audio. |
| Night / Day | Header pin. Changes the room (night earth vs morning edition). Does not stop audio. Does not follow the OS clock. Distinct from the Night hour chip. |
| Atlas | Overlay. Country → city groups. Play replaces the queue. |
| Passport | Stamps + favorites. Stamp tap retunes that city. |
| Dock art / Theater | `/listen` |

Search, chips, and overlays never call `stop()`.

## `/listen`

Sky + letter. One night: desktop sky bleeds under the letter and fades into ink; phone puts the traveler first as a fixed strip. Same galaxy river as the home globe. Seek is in the site bar. City, station, and the Room sit as type: caption, then plate + cover title, then a colophon of facts. When ICY sent a title, free trivia files the plate and facts first; AI cover may upgrade them and return a knowledge graph. A later deepening pass may add a few stars. Filing keeps the sky inhabited — the disc keeps walking knowledge edges and names stay on place and track stars. The mesh stays a figure (14 faces, 3 threads per star). No track → no dossier. On a phone the transport is the dock only. The letter sits at four lines; `more` opens the rest. Only the letter scrolls.

## Empty / error

Every empty or failed surface names the next move. Copy without a button is a dead end.

| State | UI |
|---|---|
| No ICY | Place identity stays. Honest live line. |
| Empty search | “No signal for that.” Buttons: Surprise, Atlas, Clear search. |
| Quiet solar hour / city | Clear the filter, or open Atlas. |
| Empty atlas search | Clear search. |
| Dead stream | Notice + retry + skip. Globe follows the next station. Lists hide confirmed-down and HTTP-only streams. |
| Empty passport | Ghost slots open **Find a city**. Stay-60s line stays. |
| Stamp with no live station | Open that country, or Atlas. |
| Failed mix / country catalog | Retry. |
| `/listen` with no station | Bounce home. |
