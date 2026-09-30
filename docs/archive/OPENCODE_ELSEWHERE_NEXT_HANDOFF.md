# Elsewhere — Current State and Next OpenCode Package

**Prepared:** 2026-09-17
**Repository:** `/Users/umeshmc/Code/RadioPassport`
**Base:** `main` / `origin/main` at `e68d355`
**Production:** `https://elsewheremusic.com` returned HTTP 200 during this handoff. The branch is pushed; do not claim the deployed bundle is specifically `e68d355` until Vercel or the served bundle confirms it.

This is the authoritative continuation brief. The earlier local revamp handoff and design-study files are useful historical reference, but predate the Board Sheet and Theater companion work.

## What is already in the product

| Area | Status | Notes |
| --- | --- | --- |
| Core radio experience | Existing live product | Globe/land selection, station board, single global player, Atlas, Theater, Passport. Preserve playback while moving between surfaces. |
| Secret trail and room | Live | Device-local trail: `idle → hour → atlas → passport → room`. `/secret-room` is guarded and noindexed. It ends with the native-app interest question. |
| Support moment | Intentionally inactive | A positive answer says **Support opening soon**. There is no payment URL, checkout, key, account, or webhook. Radio remains free. |
| Secret-room illustration | Live assets | `public/secret-traveler.webp` and `public/secret-coffee-table.webp`. These are the only generated art from the revamp study that have been promoted to production assets. |
| Phone Board Sheet | Live | `BoardSheet.tsx` lets the station board ride as a sheet on phone, registered as `board-sheet` in `productFlow`. |
| Theater storytelling v1 | On `main` | Commit `e68d355`: place, coarse longitude-based hour, and catalog tags/language. It is catalog-backed—not generated narration—and has Unicode/tag hygiene tests. |

## What is *not* built

The generated screens in `docs/design/elsewhere-app-revamp-2026-09-15/` are **reference images only**. They do not represent an implemented app-wide redesign:

- `01-land.png`, catalog, Theater, Passport, and room screens are visual direction, not production UI.
- `traveler-transparent.png` is source/reference art; the shipped version is the WebP in `public/`.
- No full home, catalog, Theater, Passport, or mobile shell redesign has been implemented from those studies.
- No hosted contribution URL has been chosen or connected.
- No event/analytics measurement exists for trail starts, completion, or app-interest responses.
- Native iPhone WebKit has not been manually tested. Chromium phone-size checks are not iOS proof.
- The phrase “make Elsewhere an app?” measures emotional interest; it is not a native-app implementation plan.

Do not add invented city facts, current-event claims, artists, tracks, station imagery, or stock travel photos to make the reference screens look fuller. Use real catalog data, existing station artwork where available, and code-native visual motifs.

## Recommended next package — Passport emotional polish

Build the smallest meaningful visual follow-up: make the existing Passport feel like evidence of time spent elsewhere, rather than a generic collection grid. This is deliberately narrower than an app-wide revamp.

### Goal

Polish the existing `PassportOverlay` around the story **“you stayed long enough to leave a mark.”** Keep it recognizably Elsewhere: quiet, editorial, tactile, and useful on a phone.

### In scope

- Improve hierarchy and empty/one/many-stamp states in `PassportOverlay`.
- Make replay affordances obvious without adding a second audio engine or a new control surface.
- Use existing real stamp fields only: country, city, station, language, timestamp, and existing telemetry.
- Retain the six-slot passport rhythm, but make empty slots feel intentional rather than like a dashboard placeholder.
- Check the view at 375px-wide phone, a larger phone, and desktop.
- Preserve route/search-param behavior and the Secret Trail’s Passport step.

### Out of scope

- No redesign of the globe, search, Board Sheet, player dock, Atlas, or Theater.
- No authentication, cloud sync, social sharing, external data, generated prose, paid service, checkout, or support URL.
- No change to the secret-room copy/flow unless a regression requires a narrowly justified fix.
- No bulk addition of reference images to `public/`.

### Likely files

- `app/components/radio-passport/Overlays.tsx` — `PassportOverlay`
- `app/tailwind.css` — Passport-specific styling only; append application styles outside `@layer` where specificity/layer behavior requires it
- `tests/` — add or update focused Passport behavior tests only if behavior changes

Inspect before editing: `app/state/journeyStore.ts`, `app/routes/_index.tsx`, `app/components/radio-passport/productFlow.ts`, and `app/state/secretTrail.ts`.

### Non-negotiable architecture

- `PlayerDock` is the only writer to the Room; Theater reads it.
- Global audio is owned by the root bridge. Never create a second audio element/player.
- New interactive surfaces need a `SURFACE_CONNECTIONS` entry and contract coverage.
- Preserve the public `FTS.jpeg` fallback.
- Do not use `AbortController.abort()` for Remix fetch.
- Public copy should keep Elsewhere’s vocabulary: land, dusk, hour, stamp, live, cover, elsewhere, now. Avoid generic product language.

### Done when

1. Empty, one-stamp, and many-stamp Passport states look intentional at 375px and desktop.
2. Replaying a stamp preserves the one-player contract and returns the user to the expected land/station behavior.
3. The Secret Trail can still pass through Atlas → Passport → Room.
4. `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, and `git diff --check` pass.
5. The implementer supplies local screenshots and reports exact files changed plus any baseline failures.
6. No commit, push, or deploy is made unless separately asked.

## Subsequent queue (do not combine with the Passport package)

1. **Real-device acceptance:** manually check iPhone Safari with live radio, Board Sheet, Atlas, Theater, Passport, and the trail. Watch for fixed-band/viewport/audio issues.
2. **Home and Atlas visual cohesion:** translate only the reusable, code-native motifs from the design study into one small production surface at a time. Start with hierarchy, spacing, restraint, and motion—not new fictional imagery.
3. **Trail measurement, only after a privacy decision:** add aggregate, consent-appropriate events for trail start/completion and “make an app?” response. Define retention and consent before implementation.
4. **Hosted support URL swap:** once an owner provides a verified hosted contribution URL, replace the inactive support action with that URL and test the whole room flow. Do not build custom payment processing. A one-time hosted payment page is preferred.
5. **Native-app decision:** review real trail completion and affirmative-interest signals before writing native clients or a backend account system.

## Working-tree safety

The root contains unrelated untracked work: `.codex-worktrees/`, `.playwright-mcp/`, Graphify cache data, `output/`, scratch docs/scripts, and this documentation. Preserve all of it. Do not run `git add .`.

Use an isolated worktree/branch based on current `origin/main`. Do not modify the historical design-study assets while implementing the Passport package.

## Copy/paste OpenCode prompt

```text
ROLE: Implementer
GOAL: Polish Elsewhere’s existing Passport overlay so it feels like a quiet record of time spent in other places, without broadening into an app-wide redesign.
REPO: /Users/umeshmc/Code/RadioPassport
BASE: current origin/main (currently e68d355). Work in a new isolated worktree/branch; do not touch unrelated untracked files in the root checkout.

READ FIRST:
- AGENTS.md
- docs/SESSION_HANDOFF.md
- docs/ROADMAP.md
- docs/OPENCODE_ELSEWHERE_NEXT_HANDOFF.md
- app/components/radio-passport/Overlays.tsx
- app/state/journeyStore.ts
- app/routes/_index.tsx
- app/components/radio-passport/productFlow.ts
- app/state/secretTrail.ts

SCOPE:
- Improve PassportOverlay hierarchy and the empty, one-stamp, and many-stamp states.
- Keep stamp replay clear and preserve current behavior.
- Use only existing stamp data (country, city, station, language, timestamp, telemetry).
- Validate 375px phone, larger phone, and desktop. Provide screenshots.

HARD CONSTRAINTS:
- Do not change globe, search, Board Sheet, player dock, Atlas, Theater, Secret Room flow, payments, accounts, or analytics.
- No stock travel imagery, fabricated city/station/current-event/artist/track facts, generated prose, or paid APIs.
- PlayerDock remains the only Room writer; root owns the single audio bridge. Never add another player/audio element.
- If you add a new interactive surface, register it in SURFACE_CONNECTIONS and add contract coverage.
- Preserve the trail’s Atlas → Passport → Room sequence and public/FTS.jpeg.
- Never AbortController.abort() a Remix fetch.
- Do not commit, push, or deploy.
- Do not use git add .; preserve unrelated work.

DONE WHEN:
1. Empty, one, and many stamp states are visually intentional and usable on phone and desktop.
2. Stamp replay works and radio playback continuity is preserved.
3. Secret Trail still completes through Passport.
4. npm test, npm run typecheck, npm run lint, npm run build, and git diff --check pass, with pre-existing failures clearly separated.

OUTPUT FORMAT:
STATUS: done | partial | blocked
DELIVERABLE: short summary and screenshot paths
FILES TOUCHED: exact list
VALIDATION: exact commands and results
BLOCKERS/RISKS: explicit list, including any real-device gaps
NO COMMIT/PUSH/DEPLOY: confirm
```
