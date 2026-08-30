import { describe, expect, it } from "vitest";
import { create, persist, rehydratePersistedStores } from "~/utils/zustand-lite";

type Room = {
  nowPlaying: { uuid: string; streamUrl: string } | null;
  isPlaying: boolean;
  setStation: (station: { uuid: string; streamUrl: string }) => void;
};

function memoryStorage() {
  const memory = new Map<string, string>();
  return {
    memory,
    storage: {
      getItem: (name: string) => memory.get(name) ?? null,
      setItem: (name: string, value: string) => {
        memory.set(name, value);
      },
      removeItem: (name: string) => {
        memory.delete(name);
      },
    },
  };
}

function makeRoom(name: string, storage: {
  getItem: (name: string) => string | null;
  setItem: (name: string, value: string) => void;
  removeItem: (name: string) => void;
}) {
  return create<Room>(
    persist(
      (set) => ({
        nowPlaying: null,
        isPlaying: false,
        setStation: (station) => set({ nowPlaying: station }),
      }),
      {
        name,
        storage,
        partialize: (state) => ({ nowPlaying: state.nowPlaying }),
      },
    ),
  );
}

describe("persisted player rehydrates after refresh", () => {
  it("restores the last station paused and does not autoplay", () => {
    const { memory, storage } = memoryStorage();
    const kept = { uuid: "kochi-1", streamUrl: "https://stream.example/kochi" };
    memory.set("listen-room", JSON.stringify({ nowPlaying: kept }));
    const useRoom = makeRoom("listen-room", storage);

    expect(useRoom.getState().nowPlaying).toBeNull();
    rehydratePersistedStores();

    expect(useRoom.getState().nowPlaying).toEqual(kept);
    expect(useRoom.getState().isPlaying).toBe(false);
  });

  it("leaves the room empty when nothing was landed", () => {
    const { storage } = memoryStorage();
    const useRoom = makeRoom("listen-room-empty", storage);
    rehydratePersistedStores();
    expect(useRoom.getState().nowPlaying).toBeNull();
    expect(useRoom.getState().isPlaying).toBe(false);
  });
});
