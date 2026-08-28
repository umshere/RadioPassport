/**
 * Pure-helper tests for the Theater knowledge-node DOM layer
 * (app/components/radio-passport/knowledge/TheaterNodes.tsx).
 *
 * Node environment, so no DOM rendering is attempted here — only the pure
 * exports the constellation layer is built on: flagEmoji and monogramFor.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

type TheaterNodesModule = typeof import(
  "~/components/radio-passport/knowledge/TheaterNodes"
);

describe("theater knowledge node helpers", () => {
  let knowledgeDom: TheaterNodesModule;

  beforeEach(async () => {
    vi.resetModules();
    knowledgeDom =
      await import("~/components/radio-passport/knowledge/TheaterNodes");
  });

  describe("flagEmoji", () => {
    it("maps alpha-2 country codes to regional-indicator pairs", () => {
      expect(knowledgeDom.flagEmoji("in")).toBe("🇮🇳");
      expect(knowledgeDom.flagEmoji("us")).toBe("🇺🇸");
      expect(knowledgeDom.flagEmoji("jp")).toBe("🇯🇵");
    });

    it("tolerates case and surrounding space", () => {
      expect(knowledgeDom.flagEmoji(" US ")).toBe("🇺🇸");
      expect(knowledgeDom.flagEmoji("Jp")).toBe("🇯🇵");
    });

    it("returns the empty string for invalid codes", () => {
      expect(knowledgeDom.flagEmoji("")).toBe("");
      expect(knowledgeDom.flagEmoji("i")).toBe("");
      expect(knowledgeDom.flagEmoji("ind")).toBe("");
      expect(knowledgeDom.flagEmoji("u2")).toBe("");
      expect(knowledgeDom.flagEmoji("--")).toBe("");
    });
  });

  describe("monogramFor", () => {
    it("uppercases the first latin letter of a label", () => {
      expect(knowledgeDom.monogramFor("kexp seattle")).toBe("K");
      expect(knowledgeDom.monogramFor("  night desk radio ")).toBe("N");
    });

    it("carries an accented first letter through", () => {
      expect(knowledgeDom.monogramFor("éclair fm")).toBe("É");
      expect(knowledgeDom.monogramFor("ñuñoa hora local")).toBe("Ñ");
    });

    it("takes the leading code point of an emoji label", () => {
      expect(knowledgeDom.monogramFor("📻 guitar hours")).toBe("📻");
      expect(knowledgeDom.monogramFor("🎧 late signals")).toBe("🎧");
    });

    it("settles on the house dot when a label shows nothing", () => {
      expect(knowledgeDom.monogramFor("   ")).toBe("·");
      expect(knowledgeDom.monogramFor("")).toBe("·");
    });
  });

  describe("skyCaption", () => {
    it("keeps the first language token and drops the unknown door", () => {
      expect(
        knowledgeDom.skyCaption("language", "Dutch, English, German"),
      ).toBe("Dutch");
      expect(
        knowledgeDom.skyCaption("language", "DUITS, ENGELS, NEDERLAND, POLKA"),
      ).toBe("DUITS");
      expect(knowledgeDom.skyCaption("language", "unknown")).toBe("");
    });

    it("ellipsises long station and album names without inventing words", () => {
      expect(
        knowledgeDom.skyCaption(
          "album",
          "Now That's What I Call Music! 108",
        ),
      ).toBe("Now That's What I Cal…");
      expect(knowledgeDom.skyCaption("station", "Arrow Classic Rock")).toBe(
        "Arrow Classic Rock",
      );
    });
  });

  describe("labelAnchor", () => {
    it("radiates captions away from the centre", () => {
      expect(knowledgeDom.labelAnchor(0.2, 0.5)).toBe("w");
      expect(knowledgeDom.labelAnchor(0.8, 0.5)).toBe("e");
      expect(knowledgeDom.labelAnchor(0.5, 0.1)).toBe("s");
      expect(knowledgeDom.labelAnchor(0.5, 0.9)).toBe("n");
    });
  });
});
