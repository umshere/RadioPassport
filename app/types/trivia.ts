export type TriviaFact = {
  label: string;
  value: string;
};

export type TriviaLink = {
  label: string;
  url: string;
  kind: "youtube" | "artist" | "release" | "track" | "info";
};

export type TrackTrivia = {
  summary: string;
  facts: TriviaFact[];
  links?: TriviaLink[];
  imageUrl?: string | null;
  cleanTitle?: string | null;
  cleanArtist?: string | null;
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
