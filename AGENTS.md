# Elsewhere — agent brief

Read this first. Then `docs/SESSION_HANDOFF.md` and `docs/ROADMAP.md`.

Heritage repo name: Radio Passport. Product name: **Elsewhere**. Tagline: You are not here.

## Live

- Site: https://elsewheremusic.com
- Old: https://radiopassport.art → 308 to the site
- Domains: `docs/DOMAINS.md`
- Ship: `docs/DEPLOY.md` · `/elsewhere-deploy`
- Breaks: `docs/TROUBLESHOOTING.md` · `/elsewhere-troubleshoot`

## Hard rules

- Never charge to hear radio
- Never invent ICY titles
- Never put AI on the audio path
- Never `AbortController.abort()` Remix fetch (use `Promise.race`)
- Do not commit `.env`
- Keep `public/FTS.jpeg` (404 wallpaper)

Voice: land · dusk · hour · stamp · live · cover · elsewhere · now  
Ban: discover · seamless · AI-powered · widget · playlist · unlock · explore

## Commands

```bash
npm install
npm run dev          # http://localhost:5173
npm test
npm run typecheck
```

Ship: `docs/DEPLOY.md` (`git push origin main` then `npx vercel --prod --yes`).

## Map

| Path | Role |
|---|---|
| `app/routes/_index.tsx` | Home |
| `app/components/radio-passport/` | Globe, intent, overlays, stamps |
| `app/components/radio-passport/ParticleGlobe.tsx` | Globe hit / spin / face |
| `app/components/radio-passport/searchState.ts` | Leftover-intent contracts |
| `app/components/PlayerDock.tsx` | Dock — only Room writer |
| `app/state/roomStore.ts` | Current land (ICY, caption, plate, dossier) |
| `app/routes/listen.tsx` | Theater — reads the Room |
| `app/root.tsx` | Audio bridge, 404 |
| `app/services/ai/` | Interpret / dispatch / recommend |

Local AI: Heuristics + `deepseek-v4-flash`. Prod: Gemini 2.5 Flash. Details: `docs/ENVIRONMENT.md`.

## Skills (Grok + Claude)

- `.grok/skills/elsewhere-deploy/SKILL.md`
- `.grok/skills/elsewhere-troubleshoot/SKILL.md`
- `.claude/skills/elsewhere-deploy/SKILL.md`
- `.claude/skills/elsewhere-troubleshoot/SKILL.md`

Codex: this file + the `docs/` runbooks. Same steps. Do not invent a second domain or deploy flow.
