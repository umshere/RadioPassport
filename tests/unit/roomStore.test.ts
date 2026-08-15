import { describe, expect, it } from "vitest";
import type { Station } from "~/types/radio";
import type { NowPlayingTrack } from "~/types/nowPlaying";
import {
  EMPTY_ROOM,
  createRoom,
  emptyRoom,
  roomAfterCaption,
  roomAfterDossier,
  roomAfterOpen,
  roomAfterSignal,
  roomForStation,
} from "~/state/roomStore";

function station(overrides: Partial<Station> = {}): Station {
  return {
    uuid: "vinyl",
    name: "Classic Vinyl HD",
    url: "https://example.com/vinyl",
    streamUrl: "https://example.com/vinyl",
    favicon: "",
    country: "The United States Of America",
    countryCode: "US",
    state: "New York",
    city: "New York",
    longitude: -74,
    latitude: 40.7,
    language: "english",
    tags: "jazz",
    tagList: ["jazz"],
    bitrate: 128,
    codec: "MP3",
    ...overrides,
  };
}

function track(title: string, artist: string): NowPlayingTrack {
  return {
    raw: `${artist} — ${title}`,
    title,
    artist,
    source: "icy",
    fetchedAt: "2026-08-15T17:00:00.000Z",
  };
}

describe("room identity", () => {
  it("opens a room with this station's template caption, not the last one", () => {
    const vinyl = createRoom(station());
    expect(vinyl.caption?.body).toMatch(/Classic Vinyl HD/);
    expect(vinyl.caption?.body).toMatch(/New York/);
    expect(vinyl.plate).toBeNull();
    expect(vinyl.dossier.status).toBe("idle");

    const adroit = roomAfterOpen(
      vinyl,
      station({
        uuid: "adroit",
        name: "Adroit Jazz Underground",
        city: "Wisconsin",
        state: "Wisconsin",
        longitude: -89,
      }),
      true,
    );
    expect(adroit.stationId).toBe("adroit");
    expect(adroit.city).toMatch(/Wisconsin/);
    expect(adroit.caption?.body).toMatch(/Adroit Jazz Underground/);
    expect(adroit.caption?.body).not.toMatch(/Classic Vinyl/);
    expect(adroit.plate).toBeNull();
    expect(adroit.dossier.facts).toEqual([]);
  });

  it("ignores ICY, caption, and dossier that belong to the previous land", () => {
    const vinyl = createRoom(station());
    const adroit = roomAfterOpen(
      vinyl,
      station({ uuid: "adroit", name: "Adroit Jazz Underground", city: "Wisconsin" }),
      true,
    );
    const leaked = roomAfterSignal(adroit, "vinyl", {
      status: "ready",
      track: track("Ghost", "Someone"),
      message: null,
    });
    expect(leaked.signal.track).toBeNull();
    expect(
      roomAfterCaption(adroit, "vinyl", {
        id: "vinyl|x",
        headline: "Live from New York",
        body: "Classic Vinyl HD is on the air from New York. This station is not sending track titles.",
        mood: "jazz",
        localLabel: "17:08 in New York",
      }, "ai").caption?.body,
    ).toMatch(/Adroit/);
    expect(
      roomAfterDossier(adroit, "vinyl", {
        status: "ready",
        summary: "A leftover story.",
        facts: [{ label: "Year", value: "1958" }],
        links: [],
        imageUrl: "https://cover.example/old.jpg",
        source: "free",
      }).plate,
    ).toBeNull();
  });

  it("refreshes a template caption when ICY lands, then keeps an AI caption", () => {
    const opened = createRoom(station({ uuid: "adroit", name: "Adroit Jazz Underground", city: "Wisconsin" }));
    const titled = roomAfterSignal(opened, "adroit", {
      status: "ready",
      track: track("Evening Star", "Fripp"),
      message: null,
    });
    expect(titled.caption?.body).toMatch(/Evening Star/);
    expect(titled.captionSource).toBe("template");
    expect(titled.dossier.status).toBe("loading");
    expect(titled.phase).toBe("locking");

    const filed = roomAfterDossier(titled, "adroit", {
      status: "ready",
      summary: "Recorded in 1975.",
      facts: [{ label: "Year", value: "1975" }],
      links: [{ label: "Wiki", url: "https://en.wikipedia.org/wiki/Evening_Star" }],
      imageUrl: "https://coverartarchive.org/release/abc/front-250",
      source: "free",
    });
    expect(filed.phase).toBe("filed");
    expect(filed.plate).toMatch(/coverartarchive/);

    const voiced = roomAfterCaption(
      filed,
      "adroit",
      {
        id: "adroit|icy|2026-08-15T17",
        headline: "Live from Wisconsin",
        body: "Adroit Jazz Underground is carrying Fripp through Wisconsin.",
        mood: "jazz",
        localLabel: "12:00 in Wisconsin",
      },
      "ai",
    );
    const laterIcy = roomAfterSignal(voiced, "adroit", {
      status: "ready",
      track: track("Evening Star", "Fripp"),
      message: null,
    });
    expect(laterIcy.caption?.body).toMatch(/carrying Fripp/);
    expect(laterIcy.captionSource).toBe("ai");
  });

  it("drops the last track's plate when ICY moves on", () => {
    const titled = roomAfterDossier(
      roomAfterSignal(
        createRoom(station({ uuid: "adroit", name: "Adroit Jazz Underground", city: "Wisconsin" })),
        "adroit",
        { status: "ready", track: track("Evening Star", "Fripp"), message: null },
      ),
      "adroit",
      {
        status: "ready",
        summary: "Old plate.",
        facts: [{ label: "Year", value: "1975" }],
        links: [],
        imageUrl: "https://coverartarchive.org/release/abc/front-250",
        source: "free",
      },
    );
    const nextSong = roomAfterSignal(titled, "adroit", {
      status: "ready",
      track: track("The Heavenly Music Corporation", "Fripp"),
      message: null,
    });
    expect(nextSong.plate).toBeNull();
    expect(nextSong.dossier.status).toBe("loading");
    expect(nextSong.captionSource).toBe("template");
    expect(nextSong.caption?.body).toMatch(/Heavenly Music/);
  });

  it("keeps a free plate when AI later upgrades the sentences", () => {
    const room = roomAfterDossier(
      createRoom(station({ uuid: "adroit" })),
      "adroit",
      {
        status: "ready",
        summary: "MusicBrainz line.",
        facts: [{ label: "Year", value: "1975" }],
        links: [],
        imageUrl: "https://coverartarchive.org/release/abc/front-250",
        source: "free",
      },
    );
    const upgraded = roomAfterDossier(room, "adroit", {
      status: "ready",
      summary: "Fripp and Eno recorded it in 1975.",
      facts: [
        { label: "Year", value: "1975" },
        { label: "Album", value: "Evening Star" },
      ],
      links: [{ label: "Wiki", url: "https://en.wikipedia.org/wiki/Evening_Star" }],
      imageUrl: null,
      source: "ai",
    });
    expect(upgraded.plate).toMatch(/coverartarchive/);
    expect(upgraded.dossier.summary).toMatch(/Fripp/);
    expect(upgraded.dossier.source).toBe("ai");
  });

  it("clears the room when nothing is playing", () => {
    expect(roomAfterOpen(createRoom(station()), null, false)).toBe(EMPTY_ROOM);
    expect(emptyRoom()).toBe(EMPTY_ROOM);
    expect(roomForStation(createRoom(station()), "other")).toBe(EMPTY_ROOM);
  });

  it("does not allocate a new room when the land did not change", () => {
    const live = station({ uuid: "adroit" });
    const opened = createRoom(live);
    expect(roomAfterOpen(opened, live, true)).toBe(opened);
    const sameSignal = {
      status: "loading" as const,
      track: null,
      message: null,
    };
    expect(roomAfterSignal(opened, "adroit", sameSignal)).toBe(opened);
  });
});
