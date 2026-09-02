# Troubleshooting

Domain table: [DOMAINS.md](./DOMAINS.md). Deploy: [DEPLOY.md](./DEPLOY.md).

## New domain will not load, Radio Passport also looks dead

Radio Passport 308s to `elsewheremusic.com`. If the new name fails, **both** feel broken.

1. `dig +short elsewheremusic.com A` — expect `216.198.79.1` and `64.29.17.1`.
2. `python3 -c 'import socket; print(socket.getaddrinfo("elsewheremusic.com", 443))'`
3. If **dig works** and **getaddrinfo / the browser fail**, the machine is on **Tailscale MagicDNS**.
   - Do not change DNS records.
   - Turn off **Use Tailscale DNS** (leave the VPN up) or disconnect Tailscale and retry.
   - Public visitors are fine. Confirm with `dig @1.1.1.1 +short elsewheremusic.com A` and `curl --tlsv1.2 --resolve elsewheremusic.com:443:216.198.79.1 https://elsewheremusic.com/`.

## `www.elsewheremusic.com` fails, apex works

`www` is a CNAME. Some resolvers (including Tailscale) mishandle it. Apex A records are the share URL. Do not send Radio Passport to `www`.

## HTTPS handshake fails (`SSL_ERROR_SYSCALL`) but HTTP is 200

Vercel cert can be up while local LibreSSL chokes on TLS 1.3 / MLKEM. Retry:

```bash
curl -sSI --tlsv1.2 https://elsewheremusic.com/
echo | openssl s_client -connect 216.198.79.1:443 -servername elsewheremusic.com -brief
```

If openssl shows `CN=elsewheremusic.com` and `Verification: OK`, the cert is live.

## Cloudflare POST returns 10000 Authentication error

`cloudflare-api` is logged in **read-only**. Highlight that server, re-auth, grant **Zone / DNS Edit**. `cloudflare-bindings` cannot write DNS.

## Cannot redirect a Vercel domain

`You have redirected another domain (X) to this domain. In turn, you cannot redirect this one.`

Move **X** off this host first, then PATCH.

## Globe tooltip shows a city but click misses

Pointer must freeze spin **in the same frame** (`pointerOverRef` in `ParticleGlobe.tsx`). Do not pause only after React state commits. Click plays immediately, then eases to face. Tests: `shouldSpinGlobe`, `globeHitDistance`, `turnProgress`.

## Search list fills, hour chips do nothing

Hour is a destination: it must leave the typed query. Contract: `hourTapNextState` in `searchState.ts`. Do not treat hour as a silent filter on leftover search.

## 404 is a blank theater, no wallpaper

`public/FTS.jpeg` must be committed. CSS: `.not-found-easter-egg__pattern`. Markup in `NotFoundEasterEgg` (`app/root.tsx`).

## Prod writes worse than local / no captions

Prod is `AI_PROVIDER=gemini`, `GEMINI_MODEL=gemini-2.5-flash`. Env edits need a redeploy. Never put AI on the audio path.

## `git push` 403 / `Permission denied (publickey)`

Writes to `umshere/RadioPassport` must use **`umshere`**. The active `gh` account on this machine is often `heuristicsai` (read/comment works, push 403s). `gh auth switch --user umshere` can fail on the keyring. SSH has no key.

Use `npm run ship` (or the manual `GH_TOKEN="$(gh auth token -u umshere)"` push in [DEPLOY.md](./DEPLOY.md)). Do not invent a second remote or force-push.

## `npm` / `npx` `EPERM` on `~/.npm/_cacache`

The default npm cache is root-owned here. Use a writable cache:

```bash
export NPM_CACHE="${TMPDIR:-/tmp}/elsewhere-npm-cache"
npm install --cache "$NPM_CACHE"
npx --yes --cache "$NPM_CACHE" vercel --prod --yes
```

`npm run ship` sets this for the Vercel CLI step.

## Stream dies, copy mentions filters

Dead-stream copy is `playbackNoticeCopy`. The notice store is message-only — no Retry/Next buttons unless that store grows actions.
