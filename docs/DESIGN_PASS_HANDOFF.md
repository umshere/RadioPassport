# Design & code pass — handoff (2026-09-28 → 29)

Live: https://elsewheremusic.com · last shipped `6cca3ab`. Design system (Claude artifact, private): https://claude.ai/artifact/KKCEZDJp8YyEuvQhSjaJEg — kept in sync after every visible change.
Review + plan: `docs/DESIGN_REVIEW_2026-09-28.md`.

## Shipped this pass
- Phone: collapsed board sheet clipped (no ghost rows under dock/band); dock art canvas → removed on phone; Back lives in the deck; 44px targets; search is a 48px square bar; globe grows into space freed by moving Night/Day.
- Night/Day switch: off the phone home → About ("Appearance"). Room → **About** (nav + plain copy). Hour decoder only until first stamp.
- Station rows: plain sans names, ellipsis (flip board only on cover place name + overlay titles).
- Loading: skeleton rows, artwork fades in over the seal.
- Hook: first visit shows "You are not here. Hear <city> right now." above Land (until first stamp).
- States: one button-state grammar (pressed, busy, disabled, no sticky hover on touch) at the end of `app/tailwind.css`.
- Tokens: `--rp-*` retired; `--ew-lacquer-text`, `--ew-passport-*` added; global `:focus-visible`.
- Perf: probe gives up on a silent host after 2.2s (was ~6s); Mantine out of first-load bundle; dead `VoiceInput`/`PretextMeasuredText` deleted.
- Code: `app/components/ui/Button.tsx` (Button, ButtonLink, Chip); `StationBoard`; `services/home/homeBoard.server.ts`; hooks `useHomeIntent`, `useCatalogSearch`, `useHomeStations`; `utils/stationSearch.ts`. `_index.tsx` 1247 → 978 lines.

## Gotchas learned
- Node 22 needed for tests/build: `export PATH="$HOME/.nvm/versions/node/v22.23.0/bin:$PATH"`.
- **Tailwind purges `@layer components` classes not found in `content`.** New folders with class strings must be in `tailwind.config.ts` (a test guards `components/ui`). Restart the dev server after changing the config.
- Many tests read source files by path and grep strings (`_index.tsx`, `tailwind.css`, `StationRow.tsx`…). When moving code, update those tests to read the new file.
- Ship = fast-forward `main`, `npm run ship`, verify with curl + `vercel ls -m githubCommitSha=<sha>`.

## Next (in order)
1. `Index()` → under ~500 lines: overlay orchestration hook (Atlas/country/passport), Surprise/AI hook, `HomeIntro` component (cover, hour rail, Land).
2. Primitives: Eyebrow, Row, Sheet; migrate remaining raw `<button>` (≈40 left, mostly Overlays/Theater/Dock).
3. Split `tailwind.css` (tokens / base / components) — tests read it by path; mind the layer quirk.
4. Speed: dock "up next" fetch; parallel probe batches; consider trimming per-station payload.
5. Optional product: hour rail highlighting the listener's local hour (changes filtering — needs a decision).
6. Loading polish on Theater; type scale 20 → 9 sizes; radii 8 → 4.
