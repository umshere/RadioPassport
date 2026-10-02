import { afterEach, describe, expect, it, vi } from "vitest";
import { loader } from "~/routes/admin";

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

  it("is a 404 on the live host with a wrong key or no cookie", async () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("ADMIN_KEY", "sesame-sesame");
    await expect(call("https://elsewheremusic.com/admin")).rejects.toMatchObject({ status: 404 });
    await expect(call("https://elsewheremusic.com/admin?key=nope")).rejects.toMatchObject({ status: 404 });
    await expect(call("https://elsewheremusic.com/admin", { cookie: "ew_admin=forged" })).rejects.toMatchObject({ status: 404 });
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
