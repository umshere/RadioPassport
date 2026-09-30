# Architecture

Elsewhere is a Remix 2 + Vite app (React 18, Tailwind 3 plus hand-written CSS), deployed on Vercel through `@vercel/remix`. What each feature does is in [FEATURES.md](./FEATURES.md). This file is how the pieces hang together.

## Shape of the tree

```
app/
  root.tsx            Shell, audio bridge, media session, error/404, keeper + dock mounts
  routes/             pages (_index, listen, about, t.$uuid, secret-room) and api.* / ticket.$uuid
  components/
    home/             Departures Hall bands (sky, gates, departures, how-it-works card)
    desk/             the desk (sky, pass, on air, ask, postcards, departures)
    keeper/           the Keeper: figure, sheet, voice, state, intent, murmurs, facts
    share/            ticket sheet, tune bridge, ticket model and voice
    env/              the room's light
    radio-passport/   older shared parts still in use: hour rail, seek, overlays, board, flaps, stamps
    ui/               Button, ButtonLink, Chip, Eyebrow, Row, Sheet
  hooks/              home/* (intent, catalog, stations, overlays, play), useRoom, useShelfProbe, ...
  state/              stores (see FEATURES.md section 13)
  services/           server-side: ai/, keeper/, ticket/, home/, station/, atlas/, radioBrowser/, trivia/
  api/ai/             handlers behind api.ai.* routes
  styles/             01..15-*.css, imported in order by app/tailwind.css
  utils/              clocks, streams, probes, stations, zustand-lite
tests/unit/           Vitest
scripts/              ship, foliage, og render, skill sync, screenshots
```

Some components under `radio-passport/` (ParticleGlobe, TusiField, GalaxyBackdrop, CoverStrip, StationBoard, `useRadioPlayer`, `usePlayerCards`) are not imported by anything mounted. They are dead code awaiting cleanup (see ROADMAP.md).

## Routes and layout

`root.tsx` renders `Shell` around every page: `SiteBar`, the page (`.ew-page`), `EnvLayer`, then `PlayerDock`, `KeeperHost`, `TuneBridge`, the phone `BandNav`, `JourneyBridge`, `ToastChannel`, `AtmosphereBridge` and `GlobalAudioBridge`. The home and desk sit in a fixed-height `.ew-frame` and scroll inside their own column. The Outlet is deliberately not keyed by pathname, so a home/desk crossing does not unmount the page. Error and 404 pages render through the same `Shell`, so audio and chrome survive a bad route.

The root loader returns one public flag, `keeperAskEnabled`; `shouldRevalidate` is false, so it runs once per visit.

## Playback

1. `playerStore` owns queue, now playing and play/pause.
2. `GlobalAudioBridge` in `app/root.tsx` is the only `<audio>` element. Retry, recovery and skip live there, with `playbackRecovery.ts` and `probeAhead.ts`.
3. Filters, search, overlays and the Keeper never call `stop()`.
4. A reload restores the last station, paused (`rehydratePersistedStores()` in a layout effect). Nothing autoplays.
5. `playerStore` persists only the minimal playback fields, under `player-store`. On the server and in tests the storage helpers are no-ops.
6. Media session metadata and actions are set in the bridge; artwork is `/icons/artwork-512.png`.

## The Room

`roomStore` is one object for the station on the air: place, caption, signal (ICY), plate, dossier. The dock (through `useRoom`) is the only writer. The home, desk and Keeper only read it. `roomForStation(room, uuid)` guards against a stale room under a new station.

| Field | Source | When |
|---|---|---|
| place | `Station` | on `openRoom` |
| caption | honest template, then `/api/ai/dispatch` | at once, then about 1.5s later (cached 30 min) |
| signal | ICY via `/api/now-playing`, one poller in the dock | while playing |
| plate and dossier | free trivia (one cached MusicBrainz resolution, Cover Art Archive, iTunes, Wikipedia), then one AI pass grounded on the filed dossier | only if ICY sent a title |

Free first. AI may upgrade sentences, never invent a title.

## The Keeper

`KeeperHost` at the root mounts the floating figure and the sheet, and runs murmurs and delight. The desk page shares the same store (`keeperStore`) and facts (`keeperFacts.ts`). Server pieces are in `app/services/keeper/`; routes are thin wrappers that call `handleKeeperRoute`, `handleKeeperAsk`, `handleKeeperFact`. All are dark unless `KEEPER_ASK_ENABLED`.

## Journey

`journeyStore` holds stamps, kept signals, played ids and the traveller number in localStorage. `JourneyBridge` inks a city after 60 continuous seconds and files the INKED toast.

## Data

Radio Browser is the catalog (`rbFetchJson`, `normalizeStations`, `catalogSnapshot.ts`). The home loader (`homeBoard.server.ts`) fetches countries and the top 240 stations with geo, cached 5 minutes in memory, `no-store` to the browser, with a per-load seed so the board deals a fresh window. `/api/radio-catalog` runs search across name, tag, language, country and state, with a 60-second cache and no caching of outages.

A station without coordinates has no clock and no sky. The one exception: a board row estimates a rough clock from the country's centre (`app/utils/countryCentroids.ts`). Centres are never written onto `Station`. Solar hour and stamps need a real coordinate. If a state names a different country ("Veracruz, México" filed under AX), the state wins (`correctCountryFromState`).

## AI

`getProvider()` (`app/services/ai/providers/index.ts`) builds a fallback chain from `AI_PROVIDER` and the credentials present. The Heuristics gateway is locked to `deepseek-v4-flash`. Production uses Gemini 2.5 Flash. Details: [AI_PIPELINE.md](./AI_PIPELINE.md). AI is never on the audio path. Server-side timeouts use `Promise.race`, not `AbortController`, because aborting a Remix fetch can kill the process.

## Tickets

`/ticket/<uuid>.png` renders with satori and `@resvg/resvg-js` on the server; `/t/<uuid>` is the share page with per-station meta; `TuneBridge` on the client handles `/?tune=<uuid>`. Details: [TICKETS.md](./TICKETS.md).

## Styling

`app/tailwind.css` is an ordered list of imports of `app/styles/01..15-*.css`; order is the cascade. Tokens are `--ew-*`. Tailwind's `content` list (`tailwind.config.ts`) names specific paths: it includes `root`, the routes, `PlayerDock`, `SiteBar`, `ui/`, `radio-passport/`, `keeper/`, `desk/`, but **not** `components/home`, `share` or `env`. Those directories use only hand-written `ew-*` classes from the CSS files, so it works; a Tailwind utility class added there would not be generated. Details and file ownership: [DESIGN_SPECS.md](./DESIGN_SPECS.md). Nothing under `app/` imports Mantine, Emotion, Tabler icons, framer-motion, three or react-swipeable any more; they are still listed in `package.json` (cleanup item in ROADMAP.md). Only `@chenglou/pretext` (`pretextLayout.ts`) and `react-country-flag` (`CountryFlag.tsx`) of the UI extras are imported.

Tests read CSS by path through `readAppCss()` (`tests/unit/appCss.ts`), which concatenates the imports in order. Many tests also read source files by path, so when moving code, move the test path too.

## Deployment

Vercel project `radio-passport`, Git auto-deploy from `main`. `npm run ship` pushes and waits for that single build. See [DEPLOY.md](./DEPLOY.md) and [DOMAINS.md](./DOMAINS.md).
