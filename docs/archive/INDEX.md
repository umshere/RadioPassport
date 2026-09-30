# Archive

History only. Nothing here describes the product as it is today (2026-09-30). For what is true now, read [../README.md](../README.md) and [../FEATURES.md](../FEATURES.md).

Files were moved here with `git mv`, so `git log --follow` still works. Links inside these files were not rewritten and may point at paths that no longer exist. Dates are the day the file was first added to the repo.

## Handoffs (one agent passing work to the next)

| File | What it was | Why archived | Date |
|---|---|---|---|
| `SESSION_HANDOFF.md` | Long running "state of the repo" log, Aug to Sep 2026 | Describes the globe, Theater constellation and the pre-desk player. Live facts moved to FEATURES.md and ARCHITECTURE.md. Some CSS comments in code still cite it | 2026-08-13 |
| `DESIGN_PASS_HANDOFF.md` | Design and code pass, Keeper and desk build notes, "Next" list | Superseded by the Departures Hall, tickets and env light. Its live facts (keeper knowledge mode, murmurs, gotchas) are now in FEATURES.md and AGENTS.md | 2026-09-28 |
| `OPENCODE_ELSEWHERE_NEXT_HANDOFF.md` | State and next task package for OpenCode | Describes the Sept 17 tree (globe home, Theater). Task done or moot | 2026-09-28 |
| `ELSEWHERE_REVAMP_CONTINUATION_HANDOFF.md` | Continuation of the Sept 15 app revamp | Revamp shipped in another shape (Departures Hall) | 2026-09-28 |
| `ELSEWHERE_REVAMP_NEXT_PROMPT.md` | Prompt for "Theater storytelling v1" | Theater is gone; the desk replaced it | 2026-09-28 |
| `MOBILE_BAND_HANDOFF.md` | Design brief for the one mobile band (Elsewhere / Atlas / Desk tabs) | The band shipped and is documented in FEATURES.md. The brief predates the desk rename | 2026-09-04 |
| `THEATER_CONSTELLATION_HANDOFF.md` | Story brief for the Theater constellation | The constellation was deleted on 2026-09-28 | 2026-08-14 |
| `CONSTELLATION_GRAPH_HANDOFF.md` | Knowledge-graph sky brief | Same | 2026-08-15 |
| `CONSTELLATION_FABLE_REVIEW.md` | Review pass on the living sky | Same | 2026-08-15 |
| `THEATER_EVIDENCE_MORPH_HANDOFF.md` | Brief: evidence-led enrichment and figure morph | Same. The two-call trivia pipeline it describes is kept in AI_PIPELINE.md | 2026-08-27 |

## Superseded plans and corrections

| File | What it was | Why archived | Date |
|---|---|---|---|
| `ATLAS_HANDOFF.md` | Plan for a navigable `/atlas` page | Page removed. The Atlas is now an overlay (country list) on the home. `app/services/atlas/` and `/api/atlas/expand` remain but no client calls them | 2026-08-27 |
| `PRODUCT_CORRECTION_THEATER_GRAPH.md` | "Atlas page is the wrong container, make Theater the graph" | Theater graph itself was later removed | 2026-08-27 |
| `DESIGN_REVIEW_2026-09-28.md` | Independent design and code review | Most findings were fixed the same day (token cleanup, CSS split, 44px targets). The rest is folded into ROADMAP.md | 2026-09-28 |
| `FLOW_AUDIT.md` | Walk of every `SURFACE_CONNECTIONS` entry, 2026-08-22 | Tested the globe home. Registry still exists in `productFlow.ts` | 2026-08-24 |
| `MARKET_STUDY.md` | Public-source market read, Correspondent tier idea | Research, not product. The paid-tier idea is one line in ROADMAP.md | 2026-09-14 |
| `DESIGN_SPECS_pre-departures-hall.md` | Old design spec: globe home, Theater constellation, horizon hours | Replaced by `../DESIGN_SPECS.md`. Kept because it holds the long rationale for stamp and passport rules | 2025-12-26 |

## Old contracts and experiments

| File | What it was | Why archived | Date |
|---|---|---|---|
| `SCENE_DESCRIPTOR.md` | JSON shape of an AI world mix | Merged into `../AI_PIPELINE.md` | 2025-10-28 |
| `PLAYER_STORE.md` | Notes on `playerStore` | Merged into `../ARCHITECTURE.md`. Mentions crossfade and Local/World routes that no longer exist | 2025-10-28 |
| `AI_PROMPT_ENHANCEMENT.md` | Card-stack prompt rewrite | Card stack UI is gone | 2025-11-09 |
| `PRETEXT_HERO_INSIGHTS.md` | Drifting insight cloud and elastic headline on the old globe hero | The hero is gone. `@chenglou/pretext` is still a dependency | 2026-04-06 |
| `MOTION_DESIGN.md` | "Dots and Damping" motion language (Lissajous, Tusi field) | The code it describes (`motionField.ts`, `TusiField.tsx`) is not mounted anywhere | 2026-09-07 |
| `design/elsewhere-app-revamp-2026-09-15/` | Image study, build plan, ship handoff for the Sept 15 revamp | A visual exploration, never approved as a whole. Secret room came from it | 2026-09-15 |
| `design/mobile-band/` | Standalone HTML boards for the mobile band | Boards for the archived MOBILE_BAND_HANDOFF | 2026-09-04 |
