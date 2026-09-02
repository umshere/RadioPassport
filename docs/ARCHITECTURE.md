# Architecture Overview

Elsewhere is a Remix 2 + React 18 + Tailwind app. The product face is one discovery surface plus a listening theater. Audio never lives in the route tree.

## Surfaces

| Route | Role |
|---|---|
| `/` | Departure hall: coverline, globe, intent, live board, overlays |
| `/listen` | Theater. Sky (constellation) + letter. No discovery chrome. |
| `/about` | The room |
| `/api/ai/recommend` | World mix `SceneDescriptor` |
| `/api/ai/interpret` | Natural language → place / tags / `wantsMix` |
| `/api/ai/dispatch` | Place caption from station + ICY + local hour |
| `/api/now-playing` | ICY metadata |
| `/api/now-playing-trivia` | One-track facts |
| `/api/radio-catalog` | Catalog search |

## Playback

1. `playerStore` owns queue, now playing, and play/pause.
2. `GlobalAudioBridge` in `app/root.tsx` is the only `<audio>` element. Recovery and skip live here.
3. Filters, search, and overlays must not call `stop()`.
4. `roomStore` is the current land. Land / next / prev calls `openRoom`. ICY, caption, plate, and dossier are keyed to that station. Home and Theater only read the room. The dock is the only writer (`useRoom`).

## Room

One object. One key. The previous station is gone on the next frame.

| Field | Source | When |
|---|---|---|
| place | `Station` | `openRoom` |
| caption | honest template, then `/api/ai/dispatch` | immediately, then ~1.5s |
| signal | ICY via `/api/now-playing` | dock poller |
| plate + dossier | free trivia (one cached MusicBrainz resolution: Cover Art / iTunes / Wiki + verified relations), then one AI cover call grounded on the filed dossier — optional Firecrawl evidence pass when enabled; no second deepen call | only if ICY sent a title |

Free first. AI may upgrade the sentences. A leftover caption cannot sit under a new city.

## Journey

`journeyStore` holds stamps, favorites, played IDs (localStorage). `JourneyBridge` inks a city after 60s of continuous play.

## AI

`AI_PROVIDER=heuristics` hits the Heuristics LiteLLM gateway (`HEURISTICS_BASE_URL`, default `http://localhost:4000`).  
Code locks the model to **`deepseek-v4-flash`**. OpenRouter / OpenAI / Gemini / Ollama remain fallbacks when keys exist.

- Surprise / mix → `loadWorldDescriptorPreview` → `/api/ai/recommend` → `applyAiPreviewPool` then `startStation` on the first track.
- Sentence in the intent bar → `POST /api/ai/interpret`.
- After 1.5s of play → `POST /api/ai/dispatch` (cached 30 min, template if the gateway is down).

AI never sits on the audio path. Gateway timeouts use `Promise.race`, not `AbortController` (Remix fetch abort can kill the process).

## Data

Radio Browser via `rbFetchJson` + `normalizeStations`. Some streams fail CORS or mixed content. That is the catalog, not a mock globe.

Search catalogs often omit `geo_lat` / `geo_long`. `buildGlobePlaces` keeps those stations on the earth using a country center (ISO code), then spreads country-only rows so the globe is the list, not one blob per country. Those centers are never written onto `Station`. Solar hour and stamps still need a real coordinate. The globe pool is the visible list (`liveFiltered`), capped.

## UI modules

- Home: `app/routes/_index.tsx`
- Globe / board / overlays: `app/components/radio-passport/*`
- Dock: `app/components/PlayerDock.tsx`
- Tokens: `app/tailwind.css`, `app/constants/brand.ts`
- The live shell does not load Mantine. Tailwind content is the mounted routes + `radio-passport/*`.

Legacy files (`RetroTuner`, `AppHeader`, `Premium*`, `TuningOverlay`) are unmounted. Do not import them into the live shell.
