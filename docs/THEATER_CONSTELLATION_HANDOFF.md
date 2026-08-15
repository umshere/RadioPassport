# Handoff — Theater constellation

Pass this whole file to Claude Opus. Ask it for **story direction** first, then small tweaks. Do not treat this as a rewrite brief.

**Repo:** `/Users/umeshmc/Code/RadioPassport`  
**Product:** Elsewhere (`elsewheremusic.com`)  
**This work is local only.** Live is still `d245fb0` (Atlas mobile fit). Dev: `http://localhost:5173/listen` after landing a station.

---

## What to tell Claude

You are reviewing a listening room, not adding a feature. The user opened Theater and saw two problems:

1. The type jumped when extra copy arrived (ELSEWHERE walked up the page).
2. The AI cover was invisible. Then it popped in. Then a boxed orbit looked like a loader. Then a random mesh. Then a metadata mesh that **restarted** and **snapped** to a new pattern when facts landed.

The current local code is the last of those: a metadata-driven foil constellation behind the type, with a lacquer disc (the brand mark) walking real edges and naming the star it is on.

**Job for you:**

1. Read the files below. Do not invent a new system.
2. Give a **story** for this room in Elsewhere’s voice. What is the user witnessing? One sentence, then the beat.
3. Say what is already right and must stay.
4. Propose **only tweaks** — density, tour order, label voice, glow, when the disc stops. Not a new widget. Not cyan tech. Not “AI loading”.
5. If you change code, keep tests green (`npm test`). 161 tests at last run.

---

## Voice and hard rules

Voice: **land · dusk · hour · stamp · live · cover · elsewhere · now**

Banned: discover · seamless · AI-powered · widget · playlist · unlock · explore

Never:

- Charge radio
- Invent ICY titles
- `AbortController` on Remix server fetch (`Promise.race` only)
- Bounce motion
- Spoonfeed (“looking up AI context…”)
- Mount leftovers (`RetroTuner`, `HeroSection`, `CountryFlag`, Mantine)

Night is default. Lacquer `#C73A3A` never changes. Type: Newsreader italic, Schibsted Grotesk, Azeret Mono. Spec: `docs/DESIGN_SPECS.md`.

Product loop: land → intent → tune → inhabit → stamp → next. Theater is **inhabit**. It is not discovery.

---

## Settled story (Opus, 2026-08-14)

**One sentence:** While the cover files, the disc walks everything the station has already told you — and when the dossier is ready, the room goes still.

The disc is **reading the sleeve**, not seeking. Tags first (character), then language, then track, then facts. Seats stay. Visit labels stay (mono caps, once). Fact stars say the value (`2007`), not `YEAR`. Silent stations do not walk. Dispatch/cover stay unnamed stars. Triangle fill is light (`0.08`) so tag-heavy rooms stay a constellation, not crumpled foil.

## The story we were reaching for

Theater is a quiet room you enter after you have already landed. The city name is the coverline. The station is already playing in the dock.

Below the type, a reserved well waits. Behind the whole page, a constellation **is** the metadata — not decoration, not a spinner.

- Stars only exist for fields we actually have.
- Kindred families connect (tags↔genre, track↔facts, place↔language). Unrelated families stay apart.
- While we are still reading the stream or filing the cover, the **lacquer disc from the favicon** walks those edges. When it rests on a star, that star names itself (`FADO`, `ENGLISH`, `2007`). You learn the sky by watching the visit.
- When the dossier is ready, facts fade into the well. The disc stops. Existing stars keep their seats; new ones fade in.

If a station sends no title, we say so. We do not invent one. The sky stays sparse.

---

## How information actually arrives

Three honest sources. Nothing else.

| Beat | Source | When | What it may add |
|---|---|---|---|
| Landed | `Station` | immediately | city, country, lon, bitrate, codec, languages, tags (cap 8) |
| Live title | ICY via `/api/now-playing` | dock poller only | artist, title — or honest empty |
| Dispatch | `/api/ai/dispatch` | ~1.5s after play, cached 30m | one caption line |
| Cover | `/api/now-playing-trivia?source=ai` | only if ICY sent a title | summary + up to 4 facts (theater shows 3) |

**Pollers (this was the restart bug):**

- `PlayerDock` owns the **only** ICY poller and publishes to `useNowPlayingMetadataStore`.
- Home (`app/routes/_index.tsx`) and Theater (`app/routes/listen.tsx`) **read the store**. They must not start a second ICY poller.
- Trivia: `useTrackTrivia` now joins an in-flight promise + module cache. Unmount must not abort the fetch (that was aborting home and refetching on `/listen`).
- Leftover screens (`HeroSection`, `CountryOverview`, `RetroTuner`) still start their own pollers if anyone remounts them. Leave them unmounted.

Theater phase (`theaterPhase`):

- `reading` — playing, no title yet, ICY still loading
- `locking` — title exists, trivia loading or idle
- `filed` — trivia ready
- `quiet` — paused, no title, or trivia empty/error

`theaterIntelligence` hides summary/facts unless ICY sent a title. Dispatch may still show.

---

## Constellation model

All logic is pure in `app/components/radio-passport/theaterLock.ts`.  
Draw loop is `TheaterField` in `app/components/radio-passport/TheaterWell.tsx`.  
Page wiring is `app/routes/listen.tsx`.

`theaterReleases` emits one `FieldRelease` per real field:

| Family | Node | Visual | Tour order |
|---|---|---|---|
| place | city, country | foil; X from longitude if we have it | 4 |
| signal | `128k`, `mp3` | ether | 5 |
| language | each token, cap 4 | bone | 1 |
| tag | each unique tag, cap 8 | bone, wider cluster | 0 (first) |
| track | artist, title | ether | 2 |
| dispatch | internal, **no visit label** | foil | last |
| fact | Year / Album / Genre… | foil | 3 |
| cover | internal, **no visit label** | foil | last |

Homes are **keyed** (`lockSeed([stationSeed, release.key])`). Adding a track or fact must not move `place:san francisco`. That contract is tested.

Edges: same family 1.55× reach; kindred families 1.35×; others 0.52×. Triangles reject skinny faces (longest/shortest > 3.1).

Motion (`fieldDensity`): locking brightest; filed dim; quiet almost still. Drift is tiny. Never bounce. `prefers-reduced-motion`: still mesh, disc rests on the first star.

Traveler: `startFieldTraveler` / `advanceFieldTraveler`. Stateful. Must **not** reset when the node list grows. Draw: foil ring + lacquer disc (the mark). Label only while dwelling, Azeret Mono, uppercase, skip `dispatch`/`cover`.

Canvas loop depends on **seed only** (station change). Phase and nodes are refs so facts arriving do not tear down rAF.

Well: reserved min-height (`16.75rem` / `16rem` mobile) so `← Elsewhere` and the city do not walk. Back link is sticky. Stage is `justify-end` with the well absorbing growth.

---

## Files to read (in this order)

1. `docs/DESIGN_SPECS.md` — tokens, theater paragraph, motion
2. `app/components/radio-passport/theaterLock.ts` — releases, homes, edges, traveler
3. `app/components/radio-passport/TheaterWell.tsx` — canvas + well
4. `app/routes/listen.tsx` — wiring, store, trivia
5. `app/hooks/useTrackTrivia.ts` — cache + in-flight join
6. `app/components/PlayerDock.tsx` — `setMetadata(metadata)`
7. `app/state/nowPlayingMetadataStore.ts`
8. `app/components/radio-passport/productFlow.ts` — `theaterIntelligence`, `theaterWithoutStation`
9. `tests/unit/theaterLock.test.ts`

CSS: `.ew-theater`, `.ew-theater-field`, `.ew-theater-back`, `.ew-theater-stage`, `.ew-theater-well` in `app/tailwind.css`.

---

## What is still rough (review these)

- Dispatch/cover nodes exist but stay unnamed. Is that honest, or should they not be stars?
- Fact nodes are labeled with the **fact label** (`YEAR`), not the value (`2007`). Story question.
- A tag-heavy station (8 tags) is a large foil solid. Density may still read as wallpaper on desktop.
- Isolated nodes (no kindred neighbor) can sit as stray dots far from the mesh.
- `fieldDensity.count` is unused (always 0). Dead field.
- Home still runs `useTrackTrivia` for the coverline. Same cache as Theater if the track key matches.
- `nowPlayingMetadataStore` is not persisted. Hard refresh on `/listen` waits for the dock to poll again.
- Empty theater (`no nowPlaying`) has no field. Fine.
- Not shipped. Do not `vercel --prod` unless the user says make it live.

---

## Story questions for Opus

Answer these before touching code:

1. What is the one sentence the room is saying while the disc walks?
2. Should the disc be **filing the cover** (seeking facts) or **touring what we already know** (tags first)? Today it prefers tags, then language, then track, then facts.
3. When trivia lands, should the sky **stay** the tag figure and only add three fact stars — or may it re-balance? Code now keeps seats.
4. Are visit labels (`ENGLISH`, `AMBIENT`) the right voice, or too HUD?
5. On a silent station (no ICY), is a sparse place+signal+tag mesh enough, or should the disc not walk at all?

---

## Tests to keep green

`npm test` — 161 at last run.

Critical contracts in `tests/unit/theaterLock.test.ts`:

- No invented title
- One node per released field; tag cap 8
- Two stations draw different skies; place X follows longitude
- Adding a track does **not** move the city node
- Walk starts on a tag; visit labels hide cover/dispatch
- Traveler advances along an edge without resetting `from`
- Theater reads the store; home does not call `useNowPlayingMetadata(`
- Dock publishes `setMetadata`

Stylesheet: `.ew-theater-field`, `.ew-theater-well` min-height `16.75rem`.

---

## How the user will judge your pass

Land two different stations. Open Theater.

- `← Elsewhere` does not move.
- The disc walks. Stars name themselves.
- When the note and year appear, the old stars stay. New ones fade in. No snap to a new constellation.
- A silent station does not pretend to have a title.
- It still feels like a room, not a dashboard.
