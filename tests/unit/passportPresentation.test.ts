import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PassportOverlay } from "~/components/radio-passport/Overlays";
import type { PassportStamp } from "~/state/journeyStore";

const stamp: PassportStamp = {
  id: "review", stationId: "review", stationName: "Review fixture",
  city: "Kochi", country: "India", countryCode: "IN", language: "Malayalam",
  telemetry: "128K AAC", stampedAt: 1750000000000,
};
function render(count: number) {
  return renderToStaticMarkup(createElement(PassportOverlay, {
    stamps: Array.from({ length: count }, (_, i) => ({ ...stamp, id: `review-${i}` })),
    playedCount: count, memberSince: stamp.stampedAt,
    close: () => {}, onReplay: () => {}, onFindCity: () => {},
  }));
}
describe("Passport rendered presentation contracts", () => {
  it.each([0, 1, 2, 5, 6, 8])("renders the actual six-position contract at %i stamps", (count) => {
    const html = render(count);
    expect(html.match(/class="rp-stamp rp-stamp-empty"/g) ?? []).toHaveLength(Math.max(0, 6 - count));
    expect(html.match(/aria-label="Replay Kochi, India"/g) ?? []).toHaveLength(count);
  });
  it("keeps the blank-page explanation and existing CTA", () => {
    const html = render(0);
    expect(html).toContain("The first page is blank.");
    expect(html).toContain("Find a city");
    expect(html).not.toContain("You stayed.");
  });
  it("exposes the four stats as list items and labels stamp replay", () => {
    const html = render(1);
    expect(html).toContain('role="list" aria-label="Lands on record"');
    expect(html.match(/role="listitem"/g)).toHaveLength(4);
    expect(html).toContain('aria-label="Replay Kochi, India"');
    expect(html).toContain("Land again");
    expect(html).toContain("You stayed.");
  });
});
