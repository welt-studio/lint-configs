import type { ViteUserConfig } from "vitest/config";

export interface WeltVitestOptions {
  /** Setup do projeto, rodado depois do setup do padrão. */
  setupFiles?: string[];
}

export function weltVitestConfig(options?: WeltVitestOptions): ViteUserConfig;
