---
name: elsewhere-deploy
description: >
  Ship Elsewhere (Radio Passport repo) to production on Vercel and verify
  elsewheremusic.com. Use when the user says make it live, deploy, ship,
  push prod, vercel --prod, or /elsewhere-deploy.
---

Read `docs/DEPLOY.md` and execute that runbook. After tests and commit, ship with `npm run ship` — do not raw `git push` or bare `npx vercel` on this machine. Domain facts are only in `docs/DOMAINS.md`. Do not invent a second flow.
