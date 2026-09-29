import { describe, expect, it, vi } from "vitest";
import { shareCopy, shareStation, tuneLink, TUNE_PARAM } from "~/components/share/shareStation";
import { loader } from "~/routes/api.station";

const station = { uuid: "8a1b2c3d-1111-2222-3333-444455556666", name: "Mirchi Love", city: "Mumbai", country: "India" };

describe("share a station", () => {
  it("builds a link that lands on the station", () => {
    expect(tuneLink(station)).toBe(`https://elsewheremusic.com/?${TUNE_PARAM}=8a1b2c3d-1111-2222-3333-444455556666`);
  });
  it("writes a human line, with the hour there when known", () => {
    expect(shareCopy(station, "9:47 at night").text).toBe("It’s 9:47 at night in Mumbai right now. Listen live with me.");
    expect(shareCopy(station).text).toBe("Listen live with me: Mirchi Love, Mumbai.");
  });
  it("falls back to copying the link when there is no share sheet", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    vi.stubGlobal("window", { location: { origin: "https://elsewheremusic.com" } });
    expect(await shareStation(station)).toBe("copied");
    expect(writeText.mock.calls[0]![0]).toContain("?tune=8a1b2c3d");
    vi.unstubAllGlobals();
  });
});

describe("/api/station", () => {
  it("refuses anything that is not a directory id", async () => {
    const res = await loader({ request: new Request("http://x/api/station?uuid=../../etc"), params: {}, context: {} } as never);
    expect(res.status).toBe(400);
  });
});
