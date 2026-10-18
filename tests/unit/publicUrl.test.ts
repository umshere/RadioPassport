import { afterEach, describe, expect, it } from "vitest";
import { fetchPublicUrl, isPublicHttpUrl } from "~/server/http/publicUrl";

const realFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = realFetch;
});

describe("isPublicHttpUrl", () => {
  it("allows public http and https hosts", () => {
    expect(isPublicHttpUrl("https://stream.example.com/live")).toBe(true);
    expect(isPublicHttpUrl("http://radio.example.org:8000/stream")).toBe(true);
    expect(isPublicHttpUrl("https://8.8.8.8/stream")).toBe(true);
    expect(isPublicHttpUrl(new URL("https://example.com"))).toBe(true);
  });

  it("rejects other protocols and credentials", () => {
    expect(isPublicHttpUrl("ftp://example.com/file")).toBe(false);
    expect(isPublicHttpUrl("file:///etc/passwd")).toBe(false);
    expect(isPublicHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isPublicHttpUrl("https://user:pass@example.com/")).toBe(false);
    expect(isPublicHttpUrl("not a url")).toBe(false);
  });

  it("rejects loopback, private and link-local IPv4", () => {
    for (const url of [
      "http://localhost/",
      "http://localhost./",
      "http://app.localhost/",
      "http://127.0.0.1/",
      "http://0.0.0.0/",
      "http://10.0.0.1/",
      "http://100.64.0.1/",
      "http://169.254.169.254/latest/meta-data/",
      "http://172.16.0.1/",
      "http://172.31.255.255/",
      "http://192.168.1.1/",
      "http://198.18.0.1/",
      "http://224.0.0.1/",
    ]) {
      expect(isPublicHttpUrl(url), url).toBe(false);
    }
    expect(isPublicHttpUrl("http://172.32.0.1/")).toBe(true);
  });

  it("rejects loopback, private, link-local and mapped IPv6", () => {
    for (const url of [
      "http://[::1]/",
      "http://[::]/",
      "http://[fc00::1]/",
      "http://[fd12:3456::1]/",
      "http://[fe80::1]/",
      "http://[ff02::1]/",
      "http://[::ffff:127.0.0.1]/",
      "http://[::ffff:10.0.0.1]/",
      "http://[2001:db8::1]/",
    ]) {
      expect(isPublicHttpUrl(url), url).toBe(false);
    }
    expect(isPublicHttpUrl("http://[2606:4700:4700::1111]/")).toBe(true);
  });

  it("rejects internal names and single-label hosts", () => {
    expect(isPublicHttpUrl("http://metadata.google.internal/")).toBe(false);
    expect(isPublicHttpUrl("http://anything.internal/")).toBe(false);
    expect(isPublicHttpUrl("http://printer.local/")).toBe(false);
    expect(isPublicHttpUrl("http://intranet/")).toBe(false);
  });
});

describe("fetchPublicUrl", () => {
  it("re-checks redirects instead of following them blindly", async () => {
    const calls: string[] = [];
    globalThis.fetch = (async (url: unknown) => {
      calls.push(String(url));
      return new Response(null, {
        status: 302,
        headers: { location: "http://169.254.169.254/latest/meta-data/" },
      });
    }) as typeof fetch;

    await expect(fetchPublicUrl("https://example.com/stream")).rejects.toThrow(
      /Blocked URL/
    );
    expect(calls).toEqual(["https://example.com/stream"]);
  });

  it("follows a public redirect", async () => {
    let hops = 0;
    globalThis.fetch = (async () => {
      hops += 1;
      if (hops === 1) {
        return new Response(null, {
          status: 302,
          headers: { location: "https://cdn.example.com/live" },
        });
      }
      return new Response("ok", { status: 200 });
    }) as typeof fetch;

    const response = await fetchPublicUrl("https://example.com/stream");
    expect(response.status).toBe(200);
    expect(hops).toBe(2);
  });
});
