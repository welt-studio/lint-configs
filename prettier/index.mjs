// Padrão Prettier da Welt Studio: o mesmo para todos os projetos.
//
// O `package.json` do projeto declara `"prettier": "@welt-studio/prettier-config"` e não tem
// `.prettierrc`. O estilo é o padrão do próprio Prettier (aspas duplas, vírgula no fim em tudo,
// parênteses na arrow function, `lf`); só a largura muda, para a que os projetos já usavam.
// Precisou mudar, muda aqui, para todos, numa tag nova.
//
// O que não se formata fica fora pelo `.gitignore` (o Prettier o lê sozinho) e pelo
// `.prettierignore`, que é a cópia do `prettier/ignore` mantida pelo hook `prettier-base`.

import * as glsl from "prettier-plugin-glsl";

/** @type {import("prettier").Config} */
const config = {
  printWidth: 100,
  // Shader (GLSL): o plugin só ensina o Prettier a ler esses arquivos; em projeto sem shader não
  // faz nada. Vai importado, e não pelo nome: o Prettier procuraria o nome a partir do projeto, e
  // quem tem o plugin como dependência é este pacote.
  plugins: [glsl],
  overrides: [
    {
      files: ["**/*.{glsl,vert,frag}"],
      options: { parser: "glsl-parser" },
    },
  ],
};

export default config;
