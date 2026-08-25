# Brand assets — heritage register

What lives in this repo as artwork, what still points at it, and what may
never be thrown out. Read before deleting anything under `public/` or at the
repo root.

## The hard rule first

### `public/FTS.jpeg` — KEEP, always

The 404 wallpaper. Wired at `app/tailwind.css` (`background-image: url("/FTS.jpeg")`)
and named as a hard rule in `AGENTS.md`: **never delete `public/FTS.jpeg`,
regardless of reference counts or audits.** This file restating the rule
changes nothing about it — the rule outranks any audit output.

## Heritage assets — keep, but document

These have **zero live code references today**. They are not dead weight;
they are heritage. Deletion is not a hygiene call — it needs **Ums's explicit
sign-off**, asset by asset.

| Asset | Path | What it is | Introduced | References today | Call |
| --- | --- | --- | --- | --- | --- |
| RPLOGO | `public/RPLOGO.png` | Heritage brand asset — the "PASSPORT" wordmark, Canva-authored | ~`345a86c` ("Replace logo with RPLOGO, clean up unused image assets") | none in `app/`, `scripts/`, or docs runbooks | **KEEP** — deletion needs Ums's explicit call |
| Root icon | `icon.png` (repo root — *not* under `public/`) | Earlier passport-stamp mark; superseded by the Elsewhere seal set | `bcc01e6` → `68b6e26` era (Pretext homepage / icon swaps) | none — every `icon.png`-looking hit in code is actually `/radio-passport-icon.png` (a string, no such file) or `elsewhere-favicon.svg` | **KEEP** — same treatment: unreferenced heritage asset, keep-but-document |

If either asset ever needs to move (rename, directory change), update this
register in the same commit. Neither may be deleted as part of routine cleanup.

## OG still — drift observed (PROPOSAL ONLY, nothing changed)

Source of truth for the social card: `scripts/og-still.html`, rendered by
`scripts/render-og.mjs`. Two drifts were measured against the design record
on this pass. Both are recorded here **as proposals only** — the still was
neither edited nor re-rendered.

### 1. Fonts differ from the design-handoff tokens

- `scripts/og-still.html` loads **Newsreader** (coverline/deck),
  **Schibsted Grotesk** (masthead), **Azeret Mono** (eyebrow/footer).
- The design handoff package (`design_handoff_radio_passport/Design System.dc.html`)
  specifies different tokens: **Sora** (display/UI, weights 400–800) and
  **IBM Plex Mono** (telemetry).
- Honest complication: the shipped app itself has since moved off the handoff
  type — `tailwind.config.ts` (`fontFamily.display/sans/mono`) and
  `docs/DESIGN_SPECS.md` ("Type: **Newsreader** italic (display),
  **Schibsted Grotesk** (UI), **Azeret Mono** (telemetry)") match the OG
  still, not the handoff. So "fix the fonts" could mean moving the still
  toward the old handoff or declaring the current trio canonical everywhere.

**Proposal-only:** pick one type authority (handoff Sora/Plex vs. current
Newsreader/Grotesk/Azeret), then align `scripts/og-still.html`'s Google Fonts
link and four `font-family` rules to it. Needs Ums's call on direction before
any edit.

### 2. Footer casing/domain drift

- `scripts/og-still.html` footer (the second `<span>` in `.foot`) currently
  reads **`ELSEWHERE.MUSIC.COM`**.
- The documented canonical host is **`elsewheremusic.com`**
  (`docs/DOMAINS.md`: "Apex is the share URL. Prefer it over `www` in copy,
  redirects, and OG."). The rendered string inserts a dot that the real
  domain does not have.

**Proposal-only:** a fix would change that one span to the true domain in the
same mono caps treatment — e.g. `ELSEWHEREMUSIC.COM` — and then re-render the
OG images with `scripts/render-og.mjs`. Neither step was taken on this pass.

## Related observation (out of scope here, noted for a future pass)

`app/api/ai/recommend.ts` returns `"favicon": "/radio-passport-icon.png"`
(12 occurrences), but no file named `radio-passport-icon.png` exists under
`public/` — the served icons there are `elsewhere-favicon.svg`,
`elsewhere-mark.jpg`, and friends. Fixing that pointer was outside this
pass's boundary; it is recorded so the dangling string isn't rediscovered
from scratch later.
