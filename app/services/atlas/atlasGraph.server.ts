import type { RadioBrowserCatalogSnapshot } from "~/services/radioBrowser/catalogSnapshot";
import type {
  AtlasCluster,
  AtlasEdge,
  AtlasNode,
  AtlasView,
} from "~/types/atlas";
import type { Country, Station } from "~/types/radio";
import type { TriviaGraph, TriviaGraphEdge, TriviaGraphNode } from "~/types/trivia";

/**
 * The Atlas data layer — pure derivation over the shared Radio-Browser
 * catalog snapshot (see docs/ATLAS_HANDOFF.md). Zero upstream calls, no AI:
 * every edge here is a deterministic catalog fact, so one snapshot always
 * builds byte-identical views. Server caps are law — the client never
 * decides how many nodes exist.
 */

/** Hard node ceiling per view, enforced here before anything reaches a client. */
export const ATLAS_MAX_NODES = 60;

/** Cluster heads stay readable: at most 12 languages per country (and
 * vice versa) claim seats before any station does. */
const MAX_CLUSTERS = 12;

/** Station-centred views show at most six genre neighbours. */
const MAX_TAG_NODES = 6;

const UNKNOWN_LANGUAGE_KEY = "unknown";

/**
 * Slug helper: lowercase, trim, non-alphanumeric runs collapse to "-", and
 * edge dashes go away so ids compose cleanly in URLs and breadcrumbs.
 */
export function atlasSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Code-unit comparison instead of localeCompare: locale tables differ across
 * runtimes, and this file's whole promise is that identical snapshots build
 * identical views everywhere.
 */
function compareStrings(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

type ResolvedCountry = { id: string; label: string };

/** Match a country by ISO code or by name slug; both canonicalise to the
 * uppercase ISO code so "in", "IN" and "india" all centre the same node. */
function resolveCountry(
  snapshot: RadioBrowserCatalogSnapshot,
  id: string
): ResolvedCountry | null {
  const wantedCode = id.trim().toLowerCase();
  if (!wantedCode) return null;

  const byIso = snapshot.countries.find(
    (country) => country.iso_3166_1.trim().toLowerCase() === wantedCode
  );
  if (byIso) {
    return { id: byIso.iso_3166_1.toUpperCase(), label: byIso.name };
  }

  const wantedSlug = atlasSlug(id);
  const byName = snapshot.countries.find(
    (country) => atlasSlug(country.name) === wantedSlug
  );
  if (byName) {
    return { id: byName.iso_3166_1.toUpperCase(), label: byName.name };
  }

  return null;
}

function countryByIso(
  countries: Country[],
  code: string | null | undefined
): Country | undefined {
  const wanted = code?.trim().toUpperCase();
  if (!wanted) return undefined;
  return countries.find(
    (country) => country.iso_3166_1.toUpperCase() === wanted
  );
}

/**
 * A station's primary language: first entry of languageCodes when present,
 * else the slug of its language name, else the shared "unknown" room.
 */
function primaryLanguageKey(station: Station): string {
  for (const code of station.languageCodes ?? []) {
    if (code && code.trim()) return atlasSlug(code);
  }
  if (station.language && station.language.trim()) {
    return atlasSlug(station.language);
  }
  return UNKNOWN_LANGUAGE_KEY;
}

/**
 * Cluster labels come from what stations actually call the language ("Hindi"
 * beats "hi" on the panel). The most frequent spelling wins and ties break
 * alphabetically — frequency counting keeps the label independent of
 * snapshot ordering. With no name at all, the code itself stands in.
 */
function chooseLanguageLabel(key: string, stations: Station[]): string {
  const tally = new Map<string, number>();
  for (const station of stations) {
    const name = station.language?.trim();
    if (!name) continue;
    tally.set(name, (tally.get(name) ?? 0) + 1);
  }

  let best: string | null = null;
  let bestCount = 0;
  for (const [name, count] of tally) {
    if (
      count > bestCount ||
      (count === bestCount && best !== null && compareStrings(name, best) < 0)
    ) {
      best = name;
      bestCount = count;
    }
  }

  if (best) return best;
  return key;
}

/**
 * Busiest first: clickCount is the catalog's own measure of attention, with
 * bitrate standing in when clicks are absent (the brief's fallback rule).
 * clickTrend is deliberately skipped — a trend delta is not a busyness
 * measure. uuid is the final tiebreak so equal names never reshuffle.
 */
function busyness(station: Station): number {
  return typeof station.clickCount === "number"
    ? station.clickCount
    : station.bitrate;
}

function compareBusyness(a: Station, b: Station): number {
  const delta = busyness(b) - busyness(a);
  if (delta !== 0) return delta;
  const byName = compareStrings(a.name, b.name);
  if (byName !== 0) return byName;
  return compareStrings(a.uuid, b.uuid);
}

function compareClusters(
  a: { id: string; label: string; size: number },
  b: { id: string; label: string; size: number }
): number {
  // Deterministic order everywhere: count desc, then label asc.
  const delta = b.size - a.size;
  if (delta !== 0) return delta;
  const byLabel = compareStrings(a.label, b.label);
  if (byLabel !== 0) return byLabel;
  return compareStrings(a.id, b.id);
}

type Cluster = {
  id: string;
  label: string;
  stations: Station[];
};

function finishClusters(
  groups: Map<string, Station[]>,
  labels: Map<string, string>
): Cluster[] {
  const clusters: Cluster[] = [];
  for (const [id, stations] of groups) {
    clusters.push({
      id,
      label: labels.get(id) ?? id,
      stations: [...stations].sort(compareBusyness),
    });
  }
  clusters.sort((a, b) =>
    compareClusters(
      { id: a.id, label: a.label, size: a.stations.length },
      { id: b.id, label: b.label, size: b.stations.length }
    )
  );
  // Cap after sorting: the honest counts stay with totalMembers instead.
  return clusters.slice(0, MAX_CLUSTERS);
}

/** Group a country's stations by primary language. */
function languageClusters(stations: Station[]): Cluster[] {
  const groups = new Map<string, Station[]>();
  const labels = new Map<string, string>();
  for (const station of stations) {
    const key = primaryLanguageKey(station);
    const bucket = groups.get(key);
    if (bucket) bucket.push(station);
    else groups.set(key, [station]);
  }
  for (const [key, members] of groups) {
    labels.set(key, chooseLanguageLabel(key, members));
  }
  return finishClusters(groups, labels);
}

/** Group one language's stations by country; labels prefer the official
 * country table, falling back to whatever the station itself claims. */
function countryClusters(
  stations: Station[],
  snapshot: RadioBrowserCatalogSnapshot
): Cluster[] {
  const groups = new Map<string, Station[]>();
  const labels = new Map<string, string>();

  for (const station of stations) {
    const known = countryByIso(snapshot.countries, station.countryCode);
    const id = known
      ? known.iso_3166_1.toUpperCase()
      : atlasSlug(station.country ?? "") || "unknown";
    if (!labels.has(id)) {
      labels.set(id, known?.name ?? station.country ?? id);
    }
    const bucket = groups.get(id);
    if (bucket) bucket.push(station);
    else groups.set(id, [station]);
  }

  return finishClusters(groups, labels);
}

/**
 * Seat filling: center + cluster heads claim their seats first, then the
 * busiest stations fill the rest round-robin — one station per cluster per
 * pass — so no visible language head orbits empty while a giant neighbour
 * hogs every seat.
 */
function pickStationSeats(
  clusters: Cluster[],
  seats: number
): Array<{ cluster: Cluster; station: Station }> {
  const picks: Array<{ cluster: Cluster; station: Station }> = [];
  const cursors = clusters.map(() => 0);
  let progressed = true;
  while (picks.length < seats && progressed) {
    progressed = false;
    for (
      let index = 0;
      index < clusters.length && picks.length < seats;
      index += 1
    ) {
      const cluster = clusters[index];
      if (!cluster) continue;
      const cursor = cursors[index] ?? 0;
      const station = cluster.stations[cursor];
      if (!station) continue;
      cursors[index] = cursor + 1;
      picks.push({ cluster, station });
      progressed = true;
    }
  }
  return picks;
}

function stationToNode(station: Station): AtlasNode {
  return {
    id: station.uuid,
    kind: "station",
    label: station.name,
    count: station.bitrate,
    favicon: station.favicon,
    countryCode: station.countryCode ?? null,
  };
}

/** Clusters carry only the stations that actually became nodes — invisible
 * members would ask the layout to orbit empty space. */
function toViewClusters(
  clusters: Cluster[],
  picks: Array<{ cluster: Cluster; station: Station }>
): AtlasCluster[] {
  return clusters.map((cluster) => ({
    id: cluster.id,
    label: cluster.label,
    memberIds: picks
      .filter((pick) => pick.cluster === cluster)
      .map((pick) => pick.station.uuid),
  }));
}

function buildCountryView(
  id: string,
  snapshot: RadioBrowserCatalogSnapshot
): AtlasView | null {
  const country = resolveCountry(snapshot, id);
  if (!country) return null;

  const members = snapshot.stations.filter(
    (station) =>
      (station.countryCode ?? "").trim().toLowerCase() ===
      country.id.toLowerCase()
  );

  const center: AtlasNode = {
    id: country.id,
    kind: "country",
    label: country.label,
    count: members.length,
  };

  const clusters = languageClusters(members);
  const languageNodes: AtlasNode[] = clusters.map((cluster) => ({
    id: cluster.id,
    kind: "language",
    label: cluster.label,
    count: cluster.stations.length,
  }));

  const seats = Math.max(0, ATLAS_MAX_NODES - 1 - languageNodes.length);
  const picks = pickStationSeats(clusters, seats);

  // Snapshot safety: duplicate uuids must never become two nodes.
  const seenUuids = new Set<string>();
  const seenEdges = new Set<string>();
  const stationNodes: AtlasNode[] = [];
  const edges: AtlasEdge[] = [];

  // Every capped-in head keeps its "broadcasts in" edge, even when the
  // node budget left none of its stations a seat.
  for (const cluster of clusters) {
    edges.push({
      from: center.id,
      to: cluster.id,
      relation: "broadcasts in",
      provenance: "catalog",
    });
  }

  for (const pick of picks) {
    if (seenUuids.has(pick.station.uuid)) continue;
    seenUuids.add(pick.station.uuid);
    stationNodes.push(stationToNode(pick.station));
    const edgeKey = `${pick.cluster.id}->${pick.station.uuid}`;
    if (!seenEdges.has(edgeKey)) {
      seenEdges.add(edgeKey);
      edges.push({
        from: pick.cluster.id,
        to: pick.station.uuid,
        relation: "stations here",
        provenance: "catalog",
      });
    }
  }

  const graph: TriviaGraph = {
    nodes: [center, ...languageNodes, ...stationNodes],
    edges,
  };

  return {
    center,
    graph,
    clusters: toViewClusters(clusters, picks),
    // The honest uncapped count — the panel says how many stay dark.
    totalMembers: members.length,
    fetchedAt: snapshot.fetchedAt,
  };
}

function buildLanguageView(
  id: string,
  snapshot: RadioBrowserCatalogSnapshot
): AtlasView | null {
  const wanted = atlasSlug(id);
  if (!wanted) return null;

  const summary = snapshot.languages.find(
    (entry) => atlasSlug(entry.name) === wanted
  );
  const members = snapshot.stations.filter(
    (station) =>
      (station.languageCodes ?? []).some(
        (code) => atlasSlug(code) === wanted
      ) ||
      (station.language ? atlasSlug(station.language) === wanted : false)
  );

  // Known means the catalog or the stations have heard of it — summaries
  // alone with zero derived stations still render an honest quiet view.
  if (!summary && members.length === 0) return null;

  const center: AtlasNode = {
    id: wanted,
    kind: "language",
    label: summary?.name ?? chooseLanguageLabel(wanted, members),
    count: members.length,
  };

  const clusters = countryClusters(members, snapshot);
  const countryNodes: AtlasNode[] = clusters.map((cluster) => ({
    id: cluster.id,
    kind: "country",
    label: cluster.label,
    count: cluster.stations.length,
  }));

  const seats = Math.max(0, ATLAS_MAX_NODES - 1 - countryNodes.length);
  const picks = pickStationSeats(clusters, seats);

  const seenUuids = new Set<string>();
  const seenEdges = new Set<string>();
  const stationNodes: AtlasNode[] = [];
  const edges: AtlasEdge[] = [];

  // Head edges first — country → language — then the seats that hang off
  // the language centre.
  for (const cluster of clusters) {
    edges.push({
      from: cluster.id,
      to: center.id,
      relation: "broadcasts in",
      provenance: "catalog",
    });
  }

  for (const pick of picks) {
    if (seenUuids.has(pick.station.uuid)) continue;
    seenUuids.add(pick.station.uuid);
    stationNodes.push(stationToNode(pick.station));
    const edgeKey = `${pick.cluster.id}->${pick.station.uuid}`;
    if (!seenEdges.has(edgeKey)) {
      seenEdges.add(edgeKey);
      edges.push({
        from: center.id,
        to: pick.station.uuid,
        relation: "stations here",
        provenance: "catalog",
      });
    }
  }

  const graph: TriviaGraph = {
    nodes: [center, ...countryNodes, ...stationNodes],
    edges,
  };

  return {
    center,
    graph,
    clusters: toViewClusters(clusters, picks),
    totalMembers: members.length,
    fetchedAt: snapshot.fetchedAt,
  };
}

/** Lowercase, trimmed, de-duplicated tag list — at most six genre neighbours. */
function stationTags(station: Station): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const tag of station.tagList ?? []) {
    const cleaned = tag.trim().toLowerCase();
    if (!cleaned || seen.has(cleaned)) continue;
    seen.add(cleaned);
    tags.push(cleaned);
    if (tags.length >= MAX_TAG_NODES) break;
  }
  return tags;
}

function buildStationView(
  id: string,
  snapshot: RadioBrowserCatalogSnapshot
): AtlasView | null {
  const station = snapshot.stations.find((entry) => entry.uuid === id);
  if (!station) return null;

  const center = stationToNode(station);

  // The station's own country and primary language join as first-class
  // nodes, so a station focus can walk up to its country exactly like a
  // country view walks down — one graph shape everywhere.
  const knownCountry = countryByIso(snapshot.countries, station.countryCode);
  const countryId = knownCountry
    ? knownCountry.iso_3166_1.toUpperCase()
    : atlasSlug(station.country ?? "") || "unknown";
  const countryNode: AtlasNode = {
    id: countryId,
    kind: "country",
    label: knownCountry?.name ?? station.country ?? countryId,
    count: knownCountry?.stationcount,
  };

  const languageKey = primaryLanguageKey(station);
  const languageNode: AtlasNode = {
    id: languageKey,
    kind: "language",
    label: chooseLanguageLabel(languageKey, [station]),
  };

  // Genre neighbours live in TriviaGraph space: the frozen AtlasNodeKind
  // union only covers catalog places, but AtlasView.graph is a full
  // TriviaGraph, which is exactly where "genre" nodes belong.
  const tagNodes: TriviaGraphNode[] = stationTags(station).map((tag) => ({
    id: atlasSlug(tag),
    kind: "genre",
    label: tag,
  }));

  // "tagged" is likewise a plain TriviaGraphEdge relation — the strict
  // AtlasEdgeRelation stays reserved for the country/language lattice.
  const edges: TriviaGraphEdge[] = [
    {
      from: countryId,
      to: languageKey,
      relation: "broadcasts in",
      provenance: "catalog",
    },
    {
      from: languageKey,
      to: center.id,
      relation: "stations here",
      provenance: "catalog",
    },
    ...tagNodes.map((tag) => ({
      from: center.id,
      to: tag.id,
      relation: "tagged",
      provenance: "catalog" as const,
    })),
  ];

  const graph: TriviaGraph = {
    nodes: [center, countryNode, languageNode, ...tagNodes],
    edges,
  };

  return {
    center,
    graph,
    // A single station hides nobody behind a cap — there is no population.
    clusters: [],
    totalMembers: 0,
    stationDetail: station,
    fetchedAt: snapshot.fetchedAt,
  };
}

/**
 * Build one expansion step of the Atlas. Returns null for unknown ids —
 * callers answer 404, never an empty lie. Same snapshot in, same view out:
 * no clocks, no randomness, no locale-dependent ordering.
 */
export function buildAtlasView(
  kind: string,
  id: string,
  snapshot: RadioBrowserCatalogSnapshot
): AtlasView | null {
  switch (kind) {
    case "country":
      return buildCountryView(id, snapshot);
    case "language":
      return buildLanguageView(id, snapshot);
    case "station":
      return buildStationView(id, snapshot);
    default:
      return null;
  }
}
