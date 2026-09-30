# Mobile band handoff — one frame on every page

The boards live in this repo, as standalone HTML you can open with no login,
no server and no build: **`docs/design/mobile-band/`** (see its README). Start
with `System.html`. There is also a canvas at
<https://claude.ai/code/artifact/0e0a7981-9692-41c7-abb0-95c476a0de85>, but it
needs a logged-in session — if you cannot open it, the committed boards and
this document are the whole spec and nothing is missing from them.

The problem this fixes: on a phone the header wraps, the globe is a 148px grey
sliver, the horizon rail is a 999px pill in an otherwise square design with
Atlas bolted to its side, the dock carries seven controls in 358px, and nothing
carries between `/`, `/listen` and `/about` — three pages, three frames.

Nothing here changes desktop. Every rule below is inside a mobile media query
unless it says otherwise.

## Hard rules (house rules apply unchanged)

- Never charge to hear radio. Never invent ICY titles. Never put AI on the
  audio path. Never `AbortController.abort()` a Remix fetch.
- Banned copy: discover · seamless · AI-powered · widget · playlist · unlock ·
  explore. The nav slots are **Elsewhere · Atlas · Theater · Room**.
- **Tailwind v3 drops rules inside `@layer components` nondeterministically**
  (see `docs/SESSION_HANDOFF.md`). Every new rule here goes in the appended
  section at the bottom of `app/tailwind.css`, outside any `@layer`, one-line
  rule format — same as `.ew-site-bar`, `.ew-stamp-ring` and `.rp-intent-clear`
  already do.
- **Do not resurrect `/atlas`.** `docs/ATLAS_HANDOFF.md` records that the route
  was removed on purpose. Atlas is an overlay owned by `_index.tsx` state.
- No new dependencies.

## Phase 1 — the band

The deliverable: a 52px bar and a bottom band that are byte-identical on `/`,
`/listen` and `/about`. Ship this alone and stop; it is most of the win.

### 1.1 New — `app/components/BandNav.tsx`

Four destinations under the dock, 44px tall, `grid-template-columns:
repeat(4, 1fr)`, `Azeret Mono` 9px / `.16em` / uppercase, `--ew-dust` at rest,
`--ew-foil` plus `box-shadow: inset 0 -1px 0 var(--ew-foil)` for the current
page. Mobile only (`max-width: 960px`); desktop never renders it.

| Slot | Destination |
|---|---|
| Elsewhere | `/` |
| Atlas | opens the Atlas overlay (below) |
| Theater | `/listen` — dimmed to `rgba(154,143,128,.4)` and `aria-disabled` when the Room is empty |
| Room | `/about` |

**Atlas slot — copy the passport pattern exactly.** `productFlow.ts` already
has `OPEN_PASSPORT_EVENT` / `requestOpenPassport()` / `passportRequested()` /
`homeWithPassportHref()` / `openPassportNow()`. Add the same five for Atlas:
`OPEN_ATLAS_EVENT`, `requestOpenAtlas()`, `atlasRequested(search)`,
`homeWithAtlasHref()` → `/?atlas=1`, `openAtlasNow(pathname, goHome)`. On `/`
it fires the event (`_index.tsx` already owns `setAtlas`); anywhere else it
navigates to `/?atlas=1`. Mirror how `_index.tsx` consumes `passport=1` today.

Render `BandNav` where `PlayerDock` is rendered so it sits on every page.

### 1.2 `app/components/SiteBar.tsx`

The bar becomes identity plus passport, nothing else.

- Remove the `Room` link — Room is a nav slot now.
- Remove `SiteSeekRail` from the bar (it moves into the page, 1.3). Keep
  `TheaterSeek` on `/listen` for now; a follow-up can move it too.
- Delete the `.ew-site-bar.is-home` wrap block in `app/tailwind.css`
  (~line 1829) — with the field gone the bar never wraps.
- The bar stays one row at 52px + safe-area, `justify-content: space-between`.

### 1.3 Search moves into the page

`SiteSeekRail` renders as the first element of the home column, full width,
48px, `margin: 14px 16px 0`. Keep the existing `.rp-intent` box; restyle
`.rp-surprise` from a nested outlined box to a foil text button separated by a
1px `var(--ew-rule-2)` divider inside the same box. Keep the 16px input floor
(the iOS zoom comment in `tailwind.css` explains why — do not lower it).

### 1.4 Dock — mobile

In the `max-width: 960px` block, on `.rp-dock`: keep artwork (44), title +
`LIVE · <land>` sub-line, prev and next at 44, and the play disc (48). Hide the
heart, `.ew-stamp-ring` and `.rp-theater-link` — the passport is in the bar,
favourite is on the station row, and Theater is a nav slot, so all three were
saying something twice. Re-show `.ew-dock-sub`; it sets `display: none` on
mobile today and the band has room for it now.

**Prev and next stay.** They carry `step: "next"` — the closing step of
`ELSEWHERE_LOOP` — through `dock-prev` / `dock-next` in `productFlow.ts`, and
the dock is the only surface that offers it on a phone. Dropping them left the
loop with no way to close, which is the "dead icons" rule running backwards: not
an icon without a step, but a step without a control. Under 360px prev yields
first, since `next` is the one the loop actually names.

Dock height 64. The band is the 44px nav on its own, and the dock's 64 is
reserved only while something plays — otherwise an idle page holds open a strip
for a dock that is not there. Set `--player-dock-clearance: 44px` in the mobile
block and raise it to 108 under `:root:has(.rp-dock)`. **Anything positioning
against the band reads the variable**; never hardcode 44 or 108.

### 1.5 Horizon rail — de-pill

`.ew-hours`: `border-radius: 999px` → `0`, drop the pill background and the
`::after` inner track, become `display: grid; grid-template-columns: repeat(4,
1fr)` with a 1px `var(--ew-rule)` top and bottom border and a 1px right border
between stops. Each `.ew-hour` stays ≥44px with its icon, mono label and ember
dot; the lit stop keeps its `--hour-hue` glow — that part is good and stays.

### 1.6 Atmosphere and the Atlas line

- Delete `.ew-atmosphere-icon` and its mobile block (~line 1451). The
  atmosphere control becomes a mono text button on the horizon head row:
  `HORIZON` (dust, left) and `NIGHT / DAY` (foil for the active half, dust for
  the other, right), ≥44px tap target.
- Remove `.ew-atlas` from the horizon row. Atlas is in the band; a 50px row on
  home said it twice. The board header takes `LIVE NOW` on the left and
  `<n> LANDS` on the right instead.

### 1.7 Globe

`.rp-globe-wrap` mobile height `148px` → `174px`. Keep the "one height while
seeking" rule and its comment — do not make the height depend on seek state.

### 1.8 Dead code

Delete — nothing imports them (verify with a fresh grep before removing):
`MobileTabBar.tsx` (a neumorphic `#e0e5ec` tab bar from an older era),
`Footer.tsx`, `AtlasHeatmap.tsx`, `CompactStationList.tsx`, `SignalField.tsx`,
`TuningOverlay.tsx`, and `StationArtwork.tsx` if `CompactStationList` was its
only consumer. Also delete the orphaned `.ew-atlaspage-*` block in
`tailwind.css` — it styles the route `ATLAS_HANDOFF.md` says was removed.

## Phase 2 — scrolling home

Board: `docs/design/mobile-band/Scroll.html` — three beats at 390×844.

Home is one column between the two fixed bars. At 844 the window is 844 − 52 −
108 = **684px** while something plays, 748 when the room is quiet. The column
as drawn is ~1,270px, so there is roughly 585px of travel to the last row.

**One element condenses, once.** When the coverline leaves the top, a 44px
strip appears directly beneath the bar carrying, left to right: a 7px ether
dot, the land in mono foil, `· LIVE · 13:48` in mono dust, and a 44px search
glyph pushed right that returns to the seek field. It hides again when the
coverline comes back. Nothing else moves — no shrinking bar, no collapsing
dock, no parallax.

Implementation notes, each one a thing that will bite:

- Use an `IntersectionObserver` on `.ew-coverline`, not a scroll handler.
  Keep `root: null` and set `rootMargin: "-52px 0px 0px 0px"` so it fires on
  the bar's bottom edge rather than the viewport's top. Do **not** observe
  against `.rp-stage` as the root: on mobile `.rp-stage` is the scroller (the
  document itself does not scroll — `scrollHeight` equals the viewport), and
  wiring the root to it makes the margin mean something different.
- Home only. The strip must not appear on `/listen`, `/about` or over an
  overlay.
- Position it at `top: calc(52px + env(safe-area-inset-top, 0px))` with a
  z-index below the overlays (they are 100/120/200) and above the column.
- The list scrolls *under* the strip; do not add a mask or a fade.
- Respect `prefers-reduced-motion`: appear and disappear with no transition.

Day-atmosphere ink, for the same reason Phase 1 needed it: on the day ink
ground the land name in foil reads **4.06:1** and the ether dot 4.17:1 — under
AA for 10px type. Use `#6F582D` for the land (5.71:1) and `#35635F` for the
dot (5.72:1) under `[data-atmosphere="day"]`. Night passes on the shared
tokens at 8.42 and 8.81 and is left alone.

## Phase 3 — theater enrichment states

Board: `docs/design/mobile-band/Knowledge.html` — the four states at 390×844.

`KnowledgeEvents` in `app/types/knowledge.ts` already stages this
(`landed` → `icy` → `enrichment` → `evidence`), and `TheaterPhase` in
`theaterLock.ts` is `reading | locking | filed | quiet`. The work is making
each stage a finished screen in `TheaterWell.tsx` rather than a wait.

1. **Landed (catalog only).** New block above the fold: land, city, spoken,
   signal — one hairline row each, value in bone, `CATALOG` chip in dust. Then
   one line, `● NO TITLE ON THE AIR YET`. **No spinner and no skeleton row** —
   a placeholder that promises a fact we may never get is a small lie.
2. **Reading.** The ICY title takes the cover, the catalog collapses to one
   mono line, and `● READING THE LIVE TITLE` replaces the waiting line. If the
   station is quiet this state never comes.
3. **Filed.** `facts[]` render as the existing `ew-journey` star list, and the
   same facts wake as stars in the sky — one arrival, two places. Sign the
   block with a `MUSICBRAINZ · VERIFIED RELATIONS` chip in foil.
4. **Evidence.** `links[]` render as meridian buttons that **wear their
   domain**: `▶ Live, 1971 — youtube.com`, `W Amália Rodrigues —
   wikipedia.org`. `MeridianIcon` already draws the youtube/wiki/disc glyphs;
   add the domain from `new URL(link.url).hostname` with `www.` stripped. This
   is honest and free — `KnowledgeEdge` already drops any web claim without its
   `sourceUrl`. A selected node opens in the folio with its `ew-ktrail`, its
   `knowledgeSeatCopy()` line, a **Follow this star** action and sibling chips.

Seats stay pinned (`seatTheaterKnowledge` already guarantees it): late
knowledge lights a new seat, it never moves one the reader is looking at.

## Acceptance

- [ ] Bar and band are pixel-identical on `/`, `/listen`, `/about` at 390×844.
- [ ] The bar never wraps at 320px width.
- [ ] Every tap target ≥44px; nothing overlaps the band or the safe area.
- [ ] Every step of `ELSEWHERE_LOOP` is reachable on a phone — `next` included.
- [ ] Idle, the content sits flush on the nav; playing, flush on the dock.
- [ ] On `/about` (a page with no dock content) the band still renders and the
      Room slot is current.
- [ ] Atlas opens from the band on all three pages; `/?atlas=1` opens it on a
      cold load. No `/atlas` route is added.
- [ ] Theater slot is dimmed and inert when the Room is empty.
- [ ] Nothing scrolls horizontally at 320px.
- [ ] Both atmospheres (`:root` and `[data-atmosphere="day"]`) pass 4.5:1 on
      the nav labels, the strip and the meridian domains — the ember hues are
      re-declared per atmosphere for exactly this reason.
- [ ] `npm test` and `npm run typecheck` pass.
- [ ] No new rule added inside `@layer components`.
- [ ] `git grep -n "MobileTabBar\|ew-atlaspage"` returns nothing.

## Out of scope

Desktop layout, the audio path, the AI providers, `roomStore`/`playerStore`
contracts, the globe's hit/spin/face behaviour, and anything in
`app/services/`. If a change seems to need one of these, stop and say so
instead.
