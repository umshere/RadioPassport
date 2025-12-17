# Current AI Pipeline (Nov 2025)

This document captures the **source of truth** for how /api/ai/recommend currently works. Use it when debugging intent mismatches or explaining the stack to other contributors.

## Overview

`app/api/ai/recommend.ts` mediates between user intent and scene rendering:

1. Resolve which provider to use (`OpenAI`, `Gemini`, `Ollama`, or mock) based on env vars.
2. Call `provider.getSceneDescriptor(prompt, { intent })` so each model receives region/language and personalization hints alongside the natural-language prompt.
3. Apply ranking and health heuristics before sending results to the client.
4. Return the descriptor to Remix loaders, which hydrate `SceneManager` and the player store.

Providers live under `app/services/ai/providers/` and must implement the `SceneDescriptor` contract. They may include provider-specific metadata but should normalize station fields before returning.

## 1. Prompt intake & intent extraction

1. Client sends `prompt`, `mood`, `scene/visual`, and listening context (favorites, recents, now playing).
2. `app/api/ai/recommend.ts` calls `extractPromptIntent`, which now pulls synonyms from the generated vocabulary under `app/services/ai/intent/generatedVocabulary.ts` (built from the Radio Browser catalogue).
3. The request is enriched with
   - `preferredCountries`
   - `preferredLanguages`
   - `preferredTags`
   - favorites / recents / disliked IDs
4. We log `intent-coverage` for every request so we can see which signals were detected.

## 2. Station pool construction

1. Providers fetch a general pool (`/json/stations/search`) plus targeted pools derived from intent:
   - `/bycountry/<country>`
   - `/bylanguage/<language>` (with bitrate relaxed down to 48 kbps)
   - `/bytag/<tag>`
2. Candidates are filtered via `filterStationCandidates` (bitrate, stream health) and deduped before going into the LLM prompt context.

## 3. Model selection

OpenRouter rotates through the low-latency free models we currently trust:

1. `meta-llama/llama-3.3-8b-instruct:free`
2. `google/gemma-3n-4b-it:free`
3. `mistralai/mistral-7b-instruct:free`
4. `openai/gpt-oss-20b:free`
5. `nvidia/nemotron-2-12b-vl:free`

If a model fails (moderation, invalid JSON, 404), we log the error and move on automatically.

## 4. Post processing & supplementation

1. `rankStations` scores the descriptor’s stations using tags, countries, languages, favorites.
2. `ensureIntentCoverage` guarantees at least four matches for the detected intent:
   - supplement from Radio Browser pools when the LLM picks irrelevant stations;
   - pin true matches first, then related languages (e.g. Malayalam → Tamil/Telugu) only when necessary;
   - log what happened so we can debug.
3. We annotate station health and emit a final `descriptor-stations` log listing the payload returned to the client.

## 5. Catalogue & vocabulary regeneration

We scrape Radio Browser via `scripts/generate_rag_catalogue.py`, which produces:

- `/data/radiobrowser_catalogue_<timestamp>.jsonl`
- `/data/catalogue_stats_<timestamp>.json`

Run the script (or hit `/api/radio-catalog`) whenever the intent vocabulary needs to be refreshed, then execute `python scripts/build_intent_vocabulary.py` to regenerate `generatedVocabulary.ts` before committing.

## 6. Legacy docs

`docs/AI_PERFORMANCE_OPTIMIZATION.md` and `docs/ULTRA_COMPACT_OPTIMIZATION.md` describe the original context-reduction experiments. Keep them for historical reference, but use this document for the up-to-date pipeline.
