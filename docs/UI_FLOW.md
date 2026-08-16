# UI Flow

Elsewhere is one loop: **land → intent → tune → inhabit → stamp → next**.

## First 20 seconds

1. Globe is already live. Coverline is a city (from the catalog, with geo).
2. **Land here** (or **Continue** if this browser has a last city) starts audio. Browsers block silent autoplay — the tap is the gesture.
3. Place identity fills: city, country, local clock from longitude, solar hour.
4. ICY title if the station sends one. Otherwise: *This station sends no track titles.*
5. Intent bar is available: type, speak, or Surprise.

## Primary actions

| Action | Result |
|---|---|
| Land here | Plays the featured (or last) station. Globe turns to face it. |
| Hover / tap a globe dot | Card: city, region, country code, lead station, live count. |
| Click a globe dot | Globe rotates to that longitude, then plays the strongest station there. |
| Intent (short query) | Catalog search. The bar says Searching, then N live. The list below is titled with the query. The globe stays live while the catalog arrives, then turns to the densest matching country — stations without Radio Browser coordinates still land on that country. |
| Intent (sentence) | `POST /api/ai/interpret`. May fire a mix. |
| Surprise | AI mix, then autotune the first station. |
| Solar hour chip | Filters by the city's local hour. Does not stop audio. |
| Night / Day | Header pin. Changes the room (night earth vs morning edition). Does not stop audio. Does not follow the OS clock. Distinct from the Night hour chip. |
| Atlas | Overlay. Country → city groups. Play replaces the queue. |
| Passport | Stamps + favorites. Stamp tap retunes that city. |
| Dock art / Theater | `/listen` |

Search, chips, and overlays never call `stop()`.

## `/listen`

Sky + letter. The constellation has its own rectangle (right column on desktop, first and sticky on a phone) on a seeded galaxy river — the same night that sits behind the home globe. City, station, and the Room sit as type: caption, then plate + cover title, then a colophon of facts. When ICY sent a title, free trivia files the plate and facts first; AI cover may upgrade them and return a knowledge graph. A later deepening pass may add a few stars. Filing keeps the sky inhabited — the disc keeps walking knowledge edges and names stay on place and track stars. The mesh stays a figure (14 faces, 3 threads per star). No track → no dossier. On a phone the transport is the dock only. The letter sits at four lines; `more` opens the rest. The sky stays visible while it scrolls; as you read, the constellation scales into a ribbon so more of the folio can sit above the dock. Scroll back and the night opens again.

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
