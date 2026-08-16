# Current AI Pipeline

Elsewhere uses the Heuristics LiteLLM gateway first when a key is present. **That model is locked to `deepseek-v4-flash`** in `app/services/ai/gateway.ts`.

Vercel production currently has **no Heuristics URL**. There we use **Gemini 2.5 Flash** (free tier, better writing than Flash-Lite). Pro is paid-only and is not the default.

## Calls

| Endpoint | When | On failure |
|---|---|---|
| `POST /api/ai/interpret` | User submits a sentence | `extractPromptIntent`, `fallback: true` |
| `POST /api/ai/dispatch` | 1.5s after play, and on track change. Room already shows the template. | Template stays |
| `/api/ai/recommend` | Surprise / mix | Next configured provider (OpenRouter → OpenAI → Ollama → Gemini) |
| `/api/now-playing-trivia` | Dock only, after ICY title. `source=free` first (MusicBrainz facts + verified relations), then `source=ai` grounded on those facts (journey + graph). ~10s after filed, one `source=ai-deepen` call may add 3–6 related nodes. Never invent; empty graph beats a wrong edge. | Well hides the plate; deepen failure is silence |

## Provider order

`getProvider()`: preferred (except Gemini), then heuristics (if `HEURISTICS_API_KEY`), openrouter, openai, ollama, gemini last.

## Rules

- Do not invent a song title when ICY is empty.
- Do not put AI on the audio path.
- Do not `abort()` Remix `fetch` (process crash). Use `Promise.race`.
- Intent vocabulary still comes from `scripts/build_intent_vocabulary.py` + `generatedVocabulary.ts`.

## Env

See [ENVIRONMENT.md](./ENVIRONMENT.md). Local:

```
AI_PROVIDER=heuristics
HEURISTICS_BASE_URL=http://localhost:4000
HEURISTICS_API_KEY=sk-litellm-local-dev
```

`HEURISTICS_MODEL` in `.env` is ignored for routing; Flash is hardcoded.

## Older notes

Scene descriptor shape and ranking still apply to `/api/ai/recommend`. Historical prompt notes: [AI_PROMPT_ENHANCEMENT.md](./AI_PROMPT_ENHANCEMENT.md).
