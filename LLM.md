# LLM Quickstart

Short guide for AI assistants to navigate the Radio Passport codebase and answer repo questions quickly.

## What this app does

- Remix + React radio explorer that surfaces reliable streams from the Radio Browser API.
- AI-powered “World Mode” turns natural-language prompts into curated station scenes via `/api/ai/recommend`.
- Centralized `playerStore` keeps playback stable while scenes and UI swap around it.

## Key entry points

- UI shell and main experience: `app/routes/_index.tsx`, shared UI pieces under `app/routes/components/`.
- Player state: `app/state/playerStore.ts` plus hooks such as `app/hooks/useRadioPlayer.ts`.
- AI orchestration: `app/api/ai/recommend.ts`, providers in `app/services/ai/providers/*.ts`, parser utilities in `app/services/ai/providers/sceneDescriptorParser.ts`.
- Scene contract: `docs/SCENE_DESCRIPTOR.md`, runtime types in `app/scenes/types.ts` and `app/types/radio.ts`.
- Data normalization: `app/utils/stations.ts` (Radio Browser → internal `Station` shape) and `app/utils/radioBrowser.ts`.

## Flow overview

1. Prompt (or mock) → `POST /api/ai/recommend` chooses provider based on env vars.
2. Provider returns a `SceneDescriptor` describing visuals + stations.
3. Remix loaders hydrate `SceneManager`, which feeds stations into `playerStore`.
4. UI renders stamps, cards, and explainability chips off the descriptor and store.

## Local commands

- Install: `npm install`
- Dev server: `npm run dev` (Vite + Remix)
- Build: `npm run build`
- Tests: `npm test` (Vitest), lint: `npm run lint`, types: `npm run typecheck`

## Environment essentials

Add these to `.env` (see `docs/ENVIRONMENT.md` for full list):

```
AI_PROVIDER=openai|gemini|openrouter|ollama
USE_MOCK=true             # bypasses remote calls with bundled mock descriptor
OPENAI_API_KEY=...        # or GEMINI_API_KEY / OPENROUTER_API_KEY depending on provider
ENABLE_RAPTOR_MINI=true   # optional preview of compact player
```

## Testing notes

- Unit tests live in `tests/` and `app/**/__tests__` (where present) and run with `npm test`.
- Playwright config exists (`playwright.config.ts`) for E2E; install browsers with `npx playwright install` if you need to run them.

## Useful docs

- Doc index: `docs/README.md`
- Architecture: `docs/ARCHITECTURE.md`
- AI pipeline: `docs/AI_PIPELINE.md`
- Environment variables: `docs/ENVIRONMENT.md`
