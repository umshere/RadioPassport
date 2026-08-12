import type { SceneDescriptor } from "~/scenes/types";
import type { Station } from "~/types/radio";

/** Update discovery data only; player queue ownership stays with the active session. */
export function applyAiPreviewPool(
  descriptor: SceneDescriptor,
  onStationsResolved: (stations: Station[]) => void
) {
  onStationsResolved(descriptor.stations);
  return descriptor;
}
