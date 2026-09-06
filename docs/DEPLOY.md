# Deploy

Ship Elsewhere to production. Domain facts live in [DOMAINS.md](./DOMAINS.md).

Trigger: user says **make it live**, **deploy**, **ship**, **push prod**.

## Identity

| | |
|---|---|
| App | Elsewhere |
| Repo | `umshere/RadioPassport` |
| Branch | `main` |
| Live | https://elsewheremusic.com |
| Old | https://radiopassport.art → 308 to the live host |
| Vercel | `umsheres-projects/radio-passport` |
| GitHub writes | **`umshere` only** |
| npm cache | `${TMPDIR:-/tmp}/elsewhere-npm-cache` |

## Flow

1. Tests. If `vitest` is missing or `npm` hits `EPERM` on `~/.npm`, use a writable cache first:

   ```bash
   export NPM_CACHE="${TMPDIR:-/tmp}/elsewhere-npm-cache"
   npm install --cache "$NPM_CACHE"
   npm test
   npm run typecheck
   ```

2. Commit only what this change needs. Never `.env`. Keep `public/FTS.jpeg` tracked.

3. Push + prod from the repo root (linked Vercel project):

   ```bash
   npm run ship
   ```

    That is `node scripts/ship.mjs`: push `main` as **umshere**, then wait for Vercel's Git auto-deploy of that commit (`vercel ls -m githubCommitSha=<sha>` until `● Ready`). One push, one build — never `vercel --prod` after a push; that double-builds the same commit and the two production promotions race.

4. Verify (use `--tlsv1.2` if LibreSSL fails the handshake):

```bash
curl -sSI --max-time 20 --tlsv1.2 https://elsewheremusic.com/ | rg -i 'HTTP/|location:|server:'
curl -sS --max-time 20 --tlsv1.2 https://elsewheremusic.com/ | rg -o '_index-[A-Za-z0-9_-]+\.js|Room|Elsewhere' | sort -u
curl -sSI --max-time 20 --tlsv1.2 https://www.radiopassport.art/ | rg -i 'HTTP/|location:'
```

Expect: apex **200** and the current `_index-*.js`. Radio Passport **308** to `https://elsewheremusic.com/`.

If getaddrinfo cannot resolve `elsewheremusic.com` but `dig` can, Tailscale DNS is in the way. See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md). Verify with `--resolve elsewheremusic.com:443:216.198.79.1`.

## Do not do this

- Do not `git push` with the active `gh` account if that account is `heuristicsai` — it 403s on this repo.
- Do not `gh auth switch --user umshere` (macOS keyring often fails: `failed to move active token`).
- Do not fall back to SSH (`Permission denied (publickey)` on this machine).
- Do not run bare `npx vercel` against the default `~/.npm` cache (root-owned `_cacache` → `EPERM`).

`npm run ship` already avoids those. Manual equivalent, only if the script cannot run:

```bash
export NPM_CACHE="${TMPDIR:-/tmp}/elsewhere-npm-cache"
GIT_TERMINAL_PROMPT=0 GH_TOKEN="$(gh auth token -u umshere)" \
  git -c credential.helper= -c credential.https://github.com.helper= push origin main
# Then watch the single Git-triggered build — do NOT vercel --prod after a push:
npx --yes --cache "$NPM_CACHE" vercel ls -m githubCommitSha="$(git rev-parse HEAD)"
```
(`vercel --prod --yes` is only for redeploys with no push, e.g. after dashboard env changes — with no push there is no Git trigger, so the CLI build is the single deploy.)

## After env changes

Vercel env (`AI_PROVIDER=gemini`, `GEMINI_MODEL=gemini-2.5-flash`) needs a **redeploy** to take effect. Changing the dashboard and not shipping a build leaves prod on the old process. `npm run ship -- --skip-push` redeploys the current `main`.

## Product locks that survive a ship

- Never charge to hear radio
- Never invent ICY titles
- Never put AI on the audio path
- Never `AbortController.abort()` a Remix fetch — use `Promise.race`
- Voice: land · dusk · hour · stamp · live · cover · elsewhere · now
- Ban: discover · seamless · AI-powered · widget · playlist · unlock · explore

## If the user only asked to push code

`npm run ship -- --skip-vercel`. Still run the verify curls before calling it live.
