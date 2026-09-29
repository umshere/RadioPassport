import { describe, expect, it } from "vitest";
import { cleanField, cleanTrack, cleanTrackLine } from "~/services/keeper/cleanTitle";

describe("cleanField", () => {
  it("repairs mojibake, strips sites, brackets, bitrates and edit suffixes", () => {
    expect(cleanField("DJ Baddo â€“ Cheers")).toBe("DJ Baddo – Cheers");
    expect(cleanField("Last Last | val9ja.com")).toBe("Last Last");
    expect(cleanField("Song (Official Video)")).toBe("Song");
    expect(cleanField("Song - Radio Edit")).toBe("Song");
    expect(cleanField("Song 128kbps")).toBe("Song");
    expect(cleanField("07. Song")).toBe("Song");
    expect(cleanField("www.example.com")).toBeNull();
    expect(cleanField("ToddDulaney [CEENAIJA.COM]")).toBe("ToddDulaney");
    expect(cleanField("Victory Belongs To Jesus || www.CeeNaija.com")).toBe("Victory Belongs To Jesus");
  });
});

describe("cleanTrack kinds", () => {
  it("accepts a real artist/title pair", () => {
    expect(cleanTrack("Burna Boy", "Last Last | val9ja.com", "GoRadio")).toMatchObject({
      kind: "track",
      artist: "Burna Boy",
      title: "Last Last",
    });
  });
  it("does not treat a station ident, an ad, news or a URL as a track", () => {
    expect(cleanTrack(null, "GoRadio ng", "GoRadio ng").kind).toBe("jingle_or_station_id");
    expect(cleanTrack(null, "ADVERTISEMENT", "X").kind).toBe("ad");
    expect(cleanTrack(null, "News at six", "X").kind).toBe("news_or_talk");
    expect(cleanTrack(null, "www.val9ja.com", "X").kind).toBe("junk");
    expect(cleanTrack(null, "", "X").kind).toBe("junk");
  });
  it("gives a single field low confidence and no artist", () => {
    const one = cleanTrack(null, "Barco Negro", "X");
    expect(one).toMatchObject({ kind: "track", confidence: 0.6, artist: null });
  });
});

describe("cleanTrackLine", () => {
  it("joins cleaned artist and title, and is null for nothing", () => {
    expect(cleanTrackLine({ artist: "ToddDulaney [CEENAIJA.COM]", title: "Victory || www.CeeNaija.com" })).toBe("ToddDulaney — Victory");
    expect(cleanTrackLine({ artist: null, title: "Barco Negro" })).toBe("Barco Negro");
    expect(cleanTrackLine(null)).toBeNull();
    expect(cleanTrackLine({ artist: "", title: "www.example.com" })).toBeNull();
  });
});
