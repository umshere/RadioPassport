# Atlas handoff — the navigable music atlas (slice 1)

Status: **superseded** by `docs/PRODUCT_CORRECTION_THEATER_GRAPH.md`. The `/atlas` destination is gone; `/api/atlas/expand` remains as the Theater's internal catalog expansion API. Layout/canvas/page were donor code and have been removed.
stays untouched — Atlas is a new surface that reads the catalog and never
writes the Room.

## Product shape

The Theater is the intimate room for the station on the air. The Atlas is the
world of doors around it: country → languages → stations, then (later slices)
track/artist/album branches for the tuned station. Any node can become the
centre. Language is the strongest bridge across borders.

Slice 1 ships, in this order of importance:

1. `/atlas` route: current country centred (flag medallion + name).
2. Language clusters around it (typographic nodes: "HINDI", "SPANISH").
3. Real stations orbiting their language (favicon or monogram).
4. Click to focus/recenter. Side panel shows what is known.
5. Station panel carries an explicit **Tune here** button — the only audio
   action anywhere in the Atlas. Informational clicks never change playback.
6. Breadcrumb trail (`India → Hindi → Mirchi Top 20`) with back.
7. Keyboard/screen-reader list parity: the canvas is never the only
   navigation.
8. The tuned station's track constellation remains the Theater's job; the
   panel links there instead of duplicating it.

## Hard rules (house rules apply unchanged)

- No new dependencies. No force simulation, no WebGL, no graph library.
- Banned copy never appears: discover · seamless · AI-powered · widget ·
  playlist · unlock · explore. ("Take me somewhere connected" is fine.)
- Atlas never writes the Room. Playback goes through `startStation` from
  `app/state/playerStore.ts` only; `PlayerDock`/`useRoom` react as always.
- No AI anywhere in slice 1. Deterministic catalog only.
- Never `AbortController.abort()` a Remix fetch (use `Promise.race`).
- Server caps are law: the client never decides how many nodes exist.

## Data layer

`app/services/atlas/atlasGraph.server.ts` + `app/routes/api.atlas.expand.ts`.

- Derives everything from `fetchRadioBrowserCatalogSnapshot()` (the shared
  5-minute, mirror-fallback snapshot of ~8000 stations + countries +
  languages). **Zero new upstream calls.**
- `kind=country&id=IN` → country centre + language clusters + edges
  (`broadcasts in`), busiest stations per language.
- `kind=language&id=hindi` → language centre + country clusters + the busiest
  stations per country.
- `kind=station&id=<uuid>` → station centre + its country + language + tag
  neighbours.
- Node cap: `ATLAS_MAX_NODES = 60` per view, enforced server-side; languages/
  countries first, then busiest stations per cluster. `totalMembers` carries
  the honest uncapped count.
- Response shape: `AtlasView` from `app/types/atlas.ts`. Errors are honest
  503s with `error: "snapshot-unavailable"` — never an empty lie.

## Visual language

- Country: small flag medallion (ISO emoji fallback) + name.
- Language: strong typographic node — small caps, foil.
- Station: sanitized favicon or a restrained monogram disc.
- Places/years/genres (later slices): smaller foil/ether stars.
- Focused node + immediate neighbours carry imagery; distant nodes stay
  stars. Calm hierarchy.

## Layout contract

`app/components/radio-passport/atlas/atlasLayout.ts` — pure functions, fully
deterministic, unit-tested (same discipline as `theaterLock`):

```ts
export function atlasLayout(view: AtlasView, seed: number): AtlasLayout
```

- Centre node at (0.5, 0.5). Cluster heads on an inner ring (r ≈ 0.30),
  members orbit their head (r ≈ 0.30–0.46) on a golden-angle fan, seeded
  jitter keyed `lockSeed([seed, node.id])` so growth reshuffles nothing.
- y × 0.62 (same sky flattening as the Theater). Values inside 0.06–0.94.

## Interaction

- Single click / tap: focus + recenter (focus stack, breadcrumbs).
- Station focus: panel with name, country, language, bitrate, favicon,
  **Tune here**, and — when it is the station already playing — a link to
  `/listen`.
- Back: breadcrumb click pops the stack. Zoom-out gesture is a later slice.
- Keyboard/mobile: a real `<ul>` of the visible nodes beside/below the canvas
  with the same actions; `aria-current="true"` marks the centre.

## File ownership (agent boundaries — do not cross)

| Owner | Files |
|---|---|
| orchestrator | `app/types/atlas.ts`, `app/types/trivia.ts`, `theaterLock.ts` sector map, this doc |
| data agent | `app/services/atlas/atlasGraph.server.ts`, `app/routes/api.atlas.expand.ts`, `tests/unit/atlasExpand.test.ts` |
| layout agent | `app/components/radio-passport/atlas/atlasLayout.ts`, `tests/unit/atlasLayout.test.ts` |
| canvas agent | `app/components/radio-passport/atlas/AtlasSky.tsx` |
| route agent | `app/routes/atlas.tsx`, `app/components/radio-passport/atlas/AtlasPanel.tsx`, `tests/unit/atlasRoute.test.ts` |

## Tests

Vitest, same patterns as `tests/unit/theaterLock.test.ts` (pure functions,
deterministic assertions) and `tests/unit/triviaEvidence.test.ts` (route
tests via `vi.resetModules()` + dynamic import, fetch mocked). Layout:
determinism, cap enforcement, cluster spacing, stability under growth.
Data: snapshot derivation, caps, honest errors, provenance `"catalog"`.
Route: loader wiring, Tune here calls `startStation`, list parity renders.
