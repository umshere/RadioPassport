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

const CoverSlotStore = createContext<SlotStore | null>(null);

/**
 * The condensed cover strip is owned by home (it carries the arrival, the
 * clock, and the overlay flags) but it docks to the sticky site bar — a
 * hardcoded `top` in viewport pixels drifted off the real header height and
 * left the strip floating over content.
 *
 * Slot, not a DOM portal: same Safari rule as SiteSeekRail — a portaled node
 * will not stay put inside a sticky header. A real child of the bar does.
 */
export function CoverSlotProvider({ children }: { children: ReactNode }) {
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
    <CoverSlotStore.Provider value={store}>
      {children}
    </CoverSlotStore.Provider>
  );
}

export function CoverSlotRail() {
  const store = useContext(CoverSlotStore);
  const subscribe = store?.subscribe ?? noopSubscribe;
  const get = store?.get ?? noopGet;
  const getServer = store?.getServer ?? noopGetServer;
  const children = useSyncExternalStore(subscribe, get, getServer);
  return <>{children}</>;
}

export function CoverSlotPortal({ children }: { children: ReactNode }) {
  const store = useContext(CoverSlotStore);
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
