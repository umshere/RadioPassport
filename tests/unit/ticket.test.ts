import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Station } from "~/types/radio";

const lookupStation = vi.fn<[string], Promise<Station | null>>();
vi.mock("~/services/station/lookup.server", async (importOriginal) => {
  const real = await importOriginal<typeof import("~/services/station/lookup.server")>();
  return { ...real, lookupStation: (uuid: string) => lookupStation(uuid) };
});

const root = resolve(__dirname, "../..");
vi.mock("~/services/ticket/ticketAssets.server", async (importOriginal) => {
  const real = await importOriginal<typeof import("~/services/ticket/ticketAssets.server")>();
  // The route fetches these from its own origin; the test reads the same files from disk.
  return {
    ...real,
    loadTicketAssets: async () => ({
      fonts: real.TICKET_FONT_FILES.map(({ file, ...font }) => ({ ...font, data: readFileSync(resolve(root, `public${file}`)) })),
      keeper: real.toDataUri(readFileSync(resolve(root, `public${real.TICKET_KEEPER_FILE}`))),
    }),
  };
});

import { loader as ticketImage } from "~/routes/ticket.$uuid";
import { loader as ticketPage } from "~/routes/t.$uuid";
import { ticketMeta } from "~/components/share/ticketMeta";
import {
  parseTicketFormat,
  ticketFields,
  ticketImagePath,
  ticketLocalHour,
  ticketPagePath,
  ticketParamUuid,
} from "~/components/share/ticketModel";

const UUID = "8a1b2c3d-1111-2222-3333-444455556666";
const mumbai = {
  uuid: UUID,
  name: "Mirchi Love",
  url: "",
  streamUrl: null,
  favicon: "",
  city: "Mumbai",
  state: "Maharashtra",
  country: "India",
  longitude: 72.8,
  language: "hindi,english",
  bitrate: 128,
  codec: "AAC",
  tags: null,
} as Station;

function args(url: string, params: Record<string, string>) {
  return { request: new Request(url), params, context: {} } as never;
}

function pngSize(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

beforeEach(() => {
  lookupStation.mockReset();
});

describe("ticket paths", () => {
  it("names the page and the picture", () => {
    expect(ticketPagePath(UUID)).toBe(`/t/${UUID}`);
    expect(ticketImagePath(UUID)).toBe(`/ticket/${UUID}.png`);
    expect(ticketImagePath(UUID, "story")).toBe(`/ticket/${UUID}.png?format=story`);
    expect(ticketParamUuid(`${UUID}.png`)).toBe(UUID);
    expect(parseTicketFormat("story")).toBe("story");
    expect(parseTicketFormat("<script>")).toBe("card");
  });
});

describe("the hour on the ticket", () => {
  const now = new Date("2026-09-29T16:30:00Z");
  it("is the clock at the station's longitude, with the sun's word", () => {
    expect(ticketLocalHour(72.8, now)).toEqual({ clock: "21:30", word: "night" });
    expect(ticketLocalHour(-0.1, now)).toEqual({ clock: "16:30", word: "midday" });
  });
  it("is left off when the station has not said where it is", () => {
    expect(ticketLocalHour(null, now)).toBeNull();
    expect(ticketLocalHour(undefined, now)).toBeNull();
    expect(ticketFields({ ...mumbai, longitude: null }, now).local).toBeNull();
  });
  it("prints only what the record holds", () => {
    const fields = ticketFields(mumbai, now);
    expect(fields).toMatchObject({
      place: "Mumbai",
      country: "India",
      spoken: "Hindi, English",
      signal: "128K AAC",
      serial: "Nº 8A1B2C3D",
      postmarkDay: "29 SEP",
      postmarkYear: "2026",
    });
    const bare = ticketFields({ ...mumbai, language: null, bitrate: 0, codec: null }, now);
    expect(bare.spoken).toBeNull();
    expect(bare.signal).toBeNull();
  });
});

describe("GET /ticket/<uuid>.png", () => {
  it("sends anything that is not a station id to the house still", async () => {
    const res = await ticketImage(args("http://x/ticket/..%2Fetc.png", { uuid: "../etc.png" }));
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe("/elsewhere-og.jpg");
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(lookupStation).not.toHaveBeenCalled();
  });
  it("sends an unknown station to the house still", async () => {
    lookupStation.mockResolvedValue(null);
    const res = await ticketImage(args(`http://x/ticket/${UUID}.png`, { uuid: `${UUID}.png` }));
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe("/elsewhere-og.jpg");
  });
  it("prints a 1200×630 PNG, and a 1080×1350 story", async () => {
    lookupStation.mockResolvedValue(mumbai);
    for (const [query, size] of [
      ["", { width: 1200, height: 630 }],
      ["?format=story", { width: 1080, height: 1350 }],
    ] as const) {
      const res = await ticketImage(args(`http://x/ticket/${UUID}.png${query}`, { uuid: `${UUID}.png` }));
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("image/png");
      expect(res.headers.get("Cache-Control")).toContain("s-maxage");
      const bytes = new Uint8Array(await res.arrayBuffer());
      expect(Array.from(bytes.slice(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
      expect(pngSize(bytes)).toEqual(size);
    }
    expect(lookupStation).toHaveBeenCalledWith(UUID);
  }, 30_000);
});

describe("GET /t/<uuid>", () => {
  it("sends a bad id home", async () => {
    await expect(ticketPage(args("http://x/t/nope", { uuid: "nope" }))).rejects.toMatchObject({ status: 302 });
  });
  it("carries the station for the link preview", async () => {
    lookupStation.mockResolvedValue(mumbai);
    const res = await ticketPage(args(`https://elsewheremusic.com/t/${UUID}`, { uuid: UUID }));
    const data = await res.json();
    expect(data).toMatchObject({ uuid: UUID, origin: "https://elsewheremusic.com", station: { name: "Mirchi Love", city: "Mumbai" } });
  });
});

describe("ticket link preview", () => {
  const tags = ticketMeta({ origin: "https://elsewheremusic.com", uuid: UUID, station: mumbai });
  const find = (key: string) =>
    tags.find((tag) => ("property" in tag && tag.property === key) || ("name" in tag && tag.name === key)) as
      | { content: string }
      | undefined;
  it("names the station and the place, in the keeper's voice", () => {
    expect(find("og:title")?.content).toBe("Mirchi Love · Mumbai");
    expect(find("og:description")?.content).toBe("Come and land in Mumbai with me. Mirchi Love, live on Elsewhere.");
    expect(find("og:url")?.content).toBe(`https://elsewheremusic.com/t/${UUID}`);
  });
  it("shows the ticket as a large card", () => {
    expect(find("og:image")?.content).toBe(`https://elsewheremusic.com/ticket/${UUID}.png`);
    expect(find("og:image:width")?.content).toBe("1200");
    expect(find("og:image:height")?.content).toBe("630");
    expect(find("twitter:card")?.content).toBe("summary_large_image");
    expect(find("twitter:image")?.content).toBe(`https://elsewheremusic.com/ticket/${UUID}.png`);
  });
  it("never claims anything is on air", () => {
    expect(JSON.stringify(tags)).not.toMatch(/now playing|right now|on air/i);
  });
  it("falls back to the house card for an unknown station", () => {
    const fallback = ticketMeta({ origin: "https://elsewheremusic.com", uuid: UUID, station: null });
    expect(JSON.stringify(fallback)).toContain("/elsewhere-og.jpg");
  });
  it("the root steps its house card aside for a page with its own", () => {
    const rootSource = readFileSync(resolve(root, "app/root.tsx"), "utf8");
    expect(rootSource).toMatch(/socialCard/);
    const page = readFileSync(resolve(root, "app/routes/t.$uuid.tsx"), "utf8");
    expect(page).toMatch(/handle = \{ socialCard: true \}/);
  });
});

describe("ticket sheet", () => {
  const css = readFileSync(resolve(root, "app/styles/12-share.css"), "utf8");
  const sheet = readFileSync(resolve(root, "app/components/share/TicketSheet.tsx"), "utf8");
  it("is square and uses flex columns, with 44–48px controls", () => {
    const ticketCss = css.slice(css.indexOf("the ticket sheet"));
    for (const match of ticketCss.matchAll(/border-radius:\s*([^;]+);/g)) expect(match[1]).toBe("0");
    expect(ticketCss).not.toMatch(/display:\s*grid/);
    expect(ticketCss).toMatch(/\.ew-ticket-send \{[^}]*min-height: 48px/);
    expect(ticketCss).toMatch(/\.ew-ticket-act \{[^}]*min-height: 44px/);
    expect(ticketCss).toMatch(/prefers-reduced-motion/);
  });
  it("is a labelled modal dialog that closes on Escape and keeps focus inside", () => {
    expect(sheet).toMatch(/role="dialog"/);
    expect(sheet).toMatch(/aria-modal="true"/);
    expect(sheet).toMatch(/aria-labelledby/);
    expect(sheet).toMatch(/"Escape"/);
    expect(sheet).toMatch(/"Tab"/);
    expect(sheet).toMatch(/role="status"/);
  });
});

describe("where the ticket goes", () => {
  it("names the city, else the region the directory gives, else the country", async () => {
    const { ticketPlace } = await import("~/components/share/ticketModel");
    expect(ticketPlace({ city: "Mumbai", state: "Maharashtra", country: "India" })).toBe("Mumbai");
    expect(ticketPlace({ city: null, state: "Lagos", country: "Nigeria" })).toBe("Lagos");
    expect(ticketPlace({ city: null, state: null, country: "Nigeria" })).toBe("Nigeria");
    expect(ticketPlace({ city: null, state: null, country: "" })).toBe("somewhere else");
  });
});
