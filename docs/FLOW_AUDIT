# Flow audit — Pass 3, Phase A (2026-08-22)

Every entry in `SURFACE_CONNECTIONS` (`app/components/radio-passport/productFlow.ts`) walked against its
contract row (`step`, `action`, `keepsPlayback`) on desktop (900×600 headless Chromium against a dev server,
radio streams mocked with generated silence so playback state is deterministic) **and** re-run at phone width
(390×844, iPhone 13 emulation). Walk resumed from this session's partial start and completed 2026-08-22.

Legend: ✅ verified · ⚠️ verified-with-caveat / code-verified only · ❌ broken · 📱 needs a human pass

## Ledger

| id                | surface  | step    | action         | keepsPlayback | status | notes |
| ----------------- | -------- | ------- | -------------- | ------------- | ------ | ----- |
| wordmark          | header   | land    | home           | true          | ✅     | stays on `/`, audio undisturbed |
| issue             | header   | next    | issue          | true          | ✅     | Room → /about, playback continues |
| passport          | header   | stamp   | passport       | true          | ✅     | overlay on `/`, playing throughout |
| intent            | header   | intent  | intent-catalog | true          | ✅     | "25 LIVE · LISBON" while playing |
| voice             | header   | intent  | voice          | true          | ⚠️📱   | button present/enabled; real mic needs human pass |
| surprise          | header   | intent  | surprise       | true          | ⚠️     | see F5 — silent hang, no tune, no error surface in 50s |
| land-here         | cover    | land    | land           | false         | ✅     | starts playback from idle |
| continue          | cover    | land    | continue       | false         | ✅     | pause → reload → "EW · Re-entry" resumes |
| solar-hour        | cover    | tune    | solar-hour     | true          | ✅     | dawn 109 / midday 27 / night 46 live; dusk band empty at test time (data, not bug — Clear-dusk escape works) |
| atmosphere        | cover    | inhabit | atmosphere     | true          | ✅     | day/night toggles both ways, playing |
| atlas             | cover    | tune    | atlas          | true          | ✅     | 241 countries |
| same-hour         | cover    | tune    | same-hour      | false         | ✅     | pill plays immediately; gated on `!isSeeking` by design (see F4) |
| station-row       | cover    | tune    | play-station   | false         | ✅     | src change confirmed |
| station-heart     | cover    | stamp   | favorite       | true          | ✅     | heart on, playback stays |
| globe-dot         | globe    | land    | play-station   | false         | ⚠️📱   | canvas hit-testing not scriptable here; `onSelect → playPlace` wiring code-verified |
| atlas-country     | atlas    | tune    | country        | true          | ✅     | drill-down into country sheet |
| atlas-close       | atlas    | next    | close-overlay  | true          | ✅     | × closes, playing |
| country-back      | country  | tune    | atlas          | true          | ✅     | ← Atlas returns to grid |
| country-play      | country  | tune    | play-station   | false         | ✅     | leaves leftover search/hour/place per known contract note |
| country-retry     | country  | tune    | retry-catalog  | true          | ⚠️     | error branch renders role=alert + retry; triggering needs upstream failure |
| passport-stamp    | passport | next    | replay-stamp   | false         | ✅     | replay resolved by id (same station → same src, playing continued) |
| passport-empty    | passport | land    | find-city      | true          | ⚠️📱   | closes book + opens atlas per `findCityFromPassport`; needs empty-passport human pass |
| passport-favorite | passport | tune    | play-station   | false         | ✅     | kept-signal row plays |
| dock-art          | dock     | inhabit | theater        | true           | ✅     | art → /listen → back, playing |
| dock-theater      | dock     | inhabit | theater        | true          | ✅     | Theater link |
| dock-stamp        | dock     | stamp   | passport       | true          | ✅     | ring opens passport |
| dock-heart        | dock     | stamp   | favorite       | true          | ✅     | |
| dock-play         | dock     | inhabit | toggle-play    | true          | ✅     | pause→play round trip |
| dock-prev         | dock     | next    | prev-station   | false         | ✅     | wrapped queue, src change |
| dock-next         | dock     | next    | next-station   | false         | ✅     | wrapped queue, src change |
| theater-back      | theater  | next    | home           | true          | ✅     | ← Elsewhere link, keeps playback |
| theater-empty     | theater  | land    | home           | true          | ✅     | "Land somewhere first." departure link → home |
| about-land        | about    | land    | home           | true          | ✅     | |
| retry-mix         | error    | intent  | retry-mix      | true          | ⚠️     | alert branch code-verified; not naturally triggered (surprise hung instead of erroring — F5) |

33/34 rows exercised or code-traced; zero contract violations found. The two rows still wanting human eyes:
`globe-dot` (canvas) and `passport-empty` (needs an empty passport state).

## Phone pass (390×844, iPhone 13 emulation)

No horizontal overflow on home, atlas overlay, or theater. Dock fits above the fold with all controls visible.
Land/intent/atlas/theater flows all work at phone width.

- F3 (touch targets): the dock **stamp ring measures 16×16px** on phone (`button.ew-stamp-ring`) — below even
  the WCAG 2.5.8 24px floor, far below the 44px HIG target. The dock Theater eyebrow link is 42×11px.
  Everything else in the dock is ≥40px.

## Findings

- F1 (same-hour pill copy): pills can render a country name ("The United States Of America") instead of a city —
  verbose, reads wrong for a "same-hour city" affordance. Candidate fix: prefer city label; fall back to country
  short name.
- F2 (atmosphere pin placement): the Day/Night pin sits alone in its own strip between the site bar and the
  intent row on desktop — orphaned visually. Candidate fix: fold into the header rail beside ROOM/Passport or
  inline with the horizon.
- F3 (search fragility lies "no signal"): when the catalog snapshot must rebuild, the heavy upstream query
  (limit=8000, ~10MB) measured **16.8s** against `de1.api.radio-browser.info`, but `rbFetchJson` aborts each
  mirror attempt at 5s (`DEFAULT_TIMEOUT_MS`) — so `/api/radio-catalog?stations=8000&q=…` returns 500, the client
  `catch` swallows it into `setCatalog([])`, and the cover shows **"No live signal for X"** for a query that has
  25 live results. No retry affordance on this path (unlike country drilldown). Also: a failed snapshot promise
  is negative-cached for the full 5-min TTL. Candidate fix: raise/stream the snapshot timeout, distinguish
  error from empty in the seeking status, add a retry chip.
- F4 (no way to clear a successful search): once a typed search returns results there is no clear affordance —
  IntentBar has no ✕/Escape handling, `submitIntent("")` early-returns, and the "Clear search" chip exists only
  in the *zero-result* empty state. While any result-bearing query sits in the field, `isSeeking` stays true, so
  the same-hour pills are unreachable and the paused cover stays in seeking mode. Candidate fix: clear control
  in the intent row whenever `value.trim()` is non-empty.
- F5 (surprise can hang silently): clicking Surprise produced no tune, no mix label, and no error surface for
  50s+ (observed twice: browser walk and direct route probe — `/api/ai/recommend` unanswered at 40s). Root shape:
  the gateway's 12s `Promise.race` bounds the LLM call, but the recommend action also does sequential
  RadioBrowser pool fetches (`fetchIntentStations`/`fetchStationPool`), each able to burn 9 mirrors × 5s when
  mirrors are slow — unbounded total latency, and the only progress signal is the button label flipping to
  "Tuning". Fold the interpret-race leftover (handoff) plus a whole-route deadline into item 5's fix batch.

## Fix PRs

- Fixes batched after review of this audit — see the Pass 3 addendum below.

---

# Pass 3 addendum (2026-08-23)

Re-walk after PR #17 merged and the OG/legacy batch shipped
(`2ec5902`..`e7e1fb3`). Method this time: handler-level code trace of all 34
rows against the mounted tree (file:line cited per row), desktop + compact-dock
layouts considered, playback-safety rule checked per row. Phase A's browser
walk stands for interaction-level evidence; where the two passes disagree,
this addendum wins on current code.

## Ledger corrections

- **about-land was NOT ✅.** `/about` rendered no land control at all — the
  only exits were browser back and the global wordmark. Phase A's ✅ was an
  over-read. Fixed in `e7e1fb3`: quiet text-button "Land somewhere →" at the
  end of the colophon (SPA link, root audio bridge keeps playing) plus og
  meta for `/about`.
- All other rows re-verified wired with unchanged behavior; full table with
  per-row citations lives in session history — highlights re-checked after
  recent merges: dock-stamp (PlayerDock.tsx:187), theater-empty
  (listen.tsx:171), retry-mix (_index.tsx:742), passport rows
  (Overlays.tsx:501/_index.tsx:883).

## Disposition of Phase A findings

- **F1 same-hour pill copy — FIXED.** Pills are a city affordance; stations
  without a city were rendering country names ("The United States Of
  America"). The same-hour memo now requires a non-empty `station.city`
  before a station can appear as a pill (`_index.tsx`, flow-audit F1 note).
- **F4 no way to clear a successful search — FIXED.** IntentBar grows a
  clear control (`rp-intent-clear`) whenever the field holds text; it calls
  `onChange("")`, matching the zero-result chip's semantics (query only;
  hour/place untouched). Styles appended outside any `@layer` at the end of
  `app/tailwind.css` per the layer-drop gremlin.
- **F5 surprise can hang silently — OPEN, next batch.** Root shape confirmed
  still present: gateway's 12s `Promise.race` bounds only the LLM call; the
  sequential RadioBrowser pool fetches stay unbounded. Needs the whole-route
  deadline treatment from the original recommendation — route-level work,
  not a spot fix.
- **F3 snapshot timeout false "no live signal" — OPEN, next batch.** Raising
  `DEFAULT_TIMEOUT_MS` globally would slow every mirror probe; correct fix is
  a per-call timeout override for the heavy `stations=8000` snapshot request
  plus distinguishing error-from-empty in the seeking status. Contained but
  touches catalog plumbing — deliberately kept out of this pass.
- **F2 atmosphere pin placement — OPEN, taste call.** Needs Ums's eye before
  moving a pinned element; candidate placements unchanged.
- **F3-phone stamp ring 16×16px touch target — OPEN, small.** One CSS block
  at the phone breakpoint; pair it with the next visual pass so the ring's
  tap growth is judged alongside other dock spacing, not alone.

## Registry hygiene (new observations)

- `SURFACE_CONNECTIONS` has zero runtime consumers — contract-by-tests only.
  Keep adding the row before the control.
- Close-affordance asymmetry: atlas declares `atlas-close`, but the country
  and passport overlays ship working close buttons with no declared row
  (`country-close`, `passport-close`). Undeclared live controls also exist
  (atlas query field, cover empty-state quick actions). Add these rows at the
  next contract-test touch.
- Recon for that touch (2026-08-24): all overlay closes share one shell —
  `Overlay` (Overlays.tsx:18) renders the single `.rp-close` button at
  Overlays.tsx:94–101 with `aria-label="Close ${label}"`. Callers:
  Atlas `label="Atlas"` (:146 — declared), Country ``label={`${country}
  stations`}`` (:300 — undeclared → `country-close`), Passport
  `label="Your Passport"` (:417 — undeclared → `passport-close`). Atlas query
  field is the controlled input inside `AtlasOverlay` (:107+); cover
  empty-state quick actions render via `CoverEmptyState.actions`
  (productFlow.ts:421+).

## State

Fixed this pass: F1, F4, about-land. Open with approach agreed: F5, F3,
F3-phone. Open pending taste: F2. Gate at time of writing: tests/typecheck/
eslint green (run log in session history).

---

# Pass 4 addendum (2026-08-24)

The open trio shipped via parallel agent dispatch: native subagents, one per
finding, each in an isolated git worktree with an exclusive file boundary;
orchestrator verified scope up front, reviewed every diff line-by-line, and
re-ran the full gate on main after each cherry-pick.

- **F3-phone stamp ring 16×16px — FIXED** (`5c1162f`). Inside the shipping
  960px media query the painted ring grows 16→24px and an invisible `::after`
  halo (`inset: -8px`) lifts the button's tap target to 40×40; the halo's
  reach ends where the dock's 8px gaps end, so heart/theater stay clear.
  Desktop pixel-identical. CSS-only, no markup hook needed.
- **F5 surprise silent hang — FIXED** (`8b131bd`).
  `withRouteDeadline()` races the whole recommendation pipeline (LLM call +
  the previously unbounded sequential RadioBrowser pool fetches) against
  `RECOMMEND_ROUTE_DEADLINE_MS = 15_000` in both loader and action. On
  deadline: warn once, answer with the file's existing curated mock scene so
  Surprise always lands somewhere. Losing work is never aborted (hard rule
  honored); the timer is cleared when real work finishes first. Tests cover
  fast-path-unchanged and hung-pool-still-answers within the deadline.
- **F3 snapshot false "no live signal" — FIXED** (`0925735`). The heavy
  stations=8000 search gets a per-call `{ softFail: true, timeoutMs: 30000 }`
  (measured 16.8s upstream vs the 5s default that killed every mirror);
  countries/languages/tags keep the global default. A null from softFail is
  re-raised as a rejection so total mirror failure reads as outage, not
  empty. Rejected snapshot builds clear the cache slot (identity-guarded so
  a newer snapshot can't be nuked by an older failure). The route answers
  `503 { error: "snapshot-unavailable", … }` instead of an unhandled 500;
  the client keeps `catalogError` separate from empty results and feeds it
  to `seekingStatus`/`seekingBoardLabel` (tone "unreachable", label "Signal
  lost", board `SIGNAL LOST · NAME`), and the cover empty state gains a
  "Try again" chip riding the existing `retry-catalog` action vocabulary via
  a nonce refetch.

Registry hygiene recon for the next contract-test touch lives in the Pass 3
section above (Overlays.tsx:18/:94–101/:300/:417 citations).

F2 remains open pending Ums's eye — taste call, candidate placements
unchanged.

Gate at close of Pass 4: **194 tests / 23 files green, typecheck clean,
eslint clean** (main @ `0925735`).
