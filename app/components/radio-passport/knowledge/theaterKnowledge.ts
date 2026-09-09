import type {
  ExpandedNeighborhood,
  KnowledgeEdge,
  KnowledgeEvents,
  KnowledgeGraph,
  KnowledgeKind,
  KnowledgeNode,
  KnowledgeProvenance,
  KnowledgeSeat,
  TheaterKnowledgeModel,
  TriviaGraphLike,
} from "~/types/knowledge";
import type { Station } from "~/types/radio";
import { fieldSlug, lockSeed } from "~/components/radio-passport/theaterLock";
import {
  preferSecureArtworkUrl,
  sanitizeArtworkUrl,
} from "~/utils/stations";

/**
 * The Theater knowledge model — the pure core of the product correction
 * (docs/PRODUCT_CORRECTION_THEATER_GRAPH.md).
 *
 * Three pure functions, no React, no fetching, no playback:
 *   buildTheaterKnowledge — addition-only merge of catalog + Room dossier +
 *     expansions into one navigable graph.
 *   wakeTheaterKnowledge — real events light neurons; nothing dances on its
 *     own.
 *   seatTheaterKnowledgeTide — deterministic tide coordinates; pinned seats
 *     never move, so arriving knowledge reshuffles nothing.
 *
 * Everything here fails closed: a claim without a verified MusicBrainz edge
 * behind it, or a web claim without the exact URL it was read from, never
 * becomes a node or an edge. Unsupported relations are the one thing this
 * module must never produce.
 */

/** Mirrors FIELD_SECTOR_ANGLE in theaterLock.ts so knowledge stars hold the
 * same sectors of the sky the field already taught (person->artist,
 * work->track, film->event having been mapped at build time); `city` is the
 * one new kind, seated south-west between place (130°) and country (170°). */
const SECTOR_ANGLE: Record<KnowledgeKind, number> = {
  artist: (-150 * Math.PI) / 180,
  track: (-30 * Math.PI) / 180,
  album: (-5 * Math.PI) / 180,
  place: (130 * Math.PI) / 180,
  year: (130 * Math.PI) / 180,
  genre: (47.5 * Math.PI) / 180,
  event: (47.5 * Math.PI) / 180,
  country: (170 * Math.PI) / 180,
  language: (-110 * Math.PI) / 180,
  station: (100 * Math.PI) / 180,
  city: (140 * Math.PI) / 180,
};

const SECTOR_JITTER = 0.35;
const SECTOR_WOBBLE = 0.04;
const GOLDEN_ANGLE = 2.399963229728653;
/** Normalized distance below which two labels occupy the same tap. */
const MIN_SEAT_GAP = 0.12;
const SEAT_MIN = 0.06;
const SEAT_MAX = 0.94;
const FOCUS_CENTRE: KnowledgeSeat = { x: 0.5, y: 0.5 };

/** Landing lights the four catalog anchors — the part that is definitely
 * known before any metadata arrives. */
const LANDED_KINDS: KnowledgeKind[] = ["country", "city", "language", "station"];
/** Enrichment grows branches off the track; it never invents catalog heads. */
const ENRICHABLE_KINDS = new Set<KnowledgeKind>([
  "artist",
  "album",
  "year",
  "genre",
  "place",
  "event",
]);

/** Identical generator to theaterLock's private one: same seed discipline,
 * same texture of jitter across the whole theater. */
function createRng(seed: number) {
  let state = seed || 1;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function monogramOf(label: string): string {
  const trimmed = label.trim();
  // Same convention as AtlasPanel: one letter stands in when art cannot.
  return trimmed ? trimmed.charAt(0).toUpperCase() : "·";
}

function normalizedRelation(value: string): string {
  return value.trim();
}

/**
 * Which room-graph claims may enter the merged graph. Legacy unmarked edges
 * keep their bright verified meaning (verified ⇒ musicbrainz, the same rule
 * normalizeTriviaGraph uses); an edge that only claims authority without
 * showing it — web with no retrieved URL, "musicbrainz" flagged unverified —
 * is dropped rather than displayed.
 */
function acceptRoomEdge(edge: TriviaGraphLike["edges"][number]): {
  from: string;
  to: string;
  relation: string;
  provenance: KnowledgeProvenance;
  sourceUrl?: string;
} | null {
  const from = edge.from?.trim();
  const to = edge.to?.trim();
  const relation = normalizedRelation(edge.relation ?? "");
  if (!from || !to || from === to || !relation) return null;

  const sourceUrl =
    typeof edge.sourceUrl === "string" ? edge.sourceUrl.trim() : "";
  if (edge.provenance === "web") {
    // Citation-filtered or not at all: a web edge must say where it was read.
    if (!sourceUrl) return null;
    return { from, to, relation, provenance: "web", sourceUrl };
  }
  if (edge.provenance === "catalog") {
    // Radio-Browser facts need no external citation (see types/trivia.ts).
    return { from, to, relation, provenance: "catalog" };
  }
  if (edge.provenance === "musicbrainz") {
    if (edge.verified === false) return null;
    return { from, to, relation, provenance: "musicbrainz" };
  }
  if (edge.verified === true) {
    return { from, to, relation, provenance: "musicbrainz" };
  }
  return null;
}

/**
 * Room-dossier kinds map onto knowledge kinds. The dossier carries the current
 * track as its centre work; works reached by an "appears on" edge are albums.
 * Any other named work is still a musical work — it reads truthfully as a
 * farther track star rather than being silently dropped. Atlas-only trivia
 * kinds never ride a room dossier and are refused.
 */
function knowledgeKindFor(
  kind: TriviaGraphLike["nodes"][number]["kind"],
  flags: { isCentre: boolean; isAlbum: boolean },
): KnowledgeKind | null {
  switch (kind) {
    case "person":
      return "artist";
    case "work":
      if (flags.isCentre) return "track";
      return flags.isAlbum ? "album" : "track";
    case "place":
      return "place";
    case "year":
      return "year";
    case "genre":
      return "genre";
    case "event":
      return "event";
    case "film":
      return "event";
    default:
      return null;
  }
}

/**
 * Addition-only merge: catalog (the tuned Station alone) first, the Room
 * dossier second, lazy catalog expansions third. A namespaced id files once;
 * its array position is then permanent, so growing knowledge never reshuffles
 * the nodes already on the sky.
 */
export function buildTheaterKnowledge(input: {
  station: Station | null;
  roomGraph?: TriviaGraphLike | null;
  expansions?: ExpandedNeighborhood[];
  /** Live ICY identity. Never invented — omit it when the station is quiet. */
  track?: { artist?: string | null; title?: string | null } | null;
  /**
   * Verified art only, keyed by namespaced node id — the dossier plate for
   * the track/album, gated portraits for artists. A URL that fails
   * sanitize is refused here, never rendered; nodes without art keep their
   * monogram discs.
   */
  artwork?: Record<string, string>;
}): KnowledgeGraph {
  const nodes: KnowledgeNode[] = [];
  const edges: KnowledgeEdge[] = [];
  const indexOf = new Map<string, number>();
  const edgeKeys = new Set<string>();

  const fileNode = (node: KnowledgeNode) => {
    if (!node.id || !node.label.trim()) return;
    if (indexOf.has(node.id)) return;
    if (!node.imagery) {
      const art = sanitizeArtworkUrl(input.artwork?.[node.id]);
      if (art) {
        node = {
          ...node,
          imagery: { type: "art", url: art, monogram: monogramOf(node.label) },
        };
      }
    }
    indexOf.set(node.id, nodes.length);
    nodes.push(node);
  };

  const addEdge = (
    from: string,
    to: string,
    relation: string,
    provenance: KnowledgeProvenance,
    sourceUrl?: string,
  ) => {
    if (!from || !to || from === to) return;
    // Both ends must be on the sky — a relation between ghosts supports
    // nothing and would dangle in the renderer.
    if (!indexOf.has(from) || !indexOf.has(to)) return;
    const key = `${from}\u0000${to}\u0000${relation}`;
    if (edgeKeys.has(key)) return;
    edgeKeys.add(key);
    edges.push(
      sourceUrl ? { from, to, relation, provenance, sourceUrl } : { from, to, relation, provenance },
    );
  };

  // ---- Catalog first: Radio-Browser facts about the tuned station alone.
  let stationId: string | null = null;
  const station = input.station;
  if (station) {
    const name = station.name?.trim() ?? "";
    const countryCode = station.countryCode?.trim() ?? "";
    const countryName = station.country?.trim() ?? "";
    const countryTail = countryCode
      ? countryCode.toUpperCase()
      : fieldSlug(countryName);
    if (countryTail) {
      fileNode({
        id: `country:${countryTail}`,
        kind: "country",
        label: countryName || countryCode,
        provenance: "catalog",
        // A flag medallion only from a real ISO code — never invented.
        ...(countryCode ? { imagery: { type: "flag", code: countryCode.toUpperCase() } } : {}),
      });
    }

    const cityName = station.city?.trim() ?? "";
    const cityTail = fieldSlug(cityName);
    if (cityTail) {
      fileNode({
        id: `city:${cityTail}`,
        kind: "city",
        label: cityName,
        provenance: "catalog",
      });
    }

    const languageCode = (station.languageCodes ?? [])
      .map((code) => code?.trim() ?? "")
      .find(Boolean);
    const languageName = station.language?.trim() ?? "";
    const languageTail = languageCode
      ? fieldSlug(languageCode)
      : fieldSlug(languageName);
    if (languageTail) {
      fileNode({
        id: `language:${languageTail}`,
        kind: "language",
        label: languageName || languageCode || languageTail,
        provenance: "catalog",
      });
    }

    const uuid = station.uuid?.trim() ?? "";
    if (uuid && name) {
      stationId = `station:${uuid}`;
      fileNode({
        id: stationId,
        kind: "station",
        label: name,
        provenance: "catalog",
        imagery: {
          type: "favicon",
          url: sanitizeArtworkUrl(preferSecureArtworkUrl(station.favicon)),
          monogram: monogramOf(name),
        },
      });
    }

    const countryId = countryTail ? `country:${countryTail}` : null;
    const cityId = cityTail ? `city:${cityTail}` : null;
    const languageId = languageTail ? `language:${languageTail}` : null;
    // The correction's minimal honest shape — no edge that isn't a fact the
    // station record itself states.
    if (countryId && languageId) {
      addEdge(countryId, languageId, "broadcasts in", "catalog");
    }
    if (countryId && stationId) {
      addEdge(countryId, stationId, "stations here", "catalog");
    }
    if (languageId && stationId) {
      addEdge(languageId, stationId, "stations here", "catalog");
    }
    if (stationId && cityId) {
      addEdge(stationId, cityId, "in city", "catalog");
    }
  }

  // ICY title — never invented. Lights the track star the moment the station
  // names what is on the air, before MusicBrainz has filed.
  const icyTitle = input.track?.title?.trim() ?? "";
  const icyArtist = input.track?.artist?.trim() ?? "";
  if (stationId && icyTitle) {
    const icyTail = fieldSlug([icyArtist, icyTitle].filter(Boolean).join(" "));
    if (icyTail) {
      const icyId = `track:${icyTail}`;
      fileNode({
        id: icyId,
        kind: "track",
        label: icyArtist ? `${icyArtist} — ${icyTitle}` : icyTitle,
        provenance: "catalog",
      });
      addEdge(stationId, icyId, "currently airing", "catalog");
    }
  }

  // ---- Room dossier second: MusicBrainz spine + citation-filtered web.
  const roomGraph = input.roomGraph;
  if (roomGraph) {
    const roomNodes = Array.isArray(roomGraph.nodes) ? roomGraph.nodes : [];
    const roomEdges = Array.isArray(roomGraph.edges) ? roomGraph.edges : [];
    const nodeById = new Map<string, TriviaGraphLike["nodes"][number]>();
    for (const node of roomNodes) {
      if (node?.id && !nodeById.has(node.id)) nodeById.set(node.id, node);
    }

    const appearsOn = (relation: string) =>
      relation.trim().toLowerCase() === "appears on";
    // Refuse the unprovable claims before anything reads them: identity,
    // provenance and structure all come from accepted edges only.
    const accepted = roomEdges
      .map(acceptRoomEdge)
      .filter((edge): edge is NonNullable<typeof edge> => edge !== null);
    const albumTargets = new Set(
      accepted.filter((edge) => appearsOn(edge.relation)).map((edge) => edge.to),
    );
    // The centre is the titled work that is not somebody's album — the first
    // in dossier order, so the choice never wobbles between renders.
    const centreKey =
      roomNodes.find((node) => node.kind === "work" && !albumTargets.has(node.id))
        ?.id ?? roomNodes.find((node) => node.kind === "work")?.id ?? null;
    const centre = centreKey ? nodeById.get(centreKey) : undefined;

    let artistLabel = "";
    if (centreKey) {
      for (const edge of accepted) {
        const candidate =
          edge.from === centreKey
            ? nodeById.get(edge.to)
            : edge.to === centreKey
              ? nodeById.get(edge.from)
              : undefined;
        if (candidate?.kind === "person" && candidate.label.trim()) {
          artistLabel = candidate.label.trim();
          break;
        }
      }
    }
    // track:<normalized artist + title> — the same song files as the same
    // star wherever it is met again.
    const trackTail = centre
      ? fieldSlug([artistLabel, centre.label.trim()].filter(Boolean).join(" "))
      : "";

    // Provenance flows from edges to the nodes they connect: a node whose only
    // claims were refused arrives with no accepted relation behind it and is
    // refused with them.
    const endpointProvenance = new Map<string, KnowledgeProvenance>();
    for (const edge of accepted) {
      for (const end of [edge.from, edge.to]) {
        if (!endpointProvenance.has(end)) endpointProvenance.set(end, edge.provenance);
      }
    }

    const roomNamespace = new Map<string, string>();
    for (const node of roomNodes) {
      const provenance = endpointProvenance.get(node.id);
      if (!provenance) continue;
      const kind = knowledgeKindFor(node.kind, {
        isCentre: node.id === centreKey,
        isAlbum: albumTargets.has(node.id),
      });
      if (!kind) continue;
      const tail =
        node.id === centreKey && trackTail
          ? trackTail
          : fieldSlug(node.id || node.label);
      if (!tail) continue;
      const id = `${kind}:${tail}`;
      roomNamespace.set(node.id, id);
      fileNode({
        id,
        kind,
        label: node.label.trim() || node.id,
        provenance,
      });
    }

    const namespaced = (key: string) => roomNamespace.get(key) ?? null;
    for (const edge of accepted) {
      const from = namespaced(edge.from);
      const to = namespaced(edge.to);
      if (!from || !to) continue;
      addEdge(from, to, edge.relation, edge.provenance, edge.sourceUrl);
    }

    // The dossier's centre work is on air right now — the one bridge between
    // the catalog half and the music half of the sky.
    if (stationId && centre && trackTail) {
      addEdge(stationId, `track:${trackTail}`, "currently airing", "musicbrainz");
    }
  }

  // ---- Expansions third: already namespaced, already catalog-provenance.
  for (const expansion of input.expansions ?? []) {
    for (const node of expansion.nodes) {
      fileNode({
        id: node.id,
        kind: node.kind,
        label: node.label,
        provenance: "catalog",
        ...(node.count === undefined ? {} : { count: node.count }),
        ...(node.imagery === undefined ? {} : { imagery: node.imagery }),
      });
    }
    for (const edge of expansion.edges) {
      addEdge(edge.from, edge.to, edge.relation, "catalog");
    }
  }

  return { nodes, edges };
}

const ATLAS_KIND: Record<string, KnowledgeKind> = {
  country: "country",
  language: "language",
  station: "station",
  genre: "genre",
};

/** Turn an /api/atlas/expand payload into already-namespaced expansion
 * nodes. The Atlas graph uses raw uuids/ISO codes; the Theater graph
 * prefixes every id so a station never collides with a country. */
export function toExpandedNeighborhood(
  focusId: string,
  view: {
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
  },
): ExpandedNeighborhood {
  const idByRaw = new Map<string, string>();
  const nodes: ExpandedNeighborhood["nodes"] = [];
  for (const entry of view.graph.nodes ?? []) {
    const kind = ATLAS_KIND[entry.kind];
    const tail = entry.id?.trim() ?? "";
    if (!kind || !tail || !entry.label?.trim()) continue;
    const id = `${kind}:${tail}`;
    idByRaw.set(entry.id, id);
    const imagery =
      kind === "station"
        ? {
            type: "favicon" as const,
            url: sanitizeArtworkUrl(
              preferSecureArtworkUrl(entry.favicon ?? null),
            ),
            monogram: monogramOf(entry.label),
          }
        : kind === "country" && entry.countryCode
          ? { type: "flag" as const, code: entry.countryCode.toUpperCase() }
          : undefined;
    nodes.push({
      id,
      kind,
      label: entry.label.trim(),
      provenance: "catalog",
      ...(entry.count === undefined ? {} : { count: entry.count }),
      ...(imagery ? { imagery } : {}),
    });
  }
  const edges: ExpandedNeighborhood["edges"] = [];
  for (const edge of view.graph.edges ?? []) {
    const from = idByRaw.get(edge.from);
    const to = idByRaw.get(edge.to);
    if (!from || !to) continue;
    edges.push({ from, to, relation: edge.relation });
  }
  return { focusId, nodes, edges };
}

/**
 * Stations the selected hub has opened onto. The tide shows the well and
 * its hubs; sibling stations stay under until their country or language is
 * tapped, then fan out of that hub only. Deselecting the hub stills them
 * again — the water never holds everything at once.
 */
export function revealedTideStationIds(
  expansions: ExpandedNeighborhood[],
  selectedId: string | null,
): Set<string> {
  const revealed = new Set<string>();
  if (!selectedId) return revealed;
  for (const expansion of expansions) {
    if (expansion.focusId !== selectedId) continue;
    for (const node of expansion.nodes) {
      if (node.kind === "station") revealed.add(node.id);
    }
  }
  return revealed;
}

/** Keep a handful of language doors, then the stations they open onto.
 * Graph order otherwise lets twelve languages fill a country hop and hide
 * every connected station — the opposite of Country → language → station. */
const LANGUAGE_DOORS_FIRST = 3;

function interleaveCatalogHop(
  hop: string[],
  graph: KnowledgeGraph,
  indexOf: Map<string, number>,
): string[] {
  const kindOf = (id: string) => graph.nodes[indexOf.get(id)!]?.kind;
  const languages: string[] = [];
  const stations: string[] = [];
  const rest: string[] = [];
  for (const id of hop) {
    const kind = kindOf(id);
    if (kind === "language") languages.push(id);
    else if (kind === "station") stations.push(id);
    else rest.push(id);
  }
  if (stations.length === 0 || languages.length <= LANGUAGE_DOORS_FIRST) {
    return hop;
  }
  return [
    ...languages.slice(0, LANGUAGE_DOORS_FIRST),
    ...stations,
    ...languages.slice(LANGUAGE_DOORS_FIRST),
    ...rest,
  ];
}

/**
 * Real events are the only thing that wakes a node. Tiers run in event order;
 * within a tier, graph array order. Nothing here mutates its inputs.
 */
export function wakeTheaterKnowledge(input: {
  graph: KnowledgeGraph;
  seats: Map<string, KnowledgeSeat>;
  awake: Set<string>;
  events: KnowledgeEvents;
  focusId: string | null;
  cap: number;
}): TheaterKnowledgeModel {
  const { graph } = input;
  const indexOf = new Map(graph.nodes.map((node, index) => [node.id, index]));
  const awake = new Set(input.awake);
  const wokeThisCall = new Set<string>();

  const tryWake = (id: string, allowed?: (kind: KnowledgeKind) => boolean) => {
    if (!id || awake.has(id)) return false;
    const node = indexOf.has(id) ? graph.nodes[indexOf.get(id)!] : undefined;
    if (!node) return false;
    if (allowed && !allowed(node.kind)) return false;
    awake.add(id);
    wokeThisCall.add(id);
    return true;
  };

  if (input.events.landed) {
    for (const kind of LANDED_KINDS) {
      for (const node of graph.nodes) {
        if (node.kind === kind) tryWake(node.id);
      }
    }
  }

  if (input.events.icy) {
    // The station's "currently airing" edge names the track; without it, the
    // first filed track stands in (stationless dossiers still light).
    const airing: string[] = [];
    for (const edge of graph.edges) {
      const fromKind = indexOf.get(edge.from);
      if (
        edge.relation === "currently airing" &&
        fromKind !== undefined &&
        graph.nodes[fromKind]?.kind === "station"
      ) {
        airing.push(edge.to);
      }
    }
    let wokeTrack = false;
    for (const id of airing) {
      if (tryWake(id, (kind) => kind === "track")) wokeTrack = true;
    }
    if (!wokeTrack) {
      for (const node of graph.nodes) {
        if (node.kind === "track" && tryWake(node.id)) break;
      }
    }
  }

  if (input.events.enrichment) {
    // Branches grow off the track along verified MusicBrainz threads only.
    const trackAwakeBeforeTier = new Set(
      [...awake].filter((id) => graph.nodes[indexOf.get(id)!]?.kind === "track"),
    );
    for (const edge of graph.edges) {
      if (edge.provenance !== "musicbrainz") continue;
      if (trackAwakeBeforeTier.has(edge.from)) {
        tryWake(edge.to, (kind) => ENRICHABLE_KINDS.has(kind));
      } else if (trackAwakeBeforeTier.has(edge.to)) {
        tryWake(edge.from, (kind) => ENRICHABLE_KINDS.has(kind));
      }
    }
  }

  if (input.events.evidence) {
    // Cited web knowledge joins whatever is already lit — one hop from the
    // awake set as it stood when the evidence arrived, never a chain reaction.
    const awakeBeforeTier = new Set(awake);
    for (const edge of graph.edges) {
      if (edge.provenance !== "web") continue;
      if (awakeBeforeTier.has(edge.from)) tryWake(edge.to);
      else if (awakeBeforeTier.has(edge.to)) tryWake(edge.from);
    }
  }

  // A neuron fires along an edge it just joined: one end woke in this call,
  // the other end is lit (it may have lit in the same tier). Constellation
  // edges are read undirected for pulses — the dossier stores artist->track,
  // the ear hears track-then-artist.
  const firing: Array<{ from: string; to: string }> = [];
  for (const edge of graph.edges) {
    const near = awake.has(edge.from);
    const far = awake.has(edge.to);
    if (!near || !far) continue;
    if (!wokeThisCall.has(edge.from) && !wokeThisCall.has(edge.to)) continue;
    firing.push({ from: edge.from, to: edge.to });
  }

  // Visibility prefers the focus neighbourhood, breadth by breadth, and never
  // lists a sleeping node. Hops are structural (distance from focus), the
  // listing is honest (awake only).
  const cap = Math.max(0, Math.floor(input.cap));
  const adjacency = new Map<string, string[]>();
  const linkNeighbours = (left: string, right: string) => {
    const list = adjacency.get(left);
    if (list && !list.includes(right)) list.push(right);
    else if (!list) adjacency.set(left, [right]);
  };
  for (const edge of graph.edges) {
    if (!indexOf.has(edge.from) || !indexOf.has(edge.to)) continue;
    linkNeighbours(edge.from, edge.to);
    linkNeighbours(edge.to, edge.from);
  }
  const byGraphOrder = (ids: string[]) =>
    [...new Set(ids)].sort(
      (left, right) => (indexOf.get(left) ?? 0) - (indexOf.get(right) ?? 0),
    );

  const focusId =
    input.focusId && indexOf.has(input.focusId)
      ? input.focusId
      : graph.nodes.find((node) => node.kind === "country")?.id ??
        graph.nodes[0]?.id ??
        null;
  const hopOneRaw = focusId ? byGraphOrder(adjacency.get(focusId) ?? []) : [];
  // Country/language heads have many sibling languages; if hop-1 is listed in
  // graph order those languages fill the cap and connected stations stay dark.
  // Keep a few language doors, then stations, then leftover languages — the
  // correction wants Country → language → station visible, not a language wall.
  const hopOne = interleaveCatalogHop(hopOneRaw, graph, indexOf);
  const hopTwo = byGraphOrder(hopOne.flatMap((id) => adjacency.get(id) ?? []))
    .filter((id) => id !== focusId && !hopOne.includes(id));

  const visible: string[] = [];
  for (const id of [focusId, ...hopOne, ...hopTwo]) {
    if (visible.length >= cap) break;
    if (!id || !awake.has(id) || visible.includes(id)) continue;
    visible.push(id);
  }

  // Honest darkness: awake nodes the cap leaves unlit. Sleeping catalog nodes
  // are not counted here — the panel reads those from node.count instead.
  let darkCount = 0;
  for (const id of awake) {
    if (indexOf.has(id) && !visible.includes(id)) darkCount += 1;
  }

  return { graph, seats: input.seats, awake, firing, visible, darkCount };
}

/**
 * Depth lane of a knowledge node in tide water. The well holds the tuned
 * station; the on-air track rides closest; land and tongue hubs hold the
 * middle; everything else — neighbour stations, dossier branches, cited
 * web — drifts outermost where it can be fanned without covering the room.
 */
export function tideLaneForKnowledge(
  node: { id: string; kind: KnowledgeKind },
  tunedId: string | null,
): number {
  if (node.kind === "station" && tunedId && node.id === tunedId) return 0;
  if (node.kind === "track") return 1;
  if (
    node.kind === "country" ||
    node.kind === "language" ||
    node.kind === "city" ||
    node.kind === "artist"
  ) {
    return 2;
  }
  return 3;
}

const TIDE_LANE_RADIUS = [0, 0.18, 0.3, 0.42] as const;
const TIDE_Y_FLATTEN = 0.72;

/**
 * Tide seating. Same pinning discipline (pinned seats win verbatim; jitter
 * keyed by [seed, nodeId]), but the well is the tuned station and every
 * other node takes a depth lane instead of a hop ring around the focus.
 * The focus still highlights; it never drags the water.
 */
export function seatTheaterKnowledgeTide(input: {
  graph: KnowledgeGraph;
  seats: Map<string, KnowledgeSeat>;
  focusId: string | null;
  seed: number;
  tunedId?: string | null;
}): Map<string, KnowledgeSeat> {
  const { graph } = input;
  const tunedId =
    input.tunedId && graph.nodes.some((node) => node.id === input.tunedId)
      ? input.tunedId
      : null;
  const indexOf = new Map(graph.nodes.map((node, index) => [node.id, index]));
  const seats = new Map<string, KnowledgeSeat>();
  for (const [id, seat] of input.seats) {
    if (!indexOf.has(id)) continue;
    seats.set(id, { x: seat.x, y: seat.y });
  }

  const wellId =
    tunedId ??
    (input.focusId && indexOf.has(input.focusId) ? input.focusId : null) ??
    graph.nodes.find((node) => node.kind === "country")?.id ??
    graph.nodes[0]?.id ??
    null;

  const tooClose = (candidate: KnowledgeSeat) => {
    for (const other of seats.values()) {
      const dx = candidate.x - other.x;
      const dy = candidate.y - other.y;
      if (dx * dx + dy * dy < MIN_SEAT_GAP * MIN_SEAT_GAP) return true;
    }
    return false;
  };

  for (const node of graph.nodes) {
    if (seats.has(node.id)) continue;
    if (node.id === wellId) {
      seats.set(node.id, { ...FOCUS_CENTRE });
      continue;
    }
    const lane = tideLaneForKnowledge(node, tunedId);
    const baseAngle = SECTOR_ANGLE[node.kind];
    const rng = createRng(lockSeed([input.seed, "tide", node.id]));
    let angle =
      baseAngle + (rng() - 0.5) * SECTOR_JITTER + (rng() - 0.5) * SECTOR_WOBBLE;
    const radius =
      TIDE_LANE_RADIUS[lane]! * (0.92 + rng() * 0.16);
    const polar = (theta: number, r: number): KnowledgeSeat => {
      const x = 0.5 + Math.cos(theta) * r;
      const y = 0.5 + Math.sin(theta) * r * TIDE_Y_FLATTEN;
      return {
        x: Math.min(SEAT_MAX, Math.max(SEAT_MIN, x)),
        y: Math.min(SEAT_MAX, Math.max(SEAT_MIN, y)),
      };
    };
    let seat = polar(angle, radius);
    let guard = 0;
    while (tooClose(seat) && guard < 36) {
      angle += GOLDEN_ANGLE;
      const extra = Math.floor(guard / 6) * 0.05;
      seat = polar(angle, Math.min(0.48, radius + extra));
      guard += 1;
    }
    seats.set(node.id, seat);
  }

  if (wellId) seats.set(wellId, { ...FOCUS_CENTRE });
  return seats;
}
