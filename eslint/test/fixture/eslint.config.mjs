// Monorepo mínimo para o teste do pacote: um app Vite (`apps/web`) e um pacote (`packages/ui`), sem
// `tsconfig.json` na raiz, que é o caso em que o resolver só com a pasta não achava os aliases.
//
// O teste copia esta pasta para fora do pacote (como um projeto que instala o pacote) e passa o
// endereço do `index.mjs` em `WELT_ESLINT_CONFIG`; aberta no lugar (no editor), usa o do pacote.
const { weltConfig } = await import(
  process.env.WELT_ESLINT_CONFIG ?? new URL("../../index.mjs", import.meta.url).href
);

const tsconfigRootDir = import.meta.dirname;

export default [
  ...weltConfig({
    tsconfigRootDir,
    files: ["apps/web/**/*.{ts,tsx}"],
    untypedFiles: ["apps/web/**/*.{js,mjs}"],
    framework: "vite",
  }),
  ...weltConfig({
    tsconfigRootDir,
    files: ["packages/ui/**/*.{ts,tsx}"],
    untypedFiles: ["packages/ui/**/*.{js,mjs}"],
    react: false,
  }),
];
