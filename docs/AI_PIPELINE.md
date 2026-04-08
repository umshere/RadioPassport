# Current AI Pipeline

This document captures the source of truth for how `/api/ai/recommend` currently works. Use it when debugging intent mismatches or explaining the stack to contributors.

## Overview

`app/api/ai/recommend.ts` mediates between user intent and scene rendering:

1. Resolve which provider to use (`OpenAI`, `Gemini`, `Ollama`, or mock) based on env vars.
2. Call `provider.getSceneDescriptor(prompt, { intent })` so each model receives region/language and personalization hints alongside the prompt.
3. Apply ranking and health heuristics before sending results to the client.
4. Return the descriptor to Remix clients (Classic Mode world mixes).

Providers live under `app/services/ai/providers/` and must implement the `SceneDescriptor` contract. They may include provider-specific metadata but should normalize station fields before returning.

## Where it is used

- World mixes (card stack experience) call `/api/ai/recommend` via `loadWorldDescriptor` in `app/hooks/useEventHandlers.ts`.
- The old terminal-style Gemini-only view was removed; Gemini should only be reached through provider fallback order.

## 1. Prompt intake and intent extraction

1. Client sends `prompt`, `mood`, `scene/visual`, and listening context (favorites, recents, now playing).
2. `app/api/ai/recommend.ts` calls `extractPromptIntent`, which pulls synonyms from `app/services/ai/intent/generatedVocabulary.ts`.
3. The request is enriched with:
   - `preferredCountries`
   - `preferredLanguages`
   - `preferredTags`
   - favorites / recents / disliked IDs
4. We log `intent-coverage` for every request.

## 2. Station pool construction

1. Providers fetch a general pool (`/json/stations/search`) plus targeted pools derived from intent:
   - `/bycountry/<country>`
   - `/bylanguage/<language>` (bitrate relaxed down to 48 kbps)
   - `/bytag/<tag>`
2. Candidates are filtered via `filterStationCandidates` (bitrate, stream health) and deduped before entering the LLM prompt context.

## 3. Model selection

Provider fallback order keeps Gemini as the last resort:

1. Configured provider, unless it is `gemini`
2. `openrouter`
3. `openai`
4. `ollama`
5. `gemini`

OpenRouter defaults to `openrouter/free`, OpenRouter's free-model router. This avoids pinning production traffic to free model IDs that can disappear or change behavior without notice.

For controlled fallbacks, set `OPENROUTER_MODEL` as the primary model and `OPENROUTER_MODELS` as a comma-separated list of additional models. The provider appends `openrouter/free` as a final safety fallback, logs model failures, and moves on automatically when a model fails or returns unusable JSON.

## 4. Post processing and supplementation

1. `rankStations` scores the descriptor’s stations using tags, countries, languages, favorites.
2. `ensureIntentCoverage` guarantees at least four matches for the detected intent:
   - supplement from Radio Browser pools when the LLM picks irrelevant stations;
   - pin true matches first, then related languages only when necessary;
   - log what happened so we can debug.
3. We annotate station health and emit a final `descriptor-stations` log.

## 5. Catalogue and vocabulary regeneration

We scrape Radio Browser via `scripts/generate_rag_catalogue.py`, which produces:

- `/data/radiobrowser_catalogue_<timestamp>.jsonl`
- `/data/catalogue_stats_<timestamp>.json`

Run the script (or hit `/api/radio-catalog`) whenever the intent vocabulary needs to be refreshed, then execute `python scripts/build_intent_vocabulary.py` to regenerate `generatedVocabulary.ts` before committing.

## Related docs

- `docs/SCENE_DESCRIPTOR.md`
- `docs/AI_PROMPT_ENHANCEMENT.md`
