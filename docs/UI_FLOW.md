# UI flow

Elsewhere is one loop: **land, intent, tune, inhabit, stamp, next**. The contract is `ELSEWHERE_LOOP` and `SURFACE_CONNECTIONS` in `app/components/radio-passport/productFlow.ts`. A control that does not lead to the next step is a dead icon. Feature detail is in [FEATURES.md](./FEATURES.md).

## First 20 seconds (home, `/`)

1. The Departures Hall opens on the sky of a city that is on the air (from the catalog, with coordinates), with its clock, the Keeper's line ("You are not here. Pick a gate, or land where I point.") and the first-visit card "How Elsewhere works" (Land, Listen, Send).
2. **Listen live** (or **Resume listening** when this browser has a last station) starts audio on the tap. **Browse by place** opens Atlas from beside the search field.
3. The sky becomes the city you landed in: clock, place, hours ahead or behind you. The Keeper says "Landed in Lagos." The CTA disappears while playing.
4. If the stream sends a title, it appears under the city. Otherwise nothing is shown in its place. The dock shows the same cleaned title.
5. After 60 seconds of continuous play the city is stamped: the play disc slams, an INKED toast appears, the Keeper says so. The first-visit card is gone for good once there is a stamp or it is dismissed.

## Primary actions

| Action | Result |
|---|---|
| Listen live / Resume listening | Plays the featured (or last) station. The sky becomes that city |
| Tap a departures row | Plays that station. The row shows its local time and hour tint |
| Heart on a row | Keeps the station in the passport |
| More departures | Board grows 8, 16, 32 rows |
| Fresh board | Deals a new window from the same catalog |
| Dawn, Midday, Dusk, Night | Board shows live stations where it is that hour now. Does not stop audio. The sky follows the hour |
| Search field (2+ letters) | Catalog search. Sky folds to one flap line with the query. Board is the answer (up to 32) |
| A sentence in the field | `POST /api/ai/interpret`. May fire a world mix |
| Surprise | AI world mix, then plays the first station |
| Browse by place / Atlas | Browse countries and filter stations by language |
| Tap a station in Atlas | Starts playback and keeps the country, language, and scroll position. Previous and Next follow the displayed stations |
| Passport button | Overlay: stamps and kept signals. A stamp replays that city |
| Recent stamps (under the board) | Open the passport |
| Share square (site bar) | Opens the ticket sheet for the station on the air |
| Night / Day | Switches the room. Does not stop audio. Does not follow the OS clock |
| "How it works" / "?" | `/about` |
| Keeper figure | Opens his counter: one line, up to three moves, an ask field (The desk → in the header) |
| Dock art or Desk tab | `/listen` |

Search, hours and overlays never call `stop()`.

For example, open Atlas, choose India, select Malayalam, and tap a station. The row shows Connecting, then On air when audio starts. If the signal fails, the row shows the failure and you can try another one. Open the Desk for the listening view. **Back to Malayalam stations** brings you to the same filter and scroll position, with the station and queue still playing. The browser Back button also returns to that view. While in Atlas, **Elsewhere** closes the overlay and shows the Hall.

## The desk (`/listen`)

The place card leads with the station's local hour. On air shows what the station sends, with **More like this** linking to the next departures when similar stations are available. Ask the Desk, postcards, and the station file provide more detail. The place and on-air cards sit next to each other on wider screens. Only the page column scrolls. The site bar and dock stay put.

With no station: the Keeper sleeps ("Nobody at the desk yet.") and a Land button goes home.

## Sending a station

Any share control opens the ticket sheet (Card or Story), then Send this ticket, Copy link or Save image. The friend opens `/t/<uuid>`, is handed to `/?tune=<uuid>&from=ticket`, sees "A friend sent you a ticket" and taps **Land here**. Audio never starts without a tap.

## Empty and error states

Every empty or failed surface names the next move.

| State | UI |
|---|---|
| No ICY title | Nothing is invented. Desk says "Ears up. Waiting for a name..." or that the station sends no titles |
| Search finds nothing | "No live signal for ...". Buttons: Surprise, Atlas, Clear search |
| Catalog unreachable | "Signal lost for ...". Buttons: Try again, Atlas |
| Hour with no city | "No city at Dusk in this catalog." Buttons: Clear hour, Atlas, Surprise |
| Filtered place with no rows | Show every city, Atlas |
| Atlas search finds nothing | Clear search |
| Empty passport | Ghost slots open **Find a city** |
| Stamp with no live station | Opens that country, or the Atlas |
| Failed mix or country catalog | Retry |
| Dead stream | Notice, retry, then skip to the next. Lists hide confirmed-down and HTTP-only streams |
| Station with no coordinates | No clock, no sky (board rows show a rough estimate from the country's centre) |
| Keeper asks off | "The desk is closed to questions for now." Chips still answer from local facts |
| Keeper rate limit | "That's enough questions for one hour." The radio stays on |
| `/listen` with no station | Empty desk with a Land button |
| 404 or route error | Standard shell stays; message and Back to Elsewhere |
| Ticket cannot be printed | Link preview falls back to the house still |
