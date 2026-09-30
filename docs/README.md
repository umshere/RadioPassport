# Documentation index

Elsewhere (repo heritage name: Radio Passport). Live radio from someone else's now. Remix + Vite. Live at https://elsewheremusic.com. Everything below was checked against the code on 2026-09-30.

## Start here

| Read | For |
|---|---|
| [../readme.md](../readme.md) | What it is, how to run it |
| [../AGENTS.md](../AGENTS.md) | Agent orientation: rules, stack, conventions, gotchas |
| [FEATURES.md](./FEATURES.md) | Every feature, where the code is, key constraints, API routes, stores |
| [ROADMAP.md](./ROADMAP.md) | Done, next, deferred |

## The product

| Doc | Covers |
|---|---|
| [UI_FLOW.md](./UI_FLOW.md) | The loop, primary actions, empty and error states |
| [KEEPER_CHARACTER.md](./KEEPER_CHARACTER.md) | The Keeper: who he is, how he speaks, where his words live |
| [TICKETS.md](./TICKETS.md) | Share tickets: image, link preview, sheet |
| [ENVIRONMENT_LIGHT.md](./ENVIRONMENT_LIGHT.md) | The room's foliage light |
| [DESIGN_SPECS.md](./DESIGN_SPECS.md) | Tokens, type, shape, CSS file map, design-system artifact |
| [BRAND_ASSETS.md](./BRAND_ASSETS.md) | Heritage assets that must not be deleted, OG still drift |

## Engineering

| Doc | Covers |
|---|---|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Tree, routes, playback, the Room, data, styling |
| [AI_PIPELINE.md](./AI_PIPELINE.md) | AI calls, provider order, trivia pipeline, the world-mix contract |
| [ENVIRONMENT.md](./ENVIRONMENT.md) | Environment **variables** (not the light) |
| [TESTING_GUIDE.md](./TESTING_GUIDE.md) | Tests, rules that bite, manual checklist |
| [CHANGELOG.md](./CHANGELOG.md) | Dated history, newest first |

## Operations

| Doc | Covers |
|---|---|
| [DEPLOY.md](./DEPLOY.md) | `npm run ship`, verify, env changes |
| [DOMAINS.md](./DOMAINS.md) | Hosts, DNS, Vercel, Cloudflare |
| [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) | Site down, DNS, iOS quirks, CSS, keeper, tickets |

Skills that wrap the runbooks: `.claude/skills/elsewhere-deploy`, `.claude/skills/elsewhere-troubleshoot` (mirrored in `.agents/skills` and `.grok/skills`).

## Archive

[archive/INDEX.md](./archive/INDEX.md) lists handoffs, superseded plans, and old contracts, one line each with why it was archived. Do not treat anything in `archive/` as current.
