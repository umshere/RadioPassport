# Design Specs

Radio Passport currently uses a single Home / Atlas surface with optional AI world mixes in the player stack. The previous terminal-style alternate surface has been removed.

## Current Surface

- `/`: Home, hero, atlas discovery, country shelves, catalog search, curated shelves, and player dock.
- `/about`: Static marketing/about page.
- `/api/ai/recommend`: Server-side AI world-mix generation.

## Current UI Modules

- Home and atlas UI: `app/routes/_index.tsx` and `app/routes/components/*`.
- Shared shell/player UI: `app/components/*`.
- Scene rendering: `app/components/SceneManager.tsx` and `app/scenes/*`.

## AI Entry Point

Use `/api/ai/recommend` for AI-curated station scenes. Provider fallback order should prefer OpenRouter/free routing and keep Gemini as a last-resort provider to avoid unnecessary paid usage.
