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

## Search board fills, hour gates do nothing

Hour is a destination: it must leave the typed query. Contract: `hourTapNextState` in `app/components/radio-passport/searchState.ts`. Do not treat hour as a silent filter on leftover search.

## iOS: a scrolling column collapses to nothing, or rows overlap

WebKit collapses a grid item that is also a scroll container. Use a flex column, give the scrolling child `min-height: 0`, and give the fixed children `flex: none`. This was the cause of the overlapping keeper-sheet rows and of the collapsed board. Check on a real iPhone; desktop Chrome does not show it.

## iOS: the site bar is scrolled out of view after typing

The home and desk are fixed-height shells. The keyboard or a focus jump can slide the whole shell up. The Shell scroll guard in `app/root.tsx` resets `window.scrollY` and the `.ew-frame` `scrollTop` to 0 once nothing is being typed into. If it recurs, check that the page is inside `.ew-frame` and that the guard's `onShell` condition still matches the route.

## A new CSS rule has no effect, or a test that reads CSS fails

- Rules inside `@layer components` can be dropped by Tailwind 3. Put new rules outside a layer, in the `app/styles/*.css` file that owns the surface (see [DESIGN_SPECS.md](./DESIGN_SPECS.md)).
- Order is the cascade: a later file wins. Check `app/tailwind.css` for the import order.
- A Tailwind utility class in `app/components/home`, `share` or `env` is never generated: `tailwind.config.ts` does not scan those directories. Use an `ew-*` class in a CSS file.
- Tests read CSS through `readAppCss()`. A test that names one file by path breaks when the rule moves.
- In dev, `/app/tailwind.css` (processed) and `/app/tailwind.css?direct` (raw) differ. Verify against the plain URL.

## JSX shows a literal `&rarr;` or a broken arrow

Always write the literal characters (`↗`, `→`) in JSX, never HTML entities (`&rarr;`). Entities show up verbatim inside strings and props (`aria-label`, `title`, template literals) and in copy that goes through a function.

## The Keeper says the desk is closed, or the ask routes return 404

`KEEPER_ASK_ENABLED` is off in that environment (`404 keeper_off`). Set it to `true` in Vercel and redeploy. Routing without `TYPESAFE_API_KEY` is fine: the keyword rules take over. Rate limit is 20 questions an hour per client, per server instance.

## A shared ticket shows the house still, not the ticket

`/ticket/<uuid>.png` answers 302 to `/elsewhere-og.jpg` for a bad or unknown id, for a station the directory no longer has, and for any render error. Check the uuid with `/api/station?uuid=<uuid>`. Crawlers cache previews; a new share URL forces a fresh read. Font fetches (`public/fonts/ticket/`) come from our own origin; a missing font file breaks the render.

## The room's light is not visible

- It is quiet by design (`--env-peak` at most 0.10).
- It is hidden with save-data or reduced-data on.
- On desktop it is clipped to the sky panel (`.ew-sky`); on pages without a sky (About, 404) it has no panel and sits at the default box.
- Sprites are `public/env/*.webp`. If they are missing, re-bake with `node scripts/gen-foliage.mjs`.
- Reduced motion removes the landing sweep and the gust but keeps the light.

## A route or the home shows an empty board on a phone

The catalog is Radio Browser. An outage serves the last good board from the server cache; after a cold start with an outage the board is empty and says "Signal lost". Try again, or open the Atlas. The client tries several mirrors (`de1`, `nl1`, `at1`, `de2` under `api.radio-browser.info`, see `app/utils/radioBrowser.ts`). Check one with `curl -s https://de1.api.radio-browser.info/json/stats`.

## 404 has no wallpaper

`public/FTS.jpeg` must be committed. CSS: `.not-found-easter-egg__pattern` in `07-components-b.css`. Markup in `NotFoundEasterEgg` (`app/root.tsx`). The 404 renders inside the standard Shell, so the site bar and dock should show; if they do not, the error boundary is not wrapping `Shell`.

## Prod writes worse than local / no captions

Prod is `AI_PROVIDER=gemini`, `GEMINI_MODEL=gemini-2.5-flash` (no Heuristics gateway there). Env edits need a redeploy. Never put AI on the audio path. See [ENVIRONMENT.md](./ENVIRONMENT.md).

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
