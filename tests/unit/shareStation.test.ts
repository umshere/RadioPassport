import { afterEach, describe, expect, it, vi } from "vitest";
import {
  copyTicketLink,
  sendTicket,
  shareCopy,
  shareStation,
  tuneLandingPath,
  tuneLink,
  TUNE_PARAM,
} from "~/components/share/shareStation";
import { useTicketStore } from "~/state/ticketStore";
import { loader } from "~/routes/api.station";

const station = { uuid: "8a1b2c3d-1111-2222-3333-444455556666", name: "Mirchi Love", city: "Mumbai", country: "India" };

afterEach(() => {
  vi.unstubAllGlobals();
  useTicketStore.getState().close();
});

describe("share a station", () => {
  it("links to the station's ticket page", () => {
    expect(tuneLink(station)).toBe("https://elsewheremusic.com/t/8a1b2c3d-1111-2222-3333-444455556666");
    expect(tuneLink(station, "http://localhost:5183")).toBe("http://localhost:5183/t/8a1b2c3d-1111-2222-3333-444455556666");
  });
  it("hands the ticket page on to the old ?tune= arrival, which keeps working", () => {
    expect(tuneLandingPath(station.uuid)).toBe(`/?${TUNE_PARAM}=8a1b2c3d-1111-2222-3333-444455556666`);
    expect(tuneLandingPath(station.uuid, "ticket")).toBe(`/?${TUNE_PARAM}=8a1b2c3d-1111-2222-3333-444455556666&from=ticket`);
  });
  it("writes a human line, with the hour there when known", () => {
    expect(shareCopy(station, "9:47 at night").text).toBe("It’s 9:47 at night in Mumbai right now. Come and land here with me.");
    expect(shareCopy(station).text).toBe("Come and land in Mumbai with me.");
  });
  it("opens the ticket sheet rather than firing the share sheet", async () => {
    const share = vi.fn();
    vi.stubGlobal("navigator", { share });
    expect(await shareStation(station, "21:47")).toBe("opened");
    expect(share).not.toHaveBeenCalled();
    expect(useTicketStore.getState().station?.uuid).toBe(station.uuid);
    expect(useTicketStore.getState().clock).toBe("21:47");
  });
});

describe("send the ticket", () => {
  const file = { name: "elsewhere-ticket-mumbai.png", type: "image/png" } as unknown as File;

  it("attaches the ticket picture where the phone can share files, link in the text", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { share, canShare: () => true });
    vi.stubGlobal("window", { location: { origin: "https://elsewheremusic.com" } });
    expect(await sendTicket(station, null, file)).toBe("shared");
    const payload = share.mock.calls[0]![0];
    expect(payload.files).toEqual([file]);
    expect(payload.text).toContain("/t/8a1b2c3d-1111-2222-3333-444455556666");
  });
  it("shares the link when files are not welcome", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { share, canShare: () => false });
    vi.stubGlobal("window", { location: { origin: "https://elsewheremusic.com" } });
    expect(await sendTicket(station, null, file)).toBe("shared");
    expect(share.mock.calls[0]![0]).toMatchObject({ url: "https://elsewheremusic.com/t/8a1b2c3d-1111-2222-3333-444455556666" });
  });
  it("says nothing when the listener closes the share sheet", async () => {
    const share = vi.fn().mockRejectedValue(new DOMException("closed", "AbortError"));
    vi.stubGlobal("navigator", { share });
    expect(await sendTicket(station)).toBe("cancelled");
  });
  it("falls back to copying the link when there is no share sheet", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    vi.stubGlobal("window", { location: { origin: "https://elsewheremusic.com" } });
    expect(await sendTicket(station)).toBe("copied");
    expect(writeText.mock.calls[0]![0]).toContain("/t/8a1b2c3d");
    expect(writeText.mock.calls[0]![0]).toContain("Come and land in Mumbai");
  });
  it("Copy link copies the link alone", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    vi.stubGlobal("window", { location: { origin: "https://elsewheremusic.com" } });
    expect(await copyTicketLink(station)).toBe("copied");
    expect(writeText).toHaveBeenCalledWith("https://elsewheremusic.com/t/8a1b2c3d-1111-2222-3333-444455556666");
  });
});

describe("/api/station", () => {
  it("refuses anything that is not a directory id", async () => {
    const res = await loader({ request: new Request("http://x/api/station?uuid=../../etc"), params: {}, context: {} } as never);
    expect(res.status).toBe(400);
  });
});
