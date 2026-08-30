import { Link } from "@remix-run/react";
import { useCallback, useMemo, useRef, useState } from "react";
import { useHydrated } from "~/hooks/useHydrated";
import { usePlayerStore } from "~/state/playerStore";
import { roomForStation, useRoomStore } from "~/state/roomStore";
import { BRAND } from "~/constants/brand";
import { stationLocation, stationTelemetry } from "~/components/radio-passport/StationRow";
import { stationTags } from "~/components/radio-passport/stationInsights";
import { TheaterField, TheaterWell } from "~/components/radio-passport/TheaterWell";
import {
  buildTheaterKnowledge,
  seatTheaterKnowledge,
  toExpandedNeighborhood,
  wakeTheaterKnowledge,
} from "~/components/radio-passport/knowledge/theaterKnowledge";
import type {
  ExpandedNeighborhood,
  KnowledgeGraph,
  KnowledgeNode,
} from "~/types/knowledge";
import type { Station } from "~/types/radio";
import UpNextRow from "~/components/radio-passport/UpNextRow";
import {
  lockSeed,
  splitFieldTokens,
  theaterReleases,
  theaterTrackCopy,
} from "~/components/radio-passport/theaterLock";
import { formatLocalLabel, localDateAtLongitude } from "~/utils/localTime";
import {
  theaterIntelligenceFromRoom,
  theaterRoomGate,
  theaterWithoutStation,
} from "~/components/radio-passport/productFlow";
import { knowledgeSeatCopy } from "~/components/radio-passport/knowledge/knowledgeCopy";

export const meta = () => [
  { title: `Theater · ${BRAND.name}` },
  {
    name: "description",
    content: "A quiet listening room for the station you are already inside.",
  },
  { property: "og:title", content: `Theater · ${BRAND.name}` },
  {
    property: "og:description",
    content: "A quiet listening room for the station you are already inside.",
  },
  { property: "og:url", content: "https://elsewheremusic.com/listen" },
];

export default function ListeningPage() {
  const hydrated = useHydrated();
  const storedNowPlaying = usePlayerStore((state) => state.nowPlaying);
  const startStation = usePlayerStore((state) => state.startStation);
  const storedIsPlaying = usePlayerStore((state) => state.isPlaying);
  const nowPlaying = hydrated ? storedNowPlaying : null;
  const isPlaying = hydrated ? storedIsPlaying : false;
  const storedRoom = useRoomStore((state) => state.room);
  const room = roomForStation(storedRoom, nowPlaying?.uuid);

  const city = nowPlaying ? stationLocation(nowPlaying) : "";
  const local =
    nowPlaying && typeof nowPlaying.longitude === "number"
      ? localDateAtLongitude(nowPlaying.longitude)
      : null;
  const rawTrackLine = room.signal.track
    ? [room.signal.track.artist, room.signal.track.title].filter(Boolean).join(" — ")
    : null;
  const trackLine = theaterTrackCopy({
    isPlaying,
    metadataStatus: room.signal.status,
    trackLine: rawTrackLine,
  });
  const intelligence = theaterIntelligenceFromRoom({
    hasTrack: Boolean(rawTrackLine),
    captionBody: room.caption?.body,
    summary: room.dossier.summary,
    facts: room.dossier.facts,
    imageUrl: room.plate,
    links: room.dossier.links,
    track: rawTrackLine,
    graph: room.dossier.graph,
  });

  // ── The merged Theater knowledge graph (owner: this page) ──────────────
  // Catalog (from the tuned station) + Room dossier (MB + cited web) +
  // lazily expanded catalog neighbourhoods. The field only draws and clicks.
  const [expansions, setExpansions] = useState<ExpandedNeighborhood[]>([]);
  const [expandedFocuses, setExpandedFocuses] = useState<Set<string>>(
    () => new Set(),
  );
  const seatsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const awakeRef = useRef<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [trail, setTrail] = useState<Array<{ id: string; label: string }>>([]);
  const [stationByUuid, setStationByUuid] = useState<Record<string, Station>>(
    () => ({}),
  );

  const knowledgeGraph: KnowledgeGraph = useMemo(
    () =>
      buildTheaterKnowledge({
        station: hydrated ? storedNowPlaying : null,
        roomGraph: intelligence.graph,
        expansions,
      }),
    [expansions, hydrated, storedNowPlaying, intelligence.graph],
  );

  const evidenceArrived = useMemo(
    () => intelligence.graph.edges.some((edge) => edge.provenance === "web"),
    [intelligence.graph],
  );
  const knowledge = useMemo(() => {
    const cap = typeof window !== "undefined" && window.innerWidth < 720 ? 10 : 18;
    const seats = seatTheaterKnowledge({
      graph: knowledgeGraph,
      seats: seatsRef.current,
      focusId: selectedId,
      seed: lockSeed([storedNowPlaying?.uuid ?? "elsewhere"]),
    });
    seatsRef.current = seats;
    const model = wakeTheaterKnowledge({
      graph: knowledgeGraph,
      seats,
      awake: awakeRef.current,
      events: {
        landed: Boolean(hydrated && storedNowPlaying),
        icy: Boolean(room.signal.track),
        enrichment: Boolean(intelligence.summary || intelligence.facts.length),
        evidence: evidenceArrived,
      },
      focusId: selectedId,
      cap,
    });
    awakeRef.current = model.awake;
    return model;
  }, [
    evidenceArrived,
    hydrated,
    intelligence.facts.length,
    intelligence.summary,
    knowledgeGraph,
    room.signal.track,
    selectedId,
    storedNowPlaying,
  ]);

  const knowledgeNodes = useMemo(
    () =>
      knowledge.visible
        .map((id) => {
          const node = knowledge.graph.nodes.find((entry) => entry.id === id);
          const seat = knowledge.seats.get(id);
          if (!node || !seat) return null;
          return { ...node, x: seat.x, y: seat.y };
        })
        .filter((node): node is KnowledgeNode & { x: number; y: number } =>
          Boolean(node),
        ),
    [knowledge],
  );

  const handleNodeSelect = useCallback(
    (id: string) => {
      const node = knowledgeGraph.nodes.find((entry) => entry.id === id);
      if (!node) return;
      setSelectedId(id);
      setTrail((current) => {
        const seenAt = current.findIndex((crumb) => crumb.id === id);
        if (seenAt >= 0) return current.slice(0, seenAt + 1);
        return [...current, { id, label: node.label }];
      });
      const kind = node.kind;
      const rawId = id.split(":").slice(1).join(":");
      // Country/language heads lazily reveal connected stations. Station
      // clicks fetch the full Station so Tune here has a real object — they
      // never change playback on their own.
      if (
        (kind === "country" || kind === "language" || kind === "station") &&
        !expandedFocuses.has(id)
      ) {
        setExpandedFocuses((current) => new Set(current).add(id));
        const expandKind = kind === "station" ? "station" : kind;
        void fetch(
          `/api/atlas/expand?kind=${expandKind}&id=${encodeURIComponent(rawId)}`,
        )
          .then((response) => (response.ok ? response.json() : Promise.reject()))
          .then((payload: {
            graph: {
              nodes: Array<{
                id: string;
                label: string;
                kind: string;
                count?: number;
                favicon?: string | null;
                countryCode?: string | null;
              }>;
              edges: Array<{ from: string; to: string; relation: string }>;
            };
            stationDetail?: Station;
          }) => {
            if (payload.stationDetail?.uuid) {
              setStationByUuid((current) => ({
                ...current,
                [payload.stationDetail!.uuid]: payload.stationDetail!,
              }));
            }
            if (kind === "station") return;
            setExpansions((current) => [
              ...current,
              toExpandedNeighborhood(id, payload),
            ]);
          })
          .catch(() => {
            // An expansion outage keeps the already-lit sky; nothing lies.
          });
      }
    },
    [expandedFocuses, knowledgeGraph.nodes],
  );

  const selectedKnowledgeNode: KnowledgeNode | null = selectedId
    ? knowledge.graph.nodes.find((entry) => entry.id === selectedId) ?? null
    : null;

  const phase = room.phase;
  const factKey = intelligence.facts
    .map((fact) => `${fact.label}:${fact.value}`)
    .join("|");
  const graphKey = [
    ...intelligence.graph.nodes.map((node) => node.id),
    ...intelligence.graph.edges.map((edge) => `${edge.from}:${edge.to}`),
  ].join("|");
  const tagKey = nowPlaying ? stationTags(nowPlaying).join("|") : "";
  const releases = useMemo(
    () =>
      theaterReleases({
        city,
        country: nowPlaying?.country,
        longitude: nowPlaying?.longitude,
        bitrate: nowPlaying?.bitrate,
        codec: nowPlaying?.codec,
        languages: splitFieldTokens(nowPlaying?.language),
        tags: nowPlaying ? stationTags(nowPlaying) : [],
        artist: room.signal.track?.artist,
        title: room.signal.track?.title,
        dispatchBody: intelligence.dispatchBody,
        summary: intelligence.summary,
        facts: intelligence.facts,
        graph: intelligence.graph,
      }),
    [
      city,
      factKey,
      graphKey,
      intelligence.dispatchBody,
      intelligence.summary,
      nowPlaying?.bitrate,
      nowPlaying?.codec,
      nowPlaying?.country,
      nowPlaying?.language,
      nowPlaying?.longitude,
      room.signal.track?.artist,
      room.signal.track?.title,
      tagKey,
    ],
  );
  const seed = lockSeed([nowPlaying?.uuid, city]);

  const roomGate = theaterRoomGate(hydrated, nowPlaying);
  if (roomGate === "wait") {
    return <main className="ew-theater" aria-busy="true" />;
  }
  if (roomGate === "empty" || !nowPlaying) {
    const empty = theaterWithoutStation();
    return (
      <main className="ew-theater flex min-h-screen flex-col items-start justify-center">
        <p className="rp-eyebrow text-foil ew-arrive">{BRAND.eyebrow}</p>
        <h1 className="ew-coverline mt-4 ew-arrive ew-arrive-2">
          The room is empty.
        </h1>
        <p className="rp-lede mt-4 ew-arrive ew-arrive-3">{empty.message}</p>
        <Link
          to={empty.route}
          className="ew-land mt-8 ew-arrive ew-arrive-4"
          prefetch="intent"
          viewTransition
        >
          <span className="ew-land-kicker">EW · Departure</span>
          <span className="ew-land-city">{empty.label}</span>
        </Link>
      </main>
    );
  }

  return (
    <main className="ew-theater" data-phase={phase}>
      <div className="ew-theater-room" key={nowPlaying.uuid}>
        <aside className="ew-theater-sky">
          <TheaterField
            seed={seed}
            phase={phase}
            releases={releases}
            longitude={nowPlaying.longitude}
            graph={intelligence.graph}
            focusId={room.signal.track?.title ?? null}
            knowledge={{
              nodes: knowledgeNodes,
              edges: knowledge.graph.edges,
              awakeIds: knowledge.awake,
              firing: knowledge.firing,
              focusId: selectedId,
              tunedId: storedNowPlaying
                ? `station:${storedNowPlaying.uuid}`
                : null,
              onSelect: handleNodeSelect,
            }}
          />
        </aside>
        <div className="ew-theater-folio">
          <p className="rp-eyebrow text-ether ew-arrive">
            <i className="rp-live-dot" />
            {local ? formatLocalLabel(city, local) : "LIVE"} ·{" "}
            {stationTelemetry(nowPlaying)}
          </p>
          <h1 className="ew-coverline mt-3 ew-arrive ew-arrive-2">{city}</h1>
          <p className="rp-lede mt-2 ew-arrive ew-arrive-3">
            {nowPlaying.name} · {nowPlaying.country}
            {nowPlaying.language ? ` · ${nowPlaying.language}` : ""}
          </p>
          {trackLine && phase !== "filed" ? (
            <p className="ew-track ew-arrive ew-arrive-4" key={trackLine}>
              {trackLine}
            </p>
          ) : null}
          <UpNextRow />
          {trail.length > 1 ? (
            <nav className="ew-ktrail" aria-label="Knowledge trail">
              {trail.map((crumb, index) => (
                <button
                  key={crumb.id}
                  type="button"
                  aria-current={index === trail.length - 1 || undefined}
                  onClick={() => {
                    handleNodeSelect(crumb.id);
                  }}
                >
                  {index > 0 ? "· " : ""}
                  {crumb.label}
                </button>
              ))}
            </nav>
          ) : null}
          {selectedKnowledgeNode ? (
            <div className="ew-knode-detail" key={selectedKnowledgeNode.id}>
              <h2>{selectedKnowledgeNode.label}</h2>
              <p>{knowledgeSeatCopy(selectedKnowledgeNode)}</p>
              {selectedKnowledgeNode.kind === "station" ? (
                (() => {
                  const uuid = selectedKnowledgeNode.id.split(":").slice(1).join(":");
                  const detail =
                    stationByUuid[uuid] ??
                    (storedNowPlaying?.uuid === uuid ? storedNowPlaying : null);
                  const tuned = storedNowPlaying?.uuid === uuid;
                  if (tuned) {
                    return <p>Now tuning — the Theater holds this room.</p>;
                  }
                  return detail ? (
                    <button
                      type="button"
                      className="ew-knode-tune"
                      onClick={() => startStation(detail, { autoPlay: true })}
                    >
                      Tune here
                    </button>
                  ) : (
                    <p>Filing the signal…</p>
                  );
                })()
              ) : null}
            </div>
          ) : null}
          <TheaterWell
            phase={phase}
            dispatchBody={intelligence.dispatchBody}
            summary={intelligence.summary}
            facts={intelligence.facts}
            imageUrl={intelligence.imageUrl}
            links={intelligence.links}
            track={rawTrackLine}
          />
        </div>
      </div>
    </main>
  );
}
