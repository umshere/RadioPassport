# Roadmap

Product face: **Elsewhere**. Repo heritage name: Radio Passport. Positioning: live radio from someone else's now. Rule that never moves: **never charge to hear radio**. Public streams stay public.

Status as of 2026-09-30. What exists is in [FEATURES.md](./FEATURES.md); dated history is in [CHANGELOG.md](./CHANGELOG.md).

## Done

- Departures Hall home: sky, sticky gates (search, hour rail, Atlas door), departures board with clocks (estimated from the country's centre when a station has no coordinates), recent stamps, first-visit "How Elsewhere works" card. No globe.
- The desk (`/listen`): sky, boarding pass, on air (never invents a title), Ask the desk, postcards, station file, departures.
- The Keeper: one character, one voice file, states, murmurs, questions routed by Jev with a keyword fallback, knowledge mode from Wikipedia snippets, honesty labels.
- Passport and stamps (60 seconds), kept signals, no streaks.
- Tickets: `/ticket/<uuid>.png`, `/t/<uuid>` link previews, ticket sheet, friend arrival card.
- The room's light: hour-driven foliage light, landing sweep, gust, gyro parallax, reduced-motion handling.
- Night and Day rooms. Atlas as a country overlay.
- Round app icon everywhere: transparent favicon, maskable and any PWA icons, iOS touch icon, lock-screen artwork.
- Error and 404 pages inside the standard shell; shell scroll guard for iOS.
- Perf and reliability: parallel shelf probes, 2.2s probe give-up, 5-minute home catalog cache with last-good fallback, probe-ahead skip to a live HTTPS signal, system-pause handling.
- CSS split into 15 ordered files; token cleanup; UI primitives; one button-state grammar.
- Single-build deploy (`npm run ship`).

## Next

1. **Refresh the Claude Design System artifact** (https://claude.ai/artifact/KKCEZDJp8YyEuvQhSjaJEg, now v21). It does not yet cover the home Departures Hall, tickets, the environment light or the How-it-works card. This is manual work in the artifact, not repo code.
2. **Dead-code cleanup** (another agent is on the code side of this). Known candidates found while writing these docs:
   - unmounted components: `ParticleGlobe`, `TusiField`, `GalaxyBackdrop`, `CoverStrip`, `StationBoard`, `motionField.ts` (and their tests), `useRadioPlayer`, `usePlayerCards`;
   - dependencies nothing imports: `@mantine/*`, `@emotion/react`, `@tabler/icons-react`, `framer-motion`, `three`, `@react-three/fiber`, `react-swipeable`;
   - routes with no client caller: `/api/atlas/expand` (and `services/atlas/`), `/api/node-artwork`;
   - stale env entries in `.env.example`: `HEURISTICS_MODEL`, `HEURISTICS_FALLBACK_MODEL`, `ENABLE_RAPTOR_MINI`; `uiStore.raptorMiniEnabled`;
   - `app/api/ai/recommend.ts` returns a favicon path (`/radio-passport-icon.png`) that does not exist;
   - old comments in code that point at archived docs (`SESSION_HANDOFF`, `ATLAS_HANDOFF`, `MOTION_DESIGN`).
3. **Audio recognition** for stations that send no title. Not built. It needs a recognition service key that the owner adds in Vercel. It must stay off the audio path and must label the result as a guess, not as what the station said.
4. **Owner test on iPhone** after each UI pass: keyboard on the home, keeper sheet, desk, drop-up sheets, ticket share sheet with the PNG.
5. Reliability: keep auto-skip; prefer HTTPS streams for Land here; never fake a working catalog.

## Deferred (needs something we do not have yet)

- **Group listening** ("listen with a friend"). Needs a realtime service (presence and synced state). Not started.
- **Correspondent** paid tier: $6 a month or $60 a year, never named Premium, never a stream paywall. Idea dates from August; not started and not confirmed as current intent. Sketch of the split: free forever is any public stream, Atlas, hours, stamps in this browser, the Keeper's free lines; paid would be a cloud passport, unlimited AI mixes, track-aware dispatch. Needs accounts and Stripe; a flag `ELSEWHERE_BILLING=1` was planned. Do not turn on billing while there is no launch.
- Launch campaign "Someone else's now" (stills, one reel, station DMs). Status unknown; check with the owner.
- Native apps.
- An intro moment (three.js splash). Concept only; if ever revived, start from a fresh branch, one WebGL budget line, decided here first.
- The "app interest" question in the secret room collects a local yes; nothing reads it yet.

## Will not do

- Streaks, XP, scores, feeds, NFT stamps.
- Paywalling a city, a stream, the Atlas or Land here.
- AI on the audio path, or invented track titles.
- Animated favicon.

## Docs map

[README.md](./README.md) is the index. Domain and deploy: [DOMAINS.md](./DOMAINS.md), [DEPLOY.md](./DEPLOY.md), [TROUBLESHOOTING.md](./TROUBLESHOOTING.md).
