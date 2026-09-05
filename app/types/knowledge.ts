import type { Station } from "~/types/radio";
import type { TriviaGraphKind } from "~/types/trivia";

/**
 * The Theater's navigable knowledge graph — frozen contracts for the merged
 * graph that turns /listen into the music network (see
 * docs/PRODUCT_CORRECTION_THEATER_GRAPH.md).
 *
 * One merged graph, owned above the renderer:
 *   catalog (from the tuned Station) + Room dossier + MusicBrainz +
 *   citation-filtered web = visible Theater knowledge graph.
 *
 * Namespaced stable ids — a node's identity never changes once filed, so
 * arriving knowledge never reshuffles the sky:
 *   country:IN · language:hi · station:<uuid> · track:<artist+title slug>
 *   artist:<slug> · album:<slug> · year:1979 · genre:<slug> · place:<slug>
 *   event:<slug>
 */

export type KnowledgeKind =
  | "country"
  | "language"
  | "city"
  | "station"
  | "track"
  | "artist"
  | "album"
  | "year"
  | "genre"
  | "place"
  | "event";

export type KnowledgeProvenance = "catalog" | "musicbrainz" | "web";

export type KnowledgeImagery =
  | { type: "flag"; code: string }
  | { type: "favicon"; url: string | null; monogram: string }
  | { type: "art"; url: string | null; monogram: string };

export type KnowledgeNode = {
  /** Namespaced, stable for the life of the room. */
  id: string;
  kind: KnowledgeKind;
  label: string;
  provenance: KnowledgeProvenance;
  /** Station counts for country/language heads; honest dark counts. */
  count?: number;
  imagery?: KnowledgeImagery;
};

export type KnowledgeEdge = {
  from: string;
  to: string;
  relation: string;
  provenance: KnowledgeProvenance;
  /** Web edges carry the exact retrieved URL (already citation-filtered). */
  sourceUrl?: string;
};

export type KnowledgeGraph = {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
};

/** A node seat: normalized sky coordinates (0..1, y already flattened). */
export type KnowledgeSeat = { x: number; y: number };

/** Which real events have fired — the only thing that wakes nodes. */
export type KnowledgeEvents = {
  landed: boolean; // /listen mounted with a tuned station
  icy: boolean; // a title is on air
  enrichment: boolean; // free/MusicBrainz dossier filed
  evidence: boolean; // accepted (citation-filtered) web knowledge filed
};

/**
 * Pure model — no React, no canvas, no fetching, no playback.
 */
export type TheaterKnowledgeModel = {
  /** Merged graph, addition-only: nodes keep their array position forever. */
  graph: KnowledgeGraph;
  /** Seats keyed by node id — pinned verbatim once assigned. */
  seats: Map<string, KnowledgeSeat>;
  /** Lit node ids: woken by events, in wake order. */
  awake: Set<string>;
  /** Edges whose far end just woke — the neuron pulse queue. */
  firing: Array<{ from: string; to: string }>;
  /** Ids visible at the current density cap (focus neighbourhood first). */
  visible: string[];
  /** Honest count of catalog nodes left dark at this density. */
  darkCount: number;
};

/**
 * The model module (owned by the knowledge agent,
 * app/components/radio-passport/knowledge/theaterKnowledge.ts) implements
 * three pure functions against these types:
 *
 * buildTheaterKnowledge(input: {
 *   station: Station | null;
 *   roomGraph?: TriviaGraphLike;   // MB + citation-filtered web, merged
 *   expansions?: ExpandedNeighborhood[];
 *   track?: { artist?: string | null; title?: string | null } | null;
 * }): KnowledgeGraph
 *   — addition-only merge; nodes already filed keep their array position.
 *
 * wakeTheaterKnowledge(input: {
 *   graph: KnowledgeGraph;
 *   seats: Map<string, KnowledgeSeat>;
 *   awake: Set<string>;
 *   events: KnowledgeEvents;
 *   focusId: string | null;
 *   cap: number;                    // desktop ~18, phone ~10
 * }): TheaterKnowledgeModel
 *   — landed wakes country/city/language/station; icy wakes the track
 *     (station -currently airing-> track); enrichment wakes artist/album/
 *     year/genre/place reachable from the track; evidence wakes remaining
 *     cited web neighbours. `firing` carries edges whose far end woke in
 *     THIS call (empty when nothing new).
 *
 * seatTheaterKnowledge(input: {
 *   graph: KnowledgeGraph;
 *   seats: Map<string, KnowledgeSeat>;
 *   focusId: string | null;
 *   seed: number;
 * }): Map<string, KnowledgeSeat>
 *   — focus-centred deterministic seats, pinned verbatim once assigned;
 *     newcomers take free kind-sector slots around their anchor.
 */

/** The DOM layer's node shape: knowledge node + its seat. */
export type PositionedKnowledgeNode = KnowledgeNode & KnowledgeSeat;

/** Frozen props for the DOM button layer (TheaterNodes.tsx). */
export type TheaterNodesProps = {
  nodes: PositionedKnowledgeNode[];
  focusId: string | null;
  /** Namespaced id of the station currently on the air, if any. */
  tunedId?: string | null;
  /** Ids that entered `awake` this tick — only these opacity-wake. */
  wakingIds?: readonly string[];
  reducedMotion: boolean;
  onSelect: (id: string) => void;
};

// Local structural type to avoid importing server-ish modules into a
// client contract file.
export type TriviaGraphLike = {
  nodes: Array<{ id: string; label: string; kind: TriviaGraphKind }>;
  edges: Array<{
    from: string;
    to: string;
    relation: string;
    verified?: boolean;
    provenance?: "musicbrainz" | "web" | "catalog";
    sourceUrl?: string;
  }>;
};

/** One lazily loaded catalog neighbourhood (shape returned by
 * /api/atlas/expand and consumed here by id namespacing). */
export type ExpandedNeighborhood = {
  focusId: string; // namespaced id that was expanded (country:IN etc.)
  nodes: Array<{
    id: string; // already-namespaced id from the expansion layer
    kind: KnowledgeKind;
    label: string;
    provenance: "catalog";
    count?: number;
    imagery?: KnowledgeImagery;
  }>;
  edges: Array<{ from: string; to: string; relation: string }>;
};
