import { describe, expect, it, vi } from "vitest";
import { buildKeeperFacts, type KeeperFacts } from "~/components/keeper/keeperFacts";
import { askKeeper } from "~/components/keeper/keeperClient";
import { isKeeperAskEnabled } from "~/services/keeper/flag.server";
import {
  classifyKeeperQuestion,
  JEV_URL,
  jevDecide,
  jevRequestBody,
} from "~/services/keeper/jev.server";
import {
  answerIsGrounded,
  clampWords,
  handleKeeperAsk,
  handleKeeperRoute,
  KEEPER_SYSTEM_PROMPT,
} from "~/services/keeper/keeper.server";
import { clientKey, createTokenBucket } from "~/services/keeper/rateLimit.server";
import { EMPTY_ROOM } from "~/state/roomStore";
import type { Station } from "~/types/radio";

const station: Station = {
  uuid: "st-1",
  name: "Radio Alfama",
  url: "https://example.com/a",
  streamUrl: null,
  favicon: "",
  country: "Portugal",
  state: null,
  city: "Lisbon",
  longitude: -9.1,
  language: "portuguese",
  tags: "fado",
  tagList: ["fado"],
  bitrate: 128,
  codec: "MP3",
};

const when = new Date(Date.UTC(2026, 8, 28, 22, 40));
const noTitle = buildKeeperFacts(
  station,
  { signal: { status: "empty", track: null, message: null }, dossier: EMPTY_ROOM.dossier },
  when,
);
const withTitle = buildKeeperFacts(
  station,
  {
    signal: {
      status: "ready",
      track: { raw: "Mariza - Barco Negro", artist: "Mariza", title: "Barco Negro", source: "icy", fetchedAt: "" },
      message: null,
    },
    dossier: EMPTY_ROOM.dossier,
  },
  when,
);

const ON = { KEEPER_ASK_ENABLED: "true" } as unknown as NodeJS.ProcessEnv;
const JEV_KEY = "ts-test-key-not-real";

function post(path: string, body: unknown, ip = "203.0.113.9") {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": `${ip}, 10.0.0.1` },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function jevReply(choice: string, confidence = 0.9) {
  return new Response(
    JSON.stringify({
      model: "jev-1.13.0",
      answers: { intent: { type: "choice", choice, probabilities: {}, confidence } },
      usage: { input_tokens: 10, output_tokens: 2 },
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

const freshBucket = () => createTokenBucket({ capacity: 20, refillPerHour: 20 });

describe("keeper flag", () => {
  it("is off unless KEEPER_ASK_ENABLED says so", () => {
    expect(isKeeperAskEnabled({} as unknown as NodeJS.ProcessEnv)).toBe(false);
    expect(isKeeperAskEnabled({ KEEPER_ASK_ENABLED: "false" } as unknown as NodeJS.ProcessEnv)).toBe(false);
    expect(isKeeperAskEnabled({ KEEPER_ASK_ENABLED: "1" } as unknown as NodeJS.ProcessEnv)).toBe(true);
    expect(isKeeperAskEnabled(ON)).toBe(true);
  });
});

describe("Jev adapter", () => {
  it("speaks the documented System One wire format", async () => {
    const fetchImpl = vi.fn(async () => jevReply("language"));
    const decision = await jevDecide("What language is this?", {
      apiKey: JEV_KEY,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(decision).toEqual({ intent: "language", confidence: 0.9 });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(JEV_URL);
    expect(url).toBe("https://api.typesafe.ai/v1/systemone");
    expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${JEV_KEY}`);
    const body = JSON.parse(String(init.body));
    expect(body.model).toBe("jev-latest");
    expect(body.questions.intent.type).toBe("choice");
    expect(Object.keys(body.questions.intent.criteria).sort()).toEqual(
      ["artist", "city", "hour_hop", "language", "off_topic", "station", "track", "unknown"],
    );
    expect(body.state.question).toBe("What language is this?");
    expect(jevRequestBody("x").model).toBe("jev-latest");
  });

  it("rejects an unknown choice and a failed status", async () => {
    await expect(
      jevDecide("q", { apiKey: JEV_KEY, fetchImpl: (async () => jevReply("weather")) as unknown as typeof fetch }),
    ).rejects.toThrow();
    await expect(
      jevDecide("q", {
        apiKey: JEV_KEY,
        fetchImpl: (async () => new Response("nope", { status: 401 })) as unknown as typeof fetch,
      }),
    ).rejects.toThrow("jev 401");
  });

  it("uses the keyword rules with no key, on failure, and past the 1200ms race", async () => {
    const never = vi.fn();
    expect(await classifyKeeperQuestion("What language is this?", { env: {} as unknown as NodeJS.ProcessEnv, fetchImpl: never as unknown as typeof fetch })).toEqual({
      intent: "language",
      source: "rules",
      confidence: null,
    });
    expect(never).not.toHaveBeenCalled();

    const env = { TYPESAFE_API_KEY: JEV_KEY } as unknown as NodeJS.ProcessEnv;
    const failing = (async () => {
      throw new Error("offline");
    }) as unknown as typeof fetch;
    expect((await classifyKeeperQuestion("who sings this", { env, fetchImpl: failing })).source).toBe("rules");

    const slow = (() => new Promise<Response>((resolve) => setTimeout(() => resolve(jevReply("city")), 200))) as unknown as typeof fetch;
    const raced = await classifyKeeperQuestion("who sings this", { env, fetchImpl: slow, timeoutMs: 20 });
    expect(raced).toEqual({ intent: "artist", source: "rules", confidence: null });

    const quick = (async () => jevReply("city")) as unknown as typeof fetch;
    expect(await classifyKeeperQuestion("is it late there", { env, fetchImpl: quick })).toEqual({
      intent: "city",
      source: "jev",
      confidence: 0.9,
    });
    // A shaky Jev pick yields to a confident rule.
    const shaky = (async () => jevReply("station", 0.2)) as unknown as typeof fetch;
    expect((await classifyKeeperQuestion("what language is this", { env, fetchImpl: shaky })).source).toBe("rules");
  });
});

describe("rate limit", () => {
  it("allows ~20 questions an hour per listener, then refills", () => {
    const bucket = freshBucket();
    const t0 = 1_000_000;
    for (let i = 0; i < 20; i++) expect(bucket.take("a", t0).ok).toBe(true);
    const denied = bucket.take("a", t0);
    expect(denied.ok).toBe(false);
    expect(denied.retryAfterMs).toBeGreaterThan(0);
    expect(bucket.take("b", t0).ok).toBe(true);
    expect(bucket.take("a", t0 + 3 * 60_000 + 1000).ok).toBe(true);
  });

  it("keys on the first forwarded address", () => {
    expect(clientKey(post("/x", {}, "198.51.100.4"))).toBe("198.51.100.4");
    expect(clientKey(new Request("http://localhost/x"))).toBe("anon");
  });

  it("forgets the oldest listener instead of growing without bound", () => {
    const bucket = createTokenBucket({ capacity: 2, refillPerHour: 2, maxKeys: 3 });
    for (const key of ["a", "b", "c", "d"]) bucket.take(key, 0);
    expect(bucket.size()).toBe(3);
  });
});

describe("POST /api/keeper/route", () => {
  it("stays dark with the flag off", async () => {
    const response = await handleKeeperRoute(post("/api/keeper/route", { question: "hi" }), {
      env: {} as unknown as NodeJS.ProcessEnv,
    });
    expect(response.status).toBe(404);
  });

  it("validates method, JSON, and the 200-char cap", async () => {
    const deps = { env: ON, bucket: freshBucket() };
    expect((await handleKeeperRoute(new Request("http://localhost/api/keeper/route"), deps)).status).toBe(405);
    expect((await handleKeeperRoute(post("/api/keeper/route", "{nope"), deps)).status).toBe(400);
    expect((await handleKeeperRoute(post("/api/keeper/route", { question: "   " }), deps)).status).toBe(400);
    const long = await handleKeeperRoute(post("/api/keeper/route", { question: "a".repeat(201) }), deps);
    expect(long.status).toBe(400);
    expect(await long.json()).toEqual({ error: "question_too_long" });
    const huge = await handleKeeperRoute(post("/api/keeper/route", { question: "hi", pad: "x".repeat(9000) }), deps);
    expect(huge.status).toBe(413);
  });

  it("classifies and rate-limits", async () => {
    const deps = { env: ON, bucket: createTokenBucket({ capacity: 1, refillPerHour: 1 }) };
    const first = await handleKeeperRoute(post("/api/keeper/route", { question: "What song is this?" }), deps);
    expect(await first.json()).toEqual({ intent: "track", source: "rules", state: "thinking" });
    const second = await handleKeeperRoute(post("/api/keeper/route", { question: "again" }), deps);
    expect(second.status).toBe(429);
    expect(second.headers.get("Retry-After")).toBeTruthy();
    expect((await second.json()).state).toBe("sleeping");
  });
});

describe("POST /api/keeper/ask", () => {
  it("refuses facts it cannot read", async () => {
    const response = await handleKeeperAsk(
      post("/api/keeper/ask", { question: "hi", facts: { nope: true } }),
      { env: ON, bucket: freshBucket() },
    );
    expect(response.status).toBe(400);
  });

  it("answers fact questions locally, with no model", async () => {
    const complete = vi.fn();
    const response = await handleKeeperAsk(
      post("/api/keeper/ask", { question: "What language is this?", facts: noTitle }),
      { env: ON, bucket: freshBucket(), complete },
    );
    expect(await response.json()).toMatchObject({
      answer: "Radio Alfama lists Portuguese.",
      state: "speaking",
      intent: "language",
    });
    expect(complete).not.toHaveBeenCalled();
  });

  it("never asks a model who the artist is when the station sends no titles", async () => {
    const complete = vi.fn(async () => "It is Amália Rodrigues.");
    const response = await handleKeeperAsk(
      post("/api/keeper/ask", { question: "Who is this artist?", facts: noTitle }),
      { env: ON, bucket: freshBucket(), complete },
    );
    const body = await response.json();
    expect(complete).not.toHaveBeenCalled();
    expect(body.answer).toContain("sends no track titles");
    expect(body.answer).not.toContain("Amália");
  });

  it("returns a hop action for an hour hop", async () => {
    const response = await handleKeeperAsk(
      post("/api/keeper/ask", { question: "take me somewhere it's morning", facts: noTitle }),
      { env: ON, bucket: freshBucket() },
    );
    expect(await response.json()).toMatchObject({ intent: "hour_hop", action: { kind: "hour_hop", hour: "Dawn" } });
  });

  it("grounds model prose in the facts and falls back when it strays", async () => {
    const good = vi.fn(async () => "The station names Mariza on the air right now, singing “Barco Negro”.");
    const ok = await handleKeeperAsk(
      post("/api/keeper/ask", { question: "Who is this artist?", facts: withTitle }),
      { env: ON, bucket: freshBucket(), complete: good },
    );
    const okBody = await ok.json();
    expect(okBody.source).toBe("rules+model");
    expect(okBody.answer).toContain("Mariza");
    const [system, user] = good.mock.calls[0] as unknown as [string, string];
    expect(system).toBe(KEEPER_SYSTEM_PROMPT);
    expect(system).toContain("NEVER invent");
    expect(JSON.parse(user).FACTS.track).toEqual({ artist: "Mariza", title: "Barco Negro" });

    const invented = vi.fn(async () => "Next up is “Lágrimas do Tejo”, a classic.");
    const stray = await handleKeeperAsk(
      post("/api/keeper/ask", { question: "Who is this artist?", facts: withTitle }),
      { env: ON, bucket: freshBucket(), complete: invented },
    );
    expect((await stray.json()).source).toBe("rules+facts");

    const broken = vi.fn(async () => {
      throw new Error("down");
    });
    const down = await handleKeeperAsk(
      post("/api/keeper/ask", { question: "Who is this artist?", facts: withTitle }),
      { env: ON, bucket: freshBucket(), complete: broken },
    );
    expect(await down.json()).toMatchObject({
      answer: "The station says this is Mariza. That’s all it tells me.",
      state: "speaking",
    });
  });

  it("never sends the Jev key anywhere but Jev, and never returns it", async () => {
    const seen: string[] = [];
    const fetchImpl = (async (url: string, init?: RequestInit) => {
      seen.push(`${url} ${JSON.stringify(init?.body ?? "")}`);
      return jevReply("station");
    }) as unknown as typeof fetch;
    const response = await handleKeeperAsk(
      post("/api/keeper/ask", { question: "tell me about the station", facts: noTitle }),
      { env: { ...ON, TYPESAFE_API_KEY: JEV_KEY }, bucket: freshBucket(), fetchImpl },
    );
    const text = await response.text();
    expect(text).not.toContain(JEV_KEY);
    expect(seen.every((line) => !line.includes(JEV_KEY))).toBe(true);
    expect(JSON.parse(text).source).toBe("jev+facts");
  });
});

describe("grounding helpers", () => {
  it("rejects quotes that are not in the facts and song names without a title", () => {
    expect(answerIsGrounded("They sing “Barco Negro”.", withTitle)).toBe(true);
    expect(answerIsGrounded("They sing “Something Else”.", withTitle)).toBe(false);
    expect(answerIsGrounded("This is a song called Saudade.", noTitle as KeeperFacts)).toBe(false);
    expect(clampWords("one two three", 2)).toBe("one two…");
  });
});

describe("sheet client", () => {
  it("races the server and falls back to null on a slow or broken reply", async () => {
    const slow = (() => new Promise<Response>(() => {})) as unknown as typeof fetch;
    expect(await askKeeper("hi", noTitle, slow, 10)).toBeNull();
    const broken = (async () => new Response("<html>", { status: 500 })) as unknown as typeof fetch;
    expect(await askKeeper("hi", noTitle, broken, 100)).toBeNull();
    const good = (async () =>
      new Response(JSON.stringify({ answer: "Yes.", state: "speaking", intent: "city" }))) as unknown as typeof fetch;
    expect(await askKeeper("hi", noTitle, good, 100)).toEqual({
      answer: "Yes.",
      state: "speaking",
      intent: "city",
      basis: "station",
    });
  });
});
