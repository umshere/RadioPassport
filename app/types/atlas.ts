import type { Station } from "~/types/radio";
import type { TriviaGraph } from "~/types/trivia";

/**
 * Atlas contracts — the navigable catalog layer above the Theater.
 *
 * Slice 1 scope (see docs/ATLAS_HANDOFF.md):
 * - country centred, language clusters around it, real stations orbiting
 *   their language;
 * - click to focus/recenter; side panel with an explicit "Tune here";
 * - breadcrumbs + back; keyboard/screen-reader list parity;
 * - the tuned station's track constellation stays in the Theater — Atlas
 *   never writes the Room.
 *
 * Everything here is deterministic Radio-Browser catalog data derived from
 * the shared 5-minute snapshot (`fetchRadioBrowserCatalogSnapshot`). No AI,
 * no new upstream endpoints, no new dependencies.
 */

export type AtlasNodeKind =
  | "country"
  | "language"
  | "station";

export type AtlasNode = {
  /** Stable id: country → ISO/code slug, language → code slug, station → uuid. */
  id: string;
  kind: AtlasNodeKind;
  label: string;
  /** Station count for country/language nodes; bitrate for stations. */
  count?: number;
  /** Station-only: sanitized favicon url (may be empty). */
  favicon?: string | null;
  /** Station-only: owning country code, for panel context. */
  countryCode?: string | null;
};

export type AtlasEdgeRelation =
  | "broadcasts in" // country → language
  | "stations here"; // language → station (via country co-membership)

export type AtlasEdge = {
  from: string;
  to: string;
  relation: AtlasEdgeRelation;
  provenance: "catalog";
};

/** One language cluster inside a country view (or one country cluster inside
 * a language view). Members are station node ids. */
export type AtlasCluster = {
  id: string;
  label: string;
  memberIds: string[];
};

/**
 * The response of one expansion step. Bounded server-side: at most
 * ATLAS_MAX_NODES nodes per view (languages first, then the busiest stations
 * per cluster), so the sky stays readable and the payload stays small.
 */
export type AtlasView = {
  center: AtlasNode;
  graph: TriviaGraph;
  clusters: AtlasCluster[];
  /** Total stations in the country/language before the cap — honest count
   * for the panel ("42 more stations stay dark"). */
  totalMembers: number;
  /** Present only when center.kind === "station": the full sanitized Station
   * for Tune here. */
  stationDetail?: Station;
  fetchedAt: string;
};

export type AtlasPoint = { x: number; y: number };

/** Frozen layout signature — AtlasSky renders exactly this map. */
export type AtlasLayout = Map<string, AtlasPoint>;

/** Station-centred views carry the full sanitized Station so the panel can
 * hand the real object to `startStation` — node fields alone are not enough
 * to tune. Absent on country/language views. */
export type AtlasViewBase = {
  stationDetail?: Station;
};

/** Breadcrumb trail entry: the path of focused nodes, newest last. */
export type AtlasCrumb = {
  kind: AtlasNodeKind;
  id: string;
  label: string;
};
