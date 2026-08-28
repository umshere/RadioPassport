# Handoff — the signal resolves into a figure

Implementation brief for **DeepSeek Harness**. This is the next bounded Theater
pass: make enrichment evidence-led and let the semantic constellation visibly
resolve from the existing loose field into a stable figure.

**Repo:** `/Users/umeshmc/Code/RadioPassport`  
**Product:** Elsewhere (`https://elsewheremusic.com`)  
**Route:** land a playing station, then open `/listen`

Do not deploy. Do not push. Do not commit unless Ums separately asks. Leave the
working tree ready for Codex review.

---

## Read first

Read these in order before editing:

1. `AGENTS.md`
2. `docs/SESSION_HANDOFF.md`
3. `docs/ROADMAP.md`
4. `docs/DESIGN_SPECS.md` — especially the Theater paragraph
5. `docs/THEATER_CONSTELLATION_HANDOFF.md`
6. `docs/CONSTELLATION_GRAPH_HANDOFF.md`
7. `docs/CONSTELLATION_FABLE_REVIEW.md`
8. `docs/AI_PIPELINE.md`

Query `graphify-out/graph.json` before rereading broad code areas:

```bash
graphify query "Trace now-playing trivia from useRoom through MusicBrainz and AI into roomStore, listen.tsx, theaterReleases, TheaterField, and fieldKnowledgeEdges"
```

Before touching files, inspect:

```bash
git status --short --branch
git diff --stat
npm test
npm run typecheck
```

The checkout may contain user-owned untracked files, including
`.playwright-mcp/`, `REVIEW_TASK.md`, and `implementation_plan.md`. Do not edit,
delete, stage, or incorporate them.

---

## Outcome

When an ICY title arrives, Elsewhere should:

1. File MusicBrainz facts, artwork, links, and verified relationships once.
2. Optionally retrieve a small amount of web evidence through Firecrawl when
   the verified graph is sparse.
3. Make one AI request for the letter plus evidence-backed graph additions.
4. Reject AI graph edges that do not cite one of the retrieved source URLs.
5. Morph the graph-connected stars from their loose seeded homes into a
   deterministic semantic figure.
6. Keep decorative dust and unrelated station metadata atmospheric and loose.
7. Fail silently back to the honest MusicBrainz-only room.

The visitor should witness this beat:

> At first the station has scattered signals. Then the sleeve resolves into a
> figure: track at the heart, people and works around it, context farther out.

---

## Why this pass exists

The current graph is real, but its spatial layout is not graph-shaped.
`fieldNodesFromReleases` assigns every star to a seeded family home. Knowledge
edges arrive later, yet the overall silhouette stays scattered.

The current enrichment path also repeats work:

- `source=free` calls `fetchMusicBrainzEnrichment`, then looks up the same
  recording and artist again.
- `source=ai` calls the model, then calls `fetchMusicBrainzEnrichment` again.
- `source=ai-deepen` makes a second model call without new external evidence.
- Route caching is process-local and the AI cache key ignores supplied context.

For a new track, the happy path can issue roughly eight MusicBrainz requests and
two model calls. MusicBrainz asks clients to remain near one request per second.
The implementation must reduce this to one bounded MusicBrainz resolution
(three upstream calls maximum: search, recording relations, artist) and one
model call per uncached track/context.

---

## Product locks

These are acceptance requirements, not suggestions:

- The Dock remains the only Room/audio writer. Theater only reads.
- Never put AI or enrichment on the audio path.
- Never invent an ICY title, fact, node, or edge.
- Never use `AbortController.abort()` in Remix server fetches. Use
  `Promise.race` deadlines.
- No second transport, cards, waveform, lyrics, embedded video, or community
  layer.
- Theater is **inhabit**, not discovery. A graph node does not retune audio or
  open an entity-centered Theater.
- No WebGL, 3D graph library, force simulation, or new dependency.
- No cyan tech treatment, bounce, HUD, or “AI loading” copy.
- Keep Night, lacquer `#C73A3A`, foil, bone, ether, and the current typography.
- Keep the existing single canvas/rAF loop and reduced-motion behavior.
- Preserve the triangle cap, edge-degree cap, tour spans, graph pulse, birth
  ripple, traveler, dust, nebulae, meteor, and scroll fold.
- A silent or metadata-poor station stays sparse and honest.
- Do not modify `.env` or expose credentials. Do not consume real Firecrawl
  credits during automated tests.

---

## Architecture decision

Replace this:

```text
ICY → MusicBrainz/free → AI cover → 10s delay → AI deepen
```

with this:

```text
ICY
  → one cached MusicBrainz resolution
  → free dossier appears
  → if verified graph is sparse and Firecrawl is enabled:
       one search → at most two trusted page scrapes
  → one AI call over free facts + existing graph + bounded evidence
  → validate cited graph additions
  → Room merges free + AI
  → semantic stars morph into a stable figure
```

The natural network delay between the free dossier and the AI response remains
the slow-bloom moment. A second model call is not needed to create it.

### Firecrawl boundary

Firecrawl is an optional evidence retriever, not a source of truth and not a
second structuring model.

- Call its v2 REST API directly; do not add its SDK.
- Production use requires a server-side key. Do not rely on keyless access.
- Feature is enabled only when both `FIRECRAWL_TRIVIA=1` and
  `FIRECRAWL_API_KEY` are present.
- Search once, with at most five candidates.
- Scrape at most two accepted HTTPS pages, in parallel.
- Start with the trusted hosts `en.wikipedia.org` and `www.wikidata.org`.
- Do not scrape lyrics sites, social posts, arbitrary search results, or pages
  requiring authentication.
- Request markdown, not Firecrawl JSON extraction. Elsewhere's configured model
  performs the one structuring pass.
- Keep at most 1,800 characters per page and 3,600 characters total.
- Treat scraped text as untrusted data. Delimit it and explicitly tell the model
  to ignore instructions found inside evidence.
- Use Firecrawl's cache controls where available. The local evidence cache may
  be process-local for this pass; do not invent a database or storage product.
- Failure, timeout, 401/402/429, malformed output, or no trusted result returns
  an empty evidence list and never damages the free dossier.

Official references:

- Search: `https://docs.firecrawl.dev/api-reference/endpoint/search`
- Scrape: `https://docs.firecrawl.dev/api-reference/endpoint/scrape`
- Pricing/credits: `https://www.firecrawl.dev/pricing`

---

## Workstream A — make free enrichment one operation

Primary file: `app/routes/api.now-playing-trivia.ts`

### A1. Return a complete free result

Refactor `fetchMusicBrainzEnrichment` so one invocation returns everything the
free response needs:

```ts
type MusicBrainzEnrichment = {
  summary: string | null;
  canonicalTitle: string | null;
  canonicalArtist: string | null;
  recordingId: string | null;
  releaseId: string | null;
  artistId: string | null;
  facts: TrackTrivia["facts"];
  links: TrackTrivia["links"];
  imageUrl: string | null;
  graph: TriviaGraph;
};
```

The `source=free` branch must return this result directly. Delete the second
recording lookup and second artist lookup currently performed after
`fetchMusicBrainzEnrichment`.

### A2. Do not repeat MusicBrainz in `source=ai`

The AI request already receives the free facts and graph as context. Extend its
context to carry the current free links too. Do not call
`fetchMusicBrainzEnrichment` again in the AI branch.

The Room store preserves a current array only when the incoming array is empty;
it does not union two non-empty fact/link arrays. Therefore, the AI route must
return a complete dossier without refetching:

- merge AI facts with `contextInfo.facts` using the existing fact dedupe/cap
- merge accepted evidence links with `contextInfo.links` using the existing link
  dedupe
- leave image ownership with the already-filed free dossier
- merge the known graph with accepted AI additions as described in B3

Extend `TriviaContext` in `useTrackTrivia.ts`, its serialization/cache key, and
the `useRoom.ts` AI request to carry the free links. Otherwise accepted evidence
links would replace the MusicBrainz/YouTube meridians instead of joining them.

### A3. Join concurrent free lookups

Add an in-flight map around MusicBrainz enrichment, keyed by normalized
title/artist. Two requests for the same track must share one promise. Cache
successful and honest-empty enrichment for the existing six-hour TTL; do not
cache thrown errors as successful data.

Keep a meaningful MusicBrainz `User-Agent`. Pace MusicBrainz calls through a
small server-side queue so outbound calls from this process begin at least one
second apart. The queue must recover after a rejected request.

Do not add sleeps to client code or block playback. Enrichment already runs in
the background.

### A4. Cache correctness

- Include AI context in the AI route cache key. The same title/artist with
  different free graph context must not collide.
- Cache only `ok` and intentional `empty` responses. Do not retain provider
  errors for an hour.
- Add public CDN-friendly cache headers to successful GET responses:
  - free: six-hour shared TTL with stale-while-revalidate
  - AI: one-hour shared TTL with stale-while-revalidate
- Do not add cache headers to errors.

Do not introduce Redis, Vercel KV, Supabase, or another persistence dependency
in this pass.

---

## Workstream B — optional web evidence and provenance

### B1. Extend, do not replace, the graph schema

Modify `app/types/trivia.ts`:

```ts
export type TriviaGraphProvenance = "musicbrainz" | "web";

export type TriviaGraphEdge = {
  from: string;
  to: string;
  relation: string;
  verified?: boolean;       // true only for deterministic structured sources
  provenance?: TriviaGraphProvenance;
  sourceUrl?: string;       // required for web-backed AI edges
};
```

Do not add model-generated confidence scores. They are not evidence.

MusicBrainz edges produced by `graphFromMusicBrainzRelations` must set:

```ts
{ verified: true, provenance: "musicbrainz" }
```

AI output must never be allowed to promote itself to `verified: true`.

### B2. Add a server-only evidence module

Create:

`app/services/trivia/firecrawlEvidence.server.ts`

Export small, testable boundaries:

```ts
export type WebEvidence = {
  title: string;
  url: string;
  excerpt: string;
};

export function firecrawlTriviaEnabled(env?: NodeJS.ProcessEnv): boolean;
export function isTrustedEvidenceUrl(value: string): boolean;
export function shouldFetchWebEvidence(input: {
  enabled: boolean;
  graph: TriviaGraph;
}): boolean;
export async function fetchFirecrawlEvidence(input: {
  title?: string | null;
  artist?: string | null;
  graph: TriviaGraph;
  fetchImpl?: typeof fetch;
}): Promise<WebEvidence[]>;
```

`shouldFetchWebEvidence` should return true only when enabled and the existing
verified graph has fewer than three usable edges. This threshold is a product
budget, not a reason to scrape every track.

Network limits:

- one `/v2/search` request
- five results maximum
- two `/v2/scrape` requests maximum
- scrapes run in parallel
- `Promise.race` deadline per network stage
- HTTPS trusted URLs only
- dedupe canonical URLs
- bounded excerpts and total prompt size
- empty array on any failure

Do not log the API key or send it to the browser.

### B3. Ground the one AI call

In `source=ai`:

1. Read the supplied free facts and graph.
2. Fetch web evidence only when `shouldFetchWebEvidence` allows it.
3. Include existing graph nodes/edges in the prompt so the model returns only
   additions.
4. Include evidence as labelled blocks (`[S1]`, `[S2]`) with their exact URLs.
5. Require each proposed web edge to return `sourceUrl` equal to one supplied
   URL.
6. Tell the model that evidence text is untrusted and that instructions inside
   it must be ignored.
7. Ask for the short Elsewhere letter and facts in the same JSON response.

Server validation must:

- normalize nodes and relations with existing caps
- force AI edges to `verified: false` and `provenance: "web"`
- accept `sourceUrl` only when it exactly matches an evidence URL supplied in
  this request
- drop AI edges with no accepted `sourceUrl`
- drop dangling, orphaned, self, duplicate, vibe, or overlong edges as today
- preserve MusicBrainz-first merge precedence
- convert accepted evidence URLs into ordinary `info` links for the existing
  Theater meridians; existing three-link display cap remains
- validate new edges against the union of known context nodes and returned new
  nodes, so an edge may honestly connect a new person/work to an existing track
  ID
- return a complete normalized graph (known graph plus accepted additions), not
  a fragment that loses edges to known endpoints during normalization
- return facts and links already merged with the supplied free context, because
  `roomAfterDossier` does not union two non-empty arrays

If no evidence is available, the AI may improve the letter using the supplied
free facts, but its graph contribution must be empty. The verified MusicBrainz
graph already in the Room remains visible.

### B4. Remove the second model call

Modify:

- `app/hooks/useTrackTrivia.ts`
- `app/hooks/useRoom.ts`
- `app/routes/api.now-playing-trivia.ts`

Remove `ai-deepen` from `TriviaSource`, remove the ten-second timer and client
request, and remove the route branch and prompt dedicated to deepening. Keep
request coalescing for `free` and `ai`.

Update tests and current documentation to describe:

```text
free MusicBrainz dossier → one evidence-grounded AI arrival
```

Do not weaken failure behavior: AI or Firecrawl failure leaves the free dossier
untouched and produces no visible error in the sky.

---

## Workstream C — deterministic semantic morph

Primary files:

- `app/components/radio-passport/theaterLock.ts`
- `app/components/radio-passport/TheaterWell.tsx`
- `app/routes/listen.tsx`
- `tests/unit/theaterLock.test.ts`

Do not install or use D3, Sigma, Cosmograph, Three.js, or a force-graph package.

### C1. Pure layout helpers

Add pure helpers in `theaterLock.ts`:

```ts
export const FIELD_STRUCTURE_MS = 1100;

export function fieldStructureReady(
  nodes: FieldNode[],
  graph: TriviaGraph,
  focusId?: string | null,
): boolean;

export function fieldStructuredTargets(
  nodes: FieldNode[],
  graph: TriviaGraph,
  focusId: string | null | undefined,
  seed: number,
  previous?: ReadonlyMap<string, FieldPoint>,
): Map<string, FieldPoint>;

export function fieldStructureProgress(
  ageMs: number | null,
  reduced: boolean,
): number;
```

`fieldStructureReady` requires:

- a focus node resolved from the current track title or the safe fallback below
- at least three resolved graph-connected stars
- at least two drawable knowledge edges

Otherwise the existing seeded layout remains unchanged.

### C2. Semantic target algorithm

The algorithm must be deterministic and addition-stable:

1. Resolve the focus star in this order: exact `focusId`/`refId`; then the
   highest-degree visible `work` node; then the highest-degree visible graph
   node. If none resolves, do not structure the field. Lock the chosen focus
   key for this station seed once the first morph begins; later additions must
   not recenter the figure.
2. Place the focus at approximately `{ x: 0.5, y: 0.5 }`.
3. Build adjacency only from graph edges that resolve to visible field nodes.
4. First-hop nodes use an inner ring around the focus.
5. Second-hop and farther nodes use an outer ring.
6. Give graph kinds stable angular sectors:
   - people: upper-left / left
   - works and films: upper-right / right
   - places and years: lower-left
   - genres and events: lower-right
7. Add only a small deterministic angular jitter derived from `seed + node key`.
8. Scale the vertical radius so the figure reads correctly in the wide Theater
   canvas.
9. Clamp targets inside the existing safe canvas bounds.
10. Nodes not connected to the focus keep their original seeded homes.
11. If `previous` contains a target for a key, preserve it exactly. A later graph
    addition may add targets but must not move existing targets.

Do not base angles on array index or current node count; adding one node must not
rotate the others.

### C3. Animate inside the existing loop

Pass the current track-title slug from `listen.tsx` into `TheaterField` as
`focusId`.

In `TheaterField`:

- Keep the canvas effect keyed on `seed`; graph and nodes still flow through
  refs.
- Reset structured targets and progress when `seed` changes.
- When `fieldStructureReady` first becomes true, record the start time and
  compute targets.
- Interpolate graph-connected nodes from their existing seeded homes to targets
  over `FIELD_STRUCTURE_MS` with a quiet ease-out curve.
- Apply the existing tiny drift around the interpolated home; do not remove the
  living-sky motion.
- When new graph nodes arrive later, preserve all existing targets and assign
  only the additions. Their existing opacity/birth ripple handles arrival.
- Reduced motion resolves immediately to the final targets and keeps existing
  no-twinkle/no-ripple/no-meteor behavior.
- Empty or insufficient graphs never begin a morph.

All edge, triangle, traveler, and label calculations must use the interpolated
points, so the figure visibly draws itself during the morph.

### C4. Visual hierarchy

Extend `FieldKnowledgeEdge` to retain `verified`, `provenance`, and `sourceUrl`
where available.

- MusicBrainz-verified threads remain the strongest foil.
- Web-evidence threads may be slightly quieter, using the same foil family.
- Do not introduce a new color legend, badge, tooltip, or UI control.
- Relation text remains tiny and appears only while the traveler crosses the
  corresponding real knowledge edge.
- Dust, nebulae, and unrelated station metadata stay scattered. The semantic
  figure resolves inside the sky rather than turning the whole room into a
  diagram.

No click, hover, double-click, long-press, node expansion, or retuning behavior
is part of this pass.

---

## Expected file changes

Required:

| File | Responsibility |
|---|---|
| `app/types/trivia.ts` | edge provenance and source URL |
| `app/routes/api.now-playing-trivia.ts` | one MB pass, evidence-grounded AI, cache correctness, remove deepen |
| `app/services/trivia/firecrawlEvidence.server.ts` | optional bounded Firecrawl REST retrieval |
| `app/hooks/useTrackTrivia.ts` | remove `ai-deepen`, keep request joining, carry free links in AI context |
| `app/hooks/useRoom.ts` | free → one complete AI arrival; pass free facts/links/graph; no deepen timer |
| `app/components/radio-passport/theaterLock.ts` | semantic targets, morph progress, provenance on field edges |
| `app/components/radio-passport/TheaterWell.tsx` | animate targets inside existing canvas loop |
| `app/routes/listen.tsx` | pass track focus ID to the field |
| `tests/unit/theaterLock.test.ts` | layout and provenance contracts |
| `tests/unit/nowPlayingMetadataLifecycle.test.ts` | two-source request lifecycle, no deepen |
| `tests/unit/triviaEvidence.test.ts` | Firecrawl gating, bounds, URL safety, failure behavior |
| `.env.example` | variable names only; never a real key |
| `docs/ENVIRONMENT.md` | optional Firecrawl variables and default-off behavior |
| `docs/AI_PIPELINE.md` | new free → one grounded AI flow |
| `docs/DESIGN_SPECS.md` | replace the current delayed-deepen sentence with the evidence-led arrival and semantic morph |
| `docs/SESSION_HANDOFF.md` | record the implemented state only after code and verification are complete |

Modify other files only if compilation or a named contract requires it. Explain
every extra file in the final report.

Do not modify `app/tailwind.css` unless a demonstrable visual defect cannot be
fixed in canvas code. No CSS change is expected.

---

## Test contracts

### MusicBrainz and request flow

- One `source=free` request does not re-fetch the resolved recording/artist
  after `fetchMusicBrainzEnrichment` returns.
- `source=ai` makes no MusicBrainz request.
- Concurrent identical free lookups share one in-flight enrichment promise.
- MusicBrainz queue spaces request starts and continues after a rejection.
- AI cache keys differ when supplied graph/fact context differs.
- AI context serialization includes free links, and the AI response preserves
  free facts/links while adding accepted evidence.
- Errors are not cached as successful responses.
- Client performs `free` then one `ai` request; no `ai-deepen` request exists.
- Station/track cleanup prevents stale AI results from changing the current
  Room.

### Evidence and provenance

- Feature disabled or key absent → zero Firecrawl calls.
- Three or more verified existing edges → zero Firecrawl calls.
- Sparse graph → one search and at most two scrapes.
- Only trusted HTTPS URLs survive.
- Duplicate and overlong evidence is bounded deterministically.
- Timeout, 401/402/429, malformed JSON, and rejected fetch all return `[]`.
- An AI edge without `sourceUrl` is dropped.
- An AI edge with a URL not supplied in this request is dropped.
- An accepted web edge is forced to `{ verified: false, provenance: "web" }`.
- MusicBrainz edges remain `{ verified: true, provenance: "musicbrainz" }`.
- Merge order keeps MusicBrainz when the same endpoints conflict.

### Semantic layout

- Same seed + nodes + graph + focus produces identical targets.
- Exact or fallback focus lands at the center target and stays locked for the
  station seed.
- First-hop and second-hop nodes occupy different rings.
- Kind sectors are stable.
- Unconnected metadata receives no target and keeps its seeded home.
- Insufficient graph returns no structured layout.
- Adding graph nodes while passing previous targets does not move any existing
  target.
- `fieldStructureProgress` clamps to `0..1`, reaches exactly `1`, and returns
  `1` immediately for reduced motion.
- Existing knowledge-edge, span, traveler, triangle-cap, edge-degree-cap, dust,
  birth, graph-pulse, and reduced-motion tests stay green.

Do not weaken existing exact assertions to make the implementation pass.

---

## Verification gate

Automated:

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

No test may perform a real Firecrawl, MusicBrainz, Gemini, OpenRouter, OpenAI, or
Heuristics request. Mock the network boundary.

Browser, desktop and phone:

1. Start `npm run dev`.
2. Land a station with a real ICY title and open `/listen`.
3. Capture the loose initial field before the graph is sufficient.
4. Confirm that graph-connected stars resolve into a legible figure when data
   arrives; background dust and unrelated metadata remain atmospheric.
5. Confirm the disc always travels on a visible thread.
6. Confirm existing stars do not jump when later nodes arrive.
7. Confirm a sparse/silent station remains beautiful without manufacturing a
   graph.
8. Confirm phone sticky sky, scroll fold, and folio readability remain intact.
9. Enable reduced motion and confirm the figure resolves without animated
   morph, twinkle, ripple, or meteor.
10. Check the console and network panel for duplicate trivia requests, leaked
    keys, uncaught errors, and repeated Firecrawl calls.

If no Firecrawl key is already configured in the execution environment, do not
ask for or invent one. Mark live Firecrawl verification as not run; mocked tests
must still prove the integration boundary.

Visual acceptance:

- The transformation is obvious but quiet: approximately 1.1 seconds, no
  bounce, no explosion.
- Track reads as the heart of the semantic figure.
- People/works/context form understandable rings without becoming a dashboard.
- A rich film track is a constellation, not crumpled foil.
- A metadata-only track still looks intentional.
- No cyan, WebGL, new control, card, transport, waveform, or explanatory AI
  status appears.

---

## Implementation order

Keep the work reviewable in two slices, even if no commits are made:

### Slice 1 — evidence-led enrichment

1. Add failing tests for duplicate MB work, evidence gating, provenance, and
   the two-request client lifecycle.
2. Make MusicBrainz enrichment return the complete free result.
3. Remove duplicate free/AI MusicBrainz calls.
4. Add in-flight joining, pacing, cache-key correction, and success cache
   headers.
5. Add the server-only Firecrawl evidence module, disabled by default.
6. Ground AI graph output in exact allowed URLs.
7. Remove the `ai-deepen` route/client flow.
8. Run the complete automated gate.

### Slice 2 — signal-to-figure morph

1. Add failing pure-layout tests.
2. Implement readiness, stable targets, and progress helpers.
3. Pass the track focus ID from `listen.tsx`.
4. Animate interpolation inside the current Theater canvas loop.
5. Carry provenance to knowledge-edge strength without adding UI chrome.
6. Run the complete automated gate.
7. Perform desktop, phone, sparse-track, rich-track, and reduced-motion browser
   verification.

Do not begin Slice 2 with Slice 1 tests failing.

---

## Explicit non-goals

- Direct Wikidata API integration; Firecrawl may use trusted Wikipedia/Wikidata
  pages as evidence, but a new structured provider is a later measured step.
- Durable database-backed trivia cache.
- Node selection or a left-pane entity inspector.
- Node-driven station changes or “nearby theaters.”
- Prewarming popular tracks.
- New paid features, accounts, quotas, or billing.
- 3D, WebGL, force layout, graph libraries, or new dependencies.
- Production environment changes, real secret configuration, deployment, push,
  or PR creation.

---

## Stop conditions

Stop and report instead of improvising if:

- The current source has materially diverged from the functions named here.
- A safe implementation appears to require a new dependency or datastore.
- Firecrawl's current v2 request/response contract differs from the official
  docs linked above.
- The only way to make the layout work is to replace the canvas or move audio
  ownership.
- Baseline tests fail before changes for reasons unrelated to this task.
- Existing user changes overlap the same hunks and cannot be preserved.

---

## DeepSeek Harness task — copy/paste

```text
ROLE: Senior implementer. You are working for a separate reviewer; do not mark
your own output accepted.

GOAL: Implement docs/THEATER_EVIDENCE_MORPH_HANDOFF.md exactly: deduplicate and
evidence-ground the Theater trivia pipeline, remove the second ai-deepen model
call, add optional default-off Firecrawl evidence retrieval, and morph the
existing canvas constellation into a deterministic semantic figure.

REPO: /Users/umeshmc/Code/RadioPassport

READ FIRST:
- AGENTS.md
- docs/SESSION_HANDOFF.md
- docs/ROADMAP.md
- docs/THEATER_EVIDENCE_MORPH_HANDOFF.md (authoritative task contract)
- every prerequisite document named by that handoff

CONSTRAINTS:
- Preserve all user-owned dirty/untracked work. You are not alone in the repo.
- Do not edit or delete .playwright-mcp/, REVIEW_TASK.md, implementation_plan.md,
  .env, or any unrelated file.
- No commit, push, PR, deploy, production env edit, or real credential setup.
- No new dependency, WebGL, force graph, cards, waveform, second transport,
  node-retune interaction, or banned copy.
- Never put AI on the audio path, invent facts/edges, or AbortController.abort()
  a Remix fetch.
- Firecrawl must be server-only, optional, default-off, bounded, and fully
  mocked in tests. Never expose or print a key.
- Fix code rather than weakening established assertions.

WORK ORDER:
1. Inspect status/diff and run the baseline gate.
2. Use graphify before broad code reading.
3. Implement Slice 1 and make its tests green.
4. Implement Slice 2 and make its tests green.
5. Run npm test, npm run typecheck, npm run lint, npm run build.
6. Verify /listen on desktop, phone, sparse data, rich data, and reduced motion
   when the local environment permits. Do not spend real Firecrawl credits just
   to satisfy the review.
7. Inspect the full diff for scope, secrets, duplicated requests, and accidental
   formatting churn.

DONE WHEN:
- Every acceptance and test contract in the handoff is satisfied, or a concrete
  blocker is reported with evidence.
- The worktree contains only intended changes plus pre-existing user files.
- No deployment or external persistent change occurred.

RETURN EXACTLY:
STATUS: done | partial | blocked
SUMMARY: 2-4 sentences
FILES CHANGED: one line
TESTS: exact commands and outcomes
BROWSER: scenarios verified and evidence paths, or not run with reason
FIRECRAWL: mocked/live-not-run/live-verified; calls and credits if known
RISKS: remaining concerns
REVIEW NOTES: anything the independent reviewer must inspect closely
```

---

## Codex review checklist after Harness returns

The executor's status is not acceptance. Codex should independently:

1. Inspect `git status`, `git diff --stat`, and every changed hunk.
2. Reject unrelated cleanup, new dependencies, secret exposure, weakened tests,
   and docs that claim unperformed live verification.
3. Confirm there is no MusicBrainz call in `source=ai` and no duplicate free
   lookup after the enrichment result.
4. Confirm `ai-deepen` is truly removed from client, route, cache keys, tests,
   and current docs.
5. Confirm Firecrawl cannot run without both flag and key; count the maximum
   search/scrape calls from code.
6. Confirm scraped text is bounded, treated as untrusted, and URLs are exact
   allowlisted evidence.
7. Confirm AI cannot set `verified: true` and uncited AI edges are dropped.
8. Confirm semantic targets are deterministic, addition-stable, and limited to
   graph-connected stars.
9. Confirm all drawing uses interpolated points and reduced motion resolves
   immediately.
10. Run the full automated gate again.
11. Repeat the browser scenarios independently before considering a commit,
    push, or deployment.
