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

## Flow

1. `npm test` — must pass.
2. Commit only what this change needs. Never `.env`. Keep `public/FTS.jpeg` tracked.
3. `git push origin main`
4. `npx vercel --prod --yes` from the repo root (linked project). GitHub may also build; the CLI deploy is the known-good path used in this repo.
5. Verify (use `--tlsv1.2` if LibreSSL fails the handshake):

```bash
curl -sSI --max-time 20 --tlsv1.2 https://elsewheremusic.com/ | rg -i 'HTTP/|location:|server:'
curl -sS --max-time 20 --tlsv1.2 https://elsewheremusic.com/ | rg -o '_index-[A-Za-z0-9_-]+\.js|Room|Elsewhere' | sort -u
curl -sSI --max-time 20 --tlsv1.2 https://www.radiopassport.art/ | rg -i 'HTTP/|location:'
```

Expect: apex **200** and the current `_index-*.js`. Radio Passport **308** to `https://elsewheremusic.com/`.

If getaddrinfo cannot resolve `elsewheremusic.com` but `dig` can, Tailscale DNS is in the way. See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md). Verify with `--resolve elsewheremusic.com:443:216.198.79.1`.

## After env changes

Vercel env (`AI_PROVIDER=gemini`, `GEMINI_MODEL=gemini-2.5-flash`) needs a **redeploy** to take effect. Changing the dashboard and not shipping a build leaves prod on the old process.

## Product locks that survive a ship

- Never charge to hear radio
- Never invent ICY titles
- Never put AI on the audio path
- Never `AbortController.abort()` a Remix fetch — use `Promise.race`
- Voice: land · dusk · hour · stamp · live · cover · elsewhere · now
- Ban: discover · seamless · AI-powered · widget · playlist · unlock · explore

## If the user only asked to push code

Push `main`. Still run the verify curls before calling it live.
