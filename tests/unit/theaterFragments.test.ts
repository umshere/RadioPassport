import { describe, expect, it } from "vitest";
import type { Station } from "~/types/radio";
import { theaterFragment } from "~/components/radio-passport/theaterFragments";
import { solarHourAtLongitude } from "~/utils/localTime";

function station(overrides: Partial<Station> = {}): Station {
  return {
    uuid: "uuid-1",
    name: "Night Tide Radio",
    url: "https://example.org/stream",
    streamUrl: null,
    favicon: "",
    country: "Portugal",
    state: null,
    language: "Portuguese",
    tags: "jazz, dusk, http://spam.example, live",
    bitrate: 128,
    codec: "AAC",
    latitude: 38.7,
    longitude: -9.14,
    ...overrides,
  } as Station;
}

// Fixed instant: 2026-09-16 21:30 UTC. offsetHoursFromLongitude(-9.14) rounds
// to -1, so the station's longitude clock reads 20:30 — Dusk there.
const NOW = new Date("2026-09-16T21:30:00Z");

describe("theaterFragment", () => {
  it("names the catalog place, city before state before country", () => {
    const fragment = theaterFragment(
      station({ city: "Lisbon", state: "Lisbon" }),
      NOW,
    );
    expect(fragment.place).toBe("Lisbon, Portugal");
  });

  it("falls back honestly when no place is cataloged", () => {
    const fragment = theaterFragment(
      station({ city: null, state: null, country: "" }),
      NOW,
    );
    expect(fragment.place).toBe("Place not listed");
  });

  it("reads the solar hour from longitude at a fixed instant", () => {
    const fragment = theaterFragment(station(), NOW);
    expect(solarHourAtLongitude(-9.14, NOW)).toBe("Dusk");
    expect(fragment.hour).toContain("Around 20:30");
    expect(fragment.hour).toContain("by longitude");
  });

  it("keeps the hour truthful when longitude is missing", () => {
    const fragment = theaterFragment(station({ longitude: null }), NOW);
    expect(fragment.hour).toContain("not listed");
  });

  it("drops junk tags and separators, keeps real catalog tags", () => {
    const fragment = theaterFragment(station(), NOW);
    expect(fragment.detail).toContain("jazz");
    expect(fragment.detail).toContain("dusk");
    expect(fragment.detail).not.toContain("spam");
    // A listed tag is not a claim about current playback.
    expect(fragment.detail).toContain("live");
  });

  it("splits the language field into its listed languages", () => {
    const fragment = theaterFragment(
      station({ language: "English, French" }),
      NOW,
    );
    expect(fragment.detail).toContain("English");
    expect(fragment.detail).toContain("French");
  });

  it("keeps redundant-looking but truthful sibling tags", () => {
    // "christian" inside "christian music" reads as redundancy, but
    // dropping evidence silently is worse; both survive like rock/rockabilly.
    const fragment = theaterFragment(
      station({ tags: "christian, christian music, gospel", language: null }),
      NOW,
    );
    expect(fragment.detail).toContain("christian");
    expect(fragment.detail).toContain("christian music");
    expect(fragment.detail).toContain("gospel");
  });

  it("keeps CJK place and language values intact", () => {
    const fragment = theaterFragment(
      station({ city: "東京", state: null, country: "日本", language: "日本語, 한국어, English", tags: "" }),
      NOW,
    );
    expect(fragment.place).toBe("東京, 日本");
    expect(fragment.detail).toContain("日本語");
    expect(fragment.detail).toContain("한국어");
    expect(fragment.detail).toContain("English");
  });

  it("keeps near-prefix genres that are distinct genres", () => {
    const fragment = theaterFragment(
      station({ tags: "art, party, rock", language: null }),
      NOW,
    );
    expect(fragment.detail).toContain("art");
    expect(fragment.detail).toContain("party");
    expect(fragment.detail).toContain("rock");
  });

  it("keeps both rock and rockabilly when both fit", () => {
    const fragment = theaterFragment(
      station({ tags: "rock, rockabilly", language: null }),
      NOW,
    );
    expect(fragment.detail).toContain("rock");
    expect(fragment.detail).toContain("rockabilly");
  });

  it("keeps a genre whose name contains a sibling genre", () => {
    const fragment = theaterFragment(
      station({ tags: "hard rock, rock", language: null }),
      NOW,
    );
    expect(fragment.detail).toContain("hard rock");
    expect(fragment.detail).toContain("rock");
  });

  it("merges punctuation variants of the same tag", () => {
    const fragment = theaterFragment(
      station({ tags: "78-rpm, 78rpm", language: null }),
      NOW,
    );
    expect(fragment.detail).toContain("78-rpm");
    expect(fragment.detail).not.toContain("78rpm");
  });

  it("drops URL junk in any case, keeps real tags", () => {
    const fragment = theaterFragment(
      station({ tags: "Jazz, HTTPS://spam.example, WWW.Spam.Org", language: null }),
      NOW,
    );
    expect(fragment.detail).toContain("Jazz");
    expect(fragment.detail.toLowerCase()).not.toContain("spam");
  });

  it("normalizes unicode composition so equivalent spellings dedupe", () => {
    // "café" composed vs decomposed must count as one tag.
    const composed = "caf\u00e9";
    const decomposed = "cafe\u0301";
    const fragment = theaterFragment(
      station({ tags: `${composed}, ${decomposed}`, language: null }),
      NOW,
    );
    expect(fragment.detail.match(/caf/g)).toHaveLength(1);
  });

  it("stays honest when the catalog is silent", () => {
    const fragment = theaterFragment(
      station({ tags: "", tagList: [], language: null }),
      NOW,
    );
    expect(fragment.detail).toContain("No tags or language listed");
  });

  it("is deterministic for identical input", () => {
    expect(theaterFragment(station(), NOW)).toEqual(theaterFragment(station(), NOW));
  });
});
