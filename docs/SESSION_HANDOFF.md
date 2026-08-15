# Session handoff — Elsewhere

Saved so this conversation can be compacted. Next turn: read this file + `docs/ROADMAP.md`.

## Identity

- **Product name:** Elsewhere
- **Tagline:** You are not here.
- **Promise:** Stay long enough to be stamped.
- **Repo / heritage name:** Radio Passport (`umshere/RadioPassport`)
- **Positioning:** live radio as a fashion cover of a city that is awake without you
- **Hard rule:** never charge to hear the radio. Public streams stay public.

## Git

- Branch: `main`
- Remote: `https://github.com/umshere/RadioPassport.git`
- Head at last product push: first-load peel (no Mantine on the live shell). Passport stamp rule is in `docs/DESIGN_SPECS.md`. Domain + agent docs follow.
- Do not commit `.env`
- `public/FTS.jpeg` is the 404 wallpaper. Ship it with the app.
- Live host: **https://elsewheremusic.com**. Radio Passport 308s there. Facts: `docs/DOMAINS.md`. Ship: `docs/DEPLOY.md`. Breaks: `docs/TROUBLESHOOTING.md`. Agents: `AGENTS.md`.

## What shipped (live product)

- Home `/`: coverline, night-earth globe, Land here / Continue, solar hours, same-hour cities
- Globe is **not a mock**: real Radio Browser cities. HTML tooltip = city, region, country code, lead station, live count. Click rotates the earth to face that longitude, then plays the strongest station there.
- Search (any language, tag, city — not Tamil-only) keeps the globe live. Missing Radio Browser geo falls back to the country center. Globe faces the densest match. Contract: `app/components/radio-passport/globePlaces.ts`.
- Intent bar + voice + Surprise mix
- `/listen` theater: constellation is a sky (right column / phone-first sticky strip). Type is a letter. Honest ICY. Filing keeps the sky inhabited (disc + place/track names). Home station rows use the station plate or the Elsewhere mark — never a clipart play.
- Atlas + country drill-down overlays
- Passport stamps after **60s continuous** listen; favorites; localStorage only
- Mobile: globe first, full-width Land here, compact dock, theater via art / Theater link
- Brand: lacquer seal + foil ring. Favicon `/elsewhere-favicon.svg`. Wordmark `/elsewhere-mark.jpg`. About colophon `/elsewhere-colophon.jpg`
- Day / Night pin on the cover chips. Default Night. Persist `elsewhere-atmosphere`. Day is paper, not a white invert. 404 stays night.
- Tuning overlay, old Radio Passport header/sidebar, Mantine about deck: **unmounted** (files may still exist — do not import them)
- Live stylesheet does not import Mantine or leftover travel CSS. Tailwind scans mounted files only.

## AI (cost lock)

- Local: Heuristics gateway, model hardcoded to `deepseek-v4-flash`
- Vercel prod (as of this session): `AI_PROVIDER=gemini`, `GEMINI_MODEL=gemini-2.5-flash` (free tier; better writing than Flash-Lite). No Heuristics URL. Needs a **redeploy** after the env fix.
- Dispatch and trivia try Flash first, then Gemini 2.5 Flash, then template / hide
- The Room owns the current land. Theater files free trivia (plate + facts) first, then AI cover, only when ICY sent a title
- Never put AI on the audio path
- Never `AbortController.abort()` Remix fetch (it can kill the process). Use `Promise.race`

## Audio

- Only `<audio>` is `GlobalAudioBridge` in `app/root.tsx`
- Filters / search / overlays must not `stop()` playback
- Radio Browser + CORS / mixed-content failures are real. Retry then skip. Do not fake a healthy catalog.

## Voice (use these words)

land · dusk · hour · stamp · live · cover · elsewhere · now

**Ban:** discover · seamless · AI-powered · widget · playlist · unlock · explore

## Monetization (not built)

- Paid object: **Correspondent** — **$6/mo or $60/yr**. Never call it Premium.
- Sell the desk: unlimited mix, filed dispatch, probe-ahead skip, synced passport book
- Do not paywall streams, globe, atlas, or Land here
- Account: magic link. Stripe. Flag `ELSEWHERE_BILLING=1`
- Kill if ≥200 qualified users and checkout start <1.5%, or AI COGS >35% of MRR

## Launch (not started)

- Campaign: *Someone else's now*
- Viral frame is `/listen`, not the globe
- Public domain **live**: `elsewheremusic.com` (Cloudflare DNS-only → Vercel). Apex serves. `www` serves. `radiopassport.art` + `www` 308 to the apex. See `docs/DOMAINS.md`.
- Tailscale MagicDNS can hide the new name on this laptop. Public DNS is fine. See `docs/TROUBLESHOOTING.md`.
- 14-day sequence is in `docs/ROADMAP.md`
- Do not turn on billing during launch week
- Animated favicon: **overkill**. Still seal only.

## Next work (in order)

1. OG still from `/listen` on the new host
2. Run the 14-day launch
3. Correspondent (magic link + Stripe + quotas + probe-ahead)
4. Optionally delete unused legacy files later (`RetroTuner`, `Premium*`, `TuningOverlay`, `AppHeader`)

## Key files

- `app/routes/_index.tsx` — home
- `app/components/radio-passport/*` — globe, `globePlaces.ts`, overlays, intent, stamps
- `app/components/PlayerDock.tsx`
- `app/state/roomStore.ts` — current land
- `app/hooks/useRoom.ts` — dock writer
- `app/routes/listen.tsx`
- `app/constants/brand.ts` + `app/tailwind.css`
- `app/services/ai/gateway.ts`
- `docs/ROADMAP.md`

## Tests

`npm test` — 148 passing (`elsewhereFlow` + `elsewhereProduct` cover the loop and globe search). Keep those exports (`titleCasePlaceName`, `toggleSelection`, `shouldAnimateDock`, `aggregateCountryStationContext`, `applyAiPreviewPool` returns the descriptor).
