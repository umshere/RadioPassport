# Elsewhere local prototype — exact handoff and release roadmap

Status: **local only; do not ship this checkout as-is.** `HEAD` is aligned with `origin/main` as of 2026-09-15, but the shared working tree contains another agent's unfinished BoardSheet work and graph-cache noise. A selective integration branch is required before committing or pushing.

## What is already real in the local prototype

| Surface | State | Files |
|---|---|---|
| Home arrival | Mobile story line, compact globe budget, icons in the phone band | `app/routes/_index.tsx`, `app/components/BandNav.tsx`, `app/tailwind.css` |
| Player truth | Local time derives from actual station longitude, not a cached caption | `app/components/PlayerDock.tsx`, `app/utils/placeDispatch.ts` |
| Theater | Grounded local-hour fallback and a small, optional red hour mark | `app/routes/listen.tsx`, `app/components/radio-passport/SecretTrail.tsx`, `app/components/radio-passport/TheaterAmbientLine.tsx` |
| Trail | Deterministic, device-local Theater → hour → Atlas → Passport → Room sequence | `app/state/secretTrail.ts`, `app/components/radio-passport/TrailWhisper.tsx` |
| Passport | Quiet local-record treatment, one blank next-place page | `app/components/radio-passport/Overlays.tsx` |
| Secret Room | Guarded `noindex` route, app-interest answer stored only locally, no checkout | `app/routes/secret-room.tsx` |

Verified locally: `npm test` (356 passing), `npm run typecheck`, `npm run build`, `git diff --check`, and Chrome route walkthrough. Not verified: real iPhone WebKit, a deployed build, payment checkout, or any analytics.

## Image truth

### Ready for local prototype use

| Asset | Purpose | Status |
|---|---|---|
| `public/secret-traveler.webp` | Secret Room traveler | Generated concept; needs art approval before release |
| `public/secret-coffee-table.webp` | Optional “save the second chair” support moment | Generated concept; needs art approval before release |

### Not images to generate

Do not generate fake city landmarks, station studios, artists, track covers, or "what is happening now" scenes. Those imply factual provenance that Elsewhere does not have. The product should continue to use verified station artwork/favicons when supplied, real globe/constellation data, and code-native hour/meridian/foil motifs.

### Design references, not web assets

The current direction renders are in this folder: `01-land.png`, `02-catalog-refined.png`, `03-theater.png`, `04-passport-refined.png`, and `05-secret-room.png`. They are review material, not screens to copy literally or source data.

## Support option: recommended first release

**Recommendation: Buy Me a Coffee hosted page, one-time support only.**

Why it fits: the Room can send a finisher to a hosted page after their explicit yes. Elsewhere keeps no card data, no checkout code, no supporter account, no forced subscription, and no radio feature is gated.

Current published US cost: Buy Me a Coffee charges **5% platform fee** plus Stripe processing (listed as **2.9% + 30¢** per successful transaction), plus a **0.5% payout-processing fee**; international card and subscription fees can add more. There is no monthly BMC fee. Source: [Buy Me a Coffee fee guide](https://help.buymeacoffee.com/en/articles/8105744-how-to-calculate-charges-on-your-payment).

At a $5 contribution, the displayed base fees are approximately $0.70 before any international fee: creator net about $4.30. At $10, base fees are about $1.05: net about $8.95. These are illustrative US-card figures, not a quote.

### Setup required from the owner

1. Create the Elsewhere Buy Me a Coffee creator account.
2. Complete its Stripe payout onboarding with the legal entity/bank details that should receive funds.
3. Choose a one-time support amount such as $5; do not enable memberships for the first experiment.
4. Set the page copy to the product promise: helping make the native app; radio remains free.
5. Give the final public URL to the implementer.
6. Add that URL only after a positive Room answer, with an external-link notice.

No API key, webhook, database, or payment code is required for this first version.

### Alternatives

| Option | Best when | Cost / tradeoff |
|---|---|---|
| **Buy Me a Coffee** | Fastest, most legible coffee metaphor | 5% platform fee plus Stripe processing/payout fees; best initial fit |
| **Ko-fi** | You want a more configurable profile or later memberships/shop | Free creator mode has up to 5% service fee; Ko-fi Gold is $12/month for 0% service fees, while payment-processor fees still apply. [Ko-fi details](https://help.ko-fi.com/hc/en-us/articles/360005506873-What-is-Ko-fi-Gold) |
| **Stripe Payment Link** | You want maximum brand control and already operate a Stripe business account | No monthly fee; standard domestic card fee listed as 2.9% + 30¢, but you own receipts, support, tax decisions, policy links, and customer data handling. [Stripe pricing](https://stripe.com/pricing) |

Do **not** start with Stripe for this experiment. It creates more operational and compliance work without validating whether the Room makes people care.

## Roadmap: the smallest safe path to live

### Phase 0 — Separate and accept the code (required before push)

- Create a clean worktree/branch from current `origin/main`.
- Port only the verified trail, Theater, Passport, time-truth, secret Room, two image assets, tests, and this documentation.
- Exclude `.playwright-mcp/`, `graphify-out/cache/`, output images, review scratch files, and unfinished BoardSheet code unless separately accepted.
- Review the exact diff; rerun tests, typecheck, build, desktop Chrome, 375px Chrome, and real iPhone Safari.

**Gate:** a single-purpose commit/PR with no unrelated files.

### Phase 1 — Art approval and hosted support page

- Approve or replace the traveler and coffee-table concepts.
- Set up the hosted Buy Me a Coffee page and provide its final URL.
- Add a URL configuration value rather than hardcoding it.
- Keep it hidden until the Room's explicit yes answer.

**Gate:** test payment page in a browser using a non-financial preview only; no actual charge required for UI verification.

### Phase 2 — Visual completion, page by page

1. Home: preserve globe as the primary visual; finish the station sheet’s mobile composition.
2. Atlas: reduce directory feel through hierarchy, region rhythm, language/station facts, and no fictional location art.
3. Theater: complete the evidence-first “place/hour/fragment” companion treatment.
4. Passport: test empty, one stamp, many stamps, and favorites with real data.
5. Room: test all trail branches, direct-link guard, no-motion mode, keyboard focus, and image loading.

**Gate:** final approved screenshots at 375×812, 393×852, 768×1024, and 1440×900.

### Phase 3 — Release

- Commit the reviewed branch, push it, open/merge the PR only after visual acceptance.
- Run `npm run ship` only after the verified merge and explicit production authorization.
- Verify `elsewheremusic.com` returns the deployed bundle, old domain redirect stays intact, player continuity works, and the Room never gates playback.

## Exact implementation handoff

```text
GOAL: Integrate the reviewed Elsewhere secret-trail prototype as a small removable experiment.

WORKTREE: Create a fresh branch/worktree from origin/main. Do not reuse the dirty shared checkout.

INCLUDE ONLY:
- app/state/secretTrail.ts
- app/components/radio-passport/SecretTrail.tsx
- app/components/radio-passport/TrailWhisper.tsx
- app/components/radio-passport/TheaterAmbientLine.tsx
- app/routes/secret-room.tsx
- public/secret-traveler.webp
- public/secret-coffee-table.webp
- related, reviewed hunks in _index.tsx, listen.tsx, PlayerDock.tsx, Overlays.tsx, theaterLock.ts, placeDispatch.ts, BandNav.tsx, tailwind.css
- related unit tests and this design folder

EXCLUDE:
- graphify-out/cache/**
- .playwright-mcp/**
- output/**
- REVIEW_TASK.md
- implementation_plan.md
- BoardSheet.tsx and its test until its separate owner accepts it

NON-NEGOTIABLES:
- Never charge to hear radio.
- No AI/audio-path changes; no invented ICY titles.
- Preserve PlayerDock as the only Room writer.
- Keep support link absent until the user explicitly answers yes in the Secret Room.
- Store trail/app-interest state only locally unless a separate analytics/privacy decision is approved.
- No deployment without an explicit final go-ahead.

VALIDATE:
- npm test
- npm run typecheck
- npm run build
- git diff --check
- 375px and 1440px local screenshot/walkthrough
- real iPhone Safari check before release
```
