# Elsewhere

**You are not here.** Live radio from someone else's now.

A Remix app that plays a real station on the air in another city, at the hour it is there. Stay sixty seconds and the city is stamped in your passport. A dry pixel-art clerk, the Keeper, keeps the desk. Streams are always free.

> Live: [elsewheremusic.com](https://elsewheremusic.com) · Docs: [docs/README.md](docs/README.md) · Features: [docs/FEATURES.md](docs/FEATURES.md) · Agents: [AGENTS.md](AGENTS.md) · Deploy: [docs/DEPLOY.md](docs/DEPLOY.md)

## Run

```bash
npm install
cp .env.example .env    # see docs/ENVIRONMENT.md
npm run dev             # http://localhost:5173
```

```bash
npm test                # vitest
npm run typecheck
npm run lint
```

Local AI uses a Heuristics LiteLLM gateway (`HEURISTICS_BASE_URL`, `HEURISTICS_API_KEY`) running DeepSeek V4 Flash. Production uses Gemini 2.5 Flash. The Keeper's question box is off unless `KEEPER_ASK_ENABLED=true`. Radio Browser is the catalog; some streams fail, and the player retries then skips.

## What you can do

- **Land here**, or pick Dawn, Midday, Dusk or Night, or type a place, a language or a mood. The home is a departures board of stations that are on the air right now, each with its local time.
- Open the **Desk**: your boarding pass, what is on air (never an invented title), postcards from the Keeper, next departures.
- **Ask the Keeper** about the place, the hour, the language. He says when it is from his own notebook and not the station.
- Open the **Atlas** for countries, and the **Passport** for stamps. Playback never stops.
- **Send a ticket**: a printed boarding pass with a real link preview. The friend lands on the same station.
- Night and Day rooms, and a quiet foliage light that follows the hour.

## Stack

Remix 2, Vite, React 18, Tailwind 3 plus 15 hand-written CSS files, Radio Browser, Gemini or a LiteLLM gateway for AI, satori and resvg for tickets, Vitest. Deployed on Vercel.

## Repo map

| Path | What |
|---|---|
| `app/routes/` | Pages and API routes |
| `app/components/` | `home`, `desk`, `keeper`, `share`, `env`, `radio-passport`, `ui` |
| `app/state/` | Stores (player, room, journey, keeper, atmosphere) |
| `app/services/` | Server code: AI, Keeper, tickets, home board, catalog |
| `app/styles/` | `01..15-*.css`, in cascade order |
| `tests/unit/` | Vitest |
| `docs/` | Documentation ([index](docs/README.md)); old material in `docs/archive/` |

Ship with `npm run ship` only. Read [docs/DEPLOY.md](docs/DEPLOY.md) first.
