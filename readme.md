# Elsewhere

**You are not here.** Live radio from someone else's now.

A Remix app that treats open radio as a fashion cover: a city, a local hour, a station that is actually on the air. Stay sixty seconds and the city inks your passport.

> Live: [elsewheremusic.com](https://elsewheremusic.com) · Agents: [AGENTS.md](AGENTS.md) · Docs: [docs/README.md](docs/README.md) · Deploy: [docs/DEPLOY.md](docs/DEPLOY.md)

## Run

```bash
npm install
# .env — see docs/ENVIRONMENT.md
# AI_PROVIDER=heuristics
# HEURISTICS_BASE_URL=http://localhost:4000
# HEURISTICS_API_KEY=...
npm run dev
# http://localhost:5173
```

```bash
npm test
npm run typecheck
```

Model is locked to **DeepSeek V4 Flash** (cost). Radio Browser is the catalog. Some streams fail CORS; the player retries then skips.

## What you can do

- **Land here** — start a real station. The globe turns to face that city.
- Hover a dot — city, region, lead station, live count. Click — rotate, then play.
- Type or speak *Lisbon at dusk* / *Malayalam night* / *tamil*. The list and the globe both update. Missing station geo lands on that country.
- Surprise asks the model for a mix.
- Filter by solar hour (the city's clock, not yours).
- Open Atlas, a country, or your passport. Playback does not stop.
- Theater (`/listen`) is the cover. Empty ICY stays empty.

## Stack

Remix 2 · React 18 · Tailwind · Radio Browser · Heuristics LiteLLM gateway · Zustand-lite player + journey stores.

## Money (not built yet)

Streams stay free. The paid object is **Correspondent** ($6/mo or $60/yr): unlimited mix, filed dispatch, probe-ahead, synced book. See [docs/ROADMAP.md](docs/ROADMAP.md).
