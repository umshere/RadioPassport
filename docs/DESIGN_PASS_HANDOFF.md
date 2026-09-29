# Design & code pass — handoff (updated 2026-09-29)

Live: https://elsewheremusic.com · last shipped: dock shows cleaned track title (`9w0kyb26g`). Design system (Claude artifact, private): https://claude.ai/artifact/KKCEZDJp8YyEuvQhSjaJEg — **v11, now behind** (see "Next"). Review + plan: `docs/DESIGN_REVIEW_2026-09-28.md`.

## Shipped since the last handoff
- `Index()` 1,247 → 488 lines: hooks `useHomeIntent/CatalogSearch/Stations/Overlays/Play`, components `HomeIntro/HomeGlobeSide/HomeOverlays`.
- UI primitives in `app/components/ui/`: `Button/ButtonLink/Chip`, `Eyebrow`, `Row` (list|tile), `Sheet` (modal layer).
- Board sheet (phone): measured peek shows whole rows under the hour rail (`measurePeek`, `--ew-peek`), grip attached to its label, dark ink like the page with only a foil top edge + faint glow (no lighter surface — user asked).
- Play disc **is** the stamp (`.ew-stamp-disc`; red heart grows over 60s; slam when done). Old ring gone.
- **Keeper** (`app/components/keeper/`, store `state/keeperStore.ts`): floating, draggable, pixel-art sprites cut from the user's sheet (`public/keeper/*.webp`; 6 state sprites used: idle/searching/found/listening/speaking/chill, 6 scene sprites kept: passport/atlas/control/explore/travel/nextstop). Sheet: facts, chips, question box, artwork beside "On air", "Open the desk →" link to /listen.
- **Keeper questions LIVE** (Vercel env `KEEPER_ASK_ENABLED=true`, `TYPESAFE_API_KEY` set by the user). `/api/keeper/route` (Jev intent routing, 1.2s race, rules fallback) and `/api/keeper/ask`.
  - Knowledge mode: named artist/genre/place ("Who is Ilayaraja?") → Wikipedia snippet (User-Agent header, 10-min cache) returned at once as `knowledge+snippet`; the LLM (Gemini direct, no thinking, 4.5s) only when no snippet; validator (`validateKeeperAnswer`) rejects airplay claims/unmatched quotes/banned words; label "From general knowledge — not from the station". Now-playing + injection questions stay strict (facts only, never invent a title).
  - `keeperAliases.ts` (11 seeded artists incl. Tamil/Malayalam), `keeperTopic.ts`, `services/keeper/{cleanTitle,knowledge.server,validateKeeperAnswer,jev.server,keeper.server}.ts`. Spec by Opus: `.claude/worktrees/agent-ac5fdd56505726d0a/docs/KEEPER_KNOWLEDGE_SPEC.md` (Jev extras — topic choice, title_kind, second opinion — deliberately NOT built; Jev batching wire format unverified).
- **Theater is now "the desk"** (`app/routes/listen.tsx`, `DeskDossier.tsx`): artwork + place + hour on top, dossier in the drop-up `BoardSheet`; the animated constellation (TheaterWell/TheaterNodes/AmbientLine) deleted. Titles cleaned by `cleanTrackLine` (dock + desk + keeper facts).
- Tests: 463 pass (`npx vitest run`, Node 22).

## Gotchas
- Node 22: `export PATH="$HOME/.nvm/versions/node/v22.23.0/bin:$PATH"`.
- Tailwind purges `@layer components` classes not in `content`; new late CSS blocks (desk, keeper sprites, basis label) are appended OUTSIDE layers at the end of `app/tailwind.css`. Keeper CSS test slices to EOF: no hex, no box-shadow in the last block... (check `tests/unit/keeper.test.ts` before adding).
- Many tests read source by path; when moving code, update tests to the new file.
- Ship: `npm run ship`; verify with curl + `vercel ls`. Never `vercel --prod` after push.
- Secrets: never ask for/paste keys in chat; user sets Vercel env vars themselves (`vercel env add … production`, non-interactive: `printf 'true' | vercel env add …`).
- Jev is a choice model (routing/classifying), not a writer. Keeper animation state is rule-derived, not Jev.
- Opus is used for design direction/specs only; Sonnet does the building.
- Bash tool can throw transient "classifier no verdict" errors; retry.

## Next (in order)
1. **Update the design-system artifact** (working copy: `/private/tmp/claude-501/-Users-umeshmc-Code-RadioPassport/d674d16d-5d86-47c1-bf25-3a575c4b6b6c/scratchpad/ds/project`, script pattern in `/tmp/ds_update.py`; publish with `Artifact` url + `root` + `file_path` design-system.json + `files` list). Needed: Keeper page → sprites (upload 6 webps as assets with `asset:true`, use their urls in preview.html) + knowledge label; BoardGrip README → edge-only treatment (NOT lighter surface); new "Desk" page (Theater); Sheet/Row/Eyebrow already added in v11.
2. Prune dead Theater CSS (~300 lines: `.ew-theater-*`, `.ew-knode*`, `.ew-orbit`, `.ew-journey`, tide/lane) and unused helpers (`theaterKnowledge`, `theaterFragments`, `knowledgeCopy`, `theaterLock` field functions) + their tests.
3. Split `tailwind.css` (tokens / base / components). Migrate remaining raw `<button>`s. Move `UpNextRow`/`TheaterQueue` rows to `Row`.
4. Åland-flag guard: directory data lists "EXA FM…" as country AX with state "Veracruz, México"; optional rule: state ending ", <other country>" wins.
5. Speed: dock "up next" fetch; parallel probe batches.
6. Optional: keeper scenes (passport on stamp, next stop on hour hop); Theater/keeper usage counters; hour rail highlighting local hour (needs decision); type scale 20→9, radii 8→4.
7. User to test on iPhone: keeper sheet + questions, drop-up sheet edge, desk page, compact seal tile.
