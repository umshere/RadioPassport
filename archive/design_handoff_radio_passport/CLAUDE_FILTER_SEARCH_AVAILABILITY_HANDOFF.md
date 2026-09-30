# Claude handoff: discovery filters, search clarity, and station availability

## Starting point

- Work from commit `f810bcd` / branch `codex/radio-passport-phase-two`.
- The public reference deployment is `https://radio-passport-heuristics-ai.vercel.app/`.
- Preserve the completed Signal & Stamp redesign and rich station-insights work.
- Do not overwrite the unrelated dirty working tree at `/Users/umeshmc/Code/RadioPassport`.
- Do not push, deploy, merge, or change production configuration without explicit authorization.

## User-reported problem

The discovery controls do not communicate a clear state model:

1. After selecting a mood such as Dance, the user cannot discover how to return to all moods.
2. After selecting a place such as Tamil Nadu, the user cannot discover how to return to all places.
3. Clicking an already-selected chip technically toggles it off, but there is no visible reset affordance or explanation.
4. Switching between MOOD and PLACE preserves the previous value invisibly, making the state feel locked or unpredictable.
5. The MOOD view still ends with `All places ->`; it should expose an `All moods` reset/action appropriate to the active dimension.
6. A previous mood/place selection constrains later text searches. Searching for a term such as `trans` can return nothing with no indication that Dance or a place is still restricting the result set.
7. Empty results do not explain which constraints caused the empty state or offer one-click recovery.
8. `?q=malayalam` deep links are ignored by the phase-two page on initial load.
9. `trans` is plausibly an attempted search for `trance`; the search experience provides no fuzzy recovery or suggestion.

## Current implementation evidence

In `app/routes/_index.tsx`:

- Mood chips use `setMood(value => value === item ? null : item)`.
- Place chips use the equivalent toggle through `selectPlace`.
- Those hidden toggle semantics are not represented by an `All moods`, `All places`, active-filter summary, or clear button.
- `mode` determines which stored filter participates in `filtered`, so values survive tab changes but disappear from view.
- Text query matching is ANDed with the active mood/place predicate.
- The final chip always opens `All places`, even in MOOD mode.
- `query` initializes to an empty string instead of reading the URL.

## Required interaction contract

Implement one obvious, consistent model. Recommended contract:

1. MOOD and PLACE are mutually exclusive browsing dimensions.
2. The MOOD row begins with an explicit `All moods` chip. It is selected when no mood is active.
3. The PLACE row begins with an explicit `All places` chip. It is selected when no place is active. A separate `Browse atlas ->` action may open the atlas.
4. Selecting the other mode clears the previous dimension so no hidden filter remains.
5. Free-text search is global and takes precedence over browsing filters. When a non-empty query is entered, clear mood/place constraints, or visibly suspend them and provide a removable filter bar. Prefer clearing for the simplest mental model.
6. Provide a visible `Clear search` affordance whenever query text exists.
7. Empty results must name the active constraint and offer useful actions: `Clear search`, `Show all moods`, or `Show all places` as applicable.
8. Read `q` from the URL on initial load and keep the URL synchronized in a lightweight way without causing navigation churn.
9. Add modest typo/prefix recovery for common music vocabulary. At minimum, `trans` should suggest or match `trance`; do not introduce broad fuzzy matching that floods results with irrelevant stations.
10. Show active state accessibly with `aria-pressed` or equivalent semantics, visible selection styling, 44px mobile targets, keyboard access, and reduced-motion compatibility.

## Station availability and result-quality audit

The original and phase-two sites currently use the same leading Malayalam order, but neither presents trustworthy availability:

- Original site marks all nine visible Malayalam stations as `Stream check failed`, including several that really play.
- Phase two marks stations `Healthy stream` using Radio-Browser checks dated January 15, 2026, approximately seven months stale at audit time.
- Live Chromium playback sample on August 11, 2026:

| Requested station | Actual result |
| --- | --- |
| AIR Malayalam | Failed and auto-skipped to 986malayalamradio |
| 986malayalamradio | Played |
| airmalayalam | Failed and auto-skipped to KJ Yesudas Malayalam radio |
| KJ Yesudas Malayalam radio | Played |
| Radio Suno Malayalam 91.7 | Played |
| London Malayalam Radio | Failed and skipped forward |
| Radio Beat Malayalam | HTTP stream; unusable from the HTTPS application |
| malayalammusic | Played |

Additional evidence:

- The live catalog endpoint returns 8,064 station objects for `q=malayalam`, because query results are merged with the full 8,000-station snapshot before the browser filters them.
- `server/stations/probe.ts` exists but is not wired into the phase-two search path.
- Result details currently interpret stale `lastCheckOk` as healthy.
- Auto-skip recovery works, but a requested station can silently become a different station in the dock.
- Production console emitted React hydration errors `#418` and `#423` during the audit.

## Availability/result-quality requirements

1. Do not call a station `Healthy` solely from stale catalog metadata.
2. Represent evidence age honestly: for example `Not recently verified` when the latest check exceeds an explicit freshness window.
3. Exclude known browser-incompatible streams from the leading playable list, especially HTTP mixed-content streams on HTTPS. Handle HLS according to actual player capability.
4. Prefer recently verified/playable stations in ranking; do not claim verification that did not occur.
5. Live-probe only a bounded leading shelf, with concurrency limits, short timeouts, caching, and SSR/Vercel safety. Reuse `server/stations/probe.ts` if it is suitable, but verify its HEAD/Range strategy against streaming endpoints.
6. When playback recovery changes stations, keep the warning visible long enough and clearly state both the failed requested station and the replacement station.
7. Reduce the query payload so search does not send the full 8,000-station snapshot when a focused query already returned candidates.
8. Investigate and eliminate the production hydration errors rather than suppressing console output.

## Acceptance scenarios

1. Select Dance, then choose `All moods`: results immediately return to the unfiltered shelf.
2. Select Tamil Nadu, then choose `All places`: the place constraint visibly clears.
3. Select Dance, switch to PLACE: Dance is cleared and no hidden mood affects results.
4. Select a place, type `malayalam`: global Malayalam results appear without the old place silently restricting them.
5. Load `/?q=malayalam`: the search box and results hydrate with Malayalam from the first usable render.
6. Search `trans`: show useful trance results or a clear `Did you mean trance?` recovery.
7. Produce zero results: the empty state names the constraint and provides a one-click reset.
8. A station with a seven-month-old positive check is not labeled healthy.
9. A failed station that auto-skips clearly tells the user which replacement is now playing.
10. Verify representative desktop and 390x844 mobile flows in a real browser.

## Verification

- Add focused unit tests for state transitions, URL-query hydration, empty-state actions, stale-health labeling, and ranking/filtering.
- Run typecheck, focused tests, full tests, and production build.
- The historical baseline before this handoff was 48/50 tests, with two provider-order failures in `tests/unit/fallbackLogic.test.ts` and `tests/unit/providers.test.ts`; do not create additional failures and re-check whether that baseline still applies.
- Browser-test the acceptance scenarios against the built implementation.
- Report files changed, tests/results, remaining risks, and the exact branch/worktree. Do not push or deploy.
