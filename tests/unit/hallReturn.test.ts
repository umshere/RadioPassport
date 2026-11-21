import { describe, expect, it } from "vitest";
import {
  hallReturnFromState,
  hallReturnLabel,
  hallReturnLink,
  hallReturnToDesk,
} from "~/utils/hallReturn";

describe("Hall return context", () => {
  it("keeps the filtered Hall destination on Desk navigation", () => {
    const context = {
      search: "?q=malayalam&atlas=1",
      country: "India",
      language: "Malayalam",
      scrollTop: 640,
      overlayScrollTop: 280,
    };
    const state = { hallReturn: context };
    expect(hallReturnFromState(state)).toEqual(context);
    expect(hallReturnLink(state)).toEqual({ pathname: "/", search: context.search });
    expect(hallReturnLabel(state)).toBe("Back to Malayalam stations");
  });

  it("supports browser Back state and direct Desk visits", () => {
    const context = { search: "?hour=Dusk", country: null, language: null, scrollTop: 0, overlayScrollTop: 0 };
    expect(hallReturnFromState({ usr: { hallReturn: context } })).toEqual(context);
    expect(hallReturnLabel(null)).toBe("Back to the Hall");
    expect(hallReturnToDesk()).toMatchObject({ to: "/listen", state: { hallReturn: expect.any(Object) } });
  });
});
