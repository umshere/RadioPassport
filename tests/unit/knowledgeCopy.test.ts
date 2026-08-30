import { describe, expect, it } from "vitest";
import { knowledgeSeatCopy } from "~/components/radio-passport/knowledge/knowledgeCopy";
import type { KnowledgeKind } from "~/types/knowledge";

const FORBIDDEN = /catalog|web|musicbrainz|provenance/i;

describe("knowledgeSeatCopy", () => {
  const kinds: KnowledgeKind[] = [
    "country",
    "city",
    "language",
    "station",
    "track",
    "artist",
    "album",
    "year",
    "genre",
    "place",
    "event",
  ];

  it("names a seat without provenance", () => {
    for (const kind of kinds) {
      const line = knowledgeSeatCopy({ kind });
      expect(line.length).toBeGreaterThan(0);
      expect(line).not.toMatch(FORBIDDEN);
    }
  });

  it("may file an honest station count on land and language", () => {
    expect(knowledgeSeatCopy({ kind: "country", count: 12 })).toBe(
      "the land · 12 stations",
    );
    expect(knowledgeSeatCopy({ kind: "language", count: 3 })).toBe(
      "spoken here · 3 stations",
    );
    expect(knowledgeSeatCopy({ kind: "station", count: 9 })).toBe("the signal");
  });
});
