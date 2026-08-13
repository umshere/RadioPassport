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
- Shipped commit: `a005840` — `feat: ship Elsewhere as the product face`
- Remote: `https://github.com/umshere/RadioPassport.git`
- Do not commit `.env` or `public/FTS.jpeg`

## What shipped (live product)

- Home `/`: coverline, night-earth globe, Land here / Continue, solar hours, same-hour cities
- Globe is **not a mock**: real Radio Browser cities. HTML tooltip = city, region, country code, lead station, live count. Click rotates the earth to face that longitude, then plays the strongest station there.
- Intent bar + voice + Surprise mix
- `/listen` theater (honest ICY: if no track title, say so)
- Atlas + country drill-down overlays
- Passport stamps after **60s continuous** listen; favorites; localStorage only
- Mobile: globe first, full-width Land here, compact dock, theater via art / Theater link
- Brand: lacquer seal + foil ring. Favicon `/elsewhere-favicon.svg`. Wordmark `/elsewhere-mark.jpg`. About colophon `/elsewhere-colophon.jpg`
- Tuning overlay, old Radio Passport header/sidebar, Mantine about deck: **unmounted** (files may still exist — do not import them)

## AI (cost lock)

- `AI_PROVIDER=heuristics`
- Gateway: `HEURISTICS_BASE_URL` default `http://localhost:4000`
- **Model is hardcoded to `deepseek-v4-flash`** in `app/services/ai/gateway.ts`. Ignore Pro even if `.env` asks.
- Endpoints: `POST /api/ai/interpret`, `POST /api/ai/dispatch`, existing `/api/ai/recommend`
- Dispatch: 1.5s after play; 30 min cache; template if gateway down
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
- Need a **clean public domain** (not a Heuristics Vercel slug)
- 14-day sequence is in the prior conversation / `docs/ROADMAP.md`
- Do not turn on billing during launch week
- Animated favicon: **overkill**. Still seal only.

## Next work (in order)

1. Clean domain + OG still from `/listen`
2. Run the 14-day launch
3. Correspondent (magic link + Stripe + quotas + probe-ahead)
4. Optionally delete unused legacy files later (`RetroTuner`, `Premium*`, `TuningOverlay`, `AppHeader`)

## Key files

- `app/routes/_index.tsx` — home
- `app/components/radio-passport/*` — globe, overlays, intent, stamps
- `app/components/PlayerDock.tsx`
- `app/routes/listen.tsx`
- `app/constants/brand.ts` + `app/tailwind.css`
- `app/services/ai/gateway.ts`
- `docs/ROADMAP.md`

## Tests

`npm test` — 83 passing after rebase onto origin honesty/filter helpers. Keep those exports (`titleCasePlaceName`, `toggleSelection`, `shouldAnimateDock`, `aggregateCountryStationContext`, `applyAiPreviewPool` returns the descriptor).
