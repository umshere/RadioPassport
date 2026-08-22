import { useEffect } from "react";
import { useNowPlayingMetadata } from "~/hooks/useNowPlayingMetadata";
import { requestTrackTrivia } from "~/hooks/useTrackTrivia";
import { useNowPlayingMetadataStore } from "~/state/nowPlayingMetadataStore";
import {
  dispatchRequestFor,
  useRoomStore,
  type RoomDossier,
} from "~/state/roomStore";
import type { DispatchResponse } from "~/types/ai";
import type { NowPlayingTrack } from "~/types/nowPlaying";
import type { Station } from "~/types/radio";
import { EMPTY_GRAPH } from "~/types/trivia";
import { trackKey } from "~/components/radio-passport/stationInsights";

export const DEEPEN_AFTER_MS = 10_000;

function dossierFromTrivia(
  result: Awaited<ReturnType<typeof requestTrackTrivia>>,
  source: "free" | "ai",
): RoomDossier {
  if (result.status === "ready" && result.trivia) {
    return {
      status: "ready",
      summary: result.trivia.summary ?? null,
      facts: result.trivia.facts ?? [],
      links: (result.trivia.links ?? []).map((link) => ({
        label: link.label,
        url: link.url,
      })),
      imageUrl: result.trivia.imageUrl ?? null,
      source,
      graph: result.trivia.graph ?? EMPTY_GRAPH,
    };
  }
  return {
    status: result.status === "error" ? "error" : "empty",
    summary: null,
    facts: [],
    links: [],
    imageUrl: null,
    source,
    graph: EMPTY_GRAPH,
  };
}

/**
 * The dock is the only writer. Home and Theater read `useRoomStore`.
 */
export function useRoom(nowPlaying: Station | null, isPlaying: boolean) {
  const metadata = useNowPlayingMetadata(nowPlaying, isPlaying);
  const setMetadata = useNowPlayingMetadataStore((state) => state.setMetadata);
  const openRoom = useRoomStore((state) => state.openRoom);
  const setPlaying = useRoomStore((state) => state.setPlaying);
  const setSignal = useRoomStore((state) => state.setSignal);
  const setCaption = useRoomStore((state) => state.setCaption);
  const setDossier = useRoomStore((state) => state.setDossier);

  const stationId = nowPlaying?.uuid ?? null;

  useEffect(() => {
    setMetadata(metadata);
  }, [
    metadata.lastUpdated,
    metadata.message,
    metadata.refreshing,
    metadata.sourceKey,
    metadata.status,
    metadata.track,
    setMetadata,
  ]);

  useEffect(() => {
    openRoom(nowPlaying, isPlaying);
  }, [isPlaying, nowPlaying, openRoom, stationId]);

  useEffect(() => {
    setPlaying(isPlaying);
  }, [isPlaying, setPlaying]);

  useEffect(() => {
    if (!stationId) return;
    setSignal(stationId, {
      status: metadata.status,
      track: metadata.track,
      message: metadata.message,
    });
  }, [metadata.message, metadata.status, metadata.track, setSignal, stationId]);

  useEffect(() => {
    if (!nowPlaying || !isPlaying) return;
    const stationId = nowPlaying.uuid;

    const request = () => {
      void fetch("/api/ai/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dispatchRequestFor(nowPlaying, metadata.track)),
      })
        .then(async (response) => {
          if (!response.ok) return null;
          return (await response.json()) as DispatchResponse;
        })
        .then((payload) => {
          if (payload?.dispatch) setCaption(stationId, payload.dispatch, "ai");
        })
        .catch(() => {
          // Template caption already sits on the room.
        });
    };

    const timer = window.setTimeout(request, 1500);
    // Stations that send no titles still get fresh letters as their local
    // hour moves — the room never goes fully quiet while playing.
    const ambient =
      metadata.track &&
      (metadata.track.title || metadata.track.artist)
        ? 0
        : window.setInterval(request, 90_000);

    return () => {
      window.clearTimeout(timer);
      if (ambient) window.clearInterval(ambient);
    };
  }, [isPlaying, metadata.track, nowPlaying, setCaption]);

  useEffect(() => {
    const track: NowPlayingTrack | null = metadata.track;
    if (!nowPlaying || !isPlaying || !track || !(track.title || track.artist)) {
      return;
    }
    const stationId = nowPlaying.uuid;
    let cancelled = false;
    let deepenTimer = 0;
    void requestTrackTrivia({ track, source: "free" }).then((free) => {
      if (cancelled) return;
      const freeDossier = dossierFromTrivia(free, "free");
      if (freeDossier.status === "ready") {
        setDossier(stationId, freeDossier);
      } else {
        setDossier(stationId, { ...freeDossier, status: "loading" });
      }
      return requestTrackTrivia({
        track,
        source: "ai",
        context: {
          summary: free.trivia?.summary ?? null,
          facts: free.trivia?.facts ?? [],
          graph: free.trivia?.graph ?? null,
        },
      }).then((ai) => {
        if (cancelled) return;
        const aiDossier = dossierFromTrivia(ai, "ai");
        if (aiDossier.status === "ready") {
          setDossier(stationId, aiDossier);
        } else if (freeDossier.status !== "ready") {
          setDossier(stationId, aiDossier);
        }
        const filed =
          aiDossier.status === "ready" || freeDossier.status === "ready";
        if (!filed) return;
        deepenTimer = window.setTimeout(() => {
          if (cancelled) return;
          const room = useRoomStore.getState().room;
          if (room.stationId !== stationId) return;
          if (trackKey(room.signal.track) !== trackKey(track)) return;
          void requestTrackTrivia({
            track,
            source: "ai-deepen",
            context: {
              summary: room.dossier.summary,
              facts: room.dossier.facts,
              graph: room.dossier.graph,
            },
          }).then((deep) => {
            if (cancelled) return;
            if (deep.status !== "ready" || !deep.trivia?.graph?.nodes.length) {
              return;
            }
            setDossier(stationId, {
              status: "ready",
              summary: null,
              facts: [],
              links: [],
              imageUrl: null,
              source: "ai",
              graph: deep.trivia.graph,
            });
          });
        }, DEEPEN_AFTER_MS);
      });
    });
    return () => {
      cancelled = true;
      window.clearTimeout(deepenTimer);
    };
  }, [isPlaying, metadata.track, nowPlaying, setDossier]);
}
