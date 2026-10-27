// Os grupos de arquivo que mais de uma parte do padrão usa, declarados uma vez.

// Arquivos de teste dos projetos: o unitário, com uma forma só de nome, fica ao lado do arquivo que
// testa (é o `include` do `@welt-studio/vitest-config`); o E2E é do Playwright, em `e2e/`.
export const unitTestFiles = ["**/*.test.{ts,tsx}"];
export const testFiles = [...unitTestFiles, "**/e2e/**"];

// Configs de ferramenta (`vite.config.ts`, `vitest.config.ts`, `playwright.config.ts`): estão no
// `tsconfig`, mas rodam no Node, não no app. Ficam fora do que o `framework` liga.
export const toolConfigFiles = ["**/*.config.{ts,mts,cts}"];
