import { describe, expect, it } from "vitest";

import {
  extractPromptIntent,
  resolveTypedIntent,
} from "~/services/ai/intent/promptIntent";

describe("extractPromptIntent", () => {
  it("detects india and hindi from prompt", () => {
    const intent = extractPromptIntent("hindi lo-fi vibes from Mumbai");
    expect(intent.countries).toContain("India");
    expect(intent.languages).toContain("Hindi");
    expect(intent.tags).toContain("Lofi");
    expect(intent.confidence).toBe("high");
  });

  it("returns none when prompt empty", () => {
    const intent = extractPromptIntent("");
    expect(intent.countries).toHaveLength(0);
    expect(intent.confidence).toBe("none");
  });
});

describe("resolveTypedIntent", () => {
  it("lands Lisbon at dusk on the Lisbon catalog at Dusk", () => {
    const intent = resolveTypedIntent("Lisbon at dusk");
    expect(intent.query).toMatch(/lisbon/i);
    expect(intent.hour).toBe("Dusk");
    expect(intent.wantsMix).toBe(false);
  });

  it("lands Malayalam night on the malayalam catalog at Night", () => {
    const intent = resolveTypedIntent("Malayalam night");
    expect(intent.query).toMatch(/malayalam/i);
    expect(intent.hour).toBe("Night");
    expect(intent.wantsMix).toBe(false);
  });

  it("asks for a mix only on surprise / take me / anywhere", () => {
    expect(resolveTypedIntent("surprise me").wantsMix).toBe(true);
    expect(resolveTypedIntent("take me anywhere").wantsMix).toBe(true);
    expect(resolveTypedIntent("Rahman")).toEqual({
      query: "Rahman",
      hour: null,
      wantsMix: false,
    });
  });

  it("reads tonight as Night in a place phrase", () => {
    const intent = resolveTypedIntent("Lisbon tonight");
    expect(intent.query).toMatch(/lisbon/i);
    expect(intent.hour).toBe("Night");
    expect(intent.wantsMix).toBe(false);
  });
});
