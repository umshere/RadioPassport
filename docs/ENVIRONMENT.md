# Environment Variables

Configure the AI layer and playback helpers through the following environment variables:

| Variable             | Description                                                                                                      |
| -------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `AI_PROVIDER`        | One of `heuristics`, `openai`, `gemini`, `openrouter`, or `ollama`. Selects the backing model.                   |
| `HEURISTICS_BASE_URL` | LiteLLM gateway origin (defaults to `http://localhost:4000`).                                                   |
| `HEURISTICS_API_KEY` | Gateway master key. Required for `AI_PROVIDER=heuristics`.                                                       |
| `HEURISTICS_MODEL`   | Locked to `deepseek-v4-flash` in code to keep AI cost down.                                                      |
| `HEURISTICS_FALLBACK_MODEL` | Unused. Flash is the only model.                                                                          |
| `USE_MOCK`           | `true` or `false`. When `true`, the API returns the bundled mock descriptor.                                     |
| `OPENAI_API_KEY`     | Required when `AI_PROVIDER=openai`.                                                                              |
| `OPENAI_MODEL`       | Optional OpenAI model name (defaults to `gpt-4o-mini`).                                                          |
| `GEMINI_API_KEY`     | Required when `AI_PROVIDER=gemini`.                                                                              |
| `GEMINI_MODEL`       | Optional Gemini model name (defaults to `gemini-2.5-flash`). Flash-Lite is a fallback, not the default.          |
| `GEMINI_API_VERSION` | Optional Gemini API version (defaults to `v1beta`, falls back to `v1`). Note: `v1` does NOT support JSON output. |
| `OPENROUTER_API_KEY` | Required when `AI_PROVIDER=openrouter`. Get your key from https://openrouter.ai/keys                             |
| `OPENROUTER_MODEL`   | Optional OpenRouter model name (defaults to `openrouter/free`, OpenRouter's free-model router).                  |
| `OPENROUTER_MODELS`  | Optional comma-separated OpenRouter fallback models after `OPENROUTER_MODEL`. `openrouter/free` is appended as a safety fallback. |
| `OPENROUTER_TRIVIA_MODEL`  | Optional OpenRouter model override for now-playing trivia. Falls back to `OPENROUTER_MODEL`.              |
| `OPENROUTER_TRIVIA_MODELS` | Optional comma-separated OpenRouter trivia fallback models.                                                |
| `OLLAMA_URL`         | Base URL (e.g. `http://localhost:11434`) for the Ollama server when `AI_PROVIDER=ollama`.                        |
| `OLLAMA_MODEL`       | Optional Ollama model identifier (defaults to `radio-passport`).                                                 |
| `FIRECRAWL_TRIVIA`   | Opt-in flag (`1`/`true`/`yes`/`on`) enabling web evidence retrieval for AI trivia. Default off.                   |
| `FIRECRAWL_API_KEY`  | Firecrawl secret key. Evidence is fetched only when this is set AND `FIRECRAWL_TRIVIA` is on. Server-side only; never sent to the client. |
| `MUSICBRAINZ_MIN_INTERVAL_MS` | Minimum spacing between outbound MusicBrainz requests from one process (default `1000`). Set `0` in tests. |

Place these variables in `.env` or your deployment platform's secrets manager. Do not commit real keys to the repository.

Production (Vercel `radio-passport`): `AI_PROVIDER=gemini`, `GEMINI_MODEL=gemini-2.5-flash`. Env edits need a redeploy. Live host and ship steps: [DOMAINS.md](./DOMAINS.md), [DEPLOY.md](./DEPLOY.md).
