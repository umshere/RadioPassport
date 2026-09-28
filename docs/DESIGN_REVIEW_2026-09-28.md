# Elsewhere — independent design & code review (2026-09-28)

Method: opened https://elsewheremusic.com on desktop (800px) and phone (375×812), tapped the hour rail, read the console and network, and audited `app/tailwind.css` (2,571 lines), `tailwind.config.ts`, `app/root.tsx`, and the components against the extracted design system:
https://claude.ai/artifact/KKCEZDJp8YyEuvQhSjaJEg

## 1. What it feels like today

**Strong:** the voice ("You are not here", "Land here", the stamp), the wax-seal + foil identity, the Newsreader/Azeret/Schibsted trio, hairlines instead of boxes, the split-flap place name. It already feels like a *passport*, not a radio app. That is the soul — keep it.

**Weak, in order of damage:**

1. **Phone first-load can show an empty product.** On 375px the board read `NO SIGNAL · DUSK / 0 LANDS` and stayed that way ≥14s after tapping Dusk (probe requests returned 200; the list stayed empty). The primary CTA "Land here" (`.ew-land`) is only rendered when stations exist (`.rp-land-slot:not(:has(.ew-land))`), so **with 0 lands the phone home has no primary action at all**: search, a globe, an hour rail and a drag-handle sheet. I could not confirm whether this is my in-app browser (stream probing / mixed content) or a real bug — **verify on a real phone on cellular**. Either way there is no fallback state.
2. **Above the fold on phone has no hook.** The eye lands on a search pill and a pale globe; the only promise ("Tap a city to tune") is a flip-board line. Nothing says *what happens* or gives a one-tap first ride.
3. **The board looks broken while loading.** Mid-flip, station names show as garbled letters (`MHFABD`, `FBJAA`) and art tiles are solid black squares. First impression of the list is noise.
4. **Day theme by clock reads as a different product.** The page opened in Day at dusk in Lagos; Day is washed beige with low-contrast mono. The brand lives in Night.
5. **Sub-44px targets on phone:** wordmark link 33px, Passport 24px, mic 36px, sheet handle row 28px, reshuffle 28px, dock ring 24px, atmosphere switch 32px.

## 2. Codebase inconsistencies (why edits keep drifting)

| # | Finding | Evidence | Fix |
|---|---|---|---|
| 1 | Two token systems | `--rp-*` (legacy) and `--ew-*` both declared; `root.tsx:121-122` still uses `--rp-bg/--rp-text`; `PretextMeasuredText.tsx` uses `--rp-*` and a hardcoded amber `rgba(245,177,45,…)` | Delete `--rp-*`; point them at `--ew-*`; remove the amber |
| 2 | Off-palette leftovers | `PassportStampIcon.tsx` is neumorphic `#e0e5ec`/`Inter` "RP" — the old design the handoff said to delete | Delete the file (check imports) |
| 3 | Hardcoded colours in CSS/TSX | 19 hex uses in `tailwind.css` outside `:root` (passport paper/inks, flap Day colours `#EFE3CE`/`#2A241C`, `#0C0B09` art ground); `#C73A3A` in `PlayerDock`, `TheaterWell:1570`, `UpNextRow:67` | Name them as tokens (`--ew-passport-*`, `--ew-flap-*`, `--ew-art-ground`) — already defined in the design system |
| 4 | Tailwind `content` misses files | `tailwind.config.ts` scans only 5 paths + `radio-passport/**`; `SiteBar.tsx`, `PretextMeasuredText.tsx`, `routes/secret-room.tsx` use utilities but aren't scanned → classes silently not generated | Scan `./app/**/*.{ts,tsx}` |
| 5 | Two class dialects | 74 `.rp-*` and 166 `.ew-*` classes for the same components (`rp-intent` beside `ew-seek`, `rp-dock` beside `ew-stamp-ring`) | Freeze `rp-` as legacy; new work is `ew-`; rename opportunistically |
| 6 | Same selectors declared many times | 61 selectors are declared in more than one place in one 2.5k-line file (a second block of overrides at the end: `.ew-passport-book …`, `.ew-theater-…`) | Split into `tokens.css`, `base.css`, one file per component; delete dead rules |
| 7 | Type scale has 20 sizes | 8, 9×15, 10×23, 11, 12, 14, 15, 16, 17, 18, 22, 24, 26, 28, 32, 36, 40, 42, 64, 80px | Adopt 9 steps: 10 · 12 · 14 · 16 · 18 · 22 · 28 · 40 · 64 (+ clamp'd display). 9px mono labels are below legible on phone — floor at 10px |
| 8 | Radius drift | 0 / 1 / 2 / 6 / 8 / 999 / 50% / .05em | Keep 0, 2, 999, 50%. The passport ticket's 8px and the empty slot's 6px become one `--ew-radius-ticket` |
| 9 | `secret-room.tsx` is one-line-per-statement minified JSX | 3 `className`s per line, handlers inline | Reformat; split into `SecretStory`, `SecretAsk`, `SecretCoffee` |
| 10 | Contrast misses in source | lacquer small text 3.84:1 (Night); on-lacquer 3.88:1; Day foil/ether ≈4.1:1; Day dust on hide 3.79:1 | Lighter lacquer *text* token (`--ew-lacquer-text`), dark `--ew-on-lacquer`, a Day foil at ≥4.5 |
| 11 | Focus states patchy | only 15 `:focus-visible` rules for ~240 classes | One global `:focus-visible {outline:1px solid var(--ew-foil);outline-offset:2px}` in base |
| 12 | Mantine/Tabler in `package.json` | Mantine core/carousel and tabler icons imported in a few files (`CountryFlag`, `VoiceInput`) | Confirm usage; remove if only legacy |

## 3. Universal theme + soul

**Soul, in one line:** *a night-time passport held by someone who is not where they are.* Every screen answers three questions: **where am I (place), what hour is it there (hour), what did I keep (stamp).**

Rules to encode (already drafted in the design system README):
- One lacquer object per view (the seal). Foil is the hand-written detail. Ether only means "live".
- Serif italic = the human speaking. Mono uppercase = the machine reporting. Sans = the interface.
- Square, hairline, no shadow except the dock. Paper (the passport ticket) is the *only* light object in Night.
- Copy: land, hour, stamp, now. Never discover / explore / playlist / unlock.
- **Night is the default on first visit,** Day is an opt-in (or true-daylight only for returning users), because the brand is nocturnal and Day currently weakens it.

## 4. First-visit journey (hook) — proposal

Goal: from cold link to *hearing a real place* in under 8 seconds, one tap, no choices, and a reason to return.

| Beat | Time | What the user sees / does | Design note |
|---|---|---|---|
| 0. Arrive | 0–2s | Full-bleed Night. Wordmark, the globe fades in, and a single line in Newsreader italic: **"You are not here."** Below it the lacquer stamp button: **Land** with a live mono kicker `LISBON · 21:40 · DUSK`. | The Land button is in the first viewport on phone, thumb-height, *before* search. |
| 1. Land | tap → 1s | Screen "stamps" (lacquer press + haptic), the city flips in on the split-flap, audio starts (user gesture satisfies autoplay). | Never a spinner: if the first stream fails the probe, silently try the next live one and say "Trying another signal" in the toast voice. |
| 2. Settle | 1–15s | Dock rises with the station; caption line in serif: "It is 9:40 at night in Lisbon." Ring around the seal starts inking. | The seal is the progress — no timer text. |
| 3. Stay | 15–60s | Quiet. One whisper offers the next move: **"Somewhere it's morning →"** (hour hop) and **"Take me back"**. | Two choices max. |
| 4. Stamp | 60s | The stamp inks: toast "Lisbon, Portugal — you stayed." Passport count 00 → 01. | This is the emotional peak; make the haptic/sound distinct. |
| 5. Return | end | Passport shows one cream ticket + "an hour to come" slots. Reminder line: "Tomorrow there's dawn in Kochi." | Return hook = the next unstamped hour, not a notification. |

Search, Atlas, hour rail, filters all stay — but **behind** the Land button, not competing with it.

### Mobile rules
- Primary action in the bottom third, ≥48px; every target ≥44px.
- One sheet, not two: the board sheet *is* the station list; the globe stays behind it.
- Text floor 10px mono / 16px input; nothing below 44px tap.
- Empty and error states are copy, never blank: "No signal in the dusk right now — try dawn" with a working button.
- Respect `prefers-reduced-motion` (flip, spin, pulse) and safe-area insets (already partly done).

## 5. Work plan (suggested order)

1. **Verify the phone empty-board on a real device.** If real: make the Land CTA render with a fallback station and add an honest empty state. *(highest value)*
2. Make Land the first-viewport primary action on phone; default first visit to Night.
3. Delete `PassportStampIcon.tsx`; replace `--rp-*` uses; fix Tailwind `content`.
4. Tokenise remaining hex/colours; add `--ew-lacquer-text`, fix the flagged contrast pairs; global focus rule.
5. Type and radius scale consolidation (9 sizes, 4 radii); raise <44px targets.
6. Split `tailwind.css` into tokens/base/components; delete duplicated selector blocks.
7. Loading polish: skeleton rows (no scrambled letters, seal placeholder art instead of black tiles).
8. Re-run this review; re-extract the design system so it tracks the code.

Nothing in the codebase was changed by this review.
