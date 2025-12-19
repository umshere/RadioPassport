export type NowPlayingTrack = {
  raw: string;
  title: string | null;
  artist: string | null;
  source: "icy";
  fetchedAt: string;
};

export type NowPlayingResponse =
  | {
      status: "ok";
      track: NowPlayingTrack;
    }
  | {
      status: "empty";
      reason: string;
    }
  | {
      status: "error";
      reason: string;
    };
