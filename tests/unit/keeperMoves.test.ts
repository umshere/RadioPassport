import { describe, expect, it } from "vitest";
import { keeperMoves, type MoveContext } from "~/components/keeper/keeperMoves";
import type { KeeperFacts } from "~/components/keeper/keeperFacts";

const facts = (over: Partial<KeeperFacts> = {}): KeeperFacts =>
  ({
    station: { name: "Mohanlal hits", country: "India", language: "malayalam", bitrate: 128, codec: "mp3", tags: [] },
    city: "Kerala",
    hour: { clock: "23:17", localHour: 23, solar: "Night" },
    titles: "none",
    track: null,
    dossier: null,
    ...over,
  }) as KeeperFacts;

const ctx = (over: Partial<MoveContext> = {}): MoveContext => ({
  facts: facts(),
  askEnabled: true,
  offline: false,
  subject: "Mohanlal",
  topics: ["Kerala", "India", "Malayalam"],
  hasSimilar: true,
  canShare: true,
  hushed: false,
  surface: "sheet",
  last: null,
  asked: new Set(),
  ...over,
});

const ids = (c: MoveContext) => keeperMoves(c).map((m) => m.id);

describe("keeperMoves", () => {
  it("never offers more than three", () => {
    expect(keeperMoves(ctx()).length).toBeLessThanOrEqual(3);
    expect(keeperMoves(ctx({ last: { role: "topic", topic: "Kerala" } })).length).toBeLessThanOrEqual(3);
  });

  it("leads with the person a station is named for", () => {
    expect(ids(ctx())[0]).toBe("subject");
    expect(keeperMoves(ctx())[0]!.label).toBe("Tell me about Mohanlal");
  });

  it("offers the artist only when one was sent, and 'What’s playing?' only when titles come", () => {
    const sent = facts({ titles: "sent", track: { artist: "Yesudas", title: "Song" } });
    expect(ids(ctx({ facts: sent, subject: null }))).toContain("artist");
    expect(ids(ctx({ subject: null, topics: [] }))).not.toContain("artist");
    expect(ids(ctx({ subject: null, topics: [], facts: facts({ titles: "waiting" }) }))).toContain("playing");
    expect(ids(ctx({ subject: null, topics: [], facts: facts({ titles: "none" }) }))).not.toContain("playing");
  });

  it("after a person's story offers their facts first, then the place", () => {
    const moves = keeperMoves(ctx({ last: { role: "subject", topic: "Mohanlal" }, asked: new Set(["subject"]) }));
    expect(moves[0]!.id).toMatch(/^facts:/);
    expect(moves[0]!.label).toBe("A few facts about Mohanlal");
    expect(moves.map((m) => m.id)).toContain("topic:kerala");
  });

  it("drops a move once used, and the facts move once the facts are shown", () => {
    const moves = ids(ctx({ last: { role: "facts", topic: "Mohanlal" }, asked: new Set(["subject", "topic:kerala"]) }));
    expect(moves.some((id) => id.startsWith("facts:"))).toBe(false);
    expect(moves).not.toContain("topic:kerala");
    expect(moves[0]).toBe("topic:india");
  });

  it("offers only what works with the notebook shut or unreachable", () => {
    const shut = keeperMoves(ctx({ askEnabled: false }));
    expect(shut.every((m) => m.role !== "subject" && m.role !== "topic" && m.role !== "facts")).toBe(true);
    const offline = keeperMoves(ctx({ offline: true, last: { role: "station" } }));
    expect(offline.every((m) => m.role !== "subject" && m.role !== "topic" && m.role !== "facts")).toBe(true);
  });

  it("leaves out what the desk already shows", () => {
    const moves = ids(ctx({ surface: "desk", subject: null, topics: [], facts: facts({ titles: "sent", track: { artist: "A", title: "T" } }) }));
    expect(moves).not.toContain("playing");
    expect(moves).not.toContain("station");
    expect(moves).not.toContain("similar");
  });

  it("offers 'Quiet, please' only when opened from a murmur or already hushed", () => {
    expect(ids(ctx())).not.toContain("hush");
    const fromMurmur = keeperMoves(ctx({ last: { role: "murmur", topic: "Kerala" } }));
    expect(fromMurmur.map((m) => m.id)).toContain("hush");
    expect(fromMurmur.find((m) => m.id === "hush")!.label).toBe("Quiet, please");
    expect(keeperMoves(ctx({ hushed: true, last: { role: "hush" } })).find((m) => m.id === "hush")!.label).toBe("Speak up again");
  });

  it("after a dead end points at the place, similar stations and an hour hop", () => {
    const moves = ids(ctx({ subject: null, last: { role: "deadend" } }));
    expect(moves).toEqual(["topic:kerala", "similar", "hop"]);
  });
});
