import type { AiProvider, ProviderSceneContext } from "./BaseProvider";
import type { SceneDescriptor } from "~/scenes/types";

export class FallbackProvider implements AiProvider {
  private providers: AiProvider[];

  constructor(providers: AiProvider[]) {
    this.providers = providers;
    if (this.providers.length === 0) {
      throw new Error("FallbackProvider requires at least one provider");
    }
  }

  async getSceneDescriptor(
    prompt: string,
    context?: ProviderSceneContext
  ): Promise<SceneDescriptor> {
    const errors: Error[] = [];

    for (const provider of this.providers) {
      try {
        return await provider.getSceneDescriptor(prompt, context);
      } catch (error) {
        console.warn(
          `Provider ${provider.constructor.name} failed:`,
          error instanceof Error ? error.message : String(error)
        );
        errors.push(error instanceof Error ? error : new Error(String(error)));
      }
    }

    throw new Error(
      `All providers failed. Errors: ${errors.map((e) => e.message).join("; ")}`
    );
  }
}
