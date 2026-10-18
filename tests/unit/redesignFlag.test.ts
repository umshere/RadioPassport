import { describe, expect, it } from "vitest";
import { readRedesignFlag, redesignHeaders } from "~/services/redesign.server";

const req = (url: string, cookie?: string) =>
  new Request(url, { headers: cookie ? { Cookie: cookie } : {} });

describe("redesign preview flag", () => {
  it("is off by default, so the old home and desk stay the default", () => {
    expect(readRedesignFlag(req("https://x.test/")).on).toBe(false);
    expect(readRedesignFlag(req("https://x.test/listen")).setCookie).toBeNull();
  });

  it("?redesign=1 turns it on and sets a cookie that sticks", () => {
    const flag = readRedesignFlag(req("https://x.test/?redesign=1"));
    expect(flag.on).toBe(true);
    expect(flag.setCookie).toContain("ew-redesign=1");
    expect(flag.setCookie).toContain("Path=/");
  });

  it("the cookie keeps it on for pages without the param", () => {
    expect(readRedesignFlag(req("https://x.test/listen", "a=b; ew-redesign=1")).on).toBe(true);
    expect(readRedesignFlag(req("https://x.test/listen", "ew-redesign=0")).on).toBe(false);
  });

  it("?redesign=0 turns it off and clears the cookie, even with the cookie set", () => {
    const flag = readRedesignFlag(req("https://x.test/?redesign=0", "ew-redesign=1"));
    expect(flag.on).toBe(false);
    expect(flag.setCookie).toContain("Max-Age=0");
  });

  it("responses vary on the cookie and carry the Set-Cookie only when it changes", () => {
    const on = redesignHeaders(readRedesignFlag(req("https://x.test/?redesign=1")));
    expect(on.get("Vary")).toBe("Cookie");
    expect(on.get("Set-Cookie")).toContain("ew-redesign=1");
    const plain = redesignHeaders(readRedesignFlag(req("https://x.test/")), { "Cache-Control": "private, no-store" });
    expect(plain.get("Set-Cookie")).toBeNull();
    expect(plain.get("Cache-Control")).toBe("private, no-store");
  });
});
