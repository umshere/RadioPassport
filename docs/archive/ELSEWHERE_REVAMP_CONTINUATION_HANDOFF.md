# Elsewhere revamp — continuation handoff

- Updated: 2026-09-16
- Repository: `/Users/umeshmc/Code/RadioPassport`
- Production: <https://elsewheremusic.com>
Current production/main head: `6cc24f4`

## Product north star

Elsewhere is the feeling of giving up control for a while: land somewhere, hear a real station, and feel the hour around it. The visual system should feel like an intimate night instrument—quiet, tactile, editorial, and native on a phone—not a generic media app or a collection of decorative AI panels.

Radio playback is the product. Story, Atlas, Passport, and the hidden trail deepen the listening experience without interrupting it.

## Confirmed shipped state

| Slice | Production state | Evidence / owner files |
|---|---|---|
| Secret trail | Live. Device-local `idle → hour → atlas → passport → room` sequence. | `app/state/secretTrail.ts`, `SecretTrail.tsx`, `TrailWhisper.tsx` |
| Secret Room | Live, guarded and `noindex`. App-interest answer is local-only. | `app/routes/secret-room.tsx` |
| Support ending | Wired but inactive. Positive answer shows `Support opening soon`; there is no payment URL, key, webhook, or checkout. | `app/routes/secret-room.tsx` |
| Secret artwork | Live WebP traveler and two-chair coffee-table concepts. | `public/secret-traveler.webp`, `public/secret-coffee-table.webp` |
| Theater hour line | Live, but intentionally small: one solar-hour sentence, not yet a full storytelling system. | `TheaterAmbientLine.tsx`, `app/routes/listen.tsx` |
| Mobile station board | Live as a draggable/tappable sheet above the globe and player. Desktop board remains inline. | `BoardSheet.tsx`, `_index.tsx`, `tailwind.css` |
| Flow registry | `board-sheet` is registered as a playback-preserving `cover → tune` action with a contract test. | `productFlow.ts`, `boardSheet.test.ts` |

Release sequence:

- `35f4ef7` — secret-room trail
- `a61e146` — Vercel deployment lookup compatibility
- `6cc24f4` — mobile station Board Sheet and flow contract

Latest reported gate for `6cc24f4`: 354 tests across 38 files, typecheck clean, eslint clean, Vercel Ready. `elsewheremusic.com` returned 200 and `radiopassport.art` redirected 308 to the apex.

## What is still pending

### P0 — Theater storytelling v1 (recommended next prototype)

Turn the existing solar-hour line into a restrained, evidence-first companion to the tuned station. It should answer: where did I land, what hour is it there, and what small truthful fragment makes this place feel inhabited?

Use only data already present in the tuned `Station` and Room:

- city/region/country and station name;
- calculated local time / solar hour;
- real station tags and language when supplied;
- Room caption, dossier fact, or link only when already present and attributable;
- honest fallback copy when evidence is absent.

Do not generate claims about current events, weather, people, landmarks, culture, tracks, or what is “happening now.” Do not add a paid API call to each Theater visit. Do not put AI on the audio path.

Recommended implementation boundary:

- modify `app/components/radio-passport/TheaterAmbientLine.tsx`;
- add `app/components/radio-passport/theaterFragments.ts` as a pure selector;
- make a small reviewed integration in `app/routes/listen.tsx`;
- add `tests/unit/theaterFragments.test.ts`;
- add only narrowly scoped Theater CSS at the end of `app/tailwind.css`, outside `@layer`.

Avoid changing `PlayerDock`, `app/root.tsx`, `roomStore.ts`, `theaterLock.ts`, the Board Sheet, or secret-trail state in this slice.

### P1 — Passport emotional polish

Make the local record of listening feel worth returning to: strong empty/one-stamp/many-stamp states, truthful place/hour display, and the existing “You stayed” emotional line. Use real stored data and stable Elsewhere motifs; do not add fabricated landmark illustrations or imply an account/cloud sync.

### P1 — App-wide visual coherence

Use the design study in `docs/design/elsewhere-app-revamp-2026-09-15/` as art direction, not literal screen specifications. Preserve Night/Day, the lacquer seal, foil meridian, editorial type, persistent transport, and current navigation. Refine one surface at a time after live screenshots; do not attempt a wholesale rewrite.

The generated landing/catalog/Passport screens contain speculative visual ideas. They are not factual station imagery and should not be copied as data.

### P1 — Secret trail acceptance pass

Run the complete trail at phone and desktop sizes, including refresh/resume, direct-link guard, keyboard focus, reduced motion, slow images, and uninterrupted playback across Home → Theater → Atlas → Passport → Secret Room. A real iPhone Safari pass is still desirable; responsive Chrome alone is not native WebKit proof.

### P2 — Support destination

Keep `Support opening soon` until the owner creates a hosted page and supplies its exact public URL. First choice remains a one-time hosted contribution page after the listener explicitly answers yes. Do not add a custom checkout, subscriptions, or any paid gate to radio.

### P2 — Measurement, only after a privacy decision

If approved, measure aggregate steps such as `land`, `theater_open`, `trail_start`, `trail_finish`, and `app_yes`. Do not collect email, identity, precise location, listening history, or supporter details without a separate consent/data-handling decision.

## Visual and interaction contract

- Mobile first: verify at 375×812 and 393×852; also check 768×1024 and 1440×900.
- One persistent audio element through `GlobalAudioBridge`; navigation and overlays must keep playback.
- `PlayerDock` remains the only Room writer. Theater reads the Room.
- New interactive controls require a `SURFACE_CONNECTIONS` entry and contract test.
- Touch targets should be at least 44×44 CSS px where practical.
- Keyboard focus must remain visible; mystery controls need meaningful accessible names.
- Reduced motion must resolve directly without losing information.
- Use real station artwork only when the catalog supplies it. Never invent ICY titles.
- Keep new CSS outside `@layer` where the live stylesheet already documents the Tailwind layer-drop issue.

## Working-tree safety

At this handoff, tracked `main` matches `origin/main` at `6cc24f4`. The checkout also contains untracked Graphify cache noise, `.playwright-mcp/`, scratch documents, the design-study folder, and local worktrees. Preserve them. Do not stage with `git add .`.

Before implementation:

1. Fetch and confirm the current remote head.
2. Create an isolated branch/worktree from `origin/main`.
3. Query `graphify-out/` for relationships, but treat Git/source as authoritative because the graph predates recent slices.
4. Keep the Theater slice to the boundary above.
5. Return a diff and local visual evidence for review before any push or deployment.

## Required validation

```bash
npm test
npm run typecheck
npm run lint
npm run build
git diff --check
```

Also verify locally:

- Home landing and Board Sheet at phone width;
- tune a real station and keep it playing while opening Theater;
- truthful Theater fragment with rich evidence and with no evidence;
- pause/resume and route navigation without a second audio element;
- keyboard and reduced-motion behavior;
- no regression to the hidden trail or Secret Room guard.

Do not push or deploy until the orchestrator has inspected the diff and the user has approved the visual result.

## Copy-ready continuation prompt

```text
ROLE: Senior product designer-engineer implementing one bounded Elsewhere slice.

REPO: /Users/umeshmc/Code/RadioPassport
BASE: fresh isolated worktree from current origin/main (production head was 6cc24f4 at handoff; fetch and verify before work).

READ FIRST:
- AGENTS.md
- docs/ELSEWHERE_REVAMP_CONTINUATION_HANDOFF.md
- docs/SESSION_HANDOFF.md
- docs/ROADMAP.md
- graphify-out/GRAPH_REPORT.md, then query Graphify for TheaterAmbientLine/listen/Room dependencies.

GOAL:
Build Theater storytelling v1: a quiet, cinematic, evidence-first companion that tells the listener where they landed, the local hour, and one small truthful station/place fragment while radio continues playing.

IMPLEMENTATION BOUNDARY:
- modify app/components/radio-passport/TheaterAmbientLine.tsx
- add app/components/radio-passport/theaterFragments.ts
- make only the smallest necessary integration in app/routes/listen.tsx
- add tests/unit/theaterFragments.test.ts
- add narrowly scoped Theater styles at the end of app/tailwind.css outside @layer only if needed

DATA RULES:
- derive only from the tuned Station, calculated local time/solar hour, station tags/language, and evidence already present in the Room
- deterministic useful fallback when evidence is absent
- no invented current events, weather, culture, landmarks, artist facts, track titles, or city imagery
- no paid API call per visit and no AI/audio-path coupling

DO NOT TOUCH:
- PlayerDock, app/root.tsx, roomStore.ts, theaterLock.ts
- BoardSheet/productFlow unless you add an actual new interactive control
- secretTrail state or secret-room flow
- graphify cache, .playwright-mcp, scratch docs, design-study assets, or unrelated untracked files

PRODUCT RULES:
- never charge to hear radio
- playback must continue across routes
- PlayerDock remains the only Room writer; Theater reads
- preserve existing Elsewhere identity; no generic cards/dashboard treatment
- mobile first, keyboard accessible, reduced-motion safe
- every new interactive control needs a SURFACE_CONNECTIONS row and contract test

DONE WHEN:
- rich-evidence and no-evidence Theater states both read naturally and truthfully
- npm test, npm run typecheck, npm run lint, npm run build, and git diff --check pass
- local screenshots/walkthrough at 375×812 and 1440×900 show no overlap or playback regression
- the diff contains only the agreed slice

OUTPUT:
STATUS: done | partial | blocked
SUMMARY: what changed and why
FILES: exact files touched
VALIDATION: commands and visual states checked
RISKS: remaining uncertainty, especially native iPhone WebKit

Stop after local implementation and handoff. Do not commit, push, open a PR, or deploy without explicit approval.
```
