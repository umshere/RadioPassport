import { useEffect, useState } from "react";
import type { SceneDescriptor } from "~/scenes/types";
import { sceneManager } from "~/services/sceneManager";

export function useSceneDescriptor() {
  const [descriptor, setDescriptor] = useState<SceneDescriptor | null>(
    () => sceneManager.getDescriptor()
  );

  useEffect(() => sceneManager.subscribe(setDescriptor), []);

  return descriptor;
}
