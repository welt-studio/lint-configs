// Teste do pacote: um `tsconfig.json` de projeto que estende o `base.json` pelo nome do pacote é
// aceito pelo `tsc` e herda o rigor do padrão. Roda com `pnpm test` na raiz.
//
// O pacote é montado como o projeto o recebe (o `package.json` e o que o `files` publica), num
// `node_modules` fora deste repo: arquivo esquecido no `files` quebra aqui, não nos projetos.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";

const PACKAGE = fileURLToPath(new URL("..", import.meta.url));
// O `tsc` do ambiente de desenvolvimento do repo (o `typescript` da raiz).
const TSC = createRequire(import.meta.url).resolve("typescript/bin/tsc");

let project;

before(() => {
  project = mkdtempSync(join(tmpdir(), "welt-tsconfig-"));
  const manifest = JSON.parse(readFileSync(join(PACKAGE, "package.json"), "utf8"));
  const installed = join(project, "node_modules", "@welt-studio", "tsconfig");
  mkdirSync(installed, { recursive: true });
  for (const file of ["package.json", ...manifest.files]) {
    cpSync(join(PACKAGE, file), join(installed, file));
  }
  mkdirSync(join(project, "src"));
  writeFileSync(join(project, "src", "index.ts"), "export const answer = 42;\n");
  writeFileSync(
    join(project, "tsconfig.json"),
    JSON.stringify({
      extends: "@welt-studio/tsconfig/base.json",
      compilerOptions: { target: "ES2022", noEmit: true },
      include: ["src"],
    }),
  );
});

after(() => {
  rmSync(project, { recursive: true, force: true });
});

test("o tsconfig do projeto estende o base.json e herda o rigor do padrão", () => {
  const output = execFileSync(process.execPath, [TSC, "--showConfig", "-p", project], {
    encoding: "utf8",
  });
  const { compilerOptions } = JSON.parse(output);
  assert.equal(compilerOptions.strict, true);
  assert.equal(compilerOptions.noUncheckedIndexedAccess, true);
  assert.equal(compilerOptions.erasableSyntaxOnly, true);
  assert.equal(compilerOptions.verbatimModuleSyntax, true);
  assert.equal(compilerOptions.moduleResolution, "bundler");
  // O que é do projeto continua dele.
  assert.equal(compilerOptions.target, "es2022");
});

test("o tsc aceita o projeto sem erro", () => {
  execFileSync(process.execPath, [TSC, "-p", project], { encoding: "utf8" });
});
