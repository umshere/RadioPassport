import type {
  TriviaEdgeProvenance,
  TriviaGraph,
  TriviaGraphEdge,
  TriviaGraphKind,
  TriviaGraphNode,
} from "~/types/trivia";
import { EMPTY_GRAPH } from "~/types/trivia";

export type TheaterPhase = "reading" | "locking" | "filed" | "quiet";

/** A remembered title older than this never seeds the frozen folio. */
export const LAST_TRACK_FRESH_MS = 30 * 60 * 1000;

export type FieldFamily =
  | "place"
  | "signal"
  | "language"
  | "tag"
  | "track"
  | "dispatch"
  | "fact"
  | "cover"
  | "graph";

export const GRAPH_NODE_CAP = 10;
export const GRAPH_EDGE_CAP = 14;
export type FieldPoint = { x: number; y: number };

const GRAPH_KIND_FAMILY: Record<string, FieldFamily> = {
  person: "track",
  work: "fact",
  film: "fact",
  place: "place",
  year: "fact",
  genre: "tag",
  event: "fact",
};

const GRAPH_KINDS = new Set(Object.keys(GRAPH_KIND_FAMILY));

const MB_RELATION_WORD: Record<string, string> = {
  composer: "composed",
  lyricist: "wrote",
  writer: "wrote",
  librettist: "wrote",
  producer: "produced",
  performer: "performed",
  vocal: "sang",
  instrument: "played on",
  arranger: "arranged",
  remixer: "remixed",
  mix: "mixed",
  recording: "recorded",
  "recording engineer": "recorded",
  orchestra: "performed",
  conductor: "conducted",
  performance: "recording of",
  "based on": "based on",
  samples: "sampled",
  "samples material": "sampled",
};

export function lockSeed(
  parts: Array<string | number | null | undefined>,
): number {
  let hash = 2166136261;
  const text = parts.map((part) => String(part ?? "")).join("\u001f");
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createRng(seed: number) {
  let state = seed || 1;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function fieldSlug(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function hexRgb(value: string): [number, number, number] | null {
  const hex = value.trim();
  const short = /^#([0-9a-f]{3})$/i.exec(hex);
  if (short) {
    const [r, g, b] = short[1]!.split("");
    return [parseInt(r! + r, 16), parseInt(g! + g, 16), parseInt(b! + b, 16)];
  }
  const full = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!full) return null;
  return [
    parseInt(full[1]!.slice(0, 2), 16),
    parseInt(full[1]!.slice(2, 4), 16),
    parseInt(full[1]!.slice(4, 6), 16),
  ];
}

export function theaterPhase(input: {
  isPlaying: boolean;
  hasTrack: boolean;
  metadataStatus: "idle" | "loading" | "ready" | "empty" | "error";
  triviaStatus: "idle" | "loading" | "ready" | "empty" | "error";
}): TheaterPhase {
  if (input.hasTrack && input.triviaStatus === "ready") return "filed";
  if (
    input.hasTrack &&
    (input.triviaStatus === "loading" || input.triviaStatus === "idle")
  ) {
    return "locking";
  }
  if (
    input.isPlaying &&
    !input.hasTrack &&
    (input.metadataStatus === "loading" || input.metadataStatus === "idle")
  ) {
    return "reading";
  }
  return "quiet";
}

export function theaterTrackCopy(input: {
  isPlaying: boolean;
  metadataStatus: "idle" | "loading" | "ready" | "empty" | "error";
  trackLine: string | null;
}): string | null {
  if (input.trackLine) return input.trackLine;
  if (!input.isPlaying) return null;
  if (input.metadataStatus === "empty" || input.metadataStatus === "error") {
    return "This station sends no track titles.";
  }
  return null;
}

export function theaterWellAria(phase: TheaterPhase) {
  if (phase === "reading") return "Reading the live title";
  if (phase === "locking") return "Filing the track";
  return undefined;
}

function normalizeRelation(value: string) {
  const text = value.trim().toLowerCase().replace(/\s+/g, " ");
  if (!text || text.length > 22) return null;
  if (/(influenc|vibe|spirit|energy|essence|feel of)/.test(text)) return null;
  return text;
}

export function normalizeTriviaGraph(
  raw: unknown,
  options?: { nodeCap?: number; edgeCap?: number },
): TriviaGraph {
  if (!raw || typeof raw !== "object") return { nodes: [], edges: [] };
  const obj = raw as Record<string, unknown>;
  const nodeCap = options?.nodeCap ?? GRAPH_NODE_CAP;
  const edgeCap = options?.edgeCap ?? GRAPH_EDGE_CAP;
  const seen = new Map<string, TriviaGraphNode>();
  const nodesRaw = Array.isArray(obj.nodes) ? obj.nodes : [];
  for (const entry of nodesRaw) {
    if (!entry || typeof entry !== "object") continue;
    const item = entry as Record<string, unknown>;
    const label = typeof item.label === "string" ? item.label.trim() : "";
    if (!label) continue;
    const kindRaw = typeof item.kind === "string" ? item.kind.trim() : "";
    if (!GRAPH_KINDS.has(kindRaw)) continue;
    const id = fieldSlug(
      typeof item.id === "string" && item.id.trim() ? item.id : label,
    );
    if (!id || seen.has(id)) continue;
    seen.set(id, { id, label, kind: kindRaw as TriviaGraphKind });
  }

  const edges: TriviaGraphEdge[] = [];
  const edgeSeen = new Set<string>();
  const edgesRaw = Array.isArray(obj.edges) ? obj.edges : [];
  for (const entry of edgesRaw) {
    if (!entry || typeof entry !== "object") continue;
    const item = entry as Record<string, unknown>;
    const from = fieldSlug(typeof item.from === "string" ? item.from : "");
    const to = fieldSlug(typeof item.to === "string" ? item.to : "");
    const relation = normalizeRelation(
      typeof item.relation === "string" ? item.relation : "",
    );
    if (!from || !to || from === to || !relation) continue;
    if (!seen.has(from) || !seen.has(to)) continue;
    const key = `${from}|${to}`;
    if (edgeSeen.has(key)) continue;
    edgeSeen.add(key);
    const verified = item.verified === true;
    const provenanceRaw =
      item.provenance === "web" || item.provenance === "musicbrainz"
        ? item.provenance
        : undefined;
    const sourceUrlRaw =
      typeof item.sourceUrl === "string" ? item.sourceUrl.trim() : "";
    edges.push({
      from,
      to,
      relation,
      verified,
      // Verified relations are MusicBrainz by definition; unverified ones only
      // earn a provenance tag when they arrive citing web evidence.
      provenance: provenanceRaw ?? (verified ? "musicbrainz" : undefined),
      ...(sourceUrlRaw ? { sourceUrl: sourceUrlRaw } : {}),
    });
    if (edges.length >= edgeCap) break;
  }

  const linked = new Set<string>();
  for (const edge of edges) {
    linked.add(edge.from);
    linked.add(edge.to);
  }
  const nodes = [...seen.values()]
    .filter((node) => linked.has(node.id))
    .slice(0, nodeCap);
  const keep = new Set(nodes.map((node) => node.id));
  return {
    nodes,
    edges: edges.filter((edge) => keep.has(edge.from) && keep.has(edge.to)),
  };
}

export function mergeTriviaGraphs(
  primary?: TriviaGraph | null,
  secondary?: TriviaGraph | null,
  options?: { nodeCap?: number; edgeCap?: number },
): TriviaGraph {
  return normalizeTriviaGraph(
    {
      nodes: [...(primary?.nodes ?? []), ...(secondary?.nodes ?? [])],
      edges: [...(primary?.edges ?? []), ...(secondary?.edges ?? [])],
    },
    options,
  );
}

export function graphFromMusicBrainzRelations(input: {
  title?: string | null;
  artist?: string | null;
  /** Catalog facts become verified nodes too — a release date, an origin, an
   * album or a genre is knowledge, not just a sentence in the letter. */
  catalog?: {
    album?: string | null;
    year?: string | null;
    origin?: string | null;
    styles?: string[];
  };
  relations?: Array<{
    type?: string;
    artist?: { name?: string };
    work?: { title?: string };
  }>;
}): TriviaGraph {
  const title = input.title?.trim() ?? "";
  const artist = input.artist?.trim() ?? "";
  const nodes: TriviaGraphNode[] = [];
  const edges: TriviaGraphEdge[] = [];
  const addNode = (label: string, kind: TriviaGraphKind) => {
    const id = fieldSlug(label);
    if (!id) return null;
    if (!nodes.some((node) => node.id === id)) {
      nodes.push({ id, label, kind });
    }
    return id;
  };
  const addEdge = (
    from: string | null,
    to: string | null,
    relation: string,
  ) => {
    if (!from || !to || from === to) return;
    if (edges.some((edge) => edge.from === from && edge.to === to)) return;
    edges.push({ from, to, relation, verified: true });
  };

  const workId = title ? addNode(title, "work") : null;
  const artistId = artist ? addNode(artist, "person") : null;
  if (artistId && workId) addEdge(artistId, workId, "performed");

  const catalog = input.catalog ?? {};
  // A single often shares its album's name; that is one star, not an edge.
  const albumLabel = catalog.album?.trim();
  if (workId && albumLabel && fieldSlug(albumLabel) !== workId) {
    const albumId = addNode(albumLabel, "work");
    addEdge(workId, albumId, "appears on");
  }
  if (workId && catalog.year?.trim()) {
    const yearId = addNode(catalog.year.trim(), "year");
    addEdge(workId, yearId, "released in");
  }
  if (artistId && catalog.origin?.trim()) {
    const originId = addNode(catalog.origin.trim(), "place");
    addEdge(artistId, originId, "from");
  }
  for (const style of (catalog.styles ?? []).slice(0, 2)) {
    if (!style.trim()) continue;
    const styleId = addNode(style.trim(), "genre");
    addEdge(workId, styleId, "tagged");
  }

  for (const rel of input.relations ?? []) {
    const type = (rel.type ?? "").trim().toLowerCase();
    const word = MB_RELATION_WORD[type];
    if (!word) continue;
    if (rel.artist?.name?.trim()) {
      const personId = addNode(rel.artist.name, "person");
      addEdge(personId, workId, word);
    }
    if (rel.work?.title?.trim()) {
      const related = addNode(rel.work.title, "work");
      addEdge(workId, related, word);
    }
  }

  return normalizeTriviaGraph({ nodes, edges });
}

export type FieldDustTint = "bone" | "foil" | "ether";

export type FieldDustGrain = {
  x: number;
  y: number;
  depth: 0 | 1 | 2;
  size: number;
  phase: number;
  freq: number;
  tint: FieldDustTint;
  flare: boolean;
};

/** The seeded river of far stars the whole sky leans against. */
export type FieldBand = {
  cx: number;
  cy: number;
  angle: number;
  width: number;
};

export function fieldMilkyWay(seed: number): FieldBand {
  const rng = createRng(lockSeed([seed, "band"]));
  return {
    cx: 0.35 + rng() * 0.3,
    cy: 0.35 + rng() * 0.3,
    angle: -0.9 + rng() * 0.55,
    width: 0.14 + rng() * 0.08,
  };
}

export function fieldDust(seed: number): FieldDustGrain[] {
  const rng = createRng(lockSeed([seed, "dust"]));
  const band = fieldMilkyWay(seed);
  const cos = Math.cos(band.angle);
  const sin = Math.sin(band.angle);
  const count = 170 + Math.floor(rng() * 61);
  const grains: FieldDustGrain[] = [];
  for (let index = 0; index < count; index += 1) {
    let x: number;
    let y: number;
    if (rng() < 0.55) {
      const along = -0.7 + rng() * 2.4;
      const off = (rng() + rng() + rng() - 1.5) * band.width;
      x = (((band.cx + along * cos - off * sin) % 1) + 1) % 1;
      y = (((band.cy + along * sin + off * cos) % 1) + 1) % 1;
    } else {
      x = rng();
      y = rng();
    }
    const depthRoll = rng();
    const depth = (depthRoll < 0.5 ? 0 : depthRoll < 0.85 ? 1 : 2) as 0 | 1 | 2;
    const tintRoll = rng();
    const tint: FieldDustTint =
      tintRoll < 0.62 ? "bone" : tintRoll < 0.86 ? "foil" : "ether";
    grains.push({
      x,
      y,
      depth,
      size: depth === 0 ? 0.35 : depth === 1 ? 0.6 : 0.95,
      phase: rng() * Math.PI * 2,
      freq: 0.3 + rng() * 0.6,
      tint,
      flare: depth === 2 && rng() < 0.3,
    });
  }
  return grains;
}

export function fieldDustPoint(
  grain: FieldDustGrain,
  time: number,
  live: boolean,
  reduced: boolean,
) {
  if (!live || reduced) return { x: grain.x, y: grain.y };
  const speed = grain.depth === 0 ? 0.0007 : grain.depth === 1 ? 0.0012 : 0.002;
  return {
    x: (grain.x + time * speed) % 1,
    y: (grain.y + time * speed * 0.18) % 1,
  };
}

export function fieldDustAlpha(depth: 0 | 1 | 2) {
  return depth === 0 ? 0.14 : depth === 1 ? 0.24 : 0.38;
}

export type FieldNebula = {
  x: number;
  y: number;
  radius: number;
  tint: FieldDustTint;
  phase: number;
};

export function fieldNebulae(
  seed: number,
  cluster?: FieldPoint | null,
): FieldNebula[] {
  const rng = createRng(lockSeed([seed, "nebula"]));
  const extra = rng() < 0.75;
  const band = fieldMilkyWay(seed);
  const first: FieldNebula = {
    x: cluster?.x ?? 0.42 + rng() * 0.2,
    y: cluster?.y ?? 0.38 + rng() * 0.18,
    radius: 0.3 + rng() * 0.14,
    tint: "foil",
    phase: rng() * Math.PI * 2,
  };
  const clouds = [first];
  if (extra) {
    clouds.push({
      x: Math.min(0.9, Math.max(0.1, first.x + (rng() - 0.5) * 0.28)),
      y: Math.min(0.9, Math.max(0.1, first.y + (rng() - 0.5) * 0.24)),
      radius: 0.22 + rng() * 0.1,
      tint: "ether",
      phase: rng() * Math.PI * 2,
    });
  }
  clouds.push({
    x: Math.min(0.92, Math.max(0.08, band.cx)),
    y: Math.min(0.92, Math.max(0.08, band.cy)),
    radius: 0.34 + rng() * 0.1,
    tint: "bone",
    phase: rng() * Math.PI * 2,
  });
  return clouds;
}

export function fieldNebulaAlpha(
  cloud: FieldNebula,
  time: number,
  reduced: boolean,
) {
  const base =
    cloud.tint === "foil" ? 0.065 : cloud.tint === "ether" ? 0.05 : 0.045;
  if (reduced) return base;
  return (
    base * (0.82 + 0.18 * Math.sin((time / 40) * Math.PI * 2 + cloud.phase))
  );
}

export function fieldDustTwinkle(
  time: number,
  freq: number,
  phase: number,
  reduced: boolean,
) {
  if (reduced) return 1;
  return 0.72 + 0.28 * Math.sin(time * freq * Math.PI * 2 + phase);
}

export type FieldMeteor = {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  progress: number;
};

export function fieldShootingStar(
  seed: number,
  timeSec: number,
  options?: { live?: boolean; reduced?: boolean },
): FieldMeteor | null {
  if (options?.reduced || options?.live === false) return null;
  const rng = createRng(lockSeed([seed, "meteor"]));
  const period = 90 + rng() * 60;
  const delay = 18 + rng() * 24;
  if (timeSec < delay) return null;
  const local = (timeSec - delay) % period;
  const duration = 0.7;
  if (local > duration) return null;
  const corner = Math.floor(rng() * 4);
  const span = 0.16 + rng() * 0.06;
  const inset = 0.08;
  const corners = [
    { x0: inset, y0: inset, dx: span, dy: span * 0.35 },
    { x0: 1 - inset, y0: inset, dx: -span, dy: span * 0.35 },
    { x0: inset, y0: 1 - inset, dx: span, dy: -span * 0.35 },
    { x0: 1 - inset, y0: 1 - inset, dx: -span, dy: -span * 0.35 },
  ];
  const chosen = corners[corner] ?? corners[0]!;
  return {
    x0: chosen.x0,
    y0: chosen.y0,
    x1: chosen.x0 + chosen.dx,
    y1: chosen.y0 + chosen.dy,
    progress: local / duration,
  };
}

export { EMPTY_GRAPH };
