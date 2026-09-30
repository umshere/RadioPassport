# archive

Kept out of the way, not deleted. Nothing here is imported by the app, the tests or the build, and `.vercelignore` keeps it out of Vercel builds.

| Path | What | Why archived |
|---|---|---|
| `design_handoff_radio_passport/` | Original Radio Passport design handoff (HTML mockups, design system, README) | Superseded by the shipped Elsewhere UI |
| `stray-scripts/test-*.js`, `test-api.cjs` | One-off OpenRouter / Radio Browser / Atlas probe scripts that lived at the repo root | Not wired to any npm script or test |
| `icon.png` | Root-level 852 KB icon | Unreferenced; the real app icons live in `public/` |

Removed outright (not archived): `scripts/verify-board-sheet.mjs` (targeted the removed BoardSheet) and `scripts/verify-desktop.mjs` (asserted the BoardSheet grip).
