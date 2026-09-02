# Session handoff — Elsewhere

Saved so this conversation can be compacted. Next turn: read this file + `docs/ROADMAP.md`.

## Identity

- **Product name:** Elsewhere
- **Tagline:** You are not here.
- **Promise:** Stay long enough to be stamped.
- **Repo / heritage name:** Radio Passport (`umshere/RadioPassport`)
- **Positioning:** live radio as a fashion cover of a city that is awake without you
- **Hard rule:** never charge to hear the radio. Public streams stay public.

## Git

- Branch: `main`
- Remote: `https://github.com/umshere/RadioPassport.git`
- Head at last product push: see newest *Shipped* section below (Theater knowledge graph, 2026-08-28). Passport stamp rule is in `docs/DESIGN_SPECS.md`. Domain + agent docs follow.
- **Git identity:** repo mutations (push, PR close) go as **`umshere`**, never `heuristicsai` (that token can read/comment but 403s on writes). Do not `gh auth switch` (keyring) and do not SSH. Ship command: `npm run ship` (`scripts/ship.mjs`). Token path that works: `GH_TOKEN="$(gh auth token -u umshere)"`. npm/npx: `--cache "${TMPDIR:-/tmp}/elsewhere-npm-cache"` (default `~/.npm` is EPERM). Vercel CLI is authed as `umshere`.
- Do not commit `.env`
- `public/FTS.jpeg` is the 404 wallpaper. Ship it with the app.
- Live host: **https://elsewheremusic.com**. Radio Passport 308s there. Facts: `docs/DOMAINS.md`. Ship: `docs/DEPLOY.md`. Breaks: `docs/TROUBLESHOOTING.md`. Agents: `AGENTS.md`.

## Shipped 2026-08-28 (Theater is the knowledge graph)

Sol's correction (`docs/PRODUCT_CORRECTION_THEATER_GRAPH.md`): a separate `/atlas` page is the wrong container. `/listen` is the navigable knowledge graph. Country/language/station light on landing; ICY/MB/cited web wake further neurons; DOM button layer over the canvas (keyboard + tap); Tune here is the only playback change; `/api/atlas/expand` stays as an internal catalog API. No SiteBar Atlas link and no `/atlas` page. Sky labels are DOM-only, color-coded by kind, seated with a gap so they do not stack.

Donor catalog code lives in `app/services/atlas/` + `app/types/atlas.ts` (data contract still noted in `docs/ATLAS_HANDOFF.md`).

## Shipped 2026-08-28 (theater evidence + morph)

- **Trivia pipeline is two calls again** — `ai-deepen` and `DEEPEN_AFTER_MS` are gone (`useRoom`, `useTrackTrivia`, route). `source=free` = ONE cached MusicBrainz resolution per track (search → recording rels → artist, module-level pacer ≥`MUSICBRAINZ_MIN_INTERVAL_MS`, default 1000ms; concurrent loaders join one in-flight promise; honest empty results cached 6h). `source=ai` consumes the client-sent dossier (summary ≤400 chars, ≤8 facts, ≤8 whitelisted links, graph re-normalized server-side) and makes **zero** MusicBrainz calls. Unknown `source` → 400. Cache keys: free ignores context, AI hashes it (`buildTriviaCacheKey`). Provider errors are never cached; success sets `Cache-Control: s-maxage=21600` (free) / `3600` (ai) with `Vary: Accept`.
- **Optional Firecrawl evidence pass (default OFF)** — `app/services/trivia/firecrawlEvidence.server.ts`. Needs `FIRECRAWL_TRIVIA=1` AND a non-empty `FIRECRAWL_API_KEY`; fires only when the verified graph has <3 edges. One v2 search (limit 5, `includeDomains` pinned to the allowlist: wikipedia/wikidata/allmusic/discogs) → ≤2 parallel scrapes from that same allowlist (markdown flattened to ≤1800 chars/page, 3600 total, 9s Promise.race deadlines — never AbortController). Evidence goes into the prompt as delimited untrusted excerpts; every AI edge must carry a `sourceUrl` whose canonical form matches a retrieved page or it is dropped server-side (`citedAiGraph`) — kept edges are forced `verified:false, provenance:"web"`; with no evidence the AI may only rephrase known facts (novel claims filtered) and verified MB facts merge first. MB-context edges stay `verified:true, "musicbrainz"`. Any Firecrawl failure degrades silently to no-evidence.
- **Semantic figure morph** — `fieldStructuredTargets`/`fieldStructureReady`/`fieldStructureProgress` in `theaterLock.ts`; `TheaterField` takes `focusId` (listen passes the ICY title). When the focus sits in a connected component of ≥3 stars with ≥2 drawable edges, connected stars glide from drift into deterministic stations over 900ms ease-in-out: focus centre {0.5,0.5}, hop-1 ring r=.17, hop≥2 r=.31 on kind sectors (person −150°, work −30°, film −70°, place/year 130°, genre/event 47.5°), y×0.62, seeded jitter ±0.175rad. Sparse graphs never move; reduced-motion resolves instantly; growth pins existing seats verbatim (addition-stability). Edge rendering splits by provenance: verified spines 0.92, web-cited threads 0.72 (legacy unmarked keeps 0.92). No legend, no cards.
- **Tests** — `tests/unit/triviaEvidence.test.ts` (18): MB-call budgets, join, pacing gaps, honest cached empty, cacheability split, zero-MB ai path, citation allowlist (evil/uncited/vibes edges + ghost node dropped), outage resilience, removed-source 400. `nowPlayingMetadataLifecycle` asserts the two-request contract + in-flight joins. `theaterLock.test.ts` gains the semantic-figure suite. Gate at handoff: 228 passing / 25 files, typecheck + lint green, vite build green (publicDir copy of OS-locked `FTS.jpeg` EPERMs in this sandbox — file untouched).

## Shipped 2026-08-25 (agent-army batch, `7f8d57a` + this commit)

- **Graph map wired in** (`1b54327`) — `graphify-out/` committed (graph.json 1529 nodes / 3331 edges, GRAPH_REPORT.md, html, extraction cache), `AGENTS.md` Knowledge-graph section (query/path/explain; god node `Station`, 75 edges). Query before re-reading code: `graphify query "<q>"`.
- **Registry rows** (`6e50b63`) — FLOW_AUDIT hygiene closed: `country-close`, `passport-close`, `atlas-query`, `cover-empty` declared in `SURFACE_CONNECTIONS`; contract tests in `elsewhereFlow.test.ts`. Zero JSX changes needed — all four controls already carried accessible names.
- **Hygiene** (`7f8d57a`) — twin-skills drift guard (`tests/unit/skillTwins.test.ts`, `.claude` ⇄ `.grok` byte-equality, `npm run sync:skills` repairs); `docs/BRAND_ASSETS.md` heritage register (RPLOGO.png + root `icon.png`: keep-but-document, deletion needs Ums).
- **PR #16 closed stale** — three grounds: total `_index.tsx` conflict vs main, banned "Discover" copy, pre-Elsewhere "AI Radio Browser" branding. three.js intro concept preserved in `ROADMAP.md` Later list.
- **F2 resolved — horizon row shipped** (`c4d7f68`, Ums's pick): AtmospherePin moved from the home header into `.rp-horizon-row` inside `.rp-intro`, answering the local-hour readout on one instrument line above the four-hour chips; room switch now stays reachable during seeks. Loser variant (`worker/f2-pin-rail`, SiteBar mount) lives only as a closed branch idea; its `productFlow.ts` surface flip is NOT needed since the pin stays home-scoped under `cover`.
- **Agent-army pattern that worked:** native subagents ×5, one git worktree each under `.workers/<name>` off `main` with `node_modules` symlinked, exclusive file boundaries, orchestrator line-by-line diff review, sequential cherry-pick with full gate after each pick. Gate validated green in a fresh worktree *before* dispatch.


## Shipped 2026-08-21 (`e318f7e`, live on prod)

- **The seam** — home ⇄ theater navigations run through the View Transitions API (`viewTransition` on the four nav triggers). Globe dissolves into the theater sky (`vt-globe-sky`), city name carries across (`vt-city`). Browsers without VT fall back to the Passage rise untouched.
- **Universal site bar** — `app/components/SiteBar.tsx`, mounted in `root.tsx` above `<Outlet />`. One sticky rail everywhere: wordmark → `/`, Room → `/about`, Passport (opens overlay on home, else routes to `/?passport=1`). Home puts the intent field on that rail (`SiteSeekPortal` slots a real child into `SiteSeekRail` — not `createPortal`, which Safari drops out of the sticky flex row). Theater puts compact Seek there. About has no extra chrome. The bar never wraps; the field shrinks (`min-width: 0`).
- **Night desk** — AI dispatch letters sign `— night desk` in the theater letter; facts list gets a "the desk found" byline. Template letters stay unsigned. Gate: `room.captionSource === "ai"` → `deskSigned` prop through `listen.tsx` → `TheaterWell` → `TheaterLetter`.
- **Stamp dispatch toast** — when a 60s stamp lands, `JourneyBridge` fires `/api/ai/dispatch` for that place and grows the INKED toast a one-line headline (toast holds 6.5s instead of 4s).
- **No more dead air** — stations that send no ICY titles get a fresh ambient dispatch every 90s while playing (`useRoom.ts`); captions already refreshed per track change via `dispatchCacheKey` (station|track|hour).
- **Up next** — dock prefetches the next queue station's dispatch into `upNextStore` (10-min TTL, shared tags/language computed locally, no extra AI call for similarity); theater shows a non-interactive `UP NEXT` row. Deliberately not clickable — new interactive controls must be declared in `SURFACE_CONNECTIONS`.

Gotchas discovered this session:

- **Tailwind v3 nondeterministically drops rules inside `@layer components`** (hit the site-bar block: whole rule vanished from served CSS depending on declarations like `-webkit-backdrop-filter` / `color-mix`, and even re-appearing on identical input). The site-bar CSS therefore lives **outside any `@layer`**, at the end of `app/tailwind.css`, with a comment saying why. If you add styles there, keep them outside the layer.
- The dev server serves `/app/tailwind.css` (postcss pipeline) differently from `/app/tailwind.css?direct` (raw). After CSS edits, verify against the plain URL.
- Full page reloads restore the last station (paused) via `rehydratePersistedStores()` in a root `useLayoutEffect`. Audio does not autoplay; tap the dock disc. Empty theater is only when nothing was ever landed.
- `HeroSection.tsx` fails lint (`no-empty`) on clean `main`; file is unimported legacy. Pre-existing, not ours.

## What shipped (live product)

- Home `/`: coverline, night-earth globe, Land here / Continue, solar hours, same-hour cities
- Globe is **the list, drawn** — same stations as the board, capped (`GLOBE_LIST_CAP`). HTML tooltip = city, region, country code, that station. Click plays that row; it does not filter the list to a city. Missing Radio Browser geo falls back to the country center, then spreads so many India rows are many dots. Contract: `app/components/radio-passport/globePlaces.ts`.
- Search (any language, tag, city — not Tamil-only) keeps the globe live while the catalog arrives, then the globe becomes the search list.
- Intent bar + voice + Surprise mix, in the site bar on home
- `/listen` theater: constellation is one night with the letter (desktop sky bleeds under the type and fades into ink; phone-first fixed strip) and a knowledge graph on a seeded galaxy river. Seek lives in the site bar. Type is a letter. Honest ICY. Filing keeps the sky inhabited (disc + place/track names). After filing, one deepening pass may add stars. Faces cap at 14; each star keeps at most 3 threads so a filed film track stays a figure, not crumpled foil. The letter sits at four lines; a foil `more` opens the rest. The page is an app shell (site bar + dock); only the letter scrolls — the sky does not shrink. Home keeps the same night behind the globe (`GalaxyBackdrop`). Station rows use the station plate or the Elsewhere mark — never a clipart play.
- Atlas + country drill-down overlays
- Passport stamps after **60s continuous** listen; favorites; localStorage only
- Mobile: globe first, full-width Land here, compact dock, theater via art / Theater link
- Brand: lacquer seal + foil ring. Favicon `/elsewhere-favicon.svg`. Wordmark `/elsewhere-mark.jpg`. About colophon `/elsewhere-colophon.jpg`
- Day / Night pin on the cover chips. Default Night. Persist `elsewhere-atmosphere`. Day is paper, not a white invert. 404 stays night.
- Tuning overlay, old Radio Passport header/sidebar, Mantine about deck: **unmounted** (files may still exist — do not import them)
- Live stylesheet does not import Mantine or leftover travel CSS. Tailwind scans mounted files only.

## AI (cost lock)

- Local: Heuristics gateway, model hardcoded to `deepseek-v4-flash`
- Vercel prod (as of this session): `AI_PROVIDER=gemini`, `GEMINI_MODEL=gemini-2.5-flash` (free tier; better writing than Flash-Lite). No Heuristics URL. Needs a **redeploy** after the env fix.
- Dispatch and trivia try Flash first, then Gemini 2.5 Flash, then template / hide
- The Room owns the current land. Theater files free trivia (plate + facts + verified relations) first, then AI cover + graph, then one deepen, only when ICY sent a title
- Never put AI on the audio path
- Never `AbortController.abort()` Remix fetch (it can kill the process). Use `Promise.race`

## Audio

- Only `<audio>` is `GlobalAudioBridge` in `app/root.tsx`
- Filters / search / overlays must not `stop()` playback
- Radio Browser + CORS / mixed-content failures are real. Retry then skip. Do not fake a healthy catalog.

## Voice (use these words)

land · dusk · hour · stamp · live · cover · elsewhere · now

**Ban:** discover · seamless · AI-powered · widget · playlist · unlock · explore

## Monetization (not built)

- Paid object: **Correspondent** — **$6/mo or $60/yr**. Never call it Premium.
- Sell the desk: unlimited mix, filed dispatch, probe-ahead skip, synced passport book
- Do not paywall streams, globe, atlas, or Land here
- Account: magic link. Stripe. Flag `ELSEWHERE_BILLING=1`
- Kill if ≥200 qualified users and checkout start <1.5%, or AI COGS >35% of MRR

## Launch (not started)

- Campaign: _Someone else's now_
- Viral frame is `/listen`, not the globe
- Public domain **live**: `elsewheremusic.com` (Cloudflare DNS-only → Vercel). Apex serves. `www` serves. `radiopassport.art` + `www` 308 to the apex. See `docs/DOMAINS.md`.
- Tailscale MagicDNS can hide the new name on this laptop. Public DNS is fine. See `docs/TROUBLESHOOTING.md`.
- 14-day sequence is in `docs/ROADMAP.md`
- Do not turn on billing during launch week
- Animated favicon: **overkill**. Still seal only.

## Next work (in order)

### 0. Session 2026-08-24 — flow-audit Pass 4 shipped and LIVE (agent-army session)

The open trio fixed via **parallel agent dispatch**: three native subagents,
one per finding, each in an isolated git worktree (`.workers/<name>`, branches
`worker/f5`, `worker/f3`, `worker/f3-phone`) with an exclusive file boundary;
orchestrator verified scope up front, reviewed every diff, cherry-picked
sequentially, and re-ran the full gate on main after each pick. Briefs kept in
`.workers/briefs/`. External Codex/Grok CLIs were tried first but cannot run
under this sandbox (`FS_PERMISSION_DENIED` on session create) — use native
subagents for delegation.

- **F5 surprise silent hang — FIXED** (`8b131bd`) — `withRouteDeadline()`
  races the whole recommend pipeline against 15s; warn once, lands the
  curated mock scene; losing work never aborted. Verified live: probe
  returned 200 in **15.15s** with a valid descriptor while upstream was slow.
- **F3 snapshot false "no live signal" — FIXED** (`0925735`) — heavy
  stations=8000 call gets `{ softFail: true, timeoutMs: 30000 }`; outage ≠
  empty end to end (cache-slot clear on rejection, route 503
  `snapshot-unavailable`, client "Signal lost" + "Try again" chip on the
  existing `retry-catalog` action). Markers confirmed in served chunks.
- **F3-phone stamp-ring 16×16px — FIXED** (`5c1162f`) — painted ring 16→24px,
  invisible `::after` halo lifts tap target to 40×40 inside the shipping 960px
  query; desktop untouched. Halo rule confirmed in served CSS.
- `docs/FLOW_AUDIT` gained the Pass 4 addendum + registry-hygiene recon
  (Overlays.tsx citations for `country-close`/`passport-close` rows still to
  add at next contract-test touch).
- Gate at ship: **194 tests / 23 files, typecheck clean, eslint clean**;
  prod head `478af95`.
- Still open: **F2** atmosphere pin placement (Ums's eye), PR #16
  merge-or-close, Android TWA parked.

### 0a. Session 2026-08-23 — shipped and LIVE (auto-deploy on push confirmed)

Everything below item 1 is done; prod follows `main` via the Vercel git
integration (commit status check), so "pushed" == "live".

- **OG still + social tags** (`2ec5902`) — `public/elsewhere-og.jpg` rendered
  from `scripts/og-still.html` via `scripts/render-og.mjs` (Playwright;
  re-run after edits). Site-wide og/twitter defaults in `root.tsx`;
  per-route og:title/description/url on `/`, `/listen`, `/about`.
- **Interpret-race fix** (`6b5b941`) — stale `/api/ai/interpret` responses now
  return instead of clobbering a retyped/cleared intent (guard mirrors the
  echo's queryRef rule).
- **Legacy cleanup** (`5f2e0fd`) — 40 dead files removed (RetroTuner/Premium*
  headers, SceneManager chain, `app/scenes/*` except live `types.ts`, whole
  unimported `app/routes/components/`). Full-app eslint now clean.
- **Flow audit Pass 3** — `docs/FLOW_AUDIT` is now TRACKED: Phase A browser
  walk + Pass 3 addendum. Fixed: about-land was missing entirely (`e7e1fb3` —
  "Land somewhere →" on /about), F1 city-only same-hour pills, F4 clear
  control in IntentBar when text present (`02200ec`). Open with approach
  agreed: F5 surprise route deadline, F3 snapshot per-call timeout,
  F3-phone stamp-ring touch target. Taste call: F2 atmosphere pin placement.
- Gate at ship: 184/184 tests, typecheck, full-app eslint green.
- **Deploy note:** `npx vercel --prod` CLI auth broke mid-session (logged
  out) — do not rely on it; pushes to `main` deploy themselves.

### 1. Stamp ink progress — done 2026-08-22 (live)

- `JourneyBridge` publishes `--stamp-ink` (0..1) on `document.documentElement` once a second while the current city plays unstamped; resets on station change / pause / stamp; reduced motion never receives the var (static ring + existing title copy). Pure helper: `stampInkProgress` (unit-tested).
- The fill is a lacquer conic-gradient on `.ew-stamp-ring`, appended **outside any `@layer`** at the end of `app/tailwind.css` (same layer-drop gremlin as the site bar). `PlayerDock`'s inline style only sets `background` when stamped, so the stylesheet owns the unstamped fill.
- Contract tests untouched and green: `isStampReady` semantics did not move; 182 passing.

### 2. Ticket-stub passport — done 2026-08-22 (local, not yet deployed)

- Stamps in `PassportOverlay` render as boarding-pass stubs: `.rp-stamp-ticket` — semicircle side notches punched through with CSS `mask` (autoprefixer adds `-webkit-`), dashed tear line, big italic city on the main panel, tear-off strip carrying local time at stamp moment (`stampedAt` → HH:MM), short date, telemetry small. ±1.5° rotation kept; empty slots untouched.
- Ticket CSS lives **outside any `@layer`** at the end of `app/tailwind.css` (layer-drop gremlin).
- Halftone grain: new `app/components/radio-passport/halftone.ts` — one fixed 6×6 dot tile reused as a CanvasPattern, stamped over the playing wash (`ParticleGlobe`, α .05) and nebulae (`GalaxyBackdrop` α .07, `TheaterWell` α .06). No per-pixel loops anywhere; skipped under reduced motion.
- Voice gate: no new copy — stubs render stored data only.
- Review pass 2026-08-22 (`3907729`, external DeepSeek harness): fixed a mangled fragment in `.rp-stamp-ticket .rp-stamp-stub strong` (postcss could not parse tailwind.css at all); restored `color: var(--ew-bone);`. Rest of the checklist clean; gate re-verified locally (183/183, typecheck).

### 3. Intent echo — done 2026-08-22 (local, not yet deployed)

- Pure helper `intentEchoFromInterpret(prompt, intent)` in `productFlow.ts`: language rewrite wins (mirroring route precedence); identical or whitespace-equal query whispers nothing; returns null otherwise. Unit-tested in `elsewhereFlow.test.ts`.
- `_index.tsx`: `intentEcho` state + `queryRef` staleness guard (a slow interpret response never whispers over retyped text). Echo set after the existing setQuery calls; cleared on any keystroke in the IntentBar onChange. Props: `statusLabel={intentEcho ?? seek.label}`, spoken `Heard: ${echo}`. Tone unchanged. No CSS changes.
- Contract untouched: `seekingStatus` outputs still locked by exact assertions; 183 passing.

### 4. Sky draws connections — done 2026-08-22 (on PR #17, awaiting review)

- Pure curve `fieldGraphPulse(ageMs, reduced)` + `GRAPH_PULSE_MS = 1400` in `theaterLock.ts`, modeled on the star-birth bloom family: quick attack (~18% of window), quadratic settle, exact 0 at the boundary (`>=` clamp against float epsilon); reduced motion always 0. Unit-tested in `theaterLock.test.ts`.
- `TheaterField` tracks graph edge count; any increase (first land or deepen growth) fires a one-shot pulse: knowledge-edge alpha up to x1.7 clamped <= 1, line width +0.9px. Render-side only — seeded field math untouched.
- Gate green on branch: 184/184 tests, typecheck, eslint.

### 5. Flow audit + loops — Pass 3

Walk every entry in `SURFACE_CONNECTIONS` (`productFlow.ts` ~106–380) by hand on desktop + mobile; log friction; fix. Then design the retention loops on top of a clean floor: passport milestones (10th stamp, continents complete), dusk-hour return nudges ("it's dusk in Kochi"), stamps-as-next-city pull (already half-built via `resolveStampReplay`).

### 6. Android (parked by Ums until web feels done)

TWA → Play Store via Bubblewrap/PWABuilder was the chosen path (near-zero code). Revisit only after 1–5. Background-audio/media-session quality is the thing to evaluate when deciding TWA vs Capacitor.

### Still open (business track, unchanged)

- OG still from `/listen` on the new host
- 14-day _Someone else's now_ campaign (`docs/ROADMAP.md`)
- Correspondent ($6/mo) — magic link + Stripe + quotas + probe-ahead; billing flag stays off during launch

## Housekeeping

- `.playwright-mcp/` test artifacts are untracked; add to `.gitignore` if they annoy.
- Known leftover (predates this range): a slow `/api/ai/interpret` response can still overwrite a retyped query via the unconditional setQuery calls in submitIntent — the echo has a queryRef guard, the rewrite does not. Fold into item 5 flow audit if it bites.
- Legacy dead files fail lint (`HeroSection.tsx` `no-empty`) and are unimported; safe to delete in a cleanup pass (`RetroTuner`, `Premium*`, `AppHeader`, `MobileSidebarMenu`, scenes/\*).

## Key files

- `app/routes/_index.tsx` — home
- `app/components/radio-passport/*` — globe, `globePlaces.ts`, overlays, intent, stamps
- `app/components/PlayerDock.tsx`
- `app/state/roomStore.ts` — current land
- `app/hooks/useRoom.ts` — dock writer
- `app/routes/listen.tsx`
- `app/components/SiteBar.tsx` — universal bar (root-mounted)
- `app/state/upNextStore.ts` + `app/components/radio-passport/UpNextRow.tsx`
- `app/constants/brand.ts` + `app/tailwind.css`
- `app/services/ai/gateway.ts`
- `docs/ROADMAP.md`

## Tests

`npm test` — 183 passing (22 files; `stampInkProgress` + `intentEchoFromInterpret` added 2026-08-22). Keep those exports (`titleCasePlaceName`, `toggleSelection`, `shouldAnimateDock`, `aggregateCountryStationContext`, `applyAiPreviewPool` returns the descriptor, `stampForContinuousSession`, `stampInkProgress`, `intentEchoFromInterpret`, `sharedSignals`). Note: `elsewhereProduct.test.ts` asserts the raw compact formatting of `app/tailwind.css` — keep one-line rules like `.ew-theater-well { min-height: 16rem; }` intact (editor formatters will reflow the whole file if you let them).
