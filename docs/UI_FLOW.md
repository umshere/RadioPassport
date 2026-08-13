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

| State | UI |
|---|---|
| No ICY | Place identity stays. Honest live line. |
| Empty search | “No signal for that.” Surprise or Atlas. |
| Dead stream | Notice + retry + skip. Globe follows the next station. |
| Empty passport | Ghost slots + “Stay 60 seconds.” |
| `/listen` with no station | Bounce home. |
