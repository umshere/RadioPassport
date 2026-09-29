# Next-agent prompt — Theater storytelling v1

```text
Work in /Users/umeshmc/Code/RadioPassport from a fresh isolated worktree based on current origin/main. Read AGENTS.md and docs/ELSEWHERE_REVAMP_CONTINUATION_HANDOFF.md first. Confirm the remote head; 6cc24f4 was production at handoff.

Implement only Theater storytelling v1: evolve TheaterAmbientLine into a restrained, cinematic companion that uses the tuned station, real place metadata, calculated local/solar hour, station tags/language, and evidence already present in the Room. It must still feel useful when evidence is absent.

Boundary:
- modify TheaterAmbientLine.tsx
- add a pure theaterFragments.ts selector
- minimally integrate it in listen.tsx
- add theaterFragments.test.ts
- add narrowly scoped Theater CSS at the end of tailwind.css only if needed

Do not touch PlayerDock, root.tsx, roomStore.ts, theaterLock.ts, BoardSheet, productFlow, secretTrail, or secret-room. Preserve all unrelated/untracked files. Do not use git add .

Rules: playback must continue; PlayerDock remains the only Room writer; no invented ICY titles, events, weather, landmarks, culture, artists, or “what is happening now”; no paid API call per visit; no generic dashboard/cards; mobile first, keyboard accessible, reduced-motion safe. Any genuinely new interactive control requires a SURFACE_CONNECTIONS row and contract test.

Validate npm test, npm run typecheck, npm run lint, npm run build, git diff --check, plus local 375×812 and 1440×900 walkthroughs with rich and empty evidence states. Return exact files, test evidence, screenshots/state notes, risks, and a concise diff summary. Stop after local handoff—do not commit, push, PR, or deploy without explicit approval.
```
