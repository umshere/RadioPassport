# LLM Quickstart

Elsewhere (heritage: Radio Passport). Remix radio cover of a live city.

## What it does

- `/` is the departure hall. `/listen` is the theater. `/about` is the room.
- Radio Browser catalog. `playerStore` + `GlobalAudioBridge` own audio. Do not stop playback on filter/search.
- AI: Heuristics gateway, **Flash only** (`app/services/ai/gateway.ts`). Interpret, dispatch, recommend.

## Entry points

- Home: `app/routes/_index.tsx`
- Globe / overlays / board: `app/components/radio-passport/*`
- Dock: `app/components/PlayerDock.tsx`
- Brand: `app/constants/brand.ts`, `app/tailwind.css`
- AI: `app/api/ai/{recommend,interpret,dispatch}.ts`, `app/services/ai/providers/`
- Journey: `app/state/journeyStore.ts`, `JourneyBridge.tsx`

## Commands

`npm install` · `npm run dev` · `npm test` · `npm run typecheck`

## Env

```
AI_PROVIDER=heuristics
HEURISTICS_BASE_URL=http://localhost:4000
HEURISTICS_API_KEY=...
USE_MOCK=false
```

See `docs/ENVIRONMENT.md`. Model env vars do not override Flash.

## Docs

`docs/README.md` · `docs/ROADMAP.md` · `docs/ARCHITECTURE.md` · `docs/UI_FLOW.md`
