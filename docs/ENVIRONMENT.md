# Environment variables

Everything the code reads from `process.env` (checked by grep on 2026-09-30). All are server-side except the keeper flag, which reaches the client through the root loader. Put them in `.env` locally (never commit it) and in Vercel for production. Template: `.env.example`.

Not to be confused with [ENVIRONMENT_LIGHT.md](./ENVIRONMENT_LIGHT.md), the foliage light.

## AI provider

| Variable | Description |
|---|---|
| `AI_PROVIDER` | `heuristics`, `openai`, `gemini`, `openrouter` or `ollama`. Names the preferred provider. Unknown values fall back to `openai`. Order tried: the preferred one (unless `gemini`), then heuristics, openrouter, openai, ollama, gemini last. Only providers with credentials take part |
| `USE_MOCK` | `true` makes `/api/ai/recommend` return the bundled mock mix |
| `HEURISTICS_BASE_URL` | LiteLLM gateway origin. Default `http://localhost:4000` |
| `HEURISTICS_API_KEY` | Gateway key. Turns the heuristics provider on |
| `HEURISTICS_MODEL`, `HEURISTICS_FALLBACK_MODEL` | In `.env.example` but **not read**. The gateway model is hard-coded to `deepseek-v4-flash` in `app/services/ai/gateway.ts` (cost lock) |
| `GEMINI_API_KEY` | Turns Gemini on. Used by the provider chain, trivia and the Keeper |
| `GEMINI_MODEL` | Default `gemini-2.5-flash` |
| `GEMINI_API_VERSION` | Default `v1beta`, falls back to `v1`. `v1` does not support JSON output |
| `OPENROUTER_API_KEY` | Turns OpenRouter on. Also the Keeper's last fallback |
| `OPENROUTER_MODEL` | Default `openrouter/free` |
| `OPENROUTER_MODELS` | Comma-separated fallbacks after `OPENROUTER_MODEL`. `openrouter/free` is appended last |
| `OPENROUTER_TRIVIA_MODEL`, `OPENROUTER_TRIVIA_MODELS` | Same, for now-playing trivia. Falls back to the general ones |
| `OPENAI_API_KEY`, `OPENAI_MODEL` | OpenAI. Model default `gpt-4o-mini` |
| `OLLAMA_URL`, `OLLAMA_MODEL` | Local Ollama. Model default `radio-passport` |

## The Keeper

| Variable | Description |
|---|---|
| `KEEPER_ASK_ENABLED` | `1`, `true`, `on` or `yes` turns on `/api/keeper/route`, `/api/keeper/ask`, `/api/keeper/fact`, and the desk's question box and murmur facts. Default off (routes return 404 `keeper_off`; the sheet answers from local facts only). Public, not a secret. Read once per visit in the root loader |
| `TYPESAFE_API_KEY` | TypeSafe System One (Jev) key for routing questions to an intent. Server only, never sent to the client or logged. Empty means the keyword rules route instead |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | Optional. Upstash Redis or Vercel KV REST endpoint for the anonymous visitor counters (`UPSTASH_REDIS_REST_URL` / `_TOKEN` also work). Without it, production only logs; a dev machine falls back to `.data/counters.json`. Set the same values in the local `.env` to read live numbers in `/admin` |

## Track facts

| Variable | Description |
|---|---|
| `FIRECRAWL_TRIVIA` | `1`, `true`, `yes` or `on` enables web evidence for AI trivia. Default off |
| `FIRECRAWL_API_KEY` | Firecrawl key. Evidence is fetched only when this is set and `FIRECRAWL_TRIVIA` is on |
| `MUSICBRAINZ_MIN_INTERVAL_MS` | Minimum spacing between outbound MusicBrainz calls per process. Default `1000`. Use `0` in tests |

## Other

| Variable | Description |
|---|---|
| `NODE_ENV` | Standard |
| `NPM_CACHE` | Not app config. Used by `scripts/ship.mjs` and by the deploy runbook to point npm and the Vercel CLI at a writable cache |
| `ENABLE_RAPTOR_MINI` | In `.env.example` but **not read** by any code. `uiStore.raptorMiniEnabled` is a hard-coded flag |

## Production

Vercel project `radio-passport`: `AI_PROVIDER=gemini`, `GEMINI_MODEL=gemini-2.5-flash`, `GEMINI_API_KEY`, `KEEPER_ASK_ENABLED=true`, `TYPESAFE_API_KEY` (set by the owner in Vercel; never paste keys into chat or commit them). There is no Heuristics gateway in production. **An env change needs a redeploy**: `npm run ship -- --skip-push`. See [DEPLOY.md](./DEPLOY.md).

Audio recognition (to name a song when a station sends no title) is not built. It would need a recognition service key added in Vercel by the owner. See [ROADMAP.md](./ROADMAP.md).
