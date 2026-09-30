# Mobile band — the boards

The design boards for `docs/MOBILE_BAND_HANDOFF.md`, exported as standalone
HTML so any agent or browser can open them without a login. These are the
source the phone screens were drawn from; the handoff doc is their prose.

Open them directly — no server, no build:

```bash
open docs/design/mobile-band/System.html
```

| File | What it shows |
|---|---|
| `System.html` | The system sheet. Band anatomy (playing 108 / quiet 44), the seven laws, ink, type ramp, parts, and what was retired. **Read this one first.** |
| `Main.html` | Home at rest, 390×844 |
| `Theater.html` | `/listen`, 390×844 |
| `Atlas.html` | The Atlas overlay, 390×844 |
| `Room.html` | `/about`, 390×844 — drawn with the quiet band (no dock) |
| `Scroll.html` | Phase 2. Three scroll beats side by side with the measurements |
| `Knowledge.html` | Phase 3. The four theater enrichment states |

Every board is drawn at the real token values from `app/tailwind.css` — ink
`#0C0B09`, bone `#E8DFD0`, dust `#9A8F80`, lacquer `#C73A3A`, foil `#C6A56A`,
ether `#7EB8B4` — in the night atmosphere. Type is Newsreader italic for
coverlines, Schibsted Grotesk for body, Azeret Mono for labels.

Two things the boards do **not** carry, because they are stated in the handoff
instead: the day-atmosphere palette, and the fact that anything positioned
against the band must read `--player-dock-clearance` rather than hardcoding
44 or 108.

These are drawings, not components. Nothing here is imported by the app, and
the numbers in the handoff win if the two ever disagree.
