# Elsewhere: agent brief

Read this first. Then `docs/README.md` (index), `docs/FEATURES.md` (what exists) and `docs/ROADMAP.md`.

Heritage repo name: Radio Passport. Product name: **Elsewhere**. Tagline: You are not here. Live radio from someone else's now.

## Live

- Site: https://elsewheremusic.com
- Old: https://radiopassport.art → 308 to the site
- Domains: `docs/DOMAINS.md`
- Ship: `docs/DEPLOY.md` · `/elsewhere-deploy`
- Breaks: `docs/TROUBLESHOOTING.md` · `/elsewhere-troubleshoot`

## Hard rules

- Never charge to hear radio.
- Never invent ICY titles. No title means say so.
- Never put AI on the audio path.
- Anything the station did not say is the Keeper's notebook, and is labelled.
- Never `AbortController.abort()` a Remix fetch on the server (use `Promise.race`).
- Do not commit `.env`. Keys are set by the owner in Vercel; never ask for or paste them in chat.
- Keep `public/FTS.jpeg` (404 wallpaper).
- No streaks, XP, scores.
- **Deploy = `npm run ship` only.** Never chain ships, never run it twice, never `vercel --prod` after a push, never raw `git push` to deploy. Push identity is `umshere` (see `docs/DEPLOY.md`).

Voice: land · dusk · hour · stamp · live · cover · elsewhere · now  
Ban: discover · seamless · AI-powered · widget · playlist · unlock · explore

## Commands

```bash
npm install
npm run dev          # http://localhost:5173
npm test             # vitest, tests/unit
npm run typecheck
npm run lint
npm run sync:skills  # copy .claude skills onto .grok
```

Node 22 is what the project was verified on. Details: `docs/TESTING_GUIDE.md`.

## Stack

Remix 2 + Vite, React 18, Tailwind 3 plus hand-written CSS, Zustand-lite stores (`app/utils/zustand-lite.ts`), Radio Browser catalog, Gemini or a LiteLLM gateway for AI, satori + resvg for tickets, Vitest. Vercel via `@vercel/remix`.

## Map

| Path | Role |
|---|---|
| `app/root.tsx` | Shell, the one `<audio>` (`GlobalAudioBridge`), media session, error/404, scroll guard |
| `app/routes/_index.tsx` | Home: the Departures Hall |
| `app/routes/listen.tsx` | The desk |
| `app/routes/about.tsx` | How it works |
| `app/routes/t.$uuid.tsx`, `ticket.$uuid.ts` | Ticket link and image |
| `app/routes/api.*` | API routes (list in `docs/FEATURES.md` section 12) |
| `app/components/home/` | Sky, gates, departures, how-it-works card, `homeModel.ts` |
| `app/components/desk/` | Desk cards and `deskModel.ts` |
| `app/components/keeper/` | The Keeper. `keeperVoice.ts` holds all fixed copy |
| `app/components/share/` | Ticket sheet, tune bridge |
| `app/components/env/` | The room's light |
| `app/components/radio-passport/` | Older shared parts still used: hour rail, seek, overlays (Atlas, country, passport), flaps, `productFlow.ts` |
| `app/components/PlayerDock.tsx` | Dock: the only transport, the only Room writer |
| `app/state/roomStore.ts` | The Room: current station's caption, signal, plate, dossier |
| `app/services/` | Server code: `ai/`, `keeper/`, `ticket/`, `home/`, `station/`, `trivia/` |
| `app/styles/01..15-*.css` | The cascade (below) |

## CSS

`app/tailwind.css` is an ordered list of `@import`s. **Order is the cascade.** Files: `01-tokens-base`, `02-shell-intro`, `03-hours-atlas`, `04-cover-globe`, `05-dock`, `06-rooms`, `07-components-b`, `08-home-board`, `09-button-states`, `10-keeper`, `11-desk`, `12-share`, `13-about`, `14-home`, `15-env`. New rules go in the file that owns the surface; put them outside `@layer` (Tailwind 3 has dropped rules inside `@layer components`). Tokens are `--ew-*`; never hard-code a hex. Square corners. Details: `docs/DESIGN_SPECS.md`.

- Tailwind's `content` list does not scan `components/home`, `share` or `env`. Use `ew-*` classes from the CSS files there, not new utility classes.
- **Tests read CSS by path** through `readAppCss()` (`tests/unit/appCss.ts`), which concatenates the imports in order. Many tests also read source files by path. When you move code or a rule, update the test in the same change.
- Every `<button>` needs a `type` (tested).

## Conventions and lessons

- **iOS/WebKit:** a grid item that is also a scroll container collapses. Use a flex column, `min-height: 0` on the scroller, and `flex: none` on the fixed children. Check on a real iPhone.
- **JSX uses literal characters** for arrows, `↗` and `→`, never HTML entities like `&rarr;`.
- Stations without coordinates get no clock and no sky. Never write a country centre onto `Station`.
- The dock is the only writer of the Room; home, desk and Keeper read it.
- Search, hours, overlays and the Keeper never call `stop()`.
- Keeper words live in `keeperVoice.ts` only. Ticket words live in `ticketVoice.ts`.
- Model on the gateway is hard-coded to `deepseek-v4-flash`. Local dev uses the gateway; production uses Gemini 2.5 Flash. Env details: `docs/ENVIRONMENT.md` (variables) and `docs/ENVIRONMENT_LIGHT.md` (the light, a different thing).
- One-off helper scripts go in `tmp/` and get cleaned up.
- Before pushing: `npm test`, `npm run typecheck`, commit only what the change needs.

## Knowledge graph

A graphify graph of the repo lives in `graphify-out/`. The committed graph was built 2026-09-06 and is behind the code (no Departures Hall, desk, tickets, env). Query it for old structure only; trust the code and `docs/FEATURES.md` first.

- Ask: `graphify query "<question>"` · Map: `graphify-out/graph.json` · Report: `graphify-out/GRAPH_REPORT.md`
- Refresh: `graphify . --update`

## Skills

`elsewhere-deploy` and `elsewhere-troubleshoot`, in three identical copies: `.claude/skills/`, `.agents/skills/`, `.grok/skills/`. Edit the `.claude` copy, run `npm run sync:skills` (updates `.grok`), and copy to `.agents` by hand. `tests/unit/skillTwins.test.ts` guards `.claude` against `.grok`.

Codex: this file plus the `docs/` runbooks. Same steps. Do not invent a second domain or deploy flow.

## Docs

Index: `docs/README.md`. Old handoffs and plans are in `docs/archive/`: history only, never a source of truth.
