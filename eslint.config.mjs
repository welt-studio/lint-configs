// ESLint do próprio repo, pelo pacote que ele publica: os `.mjs` dos pacotes (configs, setup do
// vitest, o teste do ESLint) sem tipo, e os `.d.ts` com tipo. Sem React e sem framework: aqui não há
// app.
import { weltConfig } from "@welt-studio/eslint-config";

export default weltConfig({
  tsconfigRootDir: import.meta.dirname,
  files: ["**/*.d.ts"],
  untypedFiles: ["**/*.{js,mjs,cjs}"],
  react: false,
  // O fixture do teste do ESLint viola o padrão de propósito: cada arquivo é um caso que deve reprovar.
  ignores: ["eslint/test/fixture/**"],
});
