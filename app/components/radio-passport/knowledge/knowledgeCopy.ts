import type { KnowledgeKind, KnowledgeNode } from "~/types/knowledge";

const SEAT: Record<KnowledgeKind, string> = {
  country: "the land",
  city: "this hour's city",
  language: "spoken here",
  station: "the signal",
  track: "on the air",
  artist: "the performer",
  album: "the disc",
  year: "the year",
  genre: "the tag",
  place: "a place on the figure",
  event: "a night that happened",
};

/**
 * One human line for the selected-node folio. Never provenance, never a bio.
 */
export function knowledgeSeatCopy(
  node: Pick<KnowledgeNode, "kind" | "count">,
): string {
  const seat = SEAT[node.kind];
  if (
    (node.kind === "country" || node.kind === "language") &&
    typeof node.count === "number" &&
    node.count > 0
  ) {
    return `${seat} · ${node.count} stations`;
  }
  return seat;
}
