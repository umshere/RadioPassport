import { create } from "~/utils/zustand-lite";
import type { ShareableStation } from "~/components/share/shareStation";

/**
 * The one ticket sheet. Any share control (header, desk pass stub, the
 * Keeper's sheet) asks for it here; TicketSheet renders it.
 */
type TicketState = {
  station: ShareableStation | null;
  /** The hour there, as the caller would say it ("9:47 at night" or "21:47"). */
  clock: string | null;
  open: (station: ShareableStation, clock?: string | null) => void;
  close: () => void;
};

export const useTicketStore = create<TicketState>((set) => ({
  station: null,
  clock: null,
  open: (station, clock = null) => set({ station, clock }),
  close: () => set({ station: null, clock: null }),
}));
