import { describe, expect, it } from "vitest";
import { repairMojibake } from "~/utils/repairMojibake";

describe("repairMojibake", () => {
  it("undoes a double-encoded dash and accents", () => {
    expect(repairMojibake("DJ Baddo â€“ Cheers")).toBe("DJ Baddo – Cheers");
    expect(repairMojibake("CafÃ© del Mar")).toBe("Café del Mar");
  });
  it("leaves clean text and real accents alone", () => {
    expect(repairMojibake("DJ Baddo – Cheers")).toBe("DJ Baddo – Cheers");
    expect(repairMojibake("Beyoncé")).toBe("Beyoncé");
    expect(repairMojibake("Ã")).toBe("Ã");
    expect(repairMojibake("മലയാളം â€“ x")).toBe("മലയാളം â€“ x");
  });
});
