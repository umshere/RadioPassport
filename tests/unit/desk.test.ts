import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { readAppCss } from "./appCss";
import {
  deskDepartures,
  deskOnAir,
  listenerClock,
  minutesAboard,
  postmarkDate,
  skyBody,
  skyHour,
} from "~/components/desk/deskModel";
import { VOICE } from "~/components/keeper/keeperVoice";
import { hourOffsetFromListener } from "~/components/keeper/keeperMurmur";
import type { KeeperFacts } from "~/components/keeper/keeperFacts";
import { useKeeperStore } from "~/state/keeperStore";
import type { Station } from "~/types/radio";

const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

function station(overrides: Partial<Station> = {}): Station {
  return {
    uuid: "s1",
    name: "Radio One",
    url: "",
    streamUrl: null,
    favicon: "",
    country: "Japan",
    state: "Tokyo",
    language: "japanese",
    tags: "jpop",
    tagList: ["jpop"],
    bitrate: 128,
    codec: "MP3",
    ...overrides,
  };
}

describe("desk sky", () => {
  it("names the hour, or says unknown without coordinates", () => {
    expect(skyHour("Night")).toBe("night");
    expect(skyHour("Dawn")).toBe("dawn");
    expect(skyHour(null)).toBe("unknown");
  });

  it("puts the sun up by day and the moon by night, in quarter-hour steps", () => {
    expect(skyBody(6, 0)).toEqual({ kind: "sun", x: 0, y: 0 });
    expect(skyBody(12, 0)).toEqual({ kind: "sun", x: 0.5, y: 1 });
    expect(skyBody(18, 0)).toEqual({ kind: "moon", x: 0, y: 0 });
    expect(skyBody(0, 0)).toEqual({ kind: "moon", x: 0.5, y: 1 });
    // Snapped: 12:14 and 12:00 stand in the same place.
    expect(skyBody(12, 14)).toEqual(skyBody(12, 0));
    expect(skyBody(12, 15)).not.toEqual(skyBody(12, 0));
    const late = skyBody(5, 50);
    expect(late.kind).toBe("moon");
    expect(late.x).toBeGreaterThan(0.9);
  });

  it("says the offset from the listener in plain words", () => {
    expect(VOICE.offset(null)).toBeNull();
    expect(VOICE.offset(0)).toBe("Your hour, by the sun");
    expect(VOICE.offset(1)).toBe("1 hour ahead of you");
    expect(VOICE.offset(-5)).toBe("5 hours behind you");
  });
});

describe("sun offset", () => {
  const at = (localHour: number) =>
    ({ hour: { clock: "00:00", localHour, solar: "Night" } }) as unknown as KeeperFacts;
  it("takes the short way round the clock and reads half a day as ahead", () => {
    expect(hourOffsetFromListener(at(2), 12)).toBe(-10);
    expect(hourOffsetFromListener(at(17), 12)).toBe(5);
    expect(hourOffsetFromListener(at(0), 12)).toBe(12);
    expect(hourOffsetFromListener(at(12), 0)).toBe(12);
    expect(hourOffsetFromListener(at(23), 0)).toBe(-1);
    for (let station = 0; station < 24; station += 1) {
      for (let listener = 0; listener < 24; listener += 1) {
        const diff = hourOffsetFromListener(at(station), listener)!;
        expect(diff).toBeGreaterThan(-12);
        expect(diff).toBeLessThanOrEqual(12);
      }
    }
  });
});

describe("desk pass", () => {
  it("counts whole minutes aboard, never negative", () => {
    expect(minutesAboard(0, 1000)).toBe(0);
    expect(minutesAboard(1000, 500)).toBe(0);
    expect(minutesAboard(0 + 1, 1 + 59_999)).toBe(0);
    expect(minutesAboard(1, 1 + 4 * 60_000 + 10)).toBe(4);
    expect(VOICE.aboard(0)).toBe("Just landed");
    expect(VOICE.aboard(12)).toBe("12 min");
  });

  it("writes the listener clock and the postmark date", () => {
    const at = new Date(2026, 8, 29, 7, 5);
    expect(listenerClock(at)).toBe("07:05");
    expect(postmarkDate(at)).toBe("29 SEP");
    expect(VOICE.stampCount(3)).toBe("Passport · 03");
  });

  it("notes when each station was first heard, once", () => {
    const store = useKeeperStore.getState();
    store.land("a");
    const first = useKeeperStore.getState().landed;
    expect(first.stationId).toBe("a");
    store.land("a");
    expect(useKeeperStore.getState().landed).toBe(first);
    store.land("b");
    expect(useKeeperStore.getState().landed.stationId).toBe("b");
  });
});

describe("desk on air", () => {
  const base = { stationName: "Radio One", titles: "sent" as const };
  it("shows a song only when the stream sent one", () => {
    expect(deskOnAir({ ...base, raw: { artist: "Nina Simone", title: "Sinnerman" } })).toEqual({
      kind: "track",
      artist: "Nina Simone",
      title: "Sinnerman",
    });
  });

  it("calls idents, adverts, talk and programmes what they are", () => {
    expect(deskOnAir({ ...base, raw: { title: "Radio One" } }).kind).toBe("ident");
    expect(deskOnAir({ ...base, raw: { title: "Advertisement" } }).kind).toBe("ad");
    expect(deskOnAir({ ...base, raw: { title: "News" } }).kind).toBe("talk");
    expect(deskOnAir({ ...base, raw: { title: "UK Top 40" } })).toEqual({ kind: "programme", line: "UK Top 40" });
  });

  it("waits or stays silent, and never invents a title", () => {
    expect(deskOnAir({ stationName: "X", titles: "waiting", raw: null })).toEqual({ kind: "waiting" });
    expect(deskOnAir({ stationName: "X", titles: "none", raw: null })).toEqual({ kind: "silent" });
    expect(deskOnAir({ stationName: "X", titles: "none", raw: { title: "--" } })).toEqual({ kind: "silent" });
  });
});

describe("desk departures", () => {
  it("lists the next stations with their own local clock, skipping the one on now", () => {
    const now = new Date(Date.UTC(2026, 8, 29, 12, 0));
    const current = station({ uuid: "a", language: "english", tagList: ["pop"] });
    const queue = [
      current,
      station({ uuid: "b", longitude: 135, language: "english", tagList: ["pop"] }),
      station({ uuid: "c", longitude: null }),
      current,
    ];
    const rows = deskDepartures(queue, 0, current, now);
    expect(rows.map((row) => row.station.uuid)).toEqual(["b", "c"]);
    expect(rows[0]!.clock).toBe("21:00");
    expect(rows[0]!.solar).toBe("Night");
    expect(rows[0]!.shared).toEqual(["english", "pop"]);
    expect(rows[1]!.clock).toBeNull();
    expect(deskDepartures([current], 0, current, now)).toEqual([]);
  });
});

describe("desk wiring", () => {
  it("shares one exchange between the sheet and the desk", () => {
    const sheet = read("app/components/keeper/KeeperSheet.tsx");
    const ask = read("app/components/desk/DeskAsk.tsx");
    const counter = read("app/components/keeper/KeeperCounter.tsx");
    // One counter, two skins: the exchange lives in the counter only.
    expect(sheet).toContain("<KeeperCounter");
    expect(ask).toContain("<KeeperCounter");
    expect(counter).toContain("useKeeperTalk(");
    expect(sheet).not.toContain("askKeeper(");
    expect(sheet).not.toContain("ew-keeper-foot");
    expect(sheet).not.toContain("ew-keeper-tab");
  });

  it("keeps copy in the keeper's voice file and marks notebook facts", () => {
    const postcards = read("app/components/desk/DeskPostcards.tsx");
    expect(postcards).toContain("VOICE.notebook");
    const listen = read("app/routes/listen.tsx");
    expect(listen).not.toContain("BoardSheet");
    expect(listen).not.toMatch(/&[a-z]+;/);
    expect(read("app/components/keeper/KeeperFloat.tsx")).toContain('pathname === "/listen"');
  });

  it("keeps model prose off the desk and labels the file as notebook", () => {
    const listen = read("app/routes/listen.tsx");
    expect(listen).toContain("caption={null}");
    expect(listen).not.toContain("deskSigned");
    expect(listen).toMatch(/ew-file-title[\s\S]*VOICE\.notebook[\s\S]*<DeskDossier/);
  });

  it("calls the page the desk in the nav and the dock", () => {
    expect(read("app/components/BandNav.tsx")).toContain('label: "Desk"');
    const dock = read("app/components/PlayerDock.tsx");
    expect(dock).toContain('aria-label="Open the desk"');
    expect(dock).not.toMatch(/>\s*Theater\s*</);
    expect(dock).not.toContain("upNextStore");
  });

  it("leaves out of the desk's moves what the desk already shows", () => {
    expect(read("app/components/desk/DeskAsk.tsx")).toContain('surface="desk"');
    const moves = read("app/components/keeper/keeperMoves.ts");
    expect(moves).toContain('ctx.surface === "desk"');
  });

  it("never clips the keeper: the wide sky grows to its content", () => {
    const css = readAppCss();
    expect(css).toMatch(/\.ew-sky \{ position: sticky; top: 0; height: auto; min-height:/);
  });

  it("stacks the phone desk in flex columns and stills motion when asked", () => {
    const css = readAppCss();
    const desk = css.slice(css.indexOf("/* ---- The desk (/listen)"));
    expect(desk).toMatch(/\.ew-desk-body \{ display: flex; flex-direction: column;/);
    expect(desk).toMatch(/\.ew-desk-col > \* \{ flex: none;/);
    expect(desk).toContain("container: desk / inline-size");
    expect(desk).toMatch(/prefers-reduced-motion: reduce\) \{\s*\.ew-desk \*, \.ew-desk \*::before, \.ew-desk \*::after \{ animation: none !important;/);
    expect(desk).not.toMatch(/box-shadow/);
    // Chips wrap on the desk; nothing scrolls sideways.
    expect(readAppCss()).toMatch(/\.ew-counter-moves \{ display: flex; flex-wrap: wrap;/);
  });
});
