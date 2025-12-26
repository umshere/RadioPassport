# Architecture Overview

Radio Passport is a Remix + React app with two parallel discovery surfaces:

- Classic Mode (`/`): Atlas browsing and optional AI world mixes (card stack).
- World Mode (`/?view=world`): Terminal-style AI discovery via `WorldHome` and `geminiService`.

## Classic Mode (Atlas + World Mix)

1. Classic Mode loads countries and stations in `app/routes/_index.tsx`.
2. The hero and atlas UI drive browsing, filtering, and station playback.
3. When the user requests a world mix, `useEventHandlers` calls `loadWorldDescriptor`.
4. `/api/ai/recommend` returns a `SceneDescriptor` which seeds the queue and drives the explore stack.

## World Mode (Terminal)

1. The user switches to `/?view=world` using the AppHeader toggle or CTA.
2. `WorldHome` renders the terminal UI and prompts.
3. `geminiService` interprets prompts, fetches stations, and returns a short explanation.
4. Station selection updates the shared PlayerDock and Passport history.

## Shared systems

- `playerStore` keeps playback state persistent across modes.
- `rbFetchJson` and station normalization utilities ensure consistent data.
- UI components are split between `app/routes/components` (Classic Mode) and `app/components/WorldMode` (World Mode).
