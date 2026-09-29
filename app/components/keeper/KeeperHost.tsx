import { useEffect } from "react";
import { useKeeperStore } from "~/state/keeperStore";
import { usePlayerStore } from "~/state/playerStore";
import { preloadKeeperSprites } from "./Keeper";
import { KeeperFloat } from "./KeeperFloat";
import { KeeperSheet, useKeeperAskEnabled } from "./KeeperSheet";
import { useKeeperMurmurs } from "./useKeeperMurmurs";
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
  useKeeperMurmurs(view, useKeeperAskEnabled());
  const closeSheet = useKeeperStore((state) => state.closeSheet);
  const land = useKeeperStore((state) => state.land);
  const stationId = usePlayerStore((state) => state.nowPlaying?.uuid ?? null);

  // Note when each station was first heard, so the desk can say how long
  // you have been aboard.
  useEffect(() => {
    land(stationId);
  }, [land, stationId]);

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
