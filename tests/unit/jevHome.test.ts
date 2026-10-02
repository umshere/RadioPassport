import { describe, expect, it } from "vitest";
import { decideHomeAsk } from "~/services/keeper/jev.server";
import { handleKeeperHome } from "~/services/keeper/keeper.server";
import { homeAskFromChoice } from "~/components/home/homeModel";

const env = { TYPESAFE_API_KEY: "k", KEEPER_ASK_ENABLED: "true" } as unknown as NodeJS.ProcessEnv;
const jev = (answers: unknown) =>
  (async () => new Response(JSON.stringify({ answers }), { status: 200 })) as unknown as typeof fetch;
const post = (question: string) =>
  new Request("http://x/api/keeper/home", { method: "POST", body: JSON.stringify({ question }) });

describe("the home ask through Jev", () => {
  it("reads Jev's two answers", async () => {
    const out = await decideHomeAsk("something calm for the evening", {
      env,
      fetchImpl: jev({ choice: { choice: "hour_hop", confidence: 0.9 }, hour: { choice: "Dusk" } }),
    });
    expect(out).toEqual({ choice: "hour_hop", hour: "Dusk", confidence: 0.9 });
  });

  it("returns null without a key, on failure, or on junk", async () => {
    expect(await decideHomeAsk("hi", { env: {} as NodeJS.ProcessEnv })).toBeNull();
    expect(await decideHomeAsk("hi", { env, fetchImpl: (async () => new Response("no", { status: 500 })) as unknown as typeof fetch })).toBeNull();
    expect(await decideHomeAsk("hi", { env, fetchImpl: jev({ choice: { choice: "dance" } }) })).toBeNull();
  });

  it("the route answers rules (so the client falls back) when Jev cannot", async () => {
    const res = await handleKeeperHome(post("hello there"), { env: { KEEPER_ASK_ENABLED: "true" } as unknown as NodeJS.ProcessEnv });
    expect(await res.json()).toEqual({ source: "rules" });
    const dark = await handleKeeperHome(post("hello"), { env: {} as NodeJS.ProcessEnv });
    expect(dark.status).toBe(404);
  });

  it("maps a choice to the same shapes the rules give", () => {
    expect(homeAskFromChoice("free", null, "q")).toMatchObject({ kind: "help" });
    expect(homeAskFromChoice("hour_hop", "Dusk", "q")).toMatchObject({ kind: "hour", hour: "Dusk" });
    expect(homeAskFromChoice("hour_hop", null, "q")).toBeNull();
    expect(homeAskFromChoice("search", null, " jazz ")).toEqual({ kind: "search", query: "jazz" });
  });
});
