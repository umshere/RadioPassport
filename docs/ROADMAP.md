# Elsewhere — Roadmap

Product face: **Elsewhere**. Heritage name in this repo: Radio Passport.

Positioning: live radio dressed as a fashion cover of a city that is awake without you.  
Rule: **never charge to hear the radio.** Public streams stay public.

## Now (shipped on `main` after this push)

- Home as a cover + night-earth globe (`/`)
- Land here / Continue, solar hours, same-hour cities
- Intent bar + voice + Surprise mix (DeepSeek V4 **Flash only**)
- Globe: real cities, HTML tooltip (city / region / station / count), rotate-to-face, play lead station
- `/listen` theater, ICY metadata, honest empty-track copy
- Atlas + country drill-down, 60s passport stamps, favorites (this browser)
- `/api/ai/interpret` and `/api/ai/dispatch` via Heuristics gateway
- Brand mark (lacquer seal), SVG favicon, about as Issue 01
- Mobile dock / cover / theater

## Next

### 1. Domain + launch (week of push)

- Clean public URL (not a Heuristics Vercel slug)
- OG still = `/listen` coverline
- Campaign *Someone else's now* — 14 days (X still, Are.na, one Reel, station DMs)
- Do **not** turn on billing in this window

### 2. Correspondent (paid desk)

One tier: **$6 / month or $60 / year**. Never named Premium.

| Free forever | Correspondent |
|---|---|
| Any public stream, globe, atlas, land, ICY, local clock | Same |
| 3 AI mixes / day, then keyword search | Unlimited mix + interpret |
| Template dispatch | Track-aware dispatch |
| One cover fact | Theater dossier (summary + facts) |
| Stamps in `localStorage` | Cloud book + inked caption |
| Hear dead streams (retry then skip) | Probe-ahead silent skip |

Account: magic link. Stripe Checkout. Flag `ELSEWHERE_BILLING=1`.  
Kill experiment if ≥200 qualified users and checkout start < 1.5%, or AI COGS > 35% of MRR.

### 3. Reliability

- Probe already runs on the visible Atlas / search shelf (first 36). Next: probe-ahead skip on play
- Prefer HTTPS / non-mixed-content stations in Land here
- Keep auto-skip; do not fake a working catalog

## Later / not this quarter

- Native apps
- Social feed, streaks, XP, NFT stamps
- Paywalling a city or a stream
- Animated favicon
- Deleting unused legacy files (`RetroTuner`, `Premium*`, old headers) — they are unmounted, not gone

## Docs map

- Product + run: [../readme.md](../readme.md)
- Architecture: [ARCHITECTURE.md](./ARCHITECTURE.md)
- Journey: [UI_FLOW.md](./UI_FLOW.md)
- Design: [DESIGN_SPECS.md](./DESIGN_SPECS.md)
- AI: [AI_PIPELINE.md](./AI_PIPELINE.md)
- Env: [ENVIRONMENT.md](./ENVIRONMENT.md)
