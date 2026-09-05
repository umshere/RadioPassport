import type {
  TriviaEdgeProvenance,
  TriviaGraph,
  TriviaGraphEdge,
  TriviaGraphKind,
  TriviaGraphNode,
} from "~/types/trivia";
import { EMPTY_GRAPH } from "~/types/trivia";

export type TheaterPhase = "reading" | "locking" | "filed" | "quiet";

export type LockKind = "foil" | "ether" | "bone";

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

export type FieldOrigin = "meta" | "graph";

export type FieldRelease = {
  key: string;
  family: FieldFamily;
  label: string;
  refId?: string;
  origin?: FieldOrigin;
};

export type FieldNode = {
  key: string;
  family: FieldFamily;
  label: string;
  x: number;
  y: number;
  ampX: number;
  ampY: number;
  freq: number;
  phase: number;
  kind: LockKind;
  size: number;
  refId?: string;
  origin?: FieldOrigin;
};

export const TAG_RELEASE_CAP = 8;
export const LANGUAGE_RELEASE_CAP = 4;
export const FACT_RELEASE_CAP = 6;
export const GRAPH_NODE_CAP = 10;
export const GRAPH_EDGE_CAP = 14;
export const STAR_BIRTH_MS = 600;
/** One breath for the constellation to settle into its semantic figure. */
export const FIELD_STRUCTURE_MS = 900;
/** A star must be this opaque before the disc may walk it — a line needs a body. */
export const FIELD_LINE_WEIGHT = 0.28;
/** Faces past this many stack into foil instead of reading as a figure. */
export const FIELD_TRIANGLE_CAP = 14;
/** Threads per star. A constellation draws to its kin, not to every neighbour. */
export const FIELD_DEGREE_CAP = 3;

export type FieldPoint = { x: number; y: number };

export type FieldEdge = { i: number; j: number; strength: number };

export type FieldTriangle = {
  i: number;
  j: number;
  k: number;
  strength: number;
};

export type FieldDensity = {
  reach: number;
  glow: number;
  drift: number;
};

export const LOCK_LINE_MS = 1800;
export const TRAVEL_EDGE_SEC = 1.35;
export const TRAVEL_DWELL_SEC = 0.7;

const FAMILY_TOUR: Record<FieldFamily, number> = {
  tag: 0,
  language: 1,
  track: 2,
  graph: 3,
  fact: 4,
  place: 5,
  signal: 6,
  cover: 8,
  dispatch: 9,
};

const FAMILY_KIND: Record<FieldFamily, LockKind> = {
  place: "foil",
  signal: "ether",
  language: "bone",
  tag: "bone",
  track: "ether",
  dispatch: "foil",
  fact: "foil",
  cover: "foil",
  graph: "foil",
};

const FAMILY_HOME: Record<
  FieldFamily,
  { x: number; y: number; spread: number }
> = {
  place: { x: 0.22, y: 0.2, spread: 0.07 },
  signal: { x: 0.16, y: 0.44, spread: 0.06 },
  language: { x: 0.3, y: 0.33, spread: 0.07 },
  tag: { x: 0.58, y: 0.36, spread: 0.15 },
  track: { x: 0.74, y: 0.28, spread: 0.08 },
  dispatch: { x: 0.28, y: 0.64, spread: 0.05 },
  fact: { x: 0.7, y: 0.6, spread: 0.11 },
  cover: { x: 0.62, y: 0.72, spread: 0.05 },
  graph: { x: 0.8, y: 0.48, spread: 0.12 },
};

const FAMILY_SIZE: Record<FieldFamily, number> = {
  place: 1.25,
  signal: 0.72,
  language: 0.82,
  tag: 0.78,
  track: 1.2,
  dispatch: 0.9,
  fact: 1.05,
  cover: 1.1,
  graph: 1.08,
};

const FAMILY_LINKS: Record<FieldFamily, readonly FieldFamily[]> = {
  place: ["place", "language", "signal", "dispatch", "graph"],
  signal: ["signal", "place", "track"],
  language: ["language", "place", "tag"],
  tag: ["tag", "language", "fact", "cover", "graph"],
  track: ["track", "signal", "fact", "cover", "dispatch", "graph"],
  dispatch: ["dispatch", "place", "track"],
  fact: ["fact", "track", "tag", "cover", "graph"],
  cover: ["cover", "fact", "track", "tag"],
  graph: ["graph", "track", "fact", "place", "tag"],
};

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

export function splitFieldTokens(value?: string | null): string[] {
  if (!value) return [];
  const seen = new Set<string>();
  const tokens: string[] = [];
  for (const part of value.split(/[,/;|]+/)) {
    const token = part.trim();
    if (!token) continue;
    const key = token.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    tokens.push(token);
  }
  return tokens;
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

export function graphKindFamily(kind: string): FieldFamily {
  return GRAPH_KIND_FAMILY[kind] ?? "graph";
}

export function theaterReleases(input: {
  city?: string | null;
  country?: string | null;
  longitude?: number | null;
  bitrate?: number | null;
  codec?: string | null;
  languages?: string[];
  tags?: string[];
  artist?: string | null;
  title?: string | null;
  dispatchBody?: string | null;
  summary?: string | null;
  facts?: Array<{ label: string; value: string }>;
  graph?: TriviaGraph | null;
}): FieldRelease[] {
  const releases: FieldRelease[] = [];
  const push = (
    family: FieldFamily,
    label: string,
    extra?: { refId?: string; origin?: FieldOrigin },
  ) => {
    const trimmed = label.trim();
    if (!trimmed) return;
    const key = `${family}:${trimmed.toLocaleLowerCase()}`;
    const existing = releases.find((item) => item.key === key);
    if (existing) {
      if (extra?.refId && !existing.refId) existing.refId = extra.refId;
      return;
    }
    releases.push({
      key,
      family,
      label: trimmed,
      refId: extra?.refId || fieldSlug(trimmed),
      origin: extra?.origin ?? "meta",
    });
  };

  if (input.city?.trim()) push("place", input.city);
  if (input.country?.trim() && input.country.trim() !== input.city?.trim()) {
    push("place", input.country);
  }
  if (input.bitrate && input.bitrate > 0) push("signal", `${input.bitrate}k`);
  if (input.codec?.trim()) push("signal", input.codec.trim());
  (input.languages ?? []).slice(0, LANGUAGE_RELEASE_CAP).forEach((language) => {
    push("language", language);
  });
  (input.tags ?? []).slice(0, TAG_RELEASE_CAP).forEach((tag) => {
    push("tag", tag);
  });
  if (input.artist?.trim()) push("track", input.artist);
  if (input.title?.trim()) push("track", input.title);
  if (input.dispatchBody?.trim()) push("dispatch", "dispatch");
  (input.facts ?? [])
    .filter((fact) => fact.label.trim() && fact.value.trim())
    .slice(0, FACT_RELEASE_CAP)
    .forEach((fact) => push("fact", fact.value));
  (input.graph?.nodes ?? []).forEach((node) => {
    const trimmed = node.label.trim();
    if (!trimmed) return;
    const existing = releases.find(
      (item) => item.label.toLocaleLowerCase() === trimmed.toLocaleLowerCase(),
    );
    if (existing) {
      existing.refId = fieldSlug(node.id || trimmed);
      return;
    }
    push(graphKindFamily(node.kind), node.label, {
      refId: fieldSlug(node.id || node.label),
      origin: "graph",
    });
  });
  if (input.summary?.trim()) push("cover", "cover");
  return releases;
}

export function longitudeHomeX(longitude: number) {
  const clamped = Math.min(180, Math.max(-180, longitude));
  return 0.12 + ((clamped + 180) / 360) * 0.76;
}

export function fieldFamiliesConnect(a: FieldFamily, b: FieldFamily) {
  return FAMILY_LINKS[a].includes(b);
}

export function fieldNodesFromReleases(
  releases: FieldRelease[],
  seed: number,
  longitude?: number | null,
): FieldNode[] {
  const counts: Partial<Record<FieldFamily, number>> = {};
  const lonX =
    typeof longitude === "number" && Number.isFinite(longitude)
      ? longitudeHomeX(longitude)
      : null;

  return releases.map((release) => {
    const index = counts[release.family] ?? 0;
    counts[release.family] = index + 1;
    const next = createRng(lockSeed([seed, release.key]));
    const home = FAMILY_HOME[release.family];
    // Golden angle: a crowded family fans into a spiral instead of queueing
    // down the page in a straight, mechanical column.
    const arm = index * 2.39996;
    const ring = index === 0 ? 0 : home.spread * (0.5 + 0.3 * Math.sqrt(index));
    let x = home.x + (next() - 0.5) * home.spread * 2 + Math.cos(arm) * ring;
    let y =
      home.y + (next() - 0.5) * home.spread * 1.6 + Math.sin(arm) * ring * 0.9;
    if (release.family === "place" && lonX != null) {
      x = lonX + (index === 0 ? 0 : 0.05);
      y = 0.2 + index * 0.08;
    }
    x = Math.min(0.96, Math.max(0.04, x));
    y = Math.min(0.94, Math.max(0.06, y));
    return {
      key: release.key,
      family: release.family,
      label: release.label,
      x,
      y,
      ampX: 0.003 + next() * 0.01,
      ampY: 0.003 + next() * 0.008,
      freq: 0.08 + next() * 0.16,
      phase: next() * Math.PI * 2,
      kind: FAMILY_KIND[release.family],
      size: FAMILY_SIZE[release.family] * (0.9 + next() * 0.2),
      refId: release.refId,
      origin: release.origin,
    };
  });
}

export function fieldDensity(phase: TheaterPhase): FieldDensity {
  if (phase === "locking") return { reach: 0.32, glow: 0.9, drift: 0.8 };
  if (phase === "reading") return { reach: 0.28, glow: 0.64, drift: 0.42 };
  if (phase === "filed") return { reach: 0.29, glow: 0.76, drift: 0.4 };
  return { reach: 0.2, glow: 0.12, drift: 0 };
}

export function fieldPoint(
  node: FieldNode,
  time: number,
  drift: number,
): FieldPoint {
  if (!drift) return { x: node.x, y: node.y };
  return {
    x: node.x + Math.sin(time * node.freq + node.phase) * node.ampX * drift,
    y:
      node.y +
      Math.cos(time * node.freq * 0.83 + node.phase) * node.ampY * drift,
  };
}

export function fieldDistance(a: FieldPoint, b: FieldPoint, aspect = 1) {
  return Math.hypot(a.x - b.x, (a.y - b.y) * aspect);
}

export function fieldEdges(
  points: FieldPoint[],
  reach: number,
  aspect = 1,
): FieldEdge[] {
  const edges: FieldEdge[] = [];
  if (reach <= 0) return edges;
  for (let i = 0; i < points.length; i += 1) {
    for (let j = i + 1; j < points.length; j += 1) {
      const distance = fieldDistance(points[i]!, points[j]!, aspect);
      if (distance < reach) {
        edges.push({ i, j, strength: 1 - distance / reach });
      }
    }
  }
  return edges;
}

export function fieldReachForPair(
  a: FieldFamily,
  b: FieldFamily,
  reach: number,
) {
  if (a === b) return reach * 1.55;
  if (fieldFamiliesConnect(a, b)) return reach * 1.35;
  return reach * 0.52;
}

export function fieldTourRank(family: FieldFamily) {
  return FAMILY_TOUR[family];
}

export function fieldVisitLabel(family: FieldFamily, label: string) {
  if (family === "dispatch" || family === "cover") return null;
  const text = label.trim();
  if (!text) return null;
  if (family === "fact" && text.split(/\s+/).length > 3) return null;
  return text.length > 22 ? `${text.slice(0, 21)}…` : text;
}

/** Names that stay on the sky after the disc leaves the star. */
export function fieldStandingLabel(
  family: FieldFamily,
  label: string,
  origin?: FieldOrigin,
) {
  if (origin === "graph") return null;
  if (family !== "place" && family !== "track") return null;
  return fieldVisitLabel(family, label);
}

function nearestUnvisited(
  start: string,
  neighbors: Map<string, string[]>,
  visited: Set<string>,
) {
  const queue = [start];
  const seen = new Set([start]);
  while (queue.length) {
    const current = queue.shift()!;
    for (const next of neighbors.get(current) ?? []) {
      if (seen.has(next)) continue;
      if (!visited.has(next)) return next;
      seen.add(next);
      queue.push(next);
    }
  }
  return null;
}

export function fieldWalk(
  nodes: Array<{ key: string; family: FieldFamily }>,
  pairs: Array<[string, string]>,
  preferredPairs: Array<[string, string]> = [],
): string[] {
  if (!nodes.length) return [];
  const known = new Set(nodes.map((node) => node.key));
  const neighbors = new Map<string, string[]>();
  const link = (left: string, right: string) => {
    if (!known.has(left) || !known.has(right) || left === right) return;
    neighbors.set(left, [...(neighbors.get(left) ?? []), right]);
    neighbors.set(right, [...(neighbors.get(right) ?? []), left]);
  };
  for (const [left, right] of pairs) link(left, right);
  const preferred = new Set<string>();
  for (const [left, right] of preferredPairs) {
    if (!known.has(left) || !known.has(right) || left === right) continue;
    preferred.add(`${left}\0${right}`);
    preferred.add(`${right}\0${left}`);
    link(left, right);
  }
  const rankOf = (key: string) => {
    const node = nodes.find((entry) => entry.key === key);
    return node ? fieldTourRank(node.family) : 99;
  };
  const prefers = (from: string, to: string) => preferred.has(`${from}\0${to}`);
  const start = [...nodes].sort(
    (left, right) =>
      fieldTourRank(left.family) - fieldTourRank(right.family) ||
      left.key.localeCompare(right.key),
  )[0]!.key;
  const walk = [start];
  const visited = new Set([start]);
  let current = start;
  while (visited.size < nodes.length) {
    const open = [...new Set(neighbors.get(current) ?? [])].filter(
      (key) => known.has(key) && !visited.has(key),
    );
    const next =
      (open.length
        ? open.sort(
            (left, right) =>
              Number(prefers(current, right)) -
                Number(prefers(current, left)) ||
              rankOf(left) - rankOf(right) ||
              left.localeCompare(right),
          )[0]
        : nearestUnvisited(current, neighbors, visited)) ??
      nodes.find((node) => !visited.has(node.key))?.key;
    if (!next) break;
    walk.push(next);
    visited.add(next);
    current = next;
  }
  if (walk.length > 2 && (neighbors.get(current) ?? []).includes(start)) {
    walk.push(start);
  }
  return walk;
}

export type FieldTravelerState = {
  from: string;
  to: string;
  progress: number;
  dwelling: number;
};

function nextWalkKey(walk: string[], from: string) {
  const index = walk.indexOf(from);
  if (index < 0) return walk[0]!;
  return walk[(index + 1) % walk.length]!;
}

export function startFieldTraveler(
  walk: string[],
  dwellSec = TRAVEL_DWELL_SEC,
): FieldTravelerState | null {
  if (!walk.length) return null;
  return { from: walk[0]!, to: walk[0]!, progress: 0, dwelling: dwellSec };
}

export function advanceFieldTraveler(
  state: FieldTravelerState,
  walk: string[],
  dt: number,
  edgeSec = TRAVEL_EDGE_SEC,
  dwellSec = TRAVEL_DWELL_SEC,
): FieldTravelerState {
  if (!walk.length) return state;
  if (!walk.includes(state.from)) {
    return startFieldTraveler(walk, dwellSec) ?? state;
  }
  if (state.dwelling > 0) {
    const left = state.dwelling - dt;
    if (left > 0)
      return { ...state, to: state.from, progress: 0, dwelling: left };
    return {
      from: state.from,
      to: nextWalkKey(walk, state.from),
      progress: 0,
      dwelling: 0,
    };
  }
  const progress = state.progress + dt / Math.max(edgeSec, 0.05);
  if (progress < 1) return { ...state, progress };
  return { from: state.to, to: state.to, progress: 0, dwelling: dwellSec };
}

export function fieldTravelerVisiting(state: FieldTravelerState) {
  if (state.dwelling > 0) return state.from;
  if (state.progress < 0.1) return state.from;
  if (state.progress > 0.9) return state.to;
  return null;
}

export function fieldTravelerAt(
  walk: string[],
  timeSec: number,
  edgeSec = TRAVEL_EDGE_SEC,
  dwellSec = TRAVEL_DWELL_SEC,
) {
  if (!walk.length) return null;
  if (walk.length === 1) {
    return { from: walk[0]!, to: walk[0]!, progress: 0, visiting: walk[0]! };
  }
  const step = edgeSec + dwellSec;
  const cycle = (walk.length - 1) * step;
  const elapsed = ((timeSec % cycle) + cycle) % cycle;
  const index = Math.min(walk.length - 2, Math.floor(elapsed / step));
  const local = elapsed - index * step;
  const from = walk[index]!;
  const to = walk[index + 1]!;
  if (local < dwellSec) {
    return { from, to: from, progress: 0, visiting: from };
  }
  const progress = (local - dwellSec) / edgeSec;
  return {
    from,
    to,
    progress,
    visiting: progress < 0.1 ? from : progress > 0.9 ? to : null,
  };
}

export function fieldSemanticEdges(
  nodes: FieldNode[],
  points: FieldPoint[],
  reach: number,
  aspect = 1,
  degreeCap = FIELD_DEGREE_CAP,
): FieldEdge[] {
  const edges: FieldEdge[] = [];
  if (reach <= 0) return edges;
  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      const allowed = fieldReachForPair(
        nodes[i]!.family,
        nodes[j]!.family,
        reach,
      );
      const distance = fieldDistance(points[i]!, points[j]!, aspect);
      if (distance < allowed) {
        edges.push({ i, j, strength: 1 - distance / allowed });
      }
    }
  }
  if (degreeCap <= 0) return edges;
  // A star draws to its nearest kin, not to everything in reach. Without this
  // a filed sky becomes a web instead of a figure.
  const degree = new Array<number>(nodes.length).fill(0);
  const kept: FieldEdge[] = [];
  for (const edge of [...edges].sort((a, b) => b.strength - a.strength)) {
    if (degree[edge.i]! >= degreeCap || degree[edge.j]! >= degreeCap) continue;
    degree[edge.i] = degree[edge.i]! + 1;
    degree[edge.j] = degree[edge.j]! + 1;
    kept.push(edge);
  }
  return kept;
}

/** Span isolated clusters so the disc never walks empty sky. */
export function fieldSpanEdges(
  nodes: Array<{ family: FieldFamily }>,
  points: FieldPoint[],
  edges: FieldEdge[],
  aspect = 1,
): FieldEdge[] {
  const count = nodes.length;
  if (count < 2) return [];
  const parent = Array.from({ length: count }, (_, index) => index);
  const find = (index: number) => {
    let current = index;
    while (parent[current] !== current) {
      parent[current] = parent[parent[current]!]!;
      current = parent[current]!;
    }
    return current;
  };
  const unite = (left: number, right: number) => {
    const a = find(left);
    const b = find(right);
    if (a === b) return false;
    parent[a] = b;
    return true;
  };
  for (const edge of edges) unite(edge.i, edge.j);
  const components = () =>
    new Set(Array.from({ length: count }, (_, index) => find(index))).size;
  if (components() <= 1) return [];

  const candidates: Array<{
    i: number;
    j: number;
    dist: number;
    kindred: boolean;
  }> = [];
  for (let i = 0; i < count; i += 1) {
    for (let j = i + 1; j < count; j += 1) {
      if (find(i) === find(j)) continue;
      const kindred =
        nodes[i]!.family === nodes[j]!.family ||
        fieldFamiliesConnect(nodes[i]!.family, nodes[j]!.family);
      candidates.push({
        i,
        j,
        dist: fieldDistance(points[i]!, points[j]!, aspect),
        kindred,
      });
    }
  }
  candidates.sort(
    (left, right) =>
      left.dist - right.dist || Number(right.kindred) - Number(left.kindred),
  );

  const spans: FieldEdge[] = [];
  for (const pair of candidates) {
    if (!unite(pair.i, pair.j)) continue;
    spans.push({
      i: pair.i,
      j: pair.j,
      strength: pair.kindred ? 0.62 : 0.52,
    });
    if (components() <= 1) break;
  }
  return spans;
}

/** A foil thread for every walk hop that is not already a drawn edge. */
export function fieldTourSpans(
  walk: string[],
  nodes: Array<{ key: string }>,
  existing: Array<[string, string]>,
): FieldEdge[] {
  const indexOf = new Map(nodes.map((node, index) => [node.key, index]));
  const have = new Set<string>();
  for (const [left, right] of existing) {
    have.add(`${left}\0${right}`);
    have.add(`${right}\0${left}`);
  }
  const spans: FieldEdge[] = [];
  for (let index = 0; index < walk.length - 1; index += 1) {
    const left = walk[index]!;
    const right = walk[index + 1]!;
    if (left === right || have.has(`${left}\0${right}`)) continue;
    const i = indexOf.get(left);
    const j = indexOf.get(right);
    if (i == null || j == null) continue;
    spans.push({
      i: Math.min(i, j),
      j: Math.max(i, j),
      strength: 0.52,
    });
    have.add(`${left}\0${right}`);
    have.add(`${right}\0${left}`);
  }
  return spans;
}

export function fieldTravelerInTransit(state: FieldTravelerState) {
  return state.dwelling <= 0 && state.from !== state.to;
}

export function fieldTriangles(
  points: FieldPoint[],
  reach: number,
  aspect = 1,
  cap = FIELD_TRIANGLE_CAP,
): FieldTriangle[] {
  const triangles: FieldTriangle[] = [];
  if (reach <= 0) return triangles;
  for (let i = 0; i < points.length; i += 1) {
    for (let j = i + 1; j < points.length; j += 1) {
      const ab = fieldDistance(points[i]!, points[j]!, aspect);
      if (ab >= reach) continue;
      for (let k = j + 1; k < points.length; k += 1) {
        const ac = fieldDistance(points[i]!, points[k]!, aspect);
        const bc = fieldDistance(points[j]!, points[k]!, aspect);
        if (ac >= reach || bc >= reach) continue;
        const longest = Math.max(ab, ac, bc);
        const shortest = Math.min(ab, ac, bc);
        if (shortest <= 0 || longest / shortest > 3.1) continue;
        triangles.push({
          i,
          j,
          k,
          strength: 1 - (ab + ac + bc) / (reach * 3),
        });
      }
    }
  }
  // A rich sky yields hundreds of faces, and stacked translucency turns the
  // constellation into crumpled foil. Keep only the tightest few.
  if (triangles.length <= cap) return triangles;
  return triangles
    .sort((left, right) => right.strength - left.strength)
    .slice(0, cap);
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

/** Phone Knowledge beats. Passage is a new room; a beat is knowledge in this one. */
export type TheaterBeat = "landed" | "reading" | "filed" | "evidence";

export const THEATER_SKY_LANDED = 236;
export const THEATER_SKY_FILED = 150;
export const THEATER_SKY_EVIDENCE = 96;

export function theaterBeat(input: {
  phase: TheaterPhase;
  hasTrack: boolean;
  selectedId: string | null;
}): TheaterBeat {
  if (input.selectedId) return "evidence";
  if (input.phase === "filed") return "filed";
  if (input.hasTrack) return "reading";
  return "landed";
}

export function theaterBeatSky(beat: TheaterBeat): number {
  if (beat === "evidence") return THEATER_SKY_EVIDENCE;
  if (beat === "filed") return THEATER_SKY_FILED;
  return THEATER_SKY_LANDED;
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

export function formatBearing(longitude: number): string {
  if (!Number.isFinite(longitude)) return "";
  if (longitude === 0) return "0°";
  const abs = Math.abs(longitude).toFixed(1);
  return longitude < 0 ? `${abs}°W` : `${abs}°E`;
}

export function lockFingerprint(
  parts: Array<string | number | null | undefined>,
) {
  const seed = lockSeed(parts);
  const left = seed.toString(16).padStart(8, "0").slice(0, 4);
  const right = (Math.imul(seed, 2654435761) >>> 0)
    .toString(16)
    .padStart(8, "0")
    .slice(0, 4);
  return `${left} · ${right}`;
}

function lastWord(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  return parts[parts.length - 1] ?? "";
}

function firstWord(value: string) {
  return value.trim().split(/\s+/).find(Boolean) ?? "";
}

export function theaterLockLines(input: {
  city?: string | null;
  longitude?: number | null;
  bitrate?: number | null;
  codec?: string | null;
  artist?: string | null;
  title?: string | null;
  phase: TheaterPhase;
}): string[] {
  const lines: string[] = [];
  if (typeof input.longitude === "number") {
    const bearing = formatBearing(input.longitude);
    if (bearing) {
      lines.push(
        input.city?.trim() ? `${bearing} · ${input.city.trim()}` : bearing,
      );
    }
  } else if (input.city?.trim()) {
    lines.push(input.city.trim());
  }
  if (input.bitrate && input.bitrate > 0) {
    const codec = input.codec?.trim();
    lines.push(codec ? `${input.bitrate}k · ${codec}` : `${input.bitrate}k`);
  }
  if (input.phase === "reading") {
    lines.push("live · in", "cover · now");
    return lines;
  }
  const artist = input.artist?.trim() ?? "";
  const title = input.title?.trim() ?? "";
  if (artist && title) {
    lines.push(`${lastWord(artist)} · ${lastWord(title)}`.toLowerCase());
  } else if (title) {
    lines.push(`${firstWord(title)} · in`.toLowerCase());
  }
  lines.push("cover · now");
  lines.push(lockFingerprint([artist, title, input.city ?? ""]));
  return lines;
}

export function theaterLockLineAt(
  lines: string[],
  nowMs: number,
  periodMs = LOCK_LINE_MS,
) {
  if (!lines.length) return "";
  return lines[Math.floor(Math.max(0, nowMs) / periodMs) % lines.length] ?? "";
}

export function theaterWellAria(phase: TheaterPhase) {
  if (phase === "reading") return "Reading the live title";
  if (phase === "locking") return "Filing the track";
  return undefined;
}

export function theaterLockLive(phase: TheaterPhase) {
  return phase === "reading" || phase === "locking";
}

/** The sky stays inhabited after the dossier files — only quiet goes dark. */
export function theaterSkyLive(phase: TheaterPhase) {
  return phase === "reading" || phase === "locking" || phase === "filed";
}

function normalizeRelation(value: string) {
  const text = value.trim().toLowerCase().replace(/\s+/g, " ");
  if (!text || text.length > 22) return null;
  if (/(influenc|vibe|spirit|energy|essence|feel of)/.test(text)) return null;
  return text;
}

export function nodeHasId(
  node: { key: string; refId?: string; label: string },
  id: string,
) {
  const slug = fieldSlug(id);
  if (!slug) return false;
  if (node.refId && fieldSlug(node.refId) === slug) return true;
  if (fieldSlug(node.label) === slug) return true;
  if (node.key === id || fieldSlug(node.key) === slug) return true;
  const tail = node.key.split(":")[1];
  return Boolean(tail && fieldSlug(tail) === slug);
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

export type FieldKnowledgeEdge = FieldEdge & {
  relation: string;
  provenance?: TriviaEdgeProvenance;
  sourceUrl?: string;
};

/** Verified MusicBrainz threads read as the figure's bright spine; cited web
 * threads join the same foil family, one step quieter. */
const VERIFIED_KNOWLEDGE_STRENGTH = 0.92;
const WEB_KNOWLEDGE_STRENGTH = 0.72;

export function fieldKnowledgeEdges(
  nodes: Array<{ key: string; refId?: string; label: string }>,
  graphEdges: TriviaGraphEdge[],
): FieldKnowledgeEdge[] {
  const edges: FieldKnowledgeEdge[] = [];
  const seen = new Set<string>();
  for (const edge of graphEdges) {
    const from = nodes.findIndex((node) => nodeHasId(node, edge.from));
    const to = nodes.findIndex((node) => nodeHasId(node, edge.to));
    if (from < 0 || to < 0 || from === to) continue;
    const i = Math.min(from, to);
    const j = Math.max(from, to);
    const key = `${i}:${j}`;
    if (seen.has(key)) continue;
    seen.add(key);
    // Legacy unmarked edges keep the bright verified thread; only claims that
    // arrive explicitly as web evidence read one step quieter.
    const provenance: TriviaEdgeProvenance | undefined =
      edge.provenance ?? (edge.verified ? "musicbrainz" : undefined);
    edges.push({
      i,
      j,
      strength:
        provenance === "web" ? WEB_KNOWLEDGE_STRENGTH : VERIFIED_KNOWLEDGE_STRENGTH,
      relation: edge.relation,
      ...(provenance ? { provenance } : {}),
      ...(edge.sourceUrl ? { sourceUrl: edge.sourceUrl } : {}),
    });
  }
  return edges;
}

/** One breath for the whole sky to settle into its semantic figure. */
export function fieldStructureProgress(
  ageMs: number,
  reducedMotion: boolean,
): number {
  if (reducedMotion) return 1;
  if (!Number.isFinite(ageMs) || ageMs <= 0) return 0;
  const t = ageMs / FIELD_STRUCTURE_MS;
  if (t >= 1) return 1;
  // ease-in-out cubic: the figure breathes in, then rests.
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

const FIELD_SECTOR_ANGLE: Record<TriviaGraphKind, number> = {
  person: (-150 * Math.PI) / 180,
  work: (-30 * Math.PI) / 180,
  film: (-70 * Math.PI) / 180,
  place: (130 * Math.PI) / 180,
  year: (130 * Math.PI) / 180,
  genre: (47.5 * Math.PI) / 180,
  event: (47.5 * Math.PI) / 180,
  // Atlas-only kinds never reach the theater field, but the record must stay
  // exhaustive; they hold unused sectors of the sky.
  country: (170 * Math.PI) / 180,
  language: (-110 * Math.PI) / 180,
  station: (100 * Math.PI) / 180,
  album: (-5 * Math.PI) / 180,
};

const FIELD_SECTOR_JITTER = 0.35;
const FIELD_HOP_ONE_RADIUS = 0.17;
const FIELD_HOP_TWO_RADIUS = 0.31;

function fieldStructureDegreeMap(
  graph: TriviaGraph | null | undefined,
): Map<string, number> {
  const degree = new Map<string, number>();
  if (!graph || !Array.isArray(graph.edges)) return degree;
  for (const edge of graph.edges) {
    if (!edge?.from || !edge?.to) continue;
    degree.set(edge.from, (degree.get(edge.from) ?? 0) + 1);
    degree.set(edge.to, (degree.get(edge.to) ?? 0) + 1);
  }
  return degree;
}

/**
 * Which star the figure hangs from: an exact focus hit first, else the busiest
 * visible graph star. Ties keep the graph's own order, so the choice never
 * wobbles between renders.
 */
export function fieldResolveFocus(
  nodes: Array<{ key: string; refId?: string; label: string }>,
  graph: TriviaGraph | null | undefined,
  focusId?: string | null,
): string | null {
  if (!graph || !graph.nodes?.length || !graph.edges?.length || !nodes.length) {
    return null;
  }
  const degree = fieldStructureDegreeMap(graph);
  const visible = graph.nodes.filter((node) => degree.has(node.id));
  if (!visible.length) return null;
  const findStar = (id: string) =>
    nodes.find((node) => nodeHasId(node, id)) ?? null;

  if (focusId) {
    const focusNode = visible.find((node) => node.id === focusId) ??
      visible.find((node) => fieldSlug(node.id) === fieldSlug(focusId));
    if (focusNode) {
      const star = findStar(focusNode.id);
      if (star) return star.key;
    }
  }

  const rank = (node: TriviaGraphNode) =>
    (degree.get(node.id) ?? 0) * 10 + (node.kind === "work" ? 5 : 0);
  let best: TriviaGraphNode | null = null;
  for (const node of visible) {
    if (!best || rank(node) > rank(best)) {
      best = node;
    }
  }
  if (best) {
    const star = findStar(best.id);
    if (star) return star.key;
  }
  for (const node of visible) {
    const star = findStar(node.id);
    if (star) return star.key;
  }
  return null;
}

/**
 * The figure may only form around a real figure: the resolved focus must sit
 * in a connected component of at least three stars and the graph must carry
 * at least two drawable knowledge edges — sparse or dangling graphs stay
 * exactly where the seed put them.
 */
export function fieldStructureReady(
  nodes: Array<{ key: string; refId?: string; label: string }>,
  graph?: TriviaGraph | null,
): boolean {
  if (!graph || !graph.edges?.length) return false;
  const focusKey = fieldResolveFocus(nodes, graph, null);
  if (!focusKey) return false;
  const focusIndex = nodes.findIndex((node) => node.key === focusKey);
  if (focusIndex < 0) return false;

  const adjacency = new Map<number, Set<number>>();
  let drawable = 0;
  for (const edge of graph.edges) {
    const i = nodes.findIndex((node) => nodeHasId(node, edge.from));
    const j = nodes.findIndex((node) => nodeHasId(node, edge.to));
    if (i < 0 || j < 0 || i === j) continue;
    drawable += 1;
    if (!adjacency.has(i)) adjacency.set(i, new Set());
    if (!adjacency.has(j)) adjacency.set(j, new Set());
    adjacency.get(i)!.add(j);
    adjacency.get(j)!.add(i);
  }

  const seen = new Set<number>([focusIndex]);
  const queue = [focusIndex];
  while (queue.length) {
    const current = queue.shift()!;
    for (const neighbour of adjacency.get(current) ?? []) {
      if (seen.has(neighbour)) continue;
      seen.add(neighbour);
      queue.push(neighbour);
    }
  }
  return drawable >= 2 && seen.size >= 3;
}

export type FieldStructureTargets = Map<string, FieldPoint>;

/**
 * Deterministic semantic placement for a begun figure.
 *
 * - The focus sits dead centre; hop-1 stars take the inner ring, farther stars
 *   the outer ring, each kind holding its own sector of the sky so people,
 *   works, places and genres read at a glance.
 * - Angular jitter is keyed by `[seed, node.key]` — never by array index or
 *   counts — so adding a star reshuffles nothing already on canvas.
 * - `previous` placements win verbatim; once a station's figure has begun it
 *   only ever grows by addition.
 */
export function fieldStructuredTargets(
  nodes: Array<{ key: string; refId?: string; label: string }>,
  graph: TriviaGraph | null | undefined,
  previous?: FieldStructureTargets | null,
  focusId?: string | null,
  seed?: number,
): FieldStructureTargets {
  const targets: FieldStructureTargets = new Map();
  if (!graph || !nodes.length) return targets;
  if (!fieldStructureReady(nodes, graph)) return targets;
  const focusKey = fieldResolveFocus(nodes, graph, focusId ?? null);
  if (!focusKey) return targets;
  const focusIndex = nodes.findIndex((node) => node.key === focusKey);
  if (focusIndex < 0) return targets;

  if (previous && previous.size) {
    for (const [key, point] of previous) {
      if (nodes.some((node) => node.key === key)) targets.set(key, point);
    }
  }

  const adjacency = new Map<number, Set<number>>();
  for (const edge of graph.edges) {
    const i = nodes.findIndex((node) => nodeHasId(node, edge.from));
    const j = nodes.findIndex((node) => nodeHasId(node, edge.to));
    if (i < 0 || j < 0 || i === j) continue;
    if (!adjacency.has(i)) adjacency.set(i, new Set());
    if (!adjacency.has(j)) adjacency.set(j, new Set());
    adjacency.get(i)!.add(j);
    adjacency.get(j)!.add(i);
  }

  const hops = new Map<number, number>([[focusIndex, 0]]);
  const queue: number[] = [focusIndex];
  while (queue.length) {
    const current = queue.shift()!;
    const depth = hops.get(current)!;
    for (const neighbour of adjacency.get(current) ?? []) {
      if (hops.has(neighbour)) continue;
      hops.set(neighbour, depth + 1);
      queue.push(neighbour);
    }
  }

  const kindByIndex = new Map<number, TriviaGraphKind>();
  for (const graphNode of graph.nodes) {
    const index = nodes.findIndex((node) => nodeHasId(node, graphNode.id));
    if (index >= 0 && !kindByIndex.has(index)) {
      kindByIndex.set(index, graphNode.kind);
    }
  }

  if (!targets.has(focusKey)) {
    targets.set(focusKey, { x: 0.5, y: 0.5 });
  }

  for (const [index, depth] of hops) {
    if (depth === 0) continue;
    const node = nodes[index]!;
    if (targets.has(node.key)) continue;
    const baseAngle =
      FIELD_SECTOR_ANGLE[kindByIndex.get(index) ?? "work"] ?? 0;
    const rng = createRng(lockSeed([seed ?? 0, node.key]));
    const angle =
      baseAngle + (rng() - 0.5) * FIELD_SECTOR_JITTER +
      (rng() - 0.5) * 0.04;
    const radius =
      depth === 1 ? FIELD_HOP_ONE_RADIUS : FIELD_HOP_TWO_RADIUS;
    const x = 0.5 + Math.cos(angle) * radius;
    const y = 0.5 + Math.sin(angle) * radius * 0.62;
    targets.set(node.key, {
      x: Math.min(0.96, Math.max(0.04, x)),
      y: Math.min(0.94, Math.max(0.06, y)),
    });
  }

  return targets;
}

export function fieldHopRelation(
  fromKey: string,
  toKey: string,
  nodes: Array<{ key: string }>,
  knowledge: FieldKnowledgeEdge[],
) {
  const from = nodes.findIndex((node) => node.key === fromKey);
  const to = nodes.findIndex((node) => node.key === toKey);
  if (from < 0 || to < 0) return null;
  return (
    knowledge.find(
      (edge) =>
        (edge.i === from && edge.j === to) ||
        (edge.i === to && edge.j === from),
    )?.relation ?? null
  );
}

export function fieldDensestPoint(points: FieldPoint[]): FieldPoint | null {
  if (!points.length) return null;
  let best = points[0]!;
  let bestScore = -1;
  for (const point of points) {
    let score = 0;
    for (const other of points) {
      const distance = fieldDistance(point, other);
      if (distance < 0.22) score += 1 - distance / 0.22;
    }
    if (score > bestScore) {
      bestScore = score;
      best = point;
    }
  }
  return best;
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

export function fieldStarTwinkle(
  time: number,
  freq: number,
  phase: number,
  reduced: boolean,
) {
  if (reduced) return 1;
  return 0.9 + 0.1 * Math.sin(time * freq * Math.PI * 2 + phase);
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

export function fieldBirthBloom(ageMs: number | null, reduced: boolean) {
  if (reduced || ageMs == null || ageMs < 0 || ageMs > STAR_BIRTH_MS) return 1;
  return 1 + 0.6 * (1 - ageMs / STAR_BIRTH_MS);
}

export function fieldBirthRipple(ageMs: number | null, reduced: boolean) {
  if (reduced || ageMs == null || ageMs < 0 || ageMs > STAR_BIRTH_MS)
    return null;
  const t = ageMs / STAR_BIRTH_MS;
  return { radius: 1 + t * 3.4, alpha: 1 - t };
}

/** One-shot pulse when the knowledge graph lands: quick rise, long settle. */
export const GRAPH_PULSE_MS = 1400;

export function fieldGraphPulse(ageMs: number | null, reduced: boolean) {
  if (reduced || ageMs == null || ageMs < 0 || ageMs >= GRAPH_PULSE_MS)
    return 0;
  const t = ageMs / GRAPH_PULSE_MS;
  const attack = Math.min(1, t / 0.18);
  const settle = 1 - (t - 0.18) / 0.82;
  return attack * settle * settle;
}

export function fieldEdgeShimmer(seed: number, time: number, reduced: boolean) {
  if (reduced) return 0.5;
  return (time / 7 + (seed % 1000) / 1000) % 1;
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
