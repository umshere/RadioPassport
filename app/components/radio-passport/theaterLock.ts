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
  | "cover";

export type FieldRelease = {
  key: string;
  family: FieldFamily;
  label: string;
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
};

export const TAG_RELEASE_CAP = 8;
export const LANGUAGE_RELEASE_CAP = 4;
export const FACT_RELEASE_CAP = 4;

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
  fact: 3,
  place: 4,
  signal: 5,
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
};

const FAMILY_HOME: Record<FieldFamily, { x: number; y: number; spread: number }> = {
  place: { x: 0.22, y: 0.2, spread: 0.07 },
  signal: { x: 0.16, y: 0.44, spread: 0.06 },
  language: { x: 0.3, y: 0.33, spread: 0.07 },
  tag: { x: 0.58, y: 0.36, spread: 0.15 },
  track: { x: 0.74, y: 0.28, spread: 0.08 },
  dispatch: { x: 0.28, y: 0.64, spread: 0.05 },
  fact: { x: 0.7, y: 0.6, spread: 0.11 },
  cover: { x: 0.62, y: 0.72, spread: 0.05 },
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
};

const FAMILY_LINKS: Record<FieldFamily, readonly FieldFamily[]> = {
  place: ["place", "language", "signal", "dispatch"],
  signal: ["signal", "place", "track"],
  language: ["language", "place", "tag"],
  tag: ["tag", "language", "fact", "cover"],
  track: ["track", "signal", "fact", "cover", "dispatch"],
  dispatch: ["dispatch", "place", "track"],
  fact: ["fact", "track", "tag", "cover"],
  cover: ["cover", "fact", "track", "tag"],
};

export function lockSeed(parts: Array<string | number | null | undefined>): number {
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
}): FieldRelease[] {
  const releases: FieldRelease[] = [];
  const push = (family: FieldFamily, label: string) => {
    const trimmed = label.trim();
    if (!trimmed) return;
    const key = `${family}:${trimmed.toLocaleLowerCase()}`;
    if (releases.some((item) => item.key === key)) return;
    releases.push({ key, family, label: trimmed });
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
    let x = home.x + (next() - 0.5) * home.spread * 2;
    let y = home.y + (next() - 0.5) * home.spread * 1.6 + index * 0.035;
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
    y: node.y + Math.cos(time * node.freq * 0.83 + node.phase) * node.ampY * drift,
  };
}

export function fieldDistance(
  a: FieldPoint,
  b: FieldPoint,
  aspect = 1,
) {
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
export function fieldStandingLabel(family: FieldFamily, label: string) {
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
): string[] {
  if (!nodes.length) return [];
  const neighbors = new Map<string, string[]>();
  for (const [left, right] of pairs) {
    neighbors.set(left, [...(neighbors.get(left) ?? []), right]);
    neighbors.set(right, [...(neighbors.get(right) ?? []), left]);
  }
  const rankOf = (key: string) => {
    const node = nodes.find((entry) => entry.key === key);
    return node ? fieldTourRank(node.family) : 99;
  };
  const start = [...nodes].sort(
    (left, right) =>
      fieldTourRank(left.family) - fieldTourRank(right.family) ||
      left.key.localeCompare(right.key),
  )[0]!.key;
  const walk = [start];
  const visited = new Set([start]);
  let current = start;
  while (visited.size < nodes.length) {
    const open = (neighbors.get(current) ?? []).filter((key) => !visited.has(key));
    const next =
      (open.length
        ? open.sort((left, right) => rankOf(left) - rankOf(right) || left.localeCompare(right))[0]
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
    if (left > 0) return { ...state, to: state.from, progress: 0, dwelling: left };
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
): FieldEdge[] {
  const edges: FieldEdge[] = [];
  if (reach <= 0) return edges;
  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      const allowed = fieldReachForPair(nodes[i]!.family, nodes[j]!.family, reach);
      const distance = fieldDistance(points[i]!, points[j]!, aspect);
      if (distance < allowed) {
        edges.push({ i, j, strength: 1 - distance / allowed });
      }
    }
  }
  return edges;
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
  const components = () => new Set(Array.from({ length: count }, (_, index) => find(index))).size;
  if (components() <= 1) return [];

  const candidates: Array<{ i: number; j: number; dist: number; kindred: boolean }> = [];
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
      strength: pair.kindred ? 0.58 : 0.4,
    });
    if (components() <= 1) break;
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
  return triangles;
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

export function formatBearing(longitude: number): string {
  if (!Number.isFinite(longitude)) return "";
  if (longitude === 0) return "0°";
  const abs = Math.abs(longitude).toFixed(1);
  return longitude < 0 ? `${abs}°W` : `${abs}°E`;
}

export function lockFingerprint(parts: Array<string | number | null | undefined>) {
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
      lines.push(input.city?.trim() ? `${bearing} · ${input.city.trim()}` : bearing);
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
