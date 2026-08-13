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
| Intent (short query) | Catalog search. Playback continues. |
| Intent (sentence) | `POST /api/ai/interpret`. May fire a mix. |
| Surprise | AI mix, then autotune the first station. |
| Solar hour chip | Filters by the city's local hour. Does not stop audio. |
| Atlas | Overlay. Country → city groups. Play replaces the queue. |
| Passport | Stamps + favorites. Stamp tap retunes that city. |
| Dock art / Theater | `/listen` |

Search, chips, and overlays never call `stop()`.

## `/listen`

Coverline + local clock + track-or-honest-live + optional dispatch / one trivia fact. On a phone the transport is the dock only.

## Empty / error

Every empty or failed surface names the next move. Copy without a button is a dead end.

| State | UI |
|---|---|
| No ICY | Place identity stays. Honest live line. |
| Empty search | “No signal for that.” Buttons: Surprise, Atlas, Clear search. |
| Quiet solar hour / city | Clear the filter, or open Atlas. |
| Empty atlas search | Clear search. |
| Dead stream | Notice + retry + skip. Globe follows the next station. |
| Empty passport | Ghost slots open **Find a city**. Stay-60s line stays. |
| Stamp with no live station | Open that country, or Atlas. |
| Failed mix / country catalog | Retry. |
| `/listen` with no station | Bounce home. |
