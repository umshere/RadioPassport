# Current AI Pipeline

Elsewhere uses the Heuristics LiteLLM gateway first when a key is present. **That model is locked to `deepseek-v4-flash`** in `app/services/ai/gateway.ts`.

Vercel production has no Heuristics gateway (the gateway is local dev only). There we use **Gemini 2.5 Flash** (free tier, better writing than Flash-Lite). Pro is paid-only and is not the default.

## Calls

| Endpoint | When | On failure |
|---|---|---|
| `POST /api/ai/interpret` | User submits a sentence | `extractPromptIntent`, `fallback: true` |
| `POST /api/ai/dispatch` | 1.5s after play, and on track change. Room already shows the template. | Template stays |
| `POST /api/ai/recommend` | Surprise / world mix (button in the home seek field, and the desk's seek row) | Next configured provider (OpenRouter → OpenAI → Ollama → Gemini) |
| `/api/keeper/route`, `/api/keeper/ask`, `/api/keeper/fact` | Keeper questions and murmur facts, only when `KEEPER_ASK_ENABLED` | Jev then keyword rules for routing; local facts or a Wikipedia snippet for answers. See [FEATURES.md](./FEATURES.md) section 2 |
| `/api/now-playing-trivia` | Dock only, after ICY title. Exactly two calls per track/context: `source=free` first (one cached MusicBrainz resolution: search → recording relations → artist, paced ≥1s apart), then `source=ai`, which re-reads the filed dossier (summary/facts/links/verified graph sent as context) and makes **zero** MusicBrainz calls of its own. When the verified graph is sparse and Firecrawl is enabled (`FIRECRAWL_TRIVIA=1` + key), that same AI call may add up to 5 web results and search with `includeDomains` pinned to the allowlist (en.wikipedia.org, www.wikidata.org, www.allmusic.com, www.discogs.com) and scrape ≤2 of those pages (≤1800 chars each) as delimited untrusted evidence — every AI graph edge must cite an exact retrieved URL or it is dropped server-side; with no evidence retrieved, AI may only rephrase known facts — novel claims are filtered out, and verified MusicBrainz facts keep their seats ahead of AI prose in the seven-fact cap. Never invent; an empty addition beats a wrong edge. | Well hides the plate; AI failure is silence |

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

## Keeper model chain

`defaultKeeperComplete` in `app/services/keeper/keeper.server.ts`: Gemini directly with hidden thinking off (4.5s), then the Heuristics gateway, then up to two OpenRouter models. Knowledge answers use a Wikipedia snippet first and only ask the model when there is none. Gateway timeouts and the Jev call use `Promise.race`.

## Scene descriptor (the world mix contract)

`/api/ai/recommend` returns a `SceneDescriptor` (types in `app/scenes/types.ts` and `app/types/radio.ts`). Providers must return JSON of this shape; extra fields are ignored:

```jsonc
{
  "visual": "3d_globe",           // legacy; the home no longer draws a globe
  "mood": "psychedelic jazz",     // optional
  "animation": "slow-tilt",       // optional, legacy
  "play": { "strategy": "autoplay_first", "crossfadeMs": 4000 },
  "reason": "Psychedelic + Jazz · High bitrate · Brazil",
  "stations": [
    { "uuid": "station-id", "name": "Radio XYZ", "country": "Brazil", "countryCode": "BR",
      "language": "Portuguese", "tagList": ["psychedelic", "jazz"], "bitrate": 192,
      "streamUrl": "https://...", "favicon": "https://.../icon.png", "highlight": "..." }
  ]
}
```

Supply at least one station, with `uuid` and `streamUrl`, so playback can start at once. `applyAiPreviewPool` then `startStation` play the first one. The client side is `app/services/aiOrchestrator.ts`. Note: `app/api/ai/recommend.ts` still returns `favicon: "/radio-passport-icon.png"`, a file that does not exist (see BRAND_ASSETS.md).

Older prompt notes (card-stack era) are in [archive/AI_PROMPT_ENHANCEMENT.md](./archive/AI_PROMPT_ENHANCEMENT.md).
