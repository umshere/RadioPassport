# Testing Guide

Elsewhere is one loop: **land → intent → tune → inhabit → stamp → next**.  
A control that does not take the listener to the next step is a dead icon.

Contract: `app/components/radio-passport/productFlow.ts`  
Tests: `tests/unit/elsewhereFlow.test.ts` plus the existing Elsewhere / journey suites.

```bash
npm test
npm run typecheck
```

## Product loop

| Step | What must happen |
|---|---|
| Land | Globe is live. **Land here** / **Continue** starts audio. Hover freezes spin; click plays, then eases to face. |
| Intent | Type, speak, or Surprise. Short query = catalog. Sentence = interpret, maybe a mix. Playback does not stop. A language search must still light the globe (country center if the row has no geo). |
| Tune | Solar hour, same-hour cities, Atlas → country, station row. Filters never call `stop()`. |
| Inhabit | Dock appears. Artwork / **Theater** opens `/listen`. Local clock + honest ICY. |
| Stamp | 60 continuous seconds inks the city. Heart keeps a signal. Stamp ring / Passport / INKED toast open the book. |
| Next | Prev/next, stamp replay (id → city → that country), empty states offer a button. |

## Empty / error (must have a step)

| State | Next step |
|---|---|
| Empty search | Surprise, Atlas, Clear search |
| Quiet solar hour | Clear hour, Atlas, Surprise |
| Filtered city with no rows | Show every city, Atlas |
| Empty atlas search | Clear search |
| Empty passport | Ghost slots + **Find a city** |
| Dead stamp replay | Open that country, or Atlas |
| Failed mix | **Try the mix again** |
| Failed country catalog | **Retry live catalog** |
| `/listen` with no station | Back to Elsewhere |
| 404 / error | Back |

## Connections to click

- Header: wordmark → `/`, Room → `/about`, Passport → book, intent, mic (hidden if unsupported), Surprise
- Cover: Land here, hour chips, Atlas, same-hour cities, station play + heart
- Globe: hover tip, click lands
- Dock: art → theater, stamp ring → book, heart, prev / play / next, Theater
- Overlays: Escape / × close, country ← Atlas, stamp tap retunes
- Theater: ← Elsewhere, prev / play / next

Search, chips, and overlays never call `stop()`.

## What not to treat as a feature

Unmounted leftovers (`AppHeader`, `Premium*`, `RetroTuner`, Tuning overlay) are not in this loop. Do not add tests that require them.
