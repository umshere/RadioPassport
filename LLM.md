# LLM quickstart

Elsewhere (heritage: Radio Passport). Live radio from someone else's now. Remix + Vite. https://elsewheremusic.com. Full rules: `AGENTS.md`. Full feature list: `docs/FEATURES.md`.

## What it does

- `/` is the Departures Hall: a city's sky, sticky gates (search, Dawn/Midday/Dusk/Night, Atlas door), a departures board. No globe.
- `/listen` is the desk: boarding pass, on air, Ask the desk, postcards, next departures.
- `/about` is "How it works". `/t/<uuid>` and `/ticket/<uuid>.png` are share tickets.
- The Keeper is the character (`app/components/keeper/`). All his fixed copy is `keeperVoice.ts`.
- One `<audio>` lives in `app/root.tsx` (`GlobalAudioBridge`); `playerStore` owns the queue. Search, filters and overlays never stop playback.
- 60 seconds of play stamps a city. No streaks.

## Rules that decide most reviews

- Never invent a track title; never put AI on the audio path; never charge to hear radio.
- Never `AbortController.abort()` a Remix fetch on the server; use `Promise.race`.
- Deploy is `npm run ship` only. Never chain ships.
- JSX uses literal `↗` and `→`, not HTML entities.
- iOS: a grid item that is a scroll container collapses; use flex columns with `flex: none` children.

## Entry points

| Need | Look at |
|---|---|
| Home | `app/routes/_index.tsx`, `app/components/home/`, `app/hooks/home/` |
| Desk | `app/routes/listen.tsx`, `app/components/desk/` |
| Keeper | `app/components/keeper/`, `app/services/keeper/`, `app/routes/api.keeper.*` |
| Tickets | `app/components/share/`, `app/services/ticket/`, `docs/TICKETS.md` |
| Room's light | `app/components/env/`, `app/styles/15-env.css`, `docs/ENVIRONMENT_LIGHT.md` |
| Dock, stamps | `app/components/PlayerDock.tsx`, `app/components/radio-passport/JourneyBridge.tsx`, `app/state/journeyStore.ts` |
| The Room | `app/state/roomStore.ts`, `app/hooks/useRoom.ts` |
| AI | `app/services/ai/`, `app/api/ai/`, `docs/AI_PIPELINE.md` |
| Styles | `app/tailwind.css` (ordered imports of `app/styles/01..15-*.css`; order is the cascade), tokens `--ew-*` |
| Brand | `app/constants/brand.ts` |

Tests read CSS by path through `readAppCss()` (`tests/unit/appCss.ts`). Move a rule or a file, then fix the test path.

## Commands

`npm install` · `npm run dev` · `npm test` · `npm run typecheck` · `npm run lint`

## Env

```
AI_PROVIDER=heuristics
HEURISTICS_BASE_URL=http://localhost:4000
HEURISTICS_API_KEY=...
USE_MOCK=false
KEEPER_ASK_ENABLED=false   # true turns on the Keeper's questions
TYPESAFE_API_KEY=          # optional, Jev routing; empty uses keyword rules
```

Gateway model is fixed to `deepseek-v4-flash`; production uses Gemini 2.5 Flash. All variables: `docs/ENVIRONMENT.md`.

## Docs

`AGENTS.md` · `docs/README.md` (index) · `docs/FEATURES.md` · `docs/ROADMAP.md` · `docs/DEPLOY.md` · `docs/TROUBLESHOOTING.md`. Anything under `docs/archive/` is history only.
