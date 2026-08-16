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
  | "event";

export type TriviaGraphNode = {
  id: string;
  label: string;
  kind: TriviaGraphKind;
};

export type TriviaGraphEdge = {
  from: string;
  to: string;
  relation: string;
  verified?: boolean;
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
