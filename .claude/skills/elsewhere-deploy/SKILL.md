---
name: elsewhere-deploy
description: >
  Ship Elsewhere (Radio Passport repo) to production on Vercel and verify
  elsewheremusic.com. Use when the user says make it live, deploy, ship,
  push prod, vercel --prod, or /elsewhere-deploy.
---

Read `docs/DEPLOY.md` and execute that runbook. After tests and commit, ship with `npm run ship`. You may ship without asking (owner-approved 2026-10-11) once tests pass; run ships sequentially, never repeat a ship of the same commit, and do not raw `git push` or bare `npx vercel` on this machine. Domain facts are only in `docs/DOMAINS.md`. Do not invent a second flow.
