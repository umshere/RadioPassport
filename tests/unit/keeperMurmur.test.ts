import { describe, expect, it } from "vitest";
import { buildKeeperFacts } from "~/components/keeper/keeperFacts";
import {
  hourOffsetFromListener,
  localMurmur,
  planMurmurs,
} from "~/components/keeper/keeperMurmur";
import { handleKeeperFact } from "~/services/keeper/keeperFact.server";
import { createTokenBucket } from "~/services/keeper/rateLimit.server";
import { EMPTY_ROOM } from "~/state/roomStore";
import type { Station } from "~/types/radio";

const station: Station = {
  uuid: "s", name: "GoRadio", url: "https://e.com/a", streamUrl: null, favicon: "",
  country: "Nigeria", state: null, city: "Lagos", longitude: 3.4, language: "english,yoruba",
  tags: "afrobeats", tagList: ["afrobeats"], bitrate: 192, codec: "MP3",
};
const when = new Date(Date.UTC(2026, 8, 29, 1, 50));
const facts = buildKeeperFacts(station, { signal: { status: "empty", track: null, message: null }, dossier: EMPTY_ROOM.dossier }, when);

describe("keeper murmurs", () => {
  it("plans local lines and fact steps in turn, with no artist step until a title exists", () => {
    const steps = planMurmurs(facts);
    expect(steps[0]).toEqual({ type: "local", id: "hour" });
    expect(steps.some((s) => s.type === "fact" && s.kind === "place" && s.name === "Lagos")).toBe(true);
    expect(steps.some((s) => s.type === "fact" && s.kind === "country")).toBe(true);
    expect(steps.some((s) => s.type === "fact" && s.kind === "language" && s.name === "English")).toBe(true);
    expect(steps.some((s) => s.type === "fact" && s.kind === "genre")).toBe(true);
    expect(steps.some((s) => s.type === "fact" && s.kind === "artist")).toBe(false);
  });

  it("local lines are built from the record and the clocks", () => {
    expect(localMurmur({ type: "local", id: "hour" }, facts, { listenerHour: 9, minutesHere: 0 })).toMatch(/in Lagos/);
    // The station's local hour is 1; a listener at 23 is 2 hours behind it.
    expect(facts.hour!.localHour).toBe(1);
    expect(hourOffsetFromListener(facts, 23)).toBe(2);
    expect(localMurmur({ type: "local", id: "offset" }, facts, { listenerHour: facts.hour!.localHour, minutesHere: 0 })).toMatch(/keeps your hour/);
    expect(localMurmur({ type: "local", id: "stay" }, facts, { listenerHour: 9, minutesHere: 12 })).toMatch(/12 minutes in Lagos/);
  });

  it("a station with no coordinates gets no hour lines", () => {
    const bare = buildKeeperFacts({ ...station, longitude: null }, null, when);
    expect(localMurmur({ type: "local", id: "hour" }, bare, { listenerHour: 9, minutesHere: 0 })).toBeNull();
    expect(planMurmurs(bare).some((s) => s.type === "local" && s.id === "hour")).toBe(false);
  });
});

const ON = { KEEPER_ASK_ENABLED: "true" } as unknown as NodeJS.ProcessEnv;
const wiki = (async (url: string) => {
  const u = String(url);
  if (u.includes("list=search")) return new Response(JSON.stringify({ query: { search: [{ title: "Lagos" }] } }));
  if (u.includes("page/summary")) {
    return new Response(JSON.stringify({ type: "standard", extract: "Lagos is a port city in Nigeria. It was the capital until 1991." }));
  }
  return new Response("{}", { status: 404 });
}) as unknown as typeof fetch;

function fact(body: unknown, deps: Parameters<typeof handleKeeperFact>[1]) {
  return handleKeeperFact(
    new Request("http://localhost/api/keeper/fact", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "203.0.113.9" },
      body: JSON.stringify(body),
    }),
    { env: ON, bucket: createTokenBucket({ capacity: 50, refillPerHour: 50 }), ...deps },
  ).then((r) => r.json() as Promise<Record<string, unknown>>);
}

describe("keeper fact route", () => {
  it("returns the model's surprising line when it is grounded in the snippet", async () => {
    const out = await fact({ kind: "place", name: "Lagos" }, {
      fetchImpl: wiki,
      complete: async () => "Lagos was Nigeria’s capital until 1991.",
    });
    expect(out.fact).toBe("Lagos was Nigeria’s capital until 1991.");
    expect(out.source).toBe("snippet+model");
  });

  it("falls back to the snippet's first sentence when the model invents a number", async () => {
    const out = await fact({ kind: "place", name: "Lagos2" }, {
      fetchImpl: wiki,
      complete: async () => "Lagos has 40 million people and 300 islands.",
    });
    expect(out.source).toBe("snippet");
    expect(out.fact).toBe("Lagos is a port city in Nigeria.");
  });

  it("refuses bad kinds and stays dark when the flag is off", async () => {
    expect((await fact({ kind: "weather", name: "Lagos" }, { fetchImpl: wiki })).error).toBe("bad_request");
    const off = await handleKeeperFact(
      new Request("http://localhost/api/keeper/fact", { method: "POST", body: "{}" }),
      { env: {} as NodeJS.ProcessEnv },
    );
    expect(off.status).toBe(404);
  });
});
