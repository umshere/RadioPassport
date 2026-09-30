# Pretext Hero Insights

This document is the source of truth for the current homepage hero experiment:

- the drifting insight cloud on the globe side
- the elastic headline / supporting copy interaction
- the desktop insight reveal flow driven from the player
- the intended "Pretext-native" architecture
- the current bugs and debugging priorities

Use this doc when starting a new debugging or redesign thread.

## Purpose

The homepage hero is meant to demonstrate a specific product point:

Radio Passport deals with unstable content:

- station names
- countries and regions
- live ICY track titles
- tags / genres / languages
- AI-generated summaries and facts
- external source links

The goal is not just to make the homepage "look cool". The goal is to show that the UI can survive variable-length live metadata and richer AI insight payloads without collapsing into layout shift, awkward wrapping, or aggressive truncation.

Pretext is the tool for that.

## Product framing

The hero is supposed to communicate three things at once:

1. Radio Passport is a global listening product.
2. The currently playing station/track is live and dynamic.
3. The text system itself can re-compose when metadata or AI insight content changes shape.

That means the hero has two layers:

- left side: stable product framing
- right side: dynamic signal manuscript / insight cloud

The left side should stay readable and product-first.
The right side is where the live metadata + AI enrichment becomes visually expressive.

## What the hero currently contains

Primary component:

- [HeroSection.tsx](/Users/umeshmc/Code/RadioPassport/app/routes/components/HeroSection.tsx)

Supporting utilities:

- [pretextLayout.ts](/Users/umeshmc/Code/RadioPassport/app/utils/pretextLayout.ts)
- [PretextMeasuredText.tsx](/Users/umeshmc/Code/RadioPassport/app/components/PretextMeasuredText.tsx)
- [PlayerDock.tsx](/Users/umeshmc/Code/RadioPassport/app/components/PlayerDock.tsx)
- [api.now-playing-trivia.ts](/Users/umeshmc/Code/RadioPassport/app/routes/api.now-playing-trivia.ts)
- [useNowPlayingMetadata.ts](/Users/umeshmc/Code/RadioPassport/app/hooks/useNowPlayingMetadata.ts)
- [useTrackTrivia.ts](/Users/umeshmc/Code/RadioPassport/app/hooks/useTrackTrivia.ts)

### Left side

- headline
- supporting paragraph
- scale proof line
- signal script strip
- search
- CTA row

### Right side

- drifting manuscript snippets
- optional artwork tile / fallback tile
- source icon cluster
- optional expanded "listening story" card

## Current data flow

### Base station/live metadata

From the currently playing station:

- `nowPlaying`
- `isPlaying`
- `country`, `countryCode`, `state`
- `language`, `bitrate`, `codec`
- `tags` / `tagList`
- `homepage`
- `favicon`

### Live track metadata

From [useNowPlayingMetadata.ts](/Users/umeshmc/Code/RadioPassport/app/hooks/useNowPlayingMetadata.ts):

- parsed ICY title
- `artist`
- `title`
- load state / freshness

### Enrichment / insight data

From [useTrackTrivia.ts](/Users/umeshmc/Code/RadioPassport/app/hooks/useTrackTrivia.ts):

- free metadata enrichment first
- AI enrichment only when insights are expanded / requested

Current hero preference order:

1. AI trivia
2. free trivia
3. raw station metadata fallback

That same priority is used for:

- summary text
- facts
- links
- artwork

## Intended interaction model

### Default hero state

The hero should feel atmospheric and editorial.

That means:

- no giant dashboard card shown by default
- the globe side should read as a manuscript cloud
- snippets should feel free-flowing and slightly alive
- the artwork tile should feel like a reveal trigger, not a fixed card

### Expanded insight state

When the user clicks the artwork or the dock `Insights` action:

- show a focused listening-story card
- keep the manuscript visible behind it
- merge richer metadata/AI content into the same story surface
- do not open a competing desktop popover in the dock

### Desktop player integration

The desktop `Insights` button is meant to control the hero-side expansion state rather than open its own large independent panel. Mobile can keep a drawer.

## How Pretext is supposed to be used here

This hero should be "Pretext-native", meaning:

- text home positions come from Pretext layout, not DOM measurement
- text line breaks come from Pretext, not browser reflow guesses
- content upgrades happen after measurement/layout decisions, not before
- variable-length metadata is treated as a designed surface

### Good Pretext use in this hero

- manuscript snippet line layout
- hero note / summary clamping
- country label width budgeting
- signal script line stability
- word/line home positions for the elastic text surface

### Bad / non-native behavior we want to avoid

- `getBoundingClientRect()` per character
- DOM read -> animation loop -> forced reflow
- different SSR and first-client text for the same node
- measuring after the browser already laid the text out

## Current implementation status

### What is on the right track

- manuscript snippets are driven by real station/track/enrichment data
- the hero no longer relies on a permanently open right-side card
- source icons and artwork tile are separate artifacts
- the hero search now supports broader search intent
- the player-driven insight expansion is conceptually aligned with the hero

### What is still broken / unstable

As of this doc:

1. Hydration mismatch still exists in the hero path.
2. The elastic headline surface still flickers or fails to reform cleanly.
3. The letter-level effect can break readability if physics is applied too literally.
4. Some hero artifact placement still needs tuning for overlap and density.

These are the highest-priority bugs.

## Current debugging findings

### Root issue discovered

The original elastic headline implementation was not actually Pretext-native.

It used:

- `getBoundingClientRect()` per particle
- DOM-measured positions as "home" coordinates
- extra re-measure / resize / RAF work

That is exactly the kind of layout-reflow path Pretext is meant to avoid.

### Refactor direction already started

The current refactor direction is:

- use Pretext to compute lines
- derive stable home positions from those lines
- preserve word structure
- let letters scatter inside word anchors instead of treating the whole line as a flat absolute-character soup

This is the correct direction, but it is not fully stabilized yet.

## Practical architecture for the next debugging thread

The safest target architecture is:

### SSR / first client render

- render stable readable text only
- use the same text on server and first client render
- do not enable the elastic particle layer yet

### After mount

- swap to the interactive Pretext-computed surface
- keep word anchors stable
- animate letters inside those anchors
- keep the proof line calmer than the headline
- keep the paragraph looser than the headline

This avoids hydration mismatch while still preserving the effect.

## Recommended behavior hierarchy

### Headline

- strongest interaction
- word-preserving
- letters scatter locally and reform quickly

### Supporting paragraph

- softer interaction
- lower force
- slower spring return

### Proof line

- minimal movement
- enough to feel connected
- not enough to chatter or blink

## Insight cloud artifact types

The right side should not make every artifact look the same.

Recommended artifact families:

1. Station artifact
- country + station identity

2. Track artifact
- artist / title / release

3. Notes artifact
- AI or metadata summary paragraph

4. Mood artifact
- tags / genres / relation language

5. Source artifact
- icon links only

6. Expanded listening story
- revealed on click, not default

## Fallback strategy

The hero should degrade progressively:

### Stage 1

Only station metadata exists:

- country
- language
- bitrate
- codec
- tags

### Stage 2

Free enrichment arrives:

- release
- artist
- track
- links
- image when available

### Stage 3

AI enrichment arrives:

- summary
- richer facts
- broader relation / mood context

The hero should not wait for Stage 3 to be useful.

## Open issues to carry into a new thread

When starting a new thread, mention these directly:

1. The hero elastic text effect must be Pretext-native, not DOM-measured.
2. Hydration mismatch must be eliminated.
3. SSR and first client render must be identical.
4. Interactive physics should only activate after mount.
5. The headline should scatter and reform while preserving word readability.
6. The proof line must stop blinking/chattering.
7. The right-side insight cloud should stay subtle by default and richer on reveal.

## Suggested new-thread prompt

Use this as the opening prompt in a new debugging thread:

> Debug Radio Passport’s homepage hero as a true Pretext-native text surface.  
> The current hero elastic text / insight cloud still has hydration mismatch and flicker.  
> Goal: keep the scatter-and-reform effect, but make SSR and first client render identical, remove DOM-based text measurement, and preserve readable word structure while using Pretext for home positions and line layout.  
> Also verify the hero insight cloud, artwork reveal, source icons, and dock-driven insight expansion still work with the new architecture.

## Related references

- Pretext README: `node_modules/@chenglou/pretext/README.md`
- Pretext demos:
  - `node_modules/@chenglou/pretext/pages/demos/dynamic-layout.ts`
  - `node_modules/@chenglou/pretext/pages/demos/editorial-engine.ts`
  - `node_modules/@chenglou/pretext/pages/demos/rich-note.ts`

These are the best references for how the final implementation should think:

- layout first
- animation second
- DOM measurement last or never
