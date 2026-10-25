/**
 * Configuração Vitest padrão da Welt Studio para os frontends.
 *
 * O padrão é um só para todos os projetos. O projeto só declara o que é dele (os aliases de import
 * e, se tiver, o setup próprio), por `mergeConfig`:
 *
 *   import { mergeConfig } from "vitest/config";
 *   import { weltVitestConfig } from "@welt-studio/vitest-config";
 *   import viteConfig from "./vite.config";
 *   export default mergeConfig(weltVitestConfig(), { resolve: viteConfig.resolve });
 *
 * O jsdom e a cobertura vêm deste pacote. O que o teste importa (Testing Library, MSW) o projeto
 * declara, porque o pnpm só deixa importar o que está no `package.json` (e o Knip cobra o mesmo); os
 * `peerDependencies` dizem as versões aceitas.
 */
import { fileURLToPath } from "node:url";

// Piso de cobertura, igual para todos (decisão do PO, 2026-10-25). O do backend é o mesmo número,
// no hook `pytest-base`.
const COVERAGE_FLOOR = 80;

const setupFile = fileURLToPath(new URL("./setup.mjs", import.meta.url));

/**
 * @param {object} [options]
 * @param {string[]} [options.setupFiles] setup do projeto, rodado depois do setup do padrão
 */
export function weltVitestConfig({ setupFiles = [] } = {}) {
  return {
    test: {
      environment: "jsdom",
      // `describe`/`it`/`expect` importados de "vitest": sem import, o `tsc` reprova.
      globals: false,
      // Desde o Node 25 há um `localStorage` do próprio Node, que sem `--localstorage-file` fica
      // `undefined` e cobre o do jsdom, que é o que os testes usam. Desligado nos workers.
      execArgv: ["--no-webstorage"],
      // Teste unitário fica ao lado do arquivo que testa, com uma forma só de nome. E2E é do
      // Playwright, fora daqui.
      include: ["src/**/*.test.{ts,tsx}"],
      setupFiles: [setupFile, ...setupFiles],
      // Ordem aleatória: teste que depende de outro aparece.
      sequence: { shuffle: true },
      coverage: {
        provider: "v8",
        // Todo o código do app conta, inclusive o que nenhum teste importa.
        include: ["src/**/*.{ts,tsx}"],
        thresholds: {
          lines: COVERAGE_FLOOR,
          functions: COVERAGE_FLOOR,
          branches: COVERAGE_FLOOR,
          statements: COVERAGE_FLOOR,
        },
      },
    },
  };
}
