# PRODUCT CORRECTION — supersedes docs/ATLAS_HANDOFF.md

The separate /atlas experience is the wrong container. Stop polishing or
expanding it. The existing /listen Theater constellation must become the
navigable music knowledge graph.

GOAL

Keep the current Theater composition:
- information and selected-node details on the left
- beautiful living constellation on the right
- player dock unchanged

The constellation begins with what is definitely known about the tuned station
and lights additional neurons only when knowledge arrives.

INITIAL GRAPH

Country is the initial central node.

Country
├── city
├── language
└── station
    └── currently airing → track
        ├── performed by → artist
        ├── appears on → album
        ├── released in → year
        ├── tagged → genre
        └── verified event/place/connections

BEHAVIOR

1. Landing on /listen lights country, language, city, and current station.
2. ICY metadata lights the track branch.
3. MusicBrainz/free enrichment lights artist, album, year, and verified edges.
4. Accepted Firecrawl evidence lights additional places, events, works, and
   relations. Never display unsupported AI claims as graph relations.
5. Newly arriving nodes illuminate and their connecting edges pulse like
   neurons firing.
6. Existing nodes must not reshuffle when new nodes arrive.
7. Clicking any knowledge node:
   - focuses/recenters its local neighborhood
   - dims unrelated branches
   - shows its details in the existing left Theater folio
   - adds a back/breadcrumb trail inside Theater
8. Clicking country or language lazily loads a bounded set of connected
   languages/countries/stations.
9. Clicking a station only selects it. Playback changes solely through an
   explicit "Tune here" action using playerStore.startStation.
10. No separate Atlas navigation is needed.

REUSE

Keep and adapt:
- app/services/atlas/atlasGraph.server.ts
- app/routes/api.atlas.expand.ts as an internal expansion API
- deterministic Atlas layout concepts
- flag, favicon, and image-fallback logic
- bounded node counts and honest hidden-node counts
- breadcrumb/back and accessible navigation logic

REMOVE AFTER TRANSPLANT

- Atlas link from app/components/SiteBar.tsx
- /atlas as a user-facing destination
- standalone Atlas page/panel/canvas once equivalent Theater behavior works
- Atlas-specific copy suggesting a second product surface

RENDERING ARCHITECTURE

Do not turn the entire canvas into an inaccessible click map.

Use:
- existing canvas for atmosphere, ambient stars, connecting lines, pulses,
  nebulae, and transitions
- an absolutely positioned DOM button layer for real knowledge nodes

The DOM nodes use the same deterministic coordinates as the canvas. This gives:
- keyboard navigation
- proper focus states and ARIA labels
- reliable tap targets
- country flags, station favicons, and album art
- tooltips and selected states
- no canvas-only navigation problem

Ambient decorative stars remain dim and non-interactive. Knowledge nodes are
visually distinct and clickable.

DATA ARCHITECTURE

Create one merged Theater graph owned above the renderer:

catalog graph
  + current station/Room graph
  + MusicBrainz graph
  + citation-filtered web graph
  = visible Theater knowledge graph

Use namespaced stable IDs:
- country:IN
- language:hi
- station:<uuid>
- track:<normalized artist+title>
- artist:<canonical id>
- album:<canonical id>
- year:1979

TheaterField should receive graph state and callbacks. It must not fetch data or
change playback itself.

VISIBLE DENSITY

Do not draw all 60 catalog nodes simultaneously.

- desktop target: approximately 12–20 interactive nodes
- phone target: approximately 8–12
- expand only one neighborhood at a time
- preserve previously visited branches as dim memory
- show "N more remain dark" instead of cluttering the sky

IMAGERY

- country: flag medallion
- station: sanitized favicon or monogram
- album/track: verified album art already available to the Room
- artist: image only when obtained from an accepted source
- language/year/genre/place: typographic or symbolic nodes

Never invent images.

ACCEPTANCE CRITERIA

- No Atlas link or separate page is required for the experience.
- /listen opens with country as the primary anchor.
- Country → language → station is visible before AI enrichment.
- Track knowledge appears incrementally without reshuffling existing nodes.
- Clicking a node changes the Theater focus and left-side information.
- Country/language clicks can reveal connected real stations.
- Station selection never changes audio without "Tune here."
- Browser/mobile/reduced-motion behavior is verified.
- Keyboard users can traverse the same meaningful nodes.
- No AI or Firecrawl request enters the audio path.
- No unsupported relation is displayed.
- Existing trivia/enrichment safeguards remain intact.
- Full tests, typecheck, lint, build, and real-browser verification are green.

Do not commit, push, or deploy. Return the revised diff for Codex review.

---

The central design idea: the stars should not continuously dance merely to look
alive. Most remain asleep. A real event — landing at a station, receiving an
ICY title, resolving an artist, accepting a cited connection — sends light
through the relevant edge and wakes the next node. That gives the neural
network firing feeling while keeping it truthful and useful.
