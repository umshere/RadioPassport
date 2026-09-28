import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  answerLocally,
  buildKeeperFacts,
  keeperOpeningLine,
  keeperTrackLine,
  sanitizeKeeperFacts,
  spokenHour,
  suggestedQuestions,
  type KeeperFacts,
} from "~/components/keeper/keeperFacts";
import { KEEPER_INTENTS, ruleClassify } from "~/components/keeper/keeperIntent";
import {
  clampKeeperSpot,
  DEFAULT_KEEPER_SPOT,
  keeperPeeks,
  maxKeeperLift,
  nudgeKeeperSpot,
  parseKeeperSpot,
  snapKeeperSpot,
} from "~/components/keeper/keeperPlacement";
import {
  deriveKeeperState,
  isDeepNight,
  KEEPER_STATES,
  keeperMood,
  keeperPlate,
  shouldDelight,
  speakingDurationMs,
  type KeeperStateInput,
} from "~/components/keeper/keeperState";
import {
  FLAP_LINE_MAX_MS,
  FLAP_TOTAL_MAX_MS,
  flapLines,
  flapTextPlan,
} from "~/components/keeper/flapTextPlan";
import { DRUM } from "~/components/radio-passport/FlipBoard";
import { EMPTY_ROOM, type Room } from "~/state/roomStore";
import type { NowPlayingTrack } from "~/types/nowPlaying";
import type { Station } from "~/types/radio";

const lisbon: Station = {
  uuid: "st-lisbon",
  name: "Radio Alfama",
  url: "https://example.com/a",
  streamUrl: "https://example.com/a.mp3",
  favicon: "",
  country: "Portugal",
  countryCode: "PT",
  state: "Lisboa",
  city: "Lisbon",
  latitude: 38.7,
  longitude: -9.1,
  language: "portuguese",
  tags: "fado,jazz",
  tagList: ["fado", "jazz"],
  bitrate: 128,
  codec: "MP3",
};

// Longitude -9.1 rounds to UTC-1 in the app's solar clock.
const at = (utcHour: number, minute = 40) =>
  new Date(Date.UTC(2026, 8, 28, utcHour, minute));

function room(
  status: Room["signal"]["status"],
  track: NowPlayingTrack | null,
  dossier?: Partial<Room["dossier"]>,
): Pick<Room, "signal" | "dossier"> {
  return {
    signal: { status, track, message: null },
    dossier: { ...EMPTY_ROOM.dossier, ...dossier },
  };
}

const icy = (artist: string | null, title: string | null): NowPlayingTrack => ({
  raw: [artist, title].filter(Boolean).join(" - "),
  artist,
  title,
  source: "icy",
  fetchedAt: "2026-09-28T20:00:00Z",
});

describe("keeper state", () => {
  const base: KeeperStateInput = {
    hasStation: true,
    isPlaying: true,
    sheetOpen: false,
    typing: false,
    exchange: "none",
    localHour: 14,
    delight: false,
  };

  it("names exactly the six states a Rive/Lottie file must expose", () => {
    expect([...KEEPER_STATES]).toEqual([
      "idle",
      "listening",
      "thinking",
      "speaking",
      "sleeping",
      "delight",
    ]);
  });

  it("sleeps with no station, when paused, and in deep local night", () => {
    expect(deriveKeeperState({ ...base, hasStation: false })).toBe("sleeping");
    expect(deriveKeeperState({ ...base, isPlaying: false })).toBe("sleeping");
    expect(deriveKeeperState({ ...base, localHour: 2 })).toBe("sleeping");
    expect(deriveKeeperState({ ...base, localHour: 5 })).toBe("idle");
    expect(isDeepNight(null)).toBe(false);
  });

  it("wakes for the listener: the sheet beats deep night, typing is listening", () => {
    expect(deriveKeeperState({ ...base, localHour: 2, sheetOpen: true })).toBe("idle");
    expect(deriveKeeperState({ ...base, sheetOpen: true, typing: true })).toBe("listening");
  });

  it("puts a live exchange above a one-shot, and a one-shot above the sheet", () => {
    expect(deriveKeeperState({ ...base, delight: true, exchange: "thinking" })).toBe("thinking");
    expect(deriveKeeperState({ ...base, delight: true, exchange: "speaking" })).toBe("speaking");
    expect(deriveKeeperState({ ...base, delight: true, sheetOpen: true })).toBe("delight");
    // No station still wins over everything.
    expect(deriveKeeperState({ ...base, isPlaying: false, exchange: "speaking" })).toBe(
      "sleeping",
    );
  });

  it("maps the station's hour to a mood", () => {
    expect(keeperMood("Night")).toBe("drowsy");
    expect(keeperMood("Dawn")).toBe("bright");
    expect(keeperMood("Dusk")).toBe("warm");
    expect(keeperMood("Midday")).toBe("awake");
    expect(keeperMood(null)).toBe("awake");
  });

  it("delights only on a title that was not there before", () => {
    expect(shouldDelight(null, "a|b")).toBe(true);
    expect(shouldDelight("a|b", "a|c")).toBe(true);
    expect(shouldDelight("a|b", "a|b")).toBe(false);
    expect(shouldDelight("a|b", null)).toBe(false);
  });

  it("keeps speaking within bounds and the plate on the FlipBoard drum", () => {
    expect(speakingDurationMs("Hi.")).toBe(1600);
    expect(speakingDurationMs("word ".repeat(200))).toBe(6000);
    for (const state of KEEPER_STATES) {
      for (const glyph of keeperPlate(state)) {
        expect(DRUM.includes(glyph)).toBe(true);
      }
    }
    expect(new Set(KEEPER_STATES.map(keeperPlate)).size).toBe(KEEPER_STATES.length);
  });
});

describe("keeper facts", () => {
  it("opens with the station's own hour and name", () => {
    const facts = buildKeeperFacts(lisbon, room("ready", null), at(22, 40));
    expect(facts.hour).toEqual({ clock: "21:40", localHour: 21, solar: "Night" });
    expect(keeperOpeningLine(facts)).toBe(
      "It’s 9:40 at night in Lisbon. This is Radio Alfama.",
    );
    expect(spokenHour("06:05", 6)).toBe("6:05 in the morning");
    expect(spokenHour("12:00", 12)).toBe("12:00 in the afternoon");
    expect(spokenHour("00:15", 0)).toBe("12:15 at night");
  });

  it("never guesses an hour for a station without coordinates", () => {
    const facts = buildKeeperFacts({ ...lisbon, longitude: null }, room("ready", null));
    expect(facts.hour).toBeNull();
    expect(keeperOpeningLine(facts)).toBe("This is Radio Alfama, live from Lisbon.");
    expect(answerLocally("city", facts).text).toContain("can’t read its hour");
    expect(suggestedQuestions(facts).some((chip) => chip.intent === "city")).toBe(false);
  });

  it("says plainly when the station sends no titles — and invents none", () => {
    const facts = buildKeeperFacts(lisbon, room("empty", null), at(9));
    expect(facts.titles).toBe("none");
    expect(facts.track).toBeNull();
    expect(keeperTrackLine(facts)).toBe("This station sends no track titles.");
    expect(answerLocally("track", facts).text).toBe("This station sends no track titles.");
    expect(answerLocally("artist", facts).text).toContain("sends no track titles");
    const chips = suggestedQuestions(facts).map((chip) => chip.label);
    expect(chips).not.toContain("Who is this artist?");
    expect(chips).not.toContain("What’s playing?");
  });

  it("is still listening while the title feed loads", () => {
    const facts = buildKeeperFacts(lisbon, room("loading", null), at(9));
    expect(facts.titles).toBe("waiting");
    expect(keeperTrackLine(facts)).toBe("Listening for a title from the station.");
  });

  it("repeats the ICY title exactly and offers the artist chip only with an artist", () => {
    const facts = buildKeeperFacts(lisbon, room("ready", icy("Mariza", "Barco Negro")), at(9));
    expect(facts.track).toEqual({ artist: "Mariza", title: "Barco Negro" });
    expect(keeperTrackLine(facts)).toBe("Mariza — Barco Negro");
    expect(answerLocally("artist", facts).text).toBe(
      "The station says this is Mariza. That’s all it tells me.",
    );
    expect(suggestedQuestions(facts)[0]?.label).toBe("Who is this artist?");

    const titleOnly = buildKeeperFacts(lisbon, room("ready", icy(null, "Noite")), at(9));
    expect(suggestedQuestions(titleOnly).map((chip) => chip.label)).not.toContain(
      "Who is this artist?",
    );
    expect(answerLocally("artist", titleOnly).text).toContain("no artist name");
  });

  it("uses the dossier only alongside a real title", () => {
    const dossier = {
      status: "ready" as const,
      summary: "Portuguese fado singer.",
      facts: [{ label: "Born", value: "1973" }],
    };
    const withTitle = buildKeeperFacts(lisbon, room("ready", icy("Mariza", "Barco Negro"), dossier));
    expect(answerLocally("artist", withTitle).text).toBe(
      "The station says this is Mariza. Portuguese fado singer.",
    );
    const noTitle = buildKeeperFacts(lisbon, room("empty", null, dossier));
    expect(noTitle.dossier).toBeNull();
  });

  it("offers an hour hop to morning, or to night when it is already morning", () => {
    const night = buildKeeperFacts(lisbon, room("empty", null), at(22));
    const hop = suggestedQuestions(night).slice(-1)[0];
    expect(hop).toEqual({ intent: "hour_hop", label: "Somewhere it’s morning →", hour: "Dawn" });
    expect(answerLocally("hour_hop", night).action).toEqual({ kind: "hour_hop", hour: "Dawn" });
    const dawn = buildKeeperFacts(lisbon, room("empty", null), at(7));
    expect(suggestedQuestions(dawn).slice(-1)[0]?.hour).toBe("Night");
  });

  it("answers language and station from the record", () => {
    const facts = buildKeeperFacts(lisbon, room("empty", null), at(9));
    expect(answerLocally("language", facts).text).toBe("Radio Alfama lists Portuguese.");
    expect(answerLocally("station", facts).text).toBe(
      "Radio Alfama, Portugal. It streams at 128 kbps MP3. It tags itself fado, jazz.",
    );
    expect(answerLocally("off_topic", facts).text).toContain("only keep this desk");
    expect(answerLocally("unknown", facts).text).toBe("I don’t know that from here.");
  });

  it("server re-reads facts: drops unknown keys, caps sizes, refuses junk", () => {
    const facts = buildKeeperFacts(lisbon, room("ready", icy("Mariza", "Barco Negro")), at(9));
    const clean = sanitizeKeeperFacts({ ...facts, secret: "x", station: { ...facts.station, extra: 1 } });
    expect(clean).toEqual(facts);
    expect(sanitizeKeeperFacts(null)).toBeNull();
    expect(sanitizeKeeperFacts({ station: {} })).toBeNull();
    expect(sanitizeKeeperFacts({ station: { name: "x".repeat(5000) } })).toBeNull();
    // A track without titles "sent" is not a track.
    const forged = sanitizeKeeperFacts({ ...facts, titles: "none" }) as KeeperFacts;
    expect(forged.track).toBeNull();
    // A malformed hour is dropped, never trusted.
    const badHour = sanitizeKeeperFacts({ ...facts, hour: { clock: "9pm", localHour: 21, solar: "Night" } });
    expect(badHour?.hour).toBeNull();
  });
});

describe("keeper rule classifier", () => {
  const cases: Array<[string, (typeof KEEPER_INTENTS)[number]]> = [
    ["Who is this artist?", "artist"],
    ["who's singing", "artist"],
    ["What song is this?", "track"],
    ["what's playing", "track"],
    ["What language is this?", "language"],
    ["What's the hour there?", "city"],
    ["what time is it in lisbon", "city"],
    ["Where is this station?", "station"],
    ["Somewhere it's morning", "hour_hop"],
    ["take me to dawn", "hour_hop"],
    ["what's the bitrate", "station"],
    ["tell me a joke", "off_topic"],
    ["weather tomorrow?", "off_topic"],
    ["hmm", "unknown"],
    ["?", "unknown"],
  ];
  it.each(cases)("%s → %s", (question, intent) => {
    expect(ruleClassify(question)).toBe(intent);
  });
});

describe("keeper placement", () => {
  const bounds = { viewportWidth: 375, viewportHeight: 812, floor: 200, ceiling: 60, size: 64 };

  it("snaps to the nearer edge and keeps the height, clamped above the floor", () => {
    expect(snapKeeperSpot(40, 500, bounds)).toEqual({ side: "left", lift: 80 });
    expect(snapKeeperSpot(300, 500, bounds).side).toBe("right");
    // Dropped on the dock: rests on the floor, never over the transport.
    expect(snapKeeperSpot(300, 790, bounds).lift).toBe(0);
    // Dropped on the header: stops under it.
    expect(snapKeeperSpot(300, 0, bounds).lift).toBe(maxKeeperLift(bounds));
    expect(maxKeeperLift(bounds)).toBe(812 - 200 - 60 - 64);
  });

  it("moves by keyboard: arrows nudge, left/right switch sides", () => {
    const up = nudgeKeeperSpot(DEFAULT_KEEPER_SPOT, "ArrowUp", bounds);
    expect(up).toEqual({ side: "right", lift: 60 });
    expect(nudgeKeeperSpot({ side: "right", lift: 10 }, "ArrowDown", bounds)?.lift).toBe(0);
    expect(nudgeKeeperSpot(DEFAULT_KEEPER_SPOT, "ArrowLeft", bounds)?.side).toBe("left");
    expect(nudgeKeeperSpot(DEFAULT_KEEPER_SPOT, "Enter", bounds)).toBeNull();
    expect(clampKeeperSpot({ side: "left", lift: 9999 }, bounds).lift).toBe(maxKeeperLift(bounds));
  });

  it("reads a stored spot defensively", () => {
    expect(parseKeeperSpot('{"side":"left","lift":120}')).toEqual({ side: "left", lift: 120 });
    expect(parseKeeperSpot("not json")).toEqual(DEFAULT_KEEPER_SPOT);
    expect(parseKeeperSpot('{"side":"top","lift":1}')).toEqual(DEFAULT_KEEPER_SPOT);
    expect(parseKeeperSpot(null)).toEqual(DEFAULT_KEEPER_SPOT);
  });

  it("peeks only while nothing is happening", () => {
    expect(keeperPeeks({ state: "idle", engaged: false, hopping: false })).toBe(true);
    expect(keeperPeeks({ state: "sleeping", engaged: false, hopping: false })).toBe(true);
    expect(keeperPeeks({ state: "idle", engaged: false, hopping: true })).toBe(false);
    expect(keeperPeeks({ state: "idle", engaged: true, hopping: false })).toBe(false);
    expect(keeperPeeks({ state: "delight", engaged: false, hopping: false })).toBe(false);
  });
});

describe("keeper flap text", () => {
  it("rolls in sentence by sentence, each beat under 600ms, whole under the cap", () => {
    expect(flapLines("It’s late. This is Radio X! Stay?")).toEqual([
      "It’s late.",
      "This is Radio X!",
      "Stay?",
    ]);
    const long = "word ".repeat(80).trim() + ". " + "Another sentence here.";
    const plan = flapTextPlan(long);
    expect(plan.totalMs).toBeLessThanOrEqual(FLAP_TOTAL_MAX_MS);
    for (const line of plan.lines) {
      const delays = line.words.flatMap((word) => word.chars.map((char) => char.delay));
      expect(Math.max(...delays) - Math.min(...delays)).toBeLessThanOrEqual(FLAP_LINE_MAX_MS);
    }
    // Every character is kept, in order.
    const rebuilt = plan.lines
      .map((line) => line.words.map((word) => word.chars.map((c) => c.ch).join("")).join(" "))
      .join(" ");
    expect(rebuilt).toBe(long);
    expect(flapTextPlan("").totalMs).toBe(0);
  });
});

describe("keeper wiring", () => {
  const read = (path: string) =>
    readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

  it("mounts once at the root, floats free of the dock row, and keeps Tailwind scanning it", () => {
    const root = read("app/root.tsx");
    expect(root).toContain("<KeeperHost />");
    expect(root).toContain("keeperAskEnabled: isKeeperAskEnabled()");
    expect(read("app/components/PlayerDock.tsx")).not.toContain("Keeper");
    expect(read("tailwind.config.ts")).toContain("./app/components/keeper/**/*.{ts,tsx}");
  });

  it("drives the figure through data-state and never adds a network call to the sheet but the flagged ask", () => {
    const keeper = read("app/components/keeper/Keeper.tsx");
    expect(keeper).toContain("data-state={state}");
    expect(keeper).toContain("data-mood={mood}");
    const sheet = read("app/components/keeper/KeeperSheet.tsx");
    expect(sheet).not.toContain("fetch(");
    expect(sheet).toContain('aria-modal="true"');
    expect(sheet).toContain('aria-labelledby="ew-keeper-title"');
    expect(sheet).toContain("snapBoardSheet");
    const client = read("app/components/keeper/keeperClient.ts");
    expect(client).toContain("Promise.race");
    expect(client).not.toContain("AbortController");
  });

  it("respects reduced motion and the square system in the stylesheet", () => {
    const css = read("app/tailwind.css");
    const keeper = css.slice(css.indexOf("/* ---- The keeper"));
    expect(keeper).toContain("@media (prefers-reduced-motion: no-preference)");
    expect(keeper).toMatch(/prefers-reduced-motion: reduce\)[\s\S]*\.ew-keeper-sheet, \.ew-flaptext-char \{ animation: none; \}/);
    expect(keeper).not.toMatch(/box-shadow/);
    expect(keeper).not.toMatch(/#[0-9a-fA-F]{3,6}\b/);
    expect(keeper).toContain(".ew-keeper-float");
  });
});
