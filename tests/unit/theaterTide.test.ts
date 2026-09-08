import { describe, expect, it } from "vitest";
import {
  buildTheaterKnowledge,
  seatTheaterKnowledge,
  seatTheaterKnowledgeTide,
  tideLaneForKnowledge,
} from "~/components/radio-passport/knowledge/theaterKnowledge";
import type { Station } from "~/types/radio";

function makeStation(): Station {
  return {
    uuid: "st-1",
    name: "Radio Dusk",
    url: "https://dusk.example/stream",
    streamUrl: null,
    favicon: "",
    country: "India",
    countryCode: "IN",
    state: null,
    city: "Mumbai",
    latitude: null,
    longitude: null,
    language: "Hindi",
    languageCodes: ["hi"],
    tags: null,
    bitrate: 128,
    codec: "AAC",
  };
}

describe("tide knowledge seating", () => {
  it("lanes the room: well, on-air, hubs, outer water", () => {
    expect(
      tideLaneForKnowledge({ id: "station:st-1", kind: "station" }, "station:st-1"),
    ).toBe(0);
    expect(
      tideLaneForKnowledge({ id: "station:st-9", kind: "station" }, "station:st-1"),
    ).toBe(3);
    expect(
      tideLaneForKnowledge({ id: "track:x", kind: "track" }, "station:st-1"),
    ).toBe(1);
    for (const kind of ["country", "language", "city", "artist"] as const) {
      expect(tideLaneForKnowledge({ id: `${kind}:x`, kind }, null)).toBe(2);
    }
    for (const kind of ["album", "year", "genre", "place", "event"] as const) {
      expect(tideLaneForKnowledge({ id: `${kind}:x`, kind }, null)).toBe(3);
    }
  });

  it("holds the tuned station in the well with lanes around it", () => {
    const graph = buildTheaterKnowledge({ station: makeStation() });
    const seats = seatTheaterKnowledgeTide({
      graph,
      seats: new Map(),
      focusId: null,
      seed: 7,
      tunedId: "station:st-1",
    });
    expect(seats.get("station:st-1")).toEqual({ x: 0.5, y: 0.5 });
    const ring = (id: string) => {
      const seat = seats.get(id)!;
      return Math.hypot(seat.x - 0.5, (seat.y - 0.5) / 0.72);
    };
    // Hubs ride the middle water, inside the neighbour lanes.
    expect(ring("country:IN")).toBeGreaterThan(0.2);
    expect(ring("country:IN")).toBeLessThan(0.4);
    for (const seat of seats.values()) {
      expect(seat.x).toBeGreaterThanOrEqual(0.06);
      expect(seat.x).toBeLessThanOrEqual(0.94);
    }
  });

  it("is deterministic and pins seats across growth and mode flips", () => {
    const graph = buildTheaterKnowledge({ station: makeStation() });
    const first = seatTheaterKnowledgeTide({
      graph,
      seats: new Map(),
      focusId: null,
      seed: 7,
      tunedId: "station:st-1",
    });
    const replay = seatTheaterKnowledgeTide({
      graph,
      seats: new Map(),
      focusId: null,
      seed: 7,
      tunedId: "station:st-1",
    });
    expect([...first.entries()]).toEqual([...replay.entries()]);

    // The sky's seats are honored verbatim — flipping the A/B only lifts
    // the tuned station into the well; nothing else already afloat moves.
    const sky = seatTheaterKnowledge({
      graph,
      seats: new Map(),
      focusId: null,
      seed: 7,
    });
    const tide = seatTheaterKnowledgeTide({
      graph,
      seats: sky,
      focusId: null,
      seed: 7,
      tunedId: "station:st-1",
    });
    expect(tide.get("station:st-1")).toEqual({ x: 0.5, y: 0.5 });
    for (const [id, seat] of sky) {
      if (id === "station:st-1") continue;
      expect(tide.get(id)).toEqual(seat);
    }
  });
});
