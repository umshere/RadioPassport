import {
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";

type SlotStore = {
  get: () => ReactNode;
  getServer: () => null;
  set: (node: ReactNode) => void;
  subscribe: (fn: () => void) => () => void;
};

const SiteSeekStore = createContext<SlotStore | null>(null);

/**
 * Home's intent field lives in the home column. The page owns the handlers;
 * SiteSeekRail owns the slot. TheaterSeek stays a sibling on /listen.
 *
 * Slot, not a DOM portal: Safari will not keep a portaled form inside a
 * sticky flex header — Chrome will. A real child of the rail stays put.
 */
export function SiteSeekProvider({ children }: { children: ReactNode }) {
  const slot = useRef<ReactNode>(null);
  const listeners = useRef(new Set<() => void>());
  const store = useRef<SlotStore>({
    get: () => slot.current,
    getServer: () => null,
    set: (node) => {
      slot.current = node;
      listeners.current.forEach((fn) => fn());
    },
    subscribe: (fn) => {
      listeners.current.add(fn);
      return () => {
        listeners.current.delete(fn);
      };
    },
  }).current;

  return (
    <SiteSeekStore.Provider value={store}>{children}</SiteSeekStore.Provider>
  );
}

export function SiteSeekRail() {
  const store = useContext(SiteSeekStore);
  const subscribe = store?.subscribe ?? noopSubscribe;
  const get = store?.get ?? noopGet;
  const getServer = store?.getServer ?? noopGetServer;
  const children = useSyncExternalStore(subscribe, get, getServer);
  return <div className="ew-theater-rail">{children}</div>;
}

export function SiteSeekPortal({ children }: { children: ReactNode }) {
  const store = useContext(SiteSeekStore);
  const set = store?.set;
  useLayoutEffect(() => {
    set?.(children);
  });
  useLayoutEffect(() => {
    return () => set?.(null);
  }, [set]);
  return null;
}

function noopSubscribe() {
  return () => {};
}

function noopGet(): ReactNode {
  return null;
}

function noopGetServer() {
  return null;
}
