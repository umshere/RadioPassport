import type { StateCreator, StoreApi } from "./index";

export type PersistStorage<T> = {
  getItem: (name: string) => string | null;
  setItem: (name: string, value: string) => void;
  removeItem?: (name: string) => void;
};

export type PersistOptions<T> = {
  name: string;
  storage?: PersistStorage<T>;
  partialize?: (state: T) => unknown;
};

export function persist<T extends object>(
  initializer: StateCreator<T>,
  options: PersistOptions<T>
): StateCreator<T> {
  return (set, get, api) => {
    const partializedState =
      typeof options.partialize === "function" ? options.partialize(get()) : undefined;
    const allowList =
      partializedState && typeof partializedState === "object"
        ? new Set(Object.keys(partializedState as Record<string, unknown>))
        : undefined;

    const storage = options.storage;

    const setWithPersistence: Parameters<StateCreator<T>>[0] = (partial, replace) => {
      set(partial as any, replace);

      if (!storage) return;

      try {
        const state = get();
        const data = options.partialize ? options.partialize(state) : state;
        storage.setItem(options.name, JSON.stringify(data));
      } catch (error) {
        console.warn("Failed to persist player store", error);
      }
    };

    initializer(setWithPersistence, get, api);

    if (storage) {
      try {
        const raw = storage.getItem(options.name);
        if (raw) {
          const parsed = JSON.parse(raw) as Record<string, unknown>;
          const current = get() as Record<string, unknown>;
          const merged: Record<string, unknown> = { ...current };

          for (const [key, value] of Object.entries(parsed)) {
            if (allowList && !allowList.has(key)) continue;
            if (typeof current[key] === "function") continue;
            merged[key] = value;
          }

          set(() => merged as T, true);
        }
      } catch (error) {
        console.warn("Failed to rehydrate player store", error);
      }
    }

    return get();
  };
}

export function createJSONStorage(getStorage: () => PersistStorage<unknown> | undefined) {
  return {
    getItem: (name: string) => {
      const storage = getStorage();
      if (!storage) return null;
      return storage.getItem(name);
    },
    setItem: (name: string, value: string) => {
      const storage = getStorage();
      storage?.setItem(name, value);
    },
    removeItem: (name: string) => {
      const storage = getStorage();
      storage?.removeItem?.(name);
    },
  } satisfies PersistStorage<unknown>;
}
