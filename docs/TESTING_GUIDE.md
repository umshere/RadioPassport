# Testing guide

```bash
npm test            # vitest run: tests/unit/**/*.test.ts, environment node
npm run typecheck   # tsc
npm run lint        # eslint over app and tests
```

Verified on Node 22 (`export PATH="$HOME/.nvm/versions/node/v22.23.0/bin:$PATH"` on Ums's machine; `package.json` only demands Node 18 or later). If `npm` hits `EPERM` on `~/.npm`, use a writable cache: `npm install --cache "${TMPDIR:-/tmp}/elsewhere-npm-cache"`.

There are about 50 files and 450 assertions in `tests/unit`. There is no browser test suite: `playwright.config.ts` exists but `tests/` has only `unit/`. Visual checks are done by hand or with `scripts/verify-desktop.mjs` and `scripts/verify-board-sheet.mjs` (Playwright screenshots against a running dev server: `node scripts/verify-desktop.mjs <baseUrl> <outDir>`).

## The product loop

Elsewhere is one loop: land, intent, tune, inhabit, stamp, next (see [UI_FLOW.md](./UI_FLOW.md)). The contract is `SURFACE_CONNECTIONS` in `app/components/radio-passport/productFlow.ts`; `tests/unit/elsewhereFlow.test.ts` checks it. A control without a next step is a dead icon.

## What the tests cover, by file

| Area | Files |
|---|---|
| Loop and product rules | `elsewhereFlow`, `elsewhereProduct`, `passportPresentation`, `radioPassportRedesign`, `radioPassportInsights` |
| Home (Departures Hall) | `home`, `homeModel`, `flipBoard` |
| Desk | `desk` |
| Keeper | `keeper`, `keeperApi`, `keeperKnowledge`, `keeperMurmur`, `keeperCleanTitle` |
| Tickets and sharing | `ticket`, `shareStation` |
| Room's light | `env` |
| Rooms | `atmosphere` |
| UI primitives and controls | `uiButton`, `uiRow`, `buttonType` |
| Player, streams, probes | `playerStore`, `playbackRecovery`, `probeAhead`, `nowPlayingMetadataLifecycle`, `playerNoticeChannel`, `persistRehydrate`, `upNext`, `stationCountryGuard`, `discoveryFiltersAndAvailability`, `catalogOutage` |
| Journey and stamps | `stampRing`, `roomStore` |
| Catalog, names, languages | `countryData`, `placeNames`, `languages`, `ranking`, `repairMojibake`, `artwork` |
| AI | `providers`, `providerUtils`, `geminiProvider`, `openRouterModels`, `intentExtractor`, `apiRecommendRoute`, `fallbackLogic`, `triviaEvidence`, `atlasExpand` |
| Repo hygiene | `skillTwins` (skills identical across trees) |

## Rules that will bite

- **CSS is read by path.** Many tests assert on stylesheet text. Use `readAppCss()` from `tests/unit/appCss.ts`: it reads `app/tailwind.css` and concatenates every `@import`ed file in order, so a rule can move between `app/styles/*.css` files without breaking the test. Do not read one CSS file by name unless the test is about that file (`env.test.ts` reads `15-env.css`).
- **Source is read by path.** Several tests read component files as text (wiring guards, "no hex in the last CSS block", "the sheet is gone"). When you move code, update the path in the test in the same change.
- **Every `<button>` has a `type`.** `buttonType.test.ts` scans all `.tsx` under `app/`.
- **The Keeper's CSS test slices to the end of the file.** Read `tests/unit/keeper.test.ts` before adding rules at the end of `10-keeper.css` (no hex, no box-shadow in the last block).
- **`ship.mjs` and `DEPLOY.md` are tested.** `elsewhereProduct.test.ts` reads both. Keep the strings it checks (`npm run ship`, `gh auth token -u umshere`, `vercel ls -m githubCommitSha`, "never `vercel --prod` after a push").
- **Skills stay identical.** `skillTwins.test.ts` compares `.claude/skills` and `.grok/skills`. Change the `.claude` copy, then run `npm run sync:skills`. `.agents/skills` is kept identical by hand (the script does not cover it).
- **MusicBrainz pacing.** Set `MUSICBRAINZ_MIN_INTERVAL_MS=0` in tests that call the trivia route.

## Empty and error states (each must name a next step)

| State | Next step |
|---|---|
| Empty search | Surprise, Atlas, Clear search |
| Catalog unreachable | Try again, Atlas |
| Hour with no city | Clear the hour, Atlas, Surprise |
| Filtered place with no rows | Show every city, Atlas |
| Empty Atlas search | Clear search |
| Empty passport | Ghost slots and Find a city |
| Dead stamp replay | Open that country, or the Atlas |
| Failed mix | Try the mix again |
| Failed country catalog | Retry |
| `/listen` with no station | Land button |
| 404 or error | Back to Elsewhere |

## Manual checklist before calling a UI change done

- Home on a phone width (375) and desktop (800+): gates stick under the header, the board scrolls beneath, nothing hides under the dock or band.
- Desk with a station playing and with none.
- Land, wait 60 seconds, see the stamp and the toast.
- Share: the ticket sheet opens, `/ticket/<uuid>.png` renders, `/t/<uuid>` carries the meta.
- Night and Day both, and `prefers-reduced-motion`.
- iOS Safari: keyboard open and close on the home does not leave the header scrolled away; a grid item that scrolls has not collapsed (see AGENTS.md).

## Playback locks (never break)

Search, hours, overlays and the Keeper never call `stop()`. Never invent an ICY title. Never put AI on the audio path.
