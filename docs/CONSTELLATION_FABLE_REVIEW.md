# Handoff — Fable review of the living sky

Pass this whole file to Fable (Claude Opus). Ask it to **review first**, then make only small tweaks. This is not a rewrite.

**Repo:** `/Users/umeshmc/Code/RadioPassport`  
**Product:** Elsewhere (`elsewheremusic.com`)  
Shipped on `main` with the galaxy / thinned-mesh / fold pass. Dev: land a station → `http://127.0.0.1:5173/listen`.

Story bible (settled, do not reopen): `docs/THEATER_CONSTELLATION_HANDOFF.md`  
Last chapter (graph + magic, now implemented): `docs/CONSTELLATION_GRAPH_HANDOFF.md`

---

## What to tell Fable

You are reviewing a listening room after a graph pass. The user just said:

> some of the constellation line is yet to show

That is the only product complaint on this pass. The earlier India / Mirchi clip was the same wound: the lacquer disc crosses empty sky. We thought we closed it with span edges + an always-on hop stroke. After knowledge edges and a dimmer proximity web, some meridians are missing again.

**Job:**

1. Read the files below. Do not invent a new system.
2. One sentence: what is the user witnessing now, after the graph pass? Then the beat.
3. Say what is already right and must stay.
4. Find why a line is missing. Fix that. Then only the tweaks the sky still needs.
5. Keep `npm test` green. 176 tests at last run.

---

## Voice and hard rules

Voice: **land · dusk · hour · stamp · live · cover · elsewhere · now**

Banned: discover · seamless · AI-powered · widget · playlist · unlock · explore

Never:

- Charge radio
- Invent ICY titles or graph edges
- `AbortController` on Remix server fetch (`Promise.race` only)
- Bounce motion
- Spoonfeed (“looking up AI context…”)
- Mount leftovers (`RetroTuner`, `HeroSection`, `CountryFlag`, Mantine)
- NASA earth / WebGL second context
- Deploy

Night is default. Lacquer `#C73A3A` never changes. Type: Newsreader italic, Schibsted Grotesk, Azeret Mono.

Theater is **inhabit**. The disc is reading the sleeve, not seeking.

---

## Settled story (do not reopen)

**One sentence:** The disc walks everything the station has told you. Filing does not empty the sky.

The new chapter: the sky is the metadata **becoming knowledge**. New stars may ignite after filing. The disc prefers knowledge threads and may name the relation (`wrote`) mid-edge.

Tags first, then language, then track, then graph, then facts. Seats stay. Dispatch/cover stay unnamed. Silent stations stay sparse and honest.

---

## What just landed (Grok, local, unshipped)

Workstreams A + B from `docs/CONSTELLATION_GRAPH_HANDOFF.md`:

- Trivia schema has `graph` (nodes + edges with relation words).
- AI cover prompt returns a graph. MusicBrainz `artist-rels+work-rels` become verified edges. MB wins on conflict. Empty graph beats a wrong edge.
- One `source=ai-deepen` call ~10s after filed. Merges into the Room. Existing homes do not move. New stars fade in with a 600ms birth ripple.
- `fieldKnowledgeEdges` connects by identity, not proximity. Drawn brighter. Traveler prefers them.
- Seeded dust (90–140, two bands), nebula behind the densest cluster, per-star twinkle, knowledge-edge shimmer, rare meteor, visited bloom.
- Fact cap 6 / merge 7 / graph 10 nodes · 14 edges. Tag cap still 8.
- Tests 176. Not live.

---

## Why a line can still go missing

Look here first. Do not start with more magic.

1. **Proximity mesh was dimmed.** In `TheaterWell.tsx` the kinship web is now `strength * glow * 0.38` and `0.55px` thick. Filed glow is `0.76`, so a span at strength `0.4` paints at ~0.12 alpha. The figure looks like it has no meridians except the current hop and a few knowledge edges.

2. **`fieldWalk` can still teleport.** Last fallback is `nodes.find(!visited)`. That hop is not in `pairs`. The in-transit stroke should cover it *if* both ends are in `active` (`weight > 0.04`). A newborn star under that, or a key that dropped out of the walk, leaves the disc in empty sky.

3. **Knowledge match can fail.** Edges use slugs. Nodes use `refId` / label / key tail. If the AI says `raj-shekhar` → `tum-ho-toh` and the title star never got that `refId`, there is no bright thread. The disc may still walk there via the teleport fallback.

4. **Knowledge keys hide the kinship line.** Proximity edges that share `i:j` with a knowledge edge are skipped. If the knowledge stroke is late (one node still fading), that meridian is gone for a beat.

5. **Same wound as Hindi / India.** Isolated language or graph stars sit outside kindred reach. `fieldSpanEdges` only bridges *components*. If the walk jumps inside a connected component along a path that was never drawn, the disc crosses a gap.

The disc must never travel a hop that is not stroked. The mesh must still read as a constellation when there is no graph yet (silent station, tags only).

---

## Files to read (in this order)

1. `docs/DESIGN_SPECS.md` — tokens, theater paragraph
2. `docs/THEATER_CONSTELLATION_HANDOFF.md` — settled story
3. `docs/CONSTELLATION_GRAPH_HANDOFF.md` — what this pass was supposed to do
4. `app/components/radio-passport/theaterLock.ts` — releases, walk, spans, knowledge, dust helpers
5. `app/components/radio-passport/TheaterWell.tsx` — draw order: dust → nebula → triangles → proximity → knowledge → stars → traveler → labels
6. `app/routes/listen.tsx` — Room → releases + graph
7. `app/hooks/useRoom.ts` — free → AI → one deepen
8. `app/state/roomStore.ts` — `mergeTriviaGraphs` on dossier
9. `app/routes/api.now-playing-trivia.ts` — prompt, MB rels, `ai-deepen`
10. `tests/unit/theaterLock.test.ts` — contracts

CSS: `.ew-theater-sky` / `.ew-theater-folio` / `.ew-theater-field` in `app/tailwind.css`.

---

## What is already right (do not undo)

- One Room. Dock writes. Theater only reads.
- Seeded homes. Adding a star does not move an old one.
- `theaterSkyLive`: filed stays inhabited. Only quiet goes dark.
- No second transport. No cards. No waveform. No cyan.
- Place + track standing labels. Sentence facts unnamed.
- Reduced motion: still dust, no twinkle / ripple / meteor.
- Never invent facts or titles.
- Canvas loop still keyed on **seed only**. Graph and nodes flow through refs.

---

## Tweaks worth considering (your call)

Only after the missing line is honest.

- Proximity web: raise alpha just enough that a tag-only sky still has meridians. Knowledge stays the bright figure.
- Walk: every consecutive pair in `fieldWalk` must exist as a drawn edge (span it if needed). Delete the teleport fallback or make it add a span.
- Knowledge match: if a graph edge cannot resolve both ends, drop it. Do not let the disc prefer a ghost.
- Newborn stars: do not walk to a star until its opacity can carry a line.
- Relation word: keep it tiny, lowercase, Azeret, only while the hop is a real knowledge edge.
- Dust / nebula / meteor: cut the meteor first if the room feels busy. Do not add more particles.
- Phone: sky stays sticky `38vh` / `16.75rem`. Do not let folio type cover the traveler.

Do not add a second AI poller. Do not remount leftovers. Do not change Night tokens.

---

## Tests to keep green

`npm test` — 176 at last run.

New contracts in `tests/unit/theaterLock.test.ts`:

- Graph normalize drops orphans, dangling edges, extras
- `fieldKnowledgeEdges` connects by id
- Deepening merge keeps homes
- Seeded dust / nebula / meteor are deterministic
- Reduced motion kills twinkle / ripple / meteor

If you change the walk, add: every consecutive walk pair is either a knowledge edge, a semantic edge, or a span.

---

## Fable's pass (2026-08-15, local, unshipped)

**What the missing meridian actually was.** Two wounds, not one.

The *structural* one was already closed by this pass before I looked: `fieldTourSpans` strokes every walk hop that no other edge covers, `fieldWalk` now drops keys it does not know, and the mesh loop only skips a kinship line when a *ready* knowledge edge replaces it. I could not construct a hop the disc walks without a thread beneath it, and the contract test pins that.

The *visible* one was real: the kinship web had been dimmed to `0.56` while a filed sky at glow `0.76` paints spans near `0.22` alpha. Raised to `0.72` with a slightly heavier line; knowledge threads to `0.88`.

**The bigger wound, which was not in the brief.** On a filed film track the sky was not a constellation at all — it was a solid gold mass. Two compounding causes, both from the graph pass widening the node count:

- `fieldTriangles` is `O(n³)`. At ~25 nodes it yielded hundreds of faces, and stacked translucency at `0.08` each compounds into opaque foil. Now capped to the tightest `FIELD_TRIANGLE_CAP = 14`, fill eased to `0.055`.
- `fieldSemanticEdges` connected every pair inside reach, so a filed sky roped everything to everything. Each star now keeps its strongest `FIELD_DEGREE_CAP = 3` threads. Spans and tour-spans still guarantee connectivity, so the disc is unaffected.

Also: crowded families stacked on `index * 0.035`, which drew graph nodes as a straight vertical column. They now fan on the golden angle.

**Galaxy.** Milky-way band, ~200 dust grains across three depths with bone/foil/ether tints and cross flares on the brightest, a third nebula on the band, the meteor finally drawn, and a vignette. Same night on home behind the globe (`GalaxyBackdrop`, throttled to 80ms — dust does not need 60fps).

**Motion.** Scrolling the theater folds the sky (`--ew-sky-shrink`). Guarded: folding shortens the page, which would claw the scroll position back on a shallow room, so it only engages above `SKY_FOLD_MIN_ROOM` of readable page.

Tests 177, typecheck clean, nothing committed, nothing deployed.

## How Ums will judge it

Land two stations. Open Theater.

- The disc never crosses empty sky. If it moves, a foil thread is under it.
- A silent station still has a sparse, readable mesh.
- A rich film track still grows 3–6 stars after filing, with a birth ripple, without snapping the old seats.
- It still feels like a room, not a dashboard.

Local only. Do not `vercel --prod`.
