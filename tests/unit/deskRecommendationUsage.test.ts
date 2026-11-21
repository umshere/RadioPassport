import { describe, expect, it } from "vitest";
import { USAGE_EVENTS } from "~/utils/usage";
import { fieldFor } from "~/services/admin/counters.server";
import { advanceRecommendationPlayback } from "~/hooks/useDeskRecommendationMetrics";

describe("Desk recommendation usage counters", () => {
  it("allowlists each anonymous funnel step as its own daily count", () => {
    const events = [
      "desk_rec_eligible",
      "desk_rec_impression",
      "desk_rec_tune",
      "desk_rec_audio_started",
      "desk_rec_listened_30s",
      "desk_rec_see_all",
    ];
    for (const event of events) {
      expect(USAGE_EVENTS).toContain(event);
      expect(fieldFor(event)).toBe(event);
    }
  });

  it("does not permit station identifiers or other dimensions on funnel counters", () => {
    expect(fieldFor("desk_rec_tune", { source: "station-uuid" })).toBe("desk_rec_tune");
    expect(fieldFor("station_uuid_123")).toBeNull();
  });

  it("requires 30 seconds of continuous selected-station media time", () => {
    const progress = { played: 0, lastTime: null as number | null };
    const observe = (currentTime: number, overrides: Partial<{ matches: boolean; playing: boolean; seeking: boolean; ready: boolean }> = {}) =>
      advanceRecommendationPlayback(progress, { matches: true, playing: true, seeking: false, ready: true, currentTime, ...overrides });

    expect(observe(0)).toBe(false);
    expect(observe(12)).toBe(false);
    expect(observe(24, { playing: false })).toBe(false); // pause breaks continuity
    expect(progress.played).toBe(0);
    expect(observe(24)).toBe(false);
    expect(observe(29)).toBe(false);
    expect(observe(34)).toBe(false);
    expect(observe(39)).toBe(false);
    expect(observe(44)).toBe(false);
    expect(observe(49)).toBe(false);
    expect(observe(54)).toBe(true);
    expect(observe(80, { matches: false })).toBe(false); // auto-skip/station change
    expect(progress.played).toBe(0);
  });

  it("does not infer listening from a wall-clock gap or a media-time reset", () => {
    const progress = { played: 0, lastTime: null as number | null };
    const observe = (currentTime: number) => advanceRecommendationPlayback(progress, {
      matches: true, playing: true, seeking: false, ready: true, currentTime,
    });
    observe(20);
    expect(observe(26)).toBe(false);
    expect(observe(4)).toBe(false);
    expect(progress.played).toBe(0);
  });
});
