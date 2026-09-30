# Handoff — Living constellation (knowledge graph + magic)

For **Grok**. Read `docs/THEATER_CONSTELLATION_HANDOFF.md` first — the story there is settled and stays. This doc is the next chapter: make the sky a **real knowledge graph that grows**, and make it **feel like a night sky**, not a plot.

**Repo:** `/Users/umeshmc/Code/RadioPassport` · Product: Elsewhere (`elsewheremusic.com`)
Dev: `npm run dev` → land a station → `http://localhost:5173/listen`.
Do not ship. `npm test` must stay green (run it before and after).

---

## The one sentence

Today the sky *is* the metadata. After this pass, the sky is the metadata **becoming knowledge** — the station tells us a little, the enrichment finds more, and you watch new stars ignite and connect while you listen.

---

## What exists (do not re-derive)

- **Nodes** — `theaterReleases` (`app/components/radio-passport/theaterLock.ts`) emits one `FieldRelease` per real field: place, signal, language (cap 4), tag (cap 8), track, dispatch, fact (**cap 4**), cover. Seeded homes; adding a node never moves an old one (tested).
- **Edges** — `fieldSemanticEdges` is *proximity × family-kinship* (same family 1.55× reach, kindred 1.35×, strangers 0.52×). There are **no true knowledge edges**. The graph looks connected but knows nothing.
- **Enrichment** — `app/routes/api.now-playing-trivia.ts`. One AI call (`AI_SYSTEM_PROMPT`) returns `summary` + 3–4 flat `{label, value}` facts + clean title/artist. MusicBrainz adds release/year/origin/length/style facts, links, cover art. Merged facts cap at **5**. One shot; nothing arrives after `filed`.
- **Traveler** — the lacquer disc walks real edges and names the star it rests on. Keep it. It is the brand mark reading the sleeve.
- **Phases** — `reading → locking → filed → quiet` (`theaterPhase`). `filed` keeps the sky lit.

## Why it disappoints

1. Facts are orphan values (`2022`, `India`) — no edge says *why* a star relates to another.
2. Enrichment lands **once**. The constellation never grows after `filed`. The "finding new notes" feeling the product wants does not exist.
3. Fact cap 4 + merge cap 5 starve the sky. A rich track (film song, three credited artists, a composer, a film, a language, a decade of covers) renders ~10 stars max.
4. Visually it reads as a wireframe plot: flat black, uniform dots, no depth, no twinkle, no arrival moment when a star is born.

---

## Workstream A — the graph becomes real

### A1. Graph-shaped AI output

Extend the trivia schema (`app/types/trivia.ts`) with an optional graph:

```ts
export type TriviaGraphNode = {
  id: string;              // slug, stable per label
  label: string;           // "Raj Shekhar"
  kind: "person" | "work" | "film" | "place" | "year" | "genre" | "event";
};
export type TriviaGraphEdge = {
  from: string; to: string;
  relation: string;        // "wrote" | "composed" | "featured in" | "recorded in" | "sampled" | ...
};
export type TriviaGraph = { nodes: TriviaGraphNode[]; edges: TriviaGraphEdge[] };
// TrackTrivia gains: graph?: TriviaGraph
```

Change `AI_SYSTEM_PROMPT` to also return `graph`: 5–10 nodes, each with **one edge to something already known** (the track, the artist, the place, another new node). Grounding rules stay absolute: *do not invent; an empty graph beats a wrong edge.* Every relation must be checkable ("who/what/where/when"), never vibes ("influenced the scene").

Normalize + validate server-side in `normalizeTriviaPayload`: drop nodes without edges, drop edges whose endpoints don't exist, dedupe by slug, cap at 10 nodes / 14 edges.

### A2. Verified edges from MusicBrainz (free, honest)

`fetchMusicBrainzEnrichment` already resolves recording/artist/release IDs. Add `inc=artist-rels+work-rels` on the recording lookup and `inc=url-rels` on the artist — MusicBrainz returns **real relationships** (composer, lyricist, producer, part-of-work). Convert those into `TriviaGraph` edges tagged as verified. AI graph merges on top; MB wins on conflict. This gives true edges even when the AI is down.

### A3. Second-ring pass — the sky grows

This is the heart of the request. After `filed`, one **deepening call** (client triggers it ~8–15 s after filed; server caches like the others):

- New endpoint param `source=ai-deepen` on the same route (reuses cache/provider chain).
- Prompt: here is the graph we have (nodes + edges as compact lines); return **only new** nodes/edges — collaborators, the film, the composer's other landmark work, the city/scene, the raga/genre lineage. 3–6 new nodes max. Same honesty rules.
- Client merges into the room dossier; `theaterReleases` emits the new nodes; existing stars keep their seats (contract already tested); new ones fade in. **One** deepening call per track — this is a slow bloom, not a poller.
- If the deepening call fails or returns nothing: silence. No error state on the sky.

### A4. Wire the graph into the field

- `FieldRelease` gains optional `refId` so graph nodes carry identity; add family `"graph"` (or map kinds onto existing families: person→track-kin, film/work→fact-kin, place→place, year→fact, genre→tag).
- New pure fn `fieldKnowledgeEdges(nodes, graphEdges)` → edges by **identity**, not proximity. Draw them brighter than proximity edges (they are the constellation figure; proximity mesh becomes the faint background web).
- Traveler prefers knowledge edges. While transiting one, paint the **relation word** (Azeret Mono, lowercase, tiny, mid-edge, fades with the hop): the disc walks from `TUM HO TOH` to `RAJ SHEKHAR` along a thread that says `wrote`. That single detail makes the graph legible.
- Raise `FACT_RELEASE_CAP` 4 → 6 and merged-facts cap 5 → 7 so the well and sky stop starving. Keep tag cap 8.

All of A4 is pure logic in `theaterLock.ts` + drawing in `TheaterWell.tsx`. Keep the canvas loop dependent on **seed only**; graph updates flow through refs like nodes already do.

---

## Workstream B — the sky becomes magical

Stay in voice: night, foil, bone, ether, lacquer. No cyan, no bounce, no HUD. All canvas-2D in the existing single rAF loop. Everything seeded (`lockSeed`) so two visits to the same station show the same sky. Respect `prefers-reduced-motion` (static versions of all of this).

1. **Deep-sky dust** — a seeded backdrop layer of ~90–140 pinprick stars in 2 depth bands (far: 0.4 px, dim bone; near: 0.7 px, faint foil), drifting *very* slowly (minutes per crossing, parallax between bands). Drawn first, alpha ≤ 0.28. This alone turns the plot into a sky.
2. **Nebula wash** — one or two large radial gradients (foil at ~0.04 alpha, ether at ~0.03) seeded per station, breathing over ~40 s. Position one behind the densest node cluster. It must be felt, not seen.
3. **Twinkle** — per-star alpha shimmer: `alpha *= 0.9 + 0.1 * sin(time * f + phase)` with per-node seeded `f` in 0.3–0.9 Hz. Dust twinkles more than metadata stars (data is steady; the universe flickers).
4. **A star is born** — when a node's opacity animates in (already tracked in `opacityRef`), add a birth moment: a 600 ms ring ripple (expanding stroke, fading) + brief bloom overshoot ~1.6× before settling. This is the "we found a new note" beat — it makes the second-ring pass *visible*.
5. **Edge shimmer** — knowledge edges get a slow light-pulse traveling along them (gradient stroke, ~7 s period, staggered by seed). Proximity edges stay static and fainter.
6. **Shooting star** — rare (seeded, ~once per 90–150 s, only while `theaterSkyLive`), a short streak crossing an empty corner in ~700 ms. Never over the type column. Pure charm; cut it first if performance dips.
7. **Visited star bloom** — when the disc dwells, the star's halo widens ~1.5× and its label brightens, easing back after departure. The tour leaves warmth behind.

Perf guardrails: precompute dust as offscreen sprite or plain array (no per-frame allocation), keep total per-frame draw calls bounded, DPR already capped at 2, and keep the existing "settled → stop rAF" logic working (dust drift counts as motion only while `theaterSkyLive`).

---

## Files to touch

| File | Change |
|---|---|
| `app/types/trivia.ts` | `TriviaGraph*` types |
| `app/routes/api.now-playing-trivia.ts` | prompt v2 with graph, MB rels, `source=ai-deepen`, graph normalize/validate |
| `app/components/radio-passport/productFlow.ts` | thread `graph` through `theaterIntelligence` |
| `app/components/radio-passport/theaterLock.ts` | `fieldKnowledgeEdges`, graph→release mapping, caps, dust/nebula/shooting-star pure helpers (seeded, testable) |
| `app/components/radio-passport/TheaterWell.tsx` | draw layers: dust → nebula → triangles → proximity edges → knowledge edges (+relation word) → stars (+twinkle, birth ripple) → traveler → labels |
| `app/hooks/useTrackTrivia.ts` (+ room store) | one-shot deepen trigger after filed, merge into dossier |
| `tests/unit/theaterLock.test.ts` | new contracts below |

## New test contracts

- Graph normalize: orphan nodes dropped, dangling edges dropped, caps enforced, dedupe by slug.
- `fieldKnowledgeEdges` connects by id, ignores proximity.
- Deepening merge: existing node keys/homes unchanged; only additions.
- One deepen call per track key (in-flight join like `requestTrackTrivia`).
- Seeded dust/nebula/shooting-star helpers are deterministic per seed.
- Reduced motion: no twinkle/ripple/shooting star; static dust.

## Hard rules (unchanged)

Never invent facts or titles. Never abort Remix fetches (`Promise.race` only). Lacquer `#C73A3A` untouched. No new dependencies. No WebGL. Banned words stay banned. Do not deploy — local only until the user says make it live.

## How Ums will judge it

Land two stations. On a rich film track: within a minute the sky visibly **gains** 3–6 stars with a birth ripple, the disc walks a thread that says `wrote`, and the room reads as a night sky with depth — dust, faint nebula, breathing stars. On a silent station: sparse, still honest, still beautiful. Same station twice: same sky. `npm test` green.
