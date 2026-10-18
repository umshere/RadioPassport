import { describe, expect, it } from "vitest";
import {
  STATION_LABEL_MIN_CONFIDENCE,
  stationLabelsFor,
  type StationLabelsFile,
} from "~/services/catalog/stationLabels";

const a = (choice: string, confidence: number | null) => ({ choice, confidence });
const file: StationLabelsFile = {
  generatedAt: "2026-10-17T00:00:00Z",
  model: "jev-1.x",
  stations: {
    sure: {
      format: a("mostly_music", 0.9),
      family: a("oldies_hits", 0.8),
      label1: a("Italian oldies", 0.85),
      label2: a("’80s and ’90s", 0.7),
      label3: a("none", 0.9),
    },
    shaky: { format: a("mixed", 0.2), family: a("pop", 0.3), label1: a("Current hits", 0.1) },
    partial: { format: a("mostly_talk_or_news", 0.95), family: a("none", 0.9), label1: a("News", 0.6) },
    dupes: { format: a("unclear", 0.9), label1: a("Classical", 0.6), label2: a("Classical", 0.9), label3: a("Not in vocabulary", 0.99) },
  },
};

describe("stationLabelsFor", () => {
  it("returns labels for a confident station", () => {
    expect(stationLabelsFor("sure", { file })).toEqual({
      format: "mostly_music",
      family: "oldies_hits",
      labels: ["Italian oldies", "’80s and ’90s"],
    });
  });

  it("returns null for unknown stations, including prototype keys", () => {
    expect(stationLabelsFor("nope", { file })).toBeNull();
    expect(stationLabelsFor("constructor", { file })).toBeNull();
  });

  it("returns null when everything is under the threshold", () => {
    expect(stationLabelsFor("shaky", { file })).toBeNull();
  });

  it("drops only the low-confidence parts and 'none' families", () => {
    expect(stationLabelsFor("partial", { file })).toEqual({ format: "mostly_talk_or_news", family: null, labels: ["News"] });
  });

  it("dedupes labels, skips unknown labels and 'unclear' format", () => {
    expect(stationLabelsFor("dupes", { file })).toEqual({ format: null, family: null, labels: ["Classical"] });
  });

  it("honours a custom threshold", () => {
    expect(stationLabelsFor("shaky", { file, minConfidence: 0.25 })?.family).toBe("pop");
  });

  it("ships an empty-safe default file and a sane threshold", () => {
    expect(stationLabelsFor("anything")).toBeNull();
    expect(STATION_LABEL_MIN_CONFIDENCE).toBeGreaterThan(0);
    expect(STATION_LABEL_MIN_CONFIDENCE).toBeLessThan(1);
  });
});
