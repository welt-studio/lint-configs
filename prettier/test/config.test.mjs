// Teste do pacote: a config carrega e formata como o padrão diz, inclusive shader pelo plugin de
// GLSL que vem no pacote. Roda com `pnpm test` na raiz.
import assert from "node:assert/strict";
import { test } from "node:test";

import { format } from "prettier";

import config from "../index.mjs";

test("TypeScript sai no estilo do padrão, com largura 100", async () => {
  const long = `const value = { first: "aaaaaaaaaa", second: 'bbbbbbbbbb', third: "cccccccccc", fourth: 1 };`;
  const output = await format(long, { ...config, filepath: "src/value.ts" });
  // Até 100 colunas cabe numa linha (com 80, quebraria); aspas duplas, `;` no fim.
  assert.equal(
    output,
    `const value = { first: "aaaaaaaaaa", second: "bbbbbbbbbb", third: "cccccccccc", fourth: 1 };\n`,
  );
});

test("shader (GLSL) é formatado pelo plugin do pacote", async () => {
  const shader = "void main(){gl_FragColor=vec4(1.0,0.0,0.0,1.0);}\n";
  const output = await format(shader, { ...config, filepath: "shaders/red.frag" });
  assert.notEqual(output, shader);
  assert.match(output, /gl_FragColor = vec4\(1\.0, 0\.0, 0\.0, 1\.0\);/);
});
