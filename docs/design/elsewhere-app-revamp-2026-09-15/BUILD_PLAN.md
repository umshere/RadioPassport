# Elsewhere — staged app-feel build

Status: local prototype, not shipped. Base: `44162ba` plus current checkout work. The existing mobile BoardSheet edits in `_index.tsx` and `tailwind.css` are another lane's work; preserve and review them before integration. Generated screens in this folder are art direction, not production assets or truthful station imagery.

Progress 2026-09-15: the local prototype now includes the Theater hour-mark trail, Atlas/Passport steps, a guarded noindex secret Room, device-local native-app interest response, and an optional two-chair coffee-table support motif after a positive answer. The Theater fallback and mobile arrival/passport treatments are present. `npm test` (356/356), `npm run typecheck`, `npm run build`, and `git diff --check` pass on the combined dirty checkout. Chrome/local browser was verified; real iPhone WebKit, production, and a payment destination are intentionally not verified or enabled.

## Visual thesis

An intimate night instrument, not an app-store template: one dark field, quiet editorial type, a small foil meridian, local-hour marks, and the lacquer player seal. The globe remains the artwork of arrival. Use the actual Elsewhere marks and station-supplied art where verified; no invented landmark imagery, mask, palm, house, account icon, or fictitious track metadata. Day mode uses the same hierarchy rather than a separate visual product. The traveler and coffee-table art are local-prototype concepts, included for review only and requiring explicit art approval before any release.

## Content plan

- Arrival: a human line about decision fatigue ("Some nights, choosing is too much.") followed by one surrender action, "Take me somewhere." Real land/station/hour appear only after landing.
- Atlas/catalog: live stations and an hour rail; selection remains optional. The mobile station board can rise as a sheet without covering the land by default.
- Theater: a cinematic companion to the tuned station. Lead with the actual place and local hour, then a short grounded fragment sourced from catalog/Room evidence. No invented events, artist claims, ICY titles, or mandatory generative request.
- Passport: stays recorded locally, with truthful station/place/time and a quiet "You stayed" moment. No account implied.
- Secret Room: a separate optional ending, never the public `/about` Room. A traveler shares "I didn't know where to go either" before asking whether the listener would like a native app. A two-chair coffee-table illustration follows a yes: one chair is occupied and one is held open. It represents "save the second chair" rather than a donation or checkout.

## Interaction thesis

The user's primary act is to let go, then optionally steer. Globe, station board, Atlas, Theater, and Passport must all preserve uninterrupted global playback. One persistent transport, one thumb-reachable navigation band; no duplicate player inside Theater. Meaningful motion is landing, sheet rise, and a small knowledge-sky response; reduced-motion has direct state changes. Mystery is a low-attention anomaly available by tap and keyboard, never a nag or overlay in the normal journey.

## Agent lanes and integration gates

| Stage | Exclusive work | Gate |
|---|---|---|
| 0. Baseline | Orchestrator: source/production comparison, 375x812 and desktop screenshots, current dirty-diff review | Current UI and playback states documented; no user work overwritten |
| 1. Arrival | Home shell and existing station BoardSheet lane; integrate only after its owner finishes | Landing above fold; sheet/keyboard/gesture and dock coexist; radio does not stop |
| 2. Story | Isolated Theater lane: `listen.tsx`, Theater-specific components/stylesheet or additive rules, pure fragment selector/tests | Place/hour true, evidence labels clear, fallback graceful, no AI/audio coupling |
| 3. Journey | Passport-specific lane and existing marks/typography, not fabricated art | Locally recorded stays survive navigation; no account or false imagery |
| 4. Trail | New removable state/component module and route hooks only after stages 1–3 stabilize | Three simple deterministic clues, touch/keyboard, no API calls per clue, never interrupts playback |
| 5. Ending | Separate Room module, optional app-interest response; support link only after explicit yes | No payment system or paywall; spoiler-free sharing tested outside listening UI |

Workers must use isolated worktrees or exclusive file sets. A worker handoff is not acceptance: inspect diff, run `npm test` and `npm run typecheck`, verify responsive UI and player continuity locally, then ask for visual/product review before any deploy. No worker may commit/push/ship production by default. Shared `_index.tsx`, `tailwind.css`, `PlayerDock.tsx`, and root audio bridge are orchestration-only integration points until the current station-sheet work is resolved.

## First prototype and success signal

Build the arrival/BoardSheet continuity and surface the existing Theater letter on the default phone folio first; the secret trail can then be a short local-state experiment. Read-only audit found the mobile stylesheet hides `.ew-letter-desk` and reveals `.ew-letter-phone` only when `.ew-theater-folio.is-star`, so the Room dispatch can be invisible on an ordinary silent landing without a plate. Fix the visible fallback from existing caption data before inventing a new story generator. Success is observed behavior, not a claim of virality: people can land and keep listening across routes, some voluntarily notice/follow the clue, and finishers willingly answer the app-interest question. Instrument only aggregate counts (`land`, `theater_open`, `trail_start`, `trail_finish`, `app_yes`) with consent/privacy review before enabling analytics. No contribution system in this prototype.

## Risks and decisions

- Existing concurrent Home/CSS edits may change the vertical budget and precedence; review the served bundle at phone sizes, not just source CSS.
- Global player continuity depends on `PlayerDock`/root boundaries; do not add a second audio element or change the Room writer.
- Theater dossier and AI caption may be absent or stale; catalog-derived lines must remain useful and accurately labeled.
- Native iOS WebKit remains unverified by desktop responsive emulation; check it before release.
- Approve the final traveler character and exact native-app/support wording separately. A lightweight interest response can be local-only initially; collection of contact information needs explicit consent and data handling.

Estimate: baseline/review 0.5–1 day, arrival/sheet integration 1–2 days, Theater fragment 1–2 days, Passport polish 1 day, trail/ending 2–3 days, cross-device QA 1–2 days. Roughly 6–11 focused days, contingent on live data and iOS testing; do not treat generated mockups as implementable screen specs.
