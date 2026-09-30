import { create } from "~/utils/zustand-lite";

/**
 * True while a friend's link is being read or its card is on screen. The
 * home's first-visit "How it works" waits for it: the friend's card is the
 * first thing that visitor should read, and it tells them what to do.
 */
type FriendState = {
  pending: boolean;
  setPending: (pending: boolean) => void;
};

export const useFriendStore = create<FriendState>((set) => ({
  pending: false,
  setPending: (pending) => set({ pending }),
}));
