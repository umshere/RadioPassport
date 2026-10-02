import { afterEach, describe, expect, it, vi } from "vitest";
import { action, loader } from "~/routes/admin";

const call = (url: string, headers: Record<string, string> = {}) =>
  loader({ request: new Request(url, { headers }), params: {}, context: {} } as never);

describe("/admin access", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is a 404 on the live host with no key set", async () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("ADMIN_KEY", "");
    await expect(call("https://elsewheremusic.com/admin")).rejects.toMatchObject({ status: 404 });
  });

  it("asks for the code, and shows nothing else, without the cookie", async () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("ADMIN_KEY", "sesame-sesame");
    for (const [url, headers] of [
      ["https://elsewheremusic.com/admin", {}],
      ["https://elsewheremusic.com/admin?key=nope", {}],
      ["https://elsewheremusic.com/admin", { cookie: "ew_admin=forged" }],
    ] as const) {
      const res = (await call(url, headers)) as Response;
      expect(await res.json()).toEqual({ locked: true });
    }
  });

  it("takes the typed code, sets the cookie, and blocks after six wrong tries", async () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("ADMIN_KEY", "sesame-sesame");
    const post = (code: string, ip: string) => {
      const body = new URLSearchParams({ intent: "unlock", code });
      return action({
        request: new Request("https://elsewheremusic.com/admin", {
          method: "POST",
          body,
          headers: { "x-forwarded-for": ip },
        }),
        params: {},
        context: {},
      } as never) as Promise<Response>;
    };
    const ok = await post("sesame-sesame", "9.9.9.9");
    expect(ok.status).toBe(302);
    expect(ok.headers.get("set-cookie")).toMatch(/HttpOnly/);
    for (let i = 0; i < 6; i++) expect((await post("wrong", "8.8.8.8")).status).toBe(401);
    expect((await post("sesame-sesame", "8.8.8.8")).status).toBe(429);
    expect((await post("sesame-sesame", "7.7.7.7")).status).toBe(302);
  });

  it("trades the right key for a scoped httpOnly cookie, then lets that cookie in", async () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("ADMIN_KEY", "sesame-sesame");
    const res = (await call("https://elsewheremusic.com/admin?key=sesame-sesame")) as Response;
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/admin");
    const set = res.headers.get("set-cookie") ?? "";
    expect(set).toMatch(/HttpOnly/);
    expect(set).toMatch(/Path=\/admin/);
    expect(set).not.toContain("sesame-sesame");
    const cookie = set.split(";")[0]!;
    const page = (await call("https://elsewheremusic.com/admin", { cookie })) as Response;
    expect(page.status).toBe(200);
  });
});
