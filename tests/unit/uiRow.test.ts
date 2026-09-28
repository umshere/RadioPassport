import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Row, RowText, rowClass } from "~/components/ui/Row";
import { Eyebrow, eyebrowClass } from "~/components/ui/Eyebrow";

describe("ui Row", () => {
  it("maps each shape to the design-system class and adds state classes", () => {
    expect(rowClass({ variant: "list" })).toBe("rp-station");
    expect(rowClass({ variant: "tile" })).toBe("rp-country");
    expect(rowClass({ active: true, unavailable: true, pending: true, className: "x" })).toBe(
      "rp-station is-active is-unavailable is-pending x",
    );
  });

  it("renders a button row with type=button and a div row without", () => {
    const button = renderToStaticMarkup(
      createElement(Row, { as: "button", variant: "tile", disabled: true }, "Go"),
    );
    expect(button).toContain("<button");
    expect(button).toContain('type="button"');
    expect(button).toContain("rp-country");
    expect(renderToStaticMarkup(createElement(Row, null, "x"))).toMatch(/^<div class="rp-station"/);
  });

  it("puts the list name in the station-name class and the tile name in a truncating strong", () => {
    expect(
      renderToStaticMarkup(createElement(RowText, { title: "RMC", sub: "France" })),
    ).toContain("ew-station-name");
    expect(
      renderToStaticMarkup(createElement(RowText, { variant: "tile", title: "Italy" })),
    ).toContain("truncate");
  });
});

describe("ui Eyebrow", () => {
  it("adds only the tone class and keeps caller classes last", () => {
    expect(eyebrowClass("foil", "mt-3")).toBe("rp-eyebrow text-foil mt-3");
    expect(eyebrowClass()).toBe("rp-eyebrow");
    const html = renderToStaticMarkup(createElement(Eyebrow, { as: "span", tone: "ether" }, "Live"));
    expect(html).toBe('<span class="rp-eyebrow text-ether">Live</span>');
  });
});
