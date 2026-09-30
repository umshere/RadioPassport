# Elsewhere — mobile-first app revamp study

Status: visual exploration plus local prototype, not approved or shipped. Eight built-in image-generation outputs are kept here for review, including two targeted refinements. The local prototype additionally uses two generated WebP concepts in `public/`: `secret-traveler.webp` and `secret-coffee-table.webp`. The screens illustrate a full-application direction; they are not production screenshots and must not be treated as factual station data or ready-to-ship assets.

The implementation inventory, image boundary, hosted-support recommendation, costs, release gates, and exact integration prompt live in [`SHIP_HANDOFF.md`](./SHIP_HANDOFF.md).

## Core story

Sometimes choosing one more thing is exhausting. Elsewhere offers a small surrender: take me somewhere; let me hear someone else's now. A curious listener may find a traveler who is also unsure where to go. The hidden trail ends with the traveler saying, "I didn't know where to go either." The app-interest question follows only after that ending. Sharing, if tested, should be a spoiler-free invitation to wander, not a viral prompt in the listening UI.

## System direction

- Native-app feeling comes from immediate orientation, few primary actions, persistent transport, thumb-reachable controls, and steady route transitions—not from imitating Apple chrome.
- Art comes from Elsewhere's own signals: night earth, local hour, station metadata, a sparse knowledge sky, lacquer, foil, and typographic stamps. No invented track titles or location photos.
- Keep the existing Night/Day identity, Newsreader/Schibsted/Azeret hierarchy, lacquer seal, and radio-first promise. Stream, globe, and landing remain free.
- The player stays present while browsing Atlas, reading Theater, opening Passport, and entering the secret Room. The puzzle never writes or stops playback.
- Prefer clean content hierarchy over decorative density. Every visible mark needs a source or a story purpose.

## Screen review

| File | Worth keeping | Rework before implementation |
|---|---|---|
| `01-land.png` | Calm arrival, one primary surrender action, earth as emotional centerpiece | Earth is too photoreal and large; bottom destinations merge Theater and Room; transport lacks station identity. |
| `02-catalog.png` | Unboxed hour rail, readable list, persistent player | Generated city photos are unsourced and must be removed; account icon and Theater-mask motif are off-brand; list should use actual catalog plate or Elsewhere seal. |
| `02-catalog-refined.png` | Replaces photos with abstract seals and returns icons to the Elsewhere grammar | Use actual station art only when supplied by the catalog; seal variants shown here are concept art, not stream-derived data. |
| `03-theater.png` | Sparse sky and anomalous red point; letter gives the signal a human frame | Pale folio must be reconciled with Night/Day; icon row is too schematic; actual Theater intelligence must remain evidence-gated. |
| `04-passport.png` | "You stayed" is the correct emotional line; ticket-stub shape and ink feel promising | Generated landmark/city art is unsourced and must be removed; no fake location iconography or time values. |
| `04-passport-refined.png` | Replaces landmarks with abstract ink/meridian impressions | Remove the residual fleur-de-lis-like mark before implementation; stamp geometry should derive from actual stay data or remain a stable motif. |
| `05-secret-room.png` | Small awkward traveler, generous quiet space, optional app-interest question, player remains visible | The final character should be treated as a concept until approved; secret Room is not the existing `/about` nav destination. |
| `traveler-transparent.png` | Reusable character concept with genuine alpha transparency | Character has not been approved; redraw/commission if its expression or age feels wrong. |

## Product map for an eventual build

Arrival/globe → hour/Atlas/live catalog → persistent dock → Theater/ambient story → Passport/stays → optional hidden trail → secret Room. The current `/about` Room remains a public editorial page; the secret ending should be a separate removable module.

## Prototype boundary

First prove the mobile journey and player continuity. Then test one subtle Theater mark and a short deterministic trail based on local hour and real landing data. Interest at the ending can initially be a local response or explicitly consented lightweight capture. No Stripe, accounts, subscriptions, or paid API call per clue.

## Image provenance and prompt set

All eight images were created with the built-in image-generation tool on 2026-09-15, without CLI/API model selection. Prompt set, in order: restrained landing with one "take me somewhere" action; live catalog with hour rail and persistent player; evidence-gated Theater with a sparse anomaly; typographic Passport; quiet secret-room app-interest ending; transparent illustrated traveler cutout; catalog thumbnail/icon replacement; Passport landmark replacement. Generated station/location imagery in the two original draft screens is speculative concept content, not sourced product data.
