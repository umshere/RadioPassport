# Features

Everything Elsewhere does today (2026-09-30), checked against the code, not against older docs. Each entry says what it does for the listener, where it lives, and the constraint that matters.

Elsewhere is live radio from someone else's now. The listener picks a place or an hour, hears a real station on the air in another city, and after sixty seconds that city is stamped in their passport. A dry pixel-art clerk, the Keeper, keeps the desk. Live at https://elsewheremusic.com. Hearing radio is always free.

## Product rules (they bind every feature)

- Never charge to hear radio.
- Never invent a track title. If the stream sends none, say so.
- Never put AI on the audio path.
- Anything the station did not say is marked as the Keeper's own notebook.
- No streaks, no XP, no scores. A stamp is a record of where you listened.
- Never `AbortController.abort()` a Remix fetch (use `Promise.race`).

## 1. Pages

| Route | Name | File |
|---|---|---|
| `/` | The Departures Hall (home) | `app/routes/_index.tsx` |
| `/listen` | The desk | `app/routes/listen.tsx` |
| `/about` | How it works | `app/routes/about.tsx` |
| `/legal` | Terms, privacy, credits (quiet footer link; no banner, no gate). Keep it true to what the code does | `app/routes/legal.tsx` |
| `/t/<uuid>` | Ticket link (share page) | `app/routes/t.$uuid.tsx` |
| `/secret-room` | The room between hours (easter egg) | `app/routes/secret-room.tsx` |
| any other | 404 inside the standard Shell | `ErrorBoundary` in `app/root.tsx` |

Navigation is three places: **Elsewhere** (`/`), **Atlas** (an overlay on the home, opened with `?atlas=1` or the Atlas door), **Desk** (`/listen`). `app/components/BandNav.tsx` draws it: a rail in the site bar on desktop, a fixed band at the root on phones. "How it works" (About) is a quiet text link in the site bar, not a tab. On phones the link is replaced by a square "?" button (`ew-site-help`). The site bar also holds the wordmark, a share square (`HeaderShare`) and the Passport button with the stamp count (`app/components/SiteBar.tsx`).

### 1.1 Home: the Departures Hall

One scrolling column of three bands that becomes a sticky sky beside the gates and board on wide screens. There is no globe. Code: `app/routes/_index.tsx`, `app/components/home/*`, `app/hooks/home/*`, `app/services/home/homeBoard.server.ts`, CSS `14-home.css` and `08-home-board.css`.

**The sky** (`HomeSky.tsx`). The arrival city's sky at its own hour: tint by the hour there, sun or moon where it stands, a split-flap clock ("21:04"), the city name on split flaps, country, flag, hours ahead or behind the listener, and the Keeper on the horizon with one line. One call to action: **Land here** (first visit), **Continue** (this browser has a last city), none while playing. Status chip says On air or Now leaving. The Day/Night toggle sits in the sky head.
- No coordinates, no clock and no sky. Nothing is guessed except the board clock below.
- While a question is typed the sky folds to one flap line: the query.

**The gates** (`HomeGates.tsx`). A sticky rail under the header with:
- the search field (`SiteSeekRail`, 48px, square, always on; a real child of its rail, never a portal because Safari drops portaled forms out of sticky boxes),
- the hour rail: Dawn, Midday, Dusk, Night (`HourRail.tsx`). Tapping one shows live stations where it is that hour right now. It marks the listener's own hour with a dotted underline,
- the Atlas door.

The field takes a short query (catalog search), a sentence (`/api/ai/interpret`, may fire a world mix), or the Surprise button (AI world mix, `IntentBar.tsx`). Two or more letters count as a seek (`SEEK_MIN` in `homeModel.ts`).

**The departures board** (`HomeDepartures.tsx`). Station rows, each with its local time on flaps, tinted by its hour, a heart to keep it, and the station art or the Elsewhere mark. Tap a row to board it. Shows 8, then 16, then 32 rows ("More departures"); a seek answer shows up to 32. "Fresh board" reshuffles. Phases: arrive, seek, hour, aboard, empty (`homePhase()` in `homeModel.ts`); each has its own Keeper line (`homeKeeperLine`).
- Rows with no coordinates show a rough clock from the country's centre (`estimatedLongitude` in `app/utils/countryCentroids.ts`). It is labelled by the row only as a time; it is an estimate.
- The board is the top 240 stations with geo from Radio Browser, cached 5 minutes on the server. An outage serves the last good board (`homeBoard.server.ts`). The document itself is `no-store`.

**Recent stamps.** Under the board, the last three stamps as postcards, only once there are stamps. They open the passport.

**The Keeper's guide** (`homeGuide`, `routeHomeAsk` in `homeModel.ts`; wording in `keeperVoice.ts`). The sky's bubble is the only first-visit help: a plain welcome line, and under the Land button two or three suggestion chips that fit the moment (How it works on a first visit, "Where it's {hour}" opposite the listener's own hour, Surprise me; while a station plays, Ask me about {city}). "Ask me anything" opens a small field: how-it-works, passport and free questions get his own answer, a bare hour hops the board, "surprise" deals a mix, anything else becomes a search. With `KEEPER_ASK_ENABLED` on, the sentence goes first to `POST /api/keeper/home` (Jev with two choices: what they want, and which hour; 1.2s server race, 2.5s client race) and `routeHomeAsk` rules answer instead on any miss. No model prose, nothing on the audio path. "More like this" on the sheet (`keeperSimilar.ts`) is plain rules too: language, then a genre tag, then the hour.

### 1.2 The desk (`/listen`)

The Keeper's own page for the station you are inside. One column on a phone; a sky beside cards on wide screens. Code: `app/routes/listen.tsx`, `app/components/desk/*`, CSS `11-desk.css`.
- **Sky** (`DeskSky.tsx`): the station's hour, place, clock, flag, offset from you, the Keeper on the horizon, his murmur bubble. The misplaced-hour mark of the secret trail sits here (see 6).
- **Boarding pass** (`DeskPass.tsx`): From (you), To (the station's place), local time there, spoken languages, signal, minutes aboard, stamped or "stay a minute", stamp count, and a share stub that opens the ticket sheet.
- **On air** (`DeskOnAir.tsx`, `deskOnAir()` in `deskModel.ts`): only what the stream sent. Station idents, adverts, talk and programme names are recognised and labelled as such, not shown as songs. Empty ICY stays empty: "Ears up. Waiting for a name..." The last aired title stays when paused.
- **Ask the desk** (`DeskAsk.tsx`): free-text question to the Keeper (see 2). Shows "closed to questions" when the ask flag is off.
- **Postcards** (`DeskPostcards.tsx`): facts the Keeper looked up about the place, country, language, genre or artist, each labelled "Out of my notebook, not the station's word". The desk starts reading up as soon as you sit down.
- **The station's file** (`DeskDossier.tsx`): facts and links from the free trivia pass, only when a title filed. The written caption is left off on purpose (model prose can contradict the clock).
- **Next departures** (`DeskDepartures.tsx`): the queue as rows with clocks, plus a seek row (`TheaterSeek`, "Change gate"), which includes Surprise.
- **Empty state:** no station, the Keeper sleeps: "Nobody at the desk yet." with a Land button.
- **Floor clearance** (`useFloorClearance` in `deskHooks.ts`): the desk measures the dock and band and sets `--desk-floor` and `--desk-h`, so nothing hides under fixed UI.

### 1.3 About ("How it works")

`/about`: the Keeper's welcome in his voice, a generated desk scene (`public/about/desk.webp`, `desk-wide.webp`), a "Where things are" list, five numbered steps (Land, Listen and get stamped, Send a ticket, Ask me things, Always free), the Day/Night switch, a Land button. Copy is in the route file; CSS `13-about.css`.

### 1.4 Atlas (overlay)

A country list, not a map or a globe. Opens over the home (`?atlas=1`, the Atlas door, the band tab, or `requestOpenAtlas()`); playback never stops. Search by country or language, grouped by continent, tiles with flags. A country opens a drill-down list of that country's stations; Play replaces the queue. Code: `app/components/radio-passport/Overlays.tsx` (`AtlasOverlay`, `CountryOverlay`), `HomeOverlays.tsx`, `app/hooks/home/useHomeOverlays.ts`, state helpers in `productFlow.ts`. Built on the `Sheet` primitive.
- `app/services/atlas/atlasGraph.server.ts` and `/api/atlas/expand` still exist (a catalog graph of country, language and station nodes) but no page calls them.

### 1.5 Passport overlay

The book: stamps as type (`IN · India`, city in italic), favourites ("kept signals"), ghost slots that open **Find a city**. Tapping a stamp replays that city (`resolveStampReplay`). Opened from the site bar, the dock, the INKED toast or `/?passport=1`. Code: `PassportOverlay` in `Overlays.tsx`, `passportPresentation` helpers, `app/state/journeyStore.ts`.

## 2. The Keeper

The character, one voice, no chatter. Bible: `docs/KEEPER_CHARACTER.md`.

- **Character.** A dry, kind border clerk with pixel-art headphones and a radar for a face. First person, short, warm. Never "the station says", never "AI", no emoji, no exclamation spam. Sprites: `public/keeper/*.webp` (idle, searching, found, listening, speaking, chill, plus scenes: passport, atlas, control, explore, travel, nextstop) and `ticket-keeper.png`.
- **All fixed copy** is in `app/components/keeper/keeperVoice.ts` (`VOICE`). Home, desk, About steps and the first-visit card all read it. Change words there.
- **States** (`keeperState.ts`): `idle`, `listening`, `thinking`, `speaking`, `sleeping`, `delight`. Local hour sets his mood (drowsy, bright, awake, warm), not his state. He sleeps in the deep local night (00:00 to 04:59) with nothing playing. Rendered by `Keeper.tsx`.
- **Where he lives.** `KeeperHost` (root, beside the dock) mounts a floating, draggable figure (`KeeperFloat`) and one sheet (`KeeperSheet`). The sheet asks first, then shows one panel at a time (Postcards, On air, Station), with three actions: Ticket, Chatter on/off (hush, stored as `elsewhere.keeper.hush`), The desk. He reads the Room and never touches playback.
- **Unasked lines** (`keeperMurmur.ts`, `useKeeperMurmurs.ts`). On landing ("Landed in Lagos. Papers in order."), on stamping, on an hour hop ("Off we go: somewhere it's morning."). While a station plays he reads up, then speaks one line about every 34 seconds (first at 7s, at most 8 per station), alternating local lines (hour, offset, stay time, language) with grounded facts. He stops when the sheet opens, the tab is hidden, or he is hushed.
- **Questions.** `KEEPER_ASK_ENABLED` must be on (public flag, read in the root loader). Flow:
  1. `POST /api/keeper/route` classifies the question into an intent (`artist`, `track`, `language`, `city`, `station`, `hour_hop`, `off_topic`, `unknown`).
  2. Routing goes to **Jev** (TypeSafe System One, `app/services/keeper/jev.server.ts`) with a 1.2s race (`Promise.race`). If there is no `TYPESAFE_API_KEY`, Jev is slow, fails, or is under 0.35 confidence, the keyword rules in `keeperIntent.ts` (`ruleClassify`) decide.
  3. `POST /api/keeper/ask` answers. Station, track, language and city questions are answered from the facts the sheet sends (`answerLocally` in `keeperFacts.ts`), no model. Grounded prose goes to a model with a strict system prompt (max about 60 words, answer only from FACTS). `answerIsGrounded` and `validateKeeperAnswer` reject airplay claims and unmatched quotes.
  4. **Knowledge mode**: a named artist, genre or place ("Who is Ilayaraja?") is answered from a Wikipedia snippet at once (User-Agent set, 10-minute cache), labelled as his notebook. The model is used only when there is no snippet (Gemini directly, then the gateway chain, 4.5s). Aliases in `keeperAliases.ts`.
  5. `POST /api/keeper/fact` gives one grounded fact for the murmurs and "Worth knowing" (Wikipedia snippet, model picks the vivid sentence, numbers must be in the snippet; own rate bucket; 30-minute cache).
- **Limits.** Body max 8 KB, question max 200 characters, 20 questions per hour per client (in-memory token bucket, `rateLimit.server.ts`, a soft limit on serverless). Every route returns 404 `keeper_off` with the flag off.
- **Honesty.** `track` and `artist` answers come only from the stream's own title (cleaned by `cleanTrackLine` in `app/services/keeper/cleanTitle.ts`). No title means "the station sends no titles". Knowledge answers carry the notebook label.
- **Anonymous counters** (`app/utils/usage.ts`, `POST /api/usage`): `keeper_open`, `keeper_ask`, `desk_view`, `station_share`, `tune_join`, `ticket_open`, `ticket_share`, `ticket_copy`, `ticket_save`. A name only (plus `source: ticket|link` on `tune_join`), one log line each.

## 3. Playing radio

- **One audio element.** `GlobalAudioBridge` in `app/root.tsx` owns the only `<audio>`. `app/state/playerStore.ts` owns queue, now playing and play/pause. Search, filters and overlays never call `stop()`.
- **Dock** (`app/components/PlayerDock.tsx`, `05-dock.css`): fixed transport at the bottom: art or Elsewhere mark, cleaned track line, prev, play disc, next, heart, Passport. The play disc is also the stamp: the red heart grows over 60 seconds and slams when the stamp lands (`.ew-stamp-disc`).
- **Recovery and probing.** A dead stream retries, then skips (`app/utils/playbackRecovery.ts`). The visible shelf is probed in parallel (`/api/stations/probe`, at most 8 targets a call, first 36 rows, 2.2s per host, `useShelfProbe.ts`). Probe-ahead picks a live HTTPS signal before skipping (`probeAhead.ts`). Confirmed-down and HTTP-only streams are hidden from lists. A system pause (phone call, Bluetooth) stops the state instead of leaving it "playing".
- **Now-playing** (`/api/now-playing`): reads ICY metadata (max 3 blocks, 8s, private hosts blocked). Double-encoded titles are repaired only when the result is clean UTF-8 (`repairMojibake.ts`). One poller, in the dock; others read `nowPlayingMetadataStore`.
- **Track facts** (`/api/now-playing-trivia`): two calls per track: `source=free` (one cached MusicBrainz resolution, then Cover Art Archive, iTunes, Wikipedia) then `source=ai`. See `docs/AI_PIPELINE.md`. Filed into the Room and shown in the desk's file.
- **The Room** (`app/state/roomStore.ts`, `hooks/useRoom.ts`): one object keyed to the station on the air: city, caption, signal, plate, dossier. The dock is the only writer. A new station replaces it on the next frame, so a leftover caption cannot sit under a new city. The caption is an honest template first, then `/api/ai/dispatch` may replace it (cached 30 minutes).
- **Media session** (`app/root.tsx`): lock-screen and headset controls with title, artist and the round mark as artwork (`/icons/artwork-512.png`).
- **Tab title** changes to "Elsewhere — still elsewhere" while the tab is hidden.
- **Restore.** A reload restores the last station, paused. Nothing autoplays; browsers block it.

## 4. Passport and stamps

- 60 seconds of continuous play stamps the city (`JourneyBridge.tsx`). The INKED toast files through the one toast channel (`playerNoticeStore`, `ToastChannel.tsx`) and taps through to the book.
- Stamps (up to 100), kept signals (hearts), played ids, a traveller number and member-since date live in `localStorage["radio-passport-journey"]` (`journeyStore.ts`). The Keeper says "Stamped. Lagos is in your passport now."
- No streaks. No score. No sync: the book lives in this browser only.

## 5. Tickets and sharing

Docs: `docs/TICKETS.md`. Every share control (header square, desk pass stub, Keeper sheet "Ticket") opens the **Your ticket** sheet (`TicketSheet.tsx`, `ticketStore.ts`, CSS `12-share.css`). Actions: Send this ticket (`navigator.share` with the PNG as a file when allowed, else the link, else clipboard), Copy link, Save image.
- **Image** `GET /ticket/<uuid>.png` (1200x630) and `?format=story` (1080x1350). satori lays it out, `@resvg/resvg-js` rasterises (`app/services/ticket/renderTicket.server.tsx`). Fonts Newsreader and Azeret Mono are fetched from our own origin (`public/fonts/ticket/`); other scripts fetch Noto subsets on demand with a 2.5s timeout. Any failure returns 302 to `/elsewhere-og.jpg`, so link previews never break. Only fields we have are printed.
- **Link** `/t/<uuid>`: per-station `og:title`, a timeless description in the Keeper's voice, `og:image` = the ticket, `twitter:card` large image. The root drops its house card on routes whose `handle` says `socialCard: true`. A person is handed on to `/?tune=<uuid>&from=ticket`.
- **Arrival** (`TuneBridge.tsx`): "A friend sent you a ticket" card and Land here. Audio starts only on the tap. `/?tune=<uuid>` still works for older links. Lookup: `GET /api/station?uuid=` (`services/station/lookup.server.ts`).
- Words: `ticketVoice.ts`. The preview never claims anything is on air.

## 6. The secret trail

A small misplaced hour mark on the desk sky starts a three-step trail: name the hour there, open the Atlas, open the passport, then `/secret-room` (a short story and a yes or not-tonight question about making an app; the answer stays on the device). Code: `SecretTrail.tsx`, `TrailWhisper.tsx`, `app/state/secretTrail.ts` (`localStorage["elsewhere-secret-trail-v1"]`), `secret-room.tsx`. The room is `noindex`.

## 7. The room's light (environment)

Full detail: `docs/ENVIRONMENT_LIGHT.md`. One fixed layer of foliage light driven by the hour. Not to be confused with `docs/ENVIRONMENT.md`, which is about environment variables.
- Code: `app/components/env/EnvLayer.tsx` and `envModel.ts`, store `app/state/envStore.ts`, CSS `app/styles/15-env.css`, sprites `public/env/{fleck,shade}-{near,far}.webp` baked by `node scripts/gen-foliage.mjs` (our own drawing; no third-party art).
- **Hour source:** the home's gate, else the home sky's city, else the playing station's solar hour, else the listener's own (refreshed every 5 minutes).
- **Colour and shape by hour** (`.ew-env[data-hour]`): angle, stretch, offset, softness and colour change together for dawn, midday, dusk, night. Colours are `--ew-hour-*`. Night room shows warm flecks, Day room shows shade on paper.
- **Desktop:** the layer is clipped to the sky panel (`.ew-sky`), so the rest of the room stays black. **Phones:** one sprite layer, between the header and the dock, feathered at the edges.
- **Landing:** on every load the light starts a half-turn behind and sweeps once, smoothly, about 6 seconds, into the real hour, brightest at the start, then settles. A change of hour transitions over 2.6 to 4.7s and sends one gust (damped sway). A new page or station stirs a softer gust.
- **Gyro parallax** on phones (near leaves move more than far). iOS asks permission, requested on the first tap; if refused, nothing happens.
- **Reduced motion:** no drift, no gust, no landing sweep; hour changes become a 1.2s ease. A room swap is a cut. A hidden tab pauses it. Save-data or reduced-data hides the sprites.
- **Budget:** `--env-peak` at most 0.10 per hour (tested in `tests/unit/env.test.ts`).

## 8. Rooms: Night and Day

The Night/Day toggle (`AtmospherePin.tsx`, `atmosphereStore.ts`, `app/utils/atmosphere.ts`) sets `data-atmosphere` on `<html>`. Night is the default; Day is a morning-edition paper palette. It does not follow the OS clock or `prefers-color-scheme`, and is stored as `localStorage["elsewhere-atmosphere"]`. A boot script in the document head applies it before paint. A swap is a cut (transitions are suspended for the swap). Not the same as the Night hour chip.

## 9. Brand, icons, PWA

- Manifest `public/manifest.json`: standalone, portrait, ink background. Icons in `public/icons/`: `icon-192`, `icon-512` (any), `maskable-192`, `maskable-512`, `apple-touch-icon` (180), `favicon-32`, `favicon-48`, `artwork-512` (media session).
- Tab icon: `/elsewhere-favicon.svg`, plus PNG fallbacks; `/favicon.ico` redirects to the SVG. The mark is the round seal (foil ring, lacquer disc), transparent, with no black square.
- Social card default: `public/elsewhere-og.jpg`, rendered from `scripts/og-still.html` by `scripts/render-og.mjs`.
- Wordmark component: `SignalMark.tsx`. Brand constants: `app/constants/brand.ts`.
- 404 wallpaper `public/FTS.jpeg` must stay (used in `07-components-b.css`).

## 10. Error and edge surfaces

- **404 and route errors** render inside the standard Shell (site bar, dock, band, Keeper stay), so audio keeps playing. 404 says "That room is not on the map." with the FTS wallpaper. Other errors show a message, Back to Elsewhere and Reload, with technical details when there is a stack.
- **Shell scroll guard** (`Shell` in `app/root.tsx`): the home and desk are fixed-height shells with the site bar on top. On iOS the keyboard or a focus jump can slide the shell up. When nothing is being typed into, the guard resets `window.scrollY` and the frame's `scrollTop` to 0 on pageshow, scroll, focusout and visual viewport resize.
- **Passage bar:** a foil hairline sweeps the top while a route loads.
- **Empty and failed states** always name a next step (Surprise, Atlas, Clear search, Retry). Contract: `SURFACE_CONNECTIONS` in `productFlow.ts`.

## 11. Design system

- Tokens are `--ew-*` in `app/styles/01-tokens-base.css` (Night on `:root`, Day on `:root[data-atmosphere="day"]`). Full list and rules: `docs/DESIGN_SPECS.md`.
- Type: Newsreader (display, italic), Schibsted Grotesk (UI), Azeret Mono (telemetry). Loaded from Google Fonts in `root.tsx`.
- Square: no rounded corners on controls. Remaining radii are 2px hairline details and 50% or 999px on dots and discs.
- Primitives: `Button`, `ButtonLink`, `Chip`, `Eyebrow`, `Row`, `Sheet` in `app/components/ui/`.
- **Claude Design System artifact** (private): https://claude.ai/artifact/KKCEZDJp8YyEuvQhSjaJEg, currently v21. It does **not** yet cover the home Departures Hall, tickets, the environment light or the How-it-works card. Refreshing it is on the roadmap.

### 10.1 Admin console and visitor counters (local only)

- `/admin` (`app/routes/admin.tsx`) is a private console. It answers 404 to everyone except a dev machine on localhost and a browser that opened `/admin?key=<ADMIN_KEY>` once (that sets a 30-day httpOnly cookie scoped to `/admin` and redirects to the clean URL). With no `ADMIN_KEY` on the server the live site always answers 404. The key is in the local `.env` and Vercel production; never in a link you share. It shows a plain-language summary, the journey (opened → started a station → stamp → Keeper → ticket → friend arrived), visitors by country (`x-vercel-ip-country` on the visit beacon only; the code is counted, no address kept), visits by day and pages viewed, over 7/30/90 days or everything kept (400 days), with the tester and system under "Tools and system": the Keeper/Jev router tester (Jev pick vs keyword rules vs what is used, with timing), which switches and keys are set (yes/no only), and a ticket preview box.
- Counters (`app/services/admin/counters.server.ts`, `app/components/usage/PageViewBridge.tsx`, `app/utils/usage.ts`): anonymous, cookie-free. One `pageview` per route change (bucket: home, desk, about, ticket, other; never the URL) and one `visit` per browser per day (a date flag in localStorage, no id, no IP). Honours Do Not Track. Stored in Upstash Redis / Vercel KV when `KV_REST_API_URL` + `KV_REST_API_TOKEN` (or `UPSTASH_REDIS_REST_URL` + `_TOKEN`) are set, else a local file `.data/counters.json` on a dev machine, else nothing. To see the live site's visitors in the local admin, connect a store to the Vercel project and put the same REST URL and token in the local `.env`.

## 12. API routes

| Route | Method | What it does |
|---|---|---|
| `/api/ai/interpret` | POST | A sentence to place, tags and `wantsMix`. Heuristics gateway or Gemini |
| `/api/ai/dispatch` | POST | A place caption from station, ICY and local hour; template fallback |
| `/api/ai/recommend` | GET, POST | The world mix (`SceneDescriptor`) behind Surprise; `USE_MOCK=true` returns a bundled one |
| `/api/radio-catalog` | GET | Catalog search over Radio Browser (name, tag, language, country, state) |
| `/api/stations/probe` | POST | Live-probe up to 8 stations; returns status and latency |
| `/api/station` | GET | One station by directory uuid, for shared links |
| `/api/now-playing` | GET | ICY metadata for a stream |
| `/api/now-playing-trivia` | GET | Facts and artwork for a track: `source=free` then `source=ai` |
| `/api/keeper/route` | POST | Classify a keeper question (Jev, rules fallback). Dark unless `KEEPER_ASK_ENABLED` |
| `/api/keeper/ask` | POST | A grounded Keeper answer. Dark unless `KEEPER_ASK_ENABLED` |
| `/api/keeper/fact` | POST | One grounded fact for murmurs. Dark unless `KEEPER_ASK_ENABLED` |
| `/api/usage` | POST | One anonymous counter line per beacon |
| `/api/atlas/expand` | GET | Catalog graph view (`kind=country\|language\|station`). No client caller |
| `/api/node-artwork` | GET | Wikipedia portrait for an artist, film or place. No client caller |
| `/ticket/<uuid>.png` | GET | The ticket image |
| `/favicon.ico` | GET | Redirect to the SVG favicon |

API responses carry permissive CORS headers (`vercel.json`).

## 13. State stores (`app/state/`)

Small Zustand-like stores from `app/utils/zustand-lite.ts`.

| Store | Holds | Persisted |
|---|---|---|
| `playerStore` | queue, now playing, play state, last track per station | yes, `player-store` |
| `roomStore` | the Room for the station on the air | no |
| `journeyStore` | stamps, kept signals, played ids, traveller number | yes, `radio-passport-journey` |
| `keeperStore` | sheet open, murmur, fact log, landed times, hush | hush only (`elsewhere.keeper.hush`) |
| `atmosphereStore` | night or day | yes, `elsewhere-atmosphere` |
| `envStore` | the hour the home is showing | no |
| `ticketStore` | the one ticket sheet | no |
| `playerNoticeStore` | the one toast (stream errors, INKED) | no |
| `stationAvailabilityStore` | probe results, honest availability | yes, `station-availability` |
| `nowPlayingMetadataStore` | shared ICY metadata from the dock poller | no |
| `stationInsightsStore` | selection for the station details sheet | no |
| `dispatchStore` | cached place dispatches | no |
| `secretTrail` | the secret trail stage | yes, `elsewhere-secret-trail-v1` |
| `favoriteSnapshot` | helper to resolve kept stations | n/a |
| `uiStore` | small UI flags | no |

## 14. Catalog and AI

- Catalog: Radio Browser (`app/utils/radioBrowser.ts`, `services/radioBrowser/catalogSnapshot.ts`). Some streams fail CORS or mixed content; that is the real catalog.
- AI is used for: interpreting a typed sentence, the world mix, place captions, track facts, and Keeper prose. Never for playback. Providers and order: `docs/AI_PIPELINE.md`. Local dev uses the Heuristics gateway (DeepSeek V4 Flash). Production uses Gemini 2.5 Flash.

## 15. Tooling

`scripts/`: `ship.mjs` (deploy), `gen-foliage.mjs`, `render-og.mjs` and `og-still.html`, `sync-skills.mjs`, `verify-desktop.mjs` and `verify-board-sheet.mjs` (Playwright screenshots), `build_intent_vocabulary.py` and `generate_rag_catalogue.py` (intent vocabulary and RAG catalogue). Unit tests: `tests/unit` (Vitest). See `docs/TESTING_GUIDE.md`.

### Station named for someone (the desk and the sheet)
- `keeperSubject.ts` strips the usual radio words from a station name ("Mohanlal hits" → "Mohanlal"). `POST /api/keeper/subject` asks Wikipedia: the article title must match and its one-line description must say person or group (actor, singer, composer, band…). Only then the desk shows a "Tell me about X" chip (`useStationSubject`).
- The answer is the article's opening lines, labelled as the Keeper's notebook, with "The station's name points to X. I can't say what's on air." (never claims it is playing), a small Wikimedia portrait that links to the article, and a "A few facts about X" follow-up: up to three sentences lifted verbatim from the article (numbers, awards, firsts); no model between.

### The hour at a station
- `stationLocalDate` (`app/utils/localTime.ts`) is the one source of a station's local clock: a country that keeps a single clock (`app/utils/countryClock.ts`: India, Germany, Japan… with half hours and daylight saving, via Intl) gives its real time even when the stream sent no coordinates; otherwise the sun at the station's longitude; otherwise nothing. Countries spanning zones (US, Russia, Brazil, Canada, Australia, Indonesia, Mexico, Portugal, Spain, Chile) are never guessed from the country; departure rows alone borrow the country's centre as a rough hour.
