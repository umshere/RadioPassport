export type TriviaFact = {
  label: string;
  value: string;
};

export type TriviaLink = {
  label: string;
  url: string;
  kind: "youtube" | "artist" | "release" | "track" | "info";
};

export type TriviaGraphKind =
  | "person"
  | "work"
  | "film"
  | "place"
  | "year"
  | "genre"
  | "event"
  /** Atlas-only kinds: the navigable catalog layer above the theater's
   * track-level figure. The theater never emits these; the atlas never
   * emits the AI-only ones without provenance. */
  | "country"
  | "language"
  | "station"
  | "album";

export type TriviaGraphNode = {
  id: string;
  label: string;
  kind: TriviaGraphKind;
};

/** Where a knowledge edge came from: MusicBrainz relations are verified; web
 * evidence is unverified until it cites the exact page it was read from;
 * catalog edges are deterministic Radio-Browser facts (country/language/
 * station membership) and need no external citation. */
export type TriviaEdgeProvenance = "musicbrainz" | "web" | "catalog";

export type TriviaGraphEdge = {
  from: string;
  to: string;
  relation: string;
  verified?: boolean;
  provenance?: TriviaEdgeProvenance;
  /** Exact retrieved evidence URL. Edges citing pages we never fetched must
   * be dropped server-side before they reach a client. */
  sourceUrl?: string;
};

export type TriviaGraph = {
  nodes: TriviaGraphNode[];
  edges: TriviaGraphEdge[];
};

export const EMPTY_GRAPH: TriviaGraph = { nodes: [], edges: [] };

export type TrackTrivia = {
  summary: string;
  facts: TriviaFact[];
  links?: TriviaLink[];
  imageUrl?: string | null;
  cleanTitle?: string | null;
  cleanArtist?: string | null;
  graph?: TriviaGraph;
  source: "free" | "ai";
  fetchedAt: string;
};

export type TrackTriviaResponse =
  | {
      status: "ok";
      trivia: TrackTrivia;
    }
  | {
      status: "empty";
      reason: string;
    }
  | {
      status: "error";
      reason: string;
    };
