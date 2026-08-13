import { describe, expect, it } from "vitest";
import type { Station } from "~/types/radio";
import {
  ELSEWHERE_LOOP,
  SURFACE_CONNECTIONS,
  connectionById,
  connectionsForStep,
  describeAtlasEmpty,
  describeCoverEmpty,
  homeWithPassportHref,
  openPassportNow,
  intentPath,
  looksLikeIntentSentence,
  nextLoopStep,
  overlayBackFromCountry,
  passportRequested,
  resolveStampReplay,
  searchKeepsPlayback,
  seekingBoardLabel,
  seekingStatus,
  theaterIntelligence,
  theaterWithoutStation,
} from "~/components/radio-passport/productFlow";
import {
  catalogRequestState,
  shouldClearBrowsingFilters,
} from "~/components/radio-passport/searchState";
import { isStampReady, stationStampId } from "~/state/journeyStore";
import { stampForContinuousSession } from "~/components/radio-passport/JourneyBridge";

const station = (overrides: Partial<Station> = {}): Station => ({
  uuid: "signal-1",
  name: "Club FM",
  url: "https://stream.example/one",
  streamUrl: "https://stream.example/one",
  favicon: "",
  country: "India",
  countryCode: "IN",
  state: "Kerala",
  city: "Kochi",
  language: "Malayalam",
  tags: "Jazz",
  tagList: ["Jazz"],
  bitrate: 128,
  codec: "mp3",
  ...overrides,
});

describe("Elsewhere living loop", () => {
  it("is one closed loop: land → intent → tune → inhabit → stamp → next", () => {
    expect(ELSEWHERE_LOOP).toEqual([
      "land",
      "intent",
      "tune",
      "inhabit",
      "stamp",
      "next",
    ]);
    expect(nextLoopStep("land")).toBe("intent");
    expect(nextLoopStep("intent")).toBe("tune");
    expect(nextLoopStep("tune")).toBe("inhabit");
    expect(nextLoopStep("inhabit")).toBe("stamp");
    expect(nextLoopStep("stamp")).toBe("next");
    expect(nextLoopStep("next")).toBe("land");
  });

  it("gives every loop step at least one on-screen connection", () => {
    for (const step of ELSEWHERE_LOOP) {
      expect(connectionsForStep(step).map((item) => item.id)).not.toEqual([]);
    }
  });

  it("names a destination for every connection we show", () => {
    for (const connection of SURFACE_CONNECTIONS) {
      expect(connection.id + ":" + connection.action).toMatch(/:[a-z-]+$/);
      expect(connection.label.trim().length).toBeGreaterThan(0);
      expect(ELSEWHERE_LOOP).toContain(connection.step);
    }
  });

  it("keeps search, chips, and overlays from calling stop", () => {
    const keepers = SURFACE_CONNECTIONS.filter((item) =>
      ["intent", "solar-hour", "atlas", "passport", "favorite", "issue"].includes(
        item.action
      )
    );
    expect(keepers.length).toBeGreaterThan(0);
    expect(keepers.every((item) => item.keepsPlayback)).toBe(true);
    expect(searchKeepsPlayback()).toBe(true);
  });
});

describe("Cover empty states always offer a next step", () => {
  it("turns a missed search into Surprise, Atlas, or clear", () => {
    const empty = describeCoverEmpty({
      query: "zzzznotreal",
      hour: null,
      place: null,
    });
    expect(empty.kind).toBe("search");
    expect(empty.message).toMatch(/no live signal for “zzzznotreal”/i);
    expect(empty.actions.map((action) => action.id)).toEqual([
      "surprise",
      "atlas",
      "clear-search",
    ]);
  });

  it("lets a quiet solar hour be cleared without leaving the cover", () => {
    const empty = describeCoverEmpty({
      query: "",
      hour: "Dawn",
      place: null,
    });
    expect(empty.kind).toBe("hour");
    expect(empty.actions.map((action) => action.id)).toContain("clear-hour");
    expect(empty.actions.map((action) => action.id)).toContain("atlas");
  });

  it("offers a way out of a city filter with no remaining signals", () => {
    const empty = describeCoverEmpty({
      query: "",
      hour: null,
      place: "Lisbon",
    });
    expect(empty.kind).toBe("place");
    expect(empty.actions.map((action) => action.id)).toEqual([
      "clear-place",
      "atlas",
    ]);
  });

  it("never returns a silent catalog with no action", () => {
    const empty = describeCoverEmpty({
      query: "",
      hour: null,
      place: null,
    });
    expect(empty.actions.length).toBeGreaterThan(0);
    expect(empty.actions.every((action) => action.label.trim())).toBe(true);
  });
});

describe("Intent is a step, not a dead field", () => {
  it("routes a short query to catalog search and a sentence to interpret", () => {
    expect(intentPath("")).toBe("idle");
    expect(intentPath("jazz")).toBe("catalog");
    expect(intentPath("Lisbon")).toBe("catalog");
    expect(intentPath("Lisbon at dusk")).toBe("interpret");
    expect(intentPath("surprise me")).toBe("interpret");
    expect(looksLikeIntentSentence("rainy night jazz")).toBe(true);
  });

  it("names the search in the bar and on the board below", () => {
    expect(seekingStatus({ query: "", loading: false, count: 0 })).toEqual({
      tone: "idle",
      label: "",
      spoken: "",
    });
    expect(
      seekingStatus({ query: "malayalam", loading: true, count: 0 })
    ).toMatchObject({ tone: "searching", label: "Searching" });
    expect(
      seekingStatus({ query: "malayalam", loading: false, count: 88 })
    ).toMatchObject({ tone: "ready", label: "88 live" });
    expect(seekingBoardLabel("malayalam", true, 0)).toBe(
      "SEARCHING · MALAYALAM"
    );
    expect(seekingBoardLabel("malayalam", false, 88)).toBe(
      "88 LIVE · MALAYALAM"
    );
    expect(shouldClearBrowsingFilters("malayalam")).toBe(true);
  });

  it("does not fetch the catalog for a one-letter tap", () => {
    expect(catalogRequestState("j")).toEqual({
      shouldFetch: false,
      isLoading: false,
    });
    expect(catalogRequestState("ja")).toEqual({
      shouldFetch: true,
      isLoading: true,
    });
  });
});

describe("Icons that look live must land somewhere", () => {
  it("sends dock art and Theater to the listening room", () => {
    expect(connectionById("dock-art")?.action).toBe("theater");
    expect(connectionById("dock-theater")?.action).toBe("theater");
    expect(connectionById("dock-art")?.keepsPlayback).toBe(true);
  });

  it("opens the book from the stamp ring, the passport button, and an inked toast", () => {
    expect(connectionById("dock-stamp")?.action).toBe("passport");
    expect(connectionById("passport")?.action).toBe("passport");
    expect(connectionById("passport-empty")?.action).toBe("find-city");
    expect(passportRequested("?passport=1")).toBe(true);
    expect(passportRequested("passport=1")).toBe(true);
    expect(passportRequested("")).toBe(false);
    expect(homeWithPassportHref()).toBe("/?passport=1");
    expect(openPassportNow("/", () => undefined)).toBe("event");
    let routed = false;
    expect(
      openPassportNow("/listen", () => {
        routed = true;
      })
    ).toBe("route");
    expect(routed).toBe(true);
  });

  it("makes Issue and the wordmark real routes home or to Issue 01", () => {
    expect(connectionById("issue")?.action).toBe("issue");
    expect(connectionById("wordmark")?.action).toBe("home");
    expect(connectionById("about-land")?.action).toBe("home");
    expect(connectionById("issue")?.optional).toBeFalsy();
  });

  it("hides the voice mic when the browser cannot listen, and never leaves a no-op heart", () => {
    expect(connectionById("voice")?.optional).toBe(true);
    expect(connectionById("station-heart")?.action).toBe("favorite");
    expect(connectionById("passport-favorite")?.action).toBe("play-station");
  });

  it("retries a failed mix instead of leaving an error as the last word", () => {
    expect(connectionById("retry-mix")?.action).toBe("retry-mix");
    expect(connectionById("country-retry")?.action).toBe("retry-catalog");
  });
});

describe("Overlays keep a way through", () => {
  it("returns country drill-down to the atlas", () => {
    expect(overlayBackFromCountry()).toBe("atlas");
    expect(connectionById("country-back")?.action).toBe("atlas");
  });

  it("lets an empty atlas search be cleared", () => {
    const empty = describeAtlasEmpty("zzzz");
    expect(empty.message).toMatch(/no country/i);
    expect(empty.actions).toEqual([
      { id: "clear-search", label: "Clear search" },
    ]);
    expect(describeAtlasEmpty("").actions).toEqual([]);
  });

  it("sends an empty theater back to land", () => {
    const empty = theaterWithoutStation();
    expect(empty.route).toBe("/");
    expect(empty.label).toMatch(/elsewhere/i);
    expect(empty.message).toMatch(/land/i);
    expect(connectionById("theater-empty")?.step).toBe("land");
  });
});

describe("A stamp is a next city, not a souvenir", () => {
  it("replays by station id, then by city, then opens that country", () => {
    const kochi = station({ uuid: "abc", city: "Kochi", country: "India" });
    const lisbon = station({
      uuid: "lis",
      city: "Lisbon",
      country: "Portugal",
      name: "Antena 1",
    });
    expect(
      resolveStampReplay(
        { stationId: "abc", city: "Kochi", country: "India" },
        [kochi, lisbon]
      ).station?.uuid
    ).toBe("abc");
    expect(
      resolveStampReplay(
        { stationId: "gone", city: "Lisbon", country: "Portugal" },
        [kochi, lisbon]
      ).station?.uuid
    ).toBe("lis");
    expect(
      resolveStampReplay(
        { stationId: "gone", city: "Accra", country: "Ghana" },
        [kochi, lisbon]
      )
    ).toEqual({ station: null, fallback: "country" });
    expect(
      resolveStampReplay(
        { stationId: "gone", city: "Nowhere", country: "" },
        [kochi]
      ).fallback
    ).toBe("atlas");
  });

  it("inks only after sixty continuous seconds in the same city", () => {
    const live = station({ city: "Kochi", country: "India" });
    expect(isStampReady(1_000, 60_999, true)).toBe(false);
    expect(stampForContinuousSession(live, 1_000, 61_000, true)?.city).toBe(
      "Kochi"
    );
    expect(stampForContinuousSession(live, 1_000, 61_000, false)).toBeNull();
    expect(stationStampId("other", "Kochi", "India")).toBe(
      stationStampId("abc", "Kochi", "India")
    );
  });

  it("shows the filed track dossier only when ICY sent a title", () => {
    expect(
      theaterIntelligence({
        hasTrack: false,
        dispatchBody: "Club FM is on the air from Kochi.",
        summary: "Should stay hidden",
        facts: [{ label: "Year", value: "1977" }],
      })
    ).toEqual({
      dispatchBody: "Club FM is on the air from Kochi.",
      summary: null,
      facts: [],
    });
    const rich = theaterIntelligence({
      hasTrack: true,
      dispatchBody: "Antena 1 is carrying Evening Star through Lisbon.",
      summary: "Fripp and Eno recorded it in 1975.",
      facts: [
        { label: "Year", value: "1975" },
        { label: "Album", value: "Evening Star" },
        { label: "Origin", value: "London" },
        { label: "Extra", value: "drop" },
      ],
    });
    expect(rich.summary).toMatch(/Fripp/);
    expect(rich.facts.map((fact) => fact.label)).toEqual([
      "Year",
      "Album",
      "Origin",
    ]);
  });
});
