import { describe, expect, it } from "vitest";

import { parseJsonObjectFromText } from "~/services/ai/providers/providerUtils";

describe("providerUtils", () => {
  it("parses the first balanced JSON object from surrounding text", () => {
    expect(
      parseJsonObjectFromText('prefix {"visual":"card_stack"} suffix')
    ).toEqual({ visual: "card_stack" });
  });

  it("accepts AI JSON responses with comments and trailing commas", () => {
    expect(
      parseJsonObjectFromText(`{
        "selectedStationIds": [
          "be04c81", // Deep House station
        ],
        "mood": "Deep House",
      }`)
    ).toEqual({
      selectedStationIds: ["be04c81"],
      mood: "Deep House",
    });
  });

  it("does not strip comment markers inside strings", () => {
    expect(
      parseJsonObjectFromText(`{
        "url": "https://example.com/stream",
        "note": "keep // as text"
      }`)
    ).toEqual({
      url: "https://example.com/stream",
      note: "keep // as text",
    });
  });
});
