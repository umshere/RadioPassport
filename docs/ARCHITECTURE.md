# Architecture Overview

Radio Passport is a Remix + React app centered on one discovery surface:

- Home / Atlas (`/`): Atlas browsing, country shelves, catalog search, and optional AI world mixes (card stack).

## Home / Atlas + World Mix

1. Home loads countries and stations in `app/routes/_index.tsx`.
2. The hero and atlas UI drive browsing, filtering, and station playback.
3. When the user requests a world mix, `useEventHandlers` calls `loadWorldDescriptor`.
4. `/api/ai/recommend` returns a `SceneDescriptor` which seeds the queue and drives the explore stack.

## Shared systems

- `playerStore` keeps playback state persistent across the app.
- `rbFetchJson` and station normalization utilities ensure consistent data.
- UI components are primarily under `app/routes/components`, with shared shell/player components under `app/components`.
