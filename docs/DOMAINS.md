# Domains

Canonical host: **https://elsewheremusic.com**

Heritage host: **https://radiopassport.art** — 308 to the apex. Do not remove it.

## Live map

| Host | Role |
|---|---|
| `elsewheremusic.com` | Serves the app |
| `www.elsewheremusic.com` | Serves the app |
| `radiopassport.art` | 308 → `elsewheremusic.com` |
| `www.radiopassport.art` | 308 → `elsewheremusic.com` |
| `radio-passport.vercel.app` | Serves the app (Vercel slug) |
| `radio-garden-delta.vercel.app` | 308 → `elsewheremusic.com` |

Apex is the share URL. Prefer it over `www` in copy, redirects, and OG.

## Owners

| Thing | Value |
|---|---|
| Registrar + DNS | Cloudflare zone `elsewheremusic.com` |
| Zone id | `95916891ae0521e3af8c7fdf10ef3b4c` |
| Cloudflare account | `4855060fd699a0f538597520547502d0` |
| Nameservers | `kami.ns.cloudflare.com`, `stan.ns.cloudflare.com` |
| Vercel project | `radio-passport` |
| Vercel project id | `prj_NcmVEDtctofZCZP7CsU7JieRB0t3` |
| Vercel team | `umsheres-projects` / `team_7rXooLo5aDMMLuSsGaZVc251` |
| Repo | `umshere/RadioPassport` · branch `main` |

`radiopassport.art` NS stay at Namecheap (`dns1.registrar-servers.com`). Do not move them unless asked.

## Cloudflare DNS (must stay DNS-only)

Orange-cloud proxy breaks Vercel certificates. Grey cloud only.

| Type | Name | Content | Proxy |
|---|---|---|---|
| A | `@` | `216.198.79.1` | DNS only |
| A | `@` | `64.29.17.1` | DNS only |
| CNAME | `www` | `ffb5a8fffc3c0f11.vercel-dns-017.com` | DNS only |

Do not put an A and a CNAME on the same name.

## Vercel domain rules

- Never redirect host A to host B if anything still redirects **to** A. Move dependents first.
- Clearing a redirect: `PATCH` with `{"redirect":null,"redirectStatusCode":null}`.
- Setting a redirect: `PATCH` with `{"redirect":"elsewheremusic.com","redirectStatusCode":308}`.
- Token: `~/Library/Application Support/com.vercel.cli/auth.json`. Team query: `teamId=team_7rXooLo5aDMMLuSsGaZVc251`.

```bash
TOKEN=$(python3 -c 'import json; print(json.load(open("/Users/umeshmc/Library/Application Support/com.vercel.cli/auth.json"))["token"])')
TEAM=team_7rXooLo5aDMMLuSsGaZVc251
curl -sS -H "Authorization: Bearer $TOKEN" \
  "https://api.vercel.com/v9/projects/radio-passport/domains?teamId=$TEAM"
```

## Cloudflare API (agent)

Use plugin `cloudflare-api` (`search` + `execute`). Zone writes need `#dns_records:edit`.

Read-only grant returns **10000 Authentication error** on POST. Re-auth that server with DNS Edit (`i` in Grok MCP Servers). `cloudflare-bindings` cannot write DNS.

```js
async () => {
  const zone = "95916891ae0521e3af8c7fdf10ef3b4c";
  return cloudflare.request({
    method: "GET",
    path: `/zones/${zone}/dns_records`,
    query: { per_page: 100 },
  });
}
```

## Do not

- Do not commit `.env`
- Do not drop `public/FTS.jpeg` (404 wallpaper)
- Do not paywall streams, globe, atlas, or Land here
- Do not change nameservers off Cloudflare for `elsewheremusic.com`
