# AI World Mode Integration

## Overview

World Mode lives on `/?view=world` and uses a dedicated flow (independent from `/api/ai/recommend`) to curate stations and generate station context.

Key entry points:

- `app/components/WorldMode/WorldHome.tsx`
- `app/services/geminiService.ts`

## World Mode flow

```
User prompt → geminiService.processPrompt → Radio Browser search
                                ↓
                 Matching stations (rbFetchJson + normalizeStations)
                                ↓
                       Results rendered in WorldHome
```

Additional World Mode behaviors:

- Curated rows: `geminiService.generateCurationSegments()` fetches themed station sets on load.
- Station context: `geminiService.getStationContext()` enriches the active station for `StationDossier`.
- Passport history: `localStorage` stores recent destinations for the Passport tab.

## Relationship to /api/ai/recommend

The AI pipeline described in `docs/AI_PIPELINE.md` remains active for Classic Mode world mixes (card stack scenes). The World Mode UI does not call `/api/ai/recommend` directly; it uses `geminiService` to interpret prompts and fetch stations.

## Configuration

Environment variables for World Mode AI:

- `GEMINI_API_KEY`
- `GEMINI_MODEL` (optional)
- `GEMINI_API_VERSION` (optional)

See `docs/ENVIRONMENT.md` for the full list.

## Notes

- World Mode is surfaced via `/?view=world` (legacy `/world/*` routes redirect).
- `geminiService` is responsible for prompt parsing and short-form messaging.
