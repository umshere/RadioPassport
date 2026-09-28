import { useEffect } from "react";
import { useKeeperStore } from "~/state/keeperStore";
import { preloadKeeperSprites } from "./Keeper";
import { KeeperFloat } from "./KeeperFloat";
import { KeeperSheet } from "./KeeperSheet";
import { useKeeperDelight, useKeeperView } from "./useKeeper";

/**
 * The keeper, mounted once at the root beside the dock: the floating figure
 * and its sheet. It reads the Room; it never writes to it and never touches
 * playback, so the audio path cannot wait on it.
 */
export function KeeperHost() {
  useKeeperDelight();
  useEffect(preloadKeeperSprites, []);
  const view = useKeeperView();
  const closeSheet = useKeeperStore((state) => state.closeSheet);

  // No station, no desk: a sheet left open when the dial empties closes.
  useEffect(() => {
    if (!view.hasStation && view.sheetOpen) closeSheet();
  }, [closeSheet, view.hasStation, view.sheetOpen]);

  return (
    <>
      <KeeperFloat view={view} />
      {view.sheetOpen && view.facts ? (
        <KeeperSheet view={{ ...view, facts: view.facts }} />
      ) : null}
    </>
  );
}
