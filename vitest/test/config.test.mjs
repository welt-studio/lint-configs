// Teste do pacote: o `weltVitestConfig` carrega e devolve o padrão. Roda com `pnpm test` na raiz.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

import { weltVitestConfig } from "../index.mjs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

// O piso do front é o mesmo do backend (decisão do PO, 2026-10-25), que mora no hook `pytest-base`
// em Python: sem import entre as linguagens, este teste confere que os dois batem.
const backendFloor = Number(
  /^COVERAGE_FLOOR = (\d+)$/m.exec(read("../../hooks/check_pytest.py"))[1],
);

test("o padrão fixa os campos que os projetos herdam", () => {
  const { test: config } = weltVitestConfig();
  assert.equal(config.environment, "jsdom");
  assert.equal(config.globals, false);
  assert.equal(config.restoreMocks, true);
  assert.deepEqual(config.sequence, { shuffle: true });
  assert.equal(config.coverage.provider, "v8");
  assert.equal(backendFloor, 80);
  assert.deepEqual(config.coverage.thresholds, {
    lines: backendFloor,
    functions: backendFloor,
    branches: backendFloor,
    statements: backendFloor,
  });
});

test("o setup do padrão existe e roda antes do setup do projeto", () => {
  const { test: config } = weltVitestConfig({ setupFiles: ["./src/testing/setup.ts"] });
  assert.equal(config.setupFiles.length, 2);
  assert.ok(existsSync(config.setupFiles[0]), config.setupFiles[0]);
  assert.equal(config.setupFiles[1], "./src/testing/setup.ts");
});

// O `@vitest/coverage-v8` precisa da mesma versão do `vitest`: as duas faixas são uma decisão só.
test("o coverage-v8 aceita a mesma faixa do vitest", () => {
  const { peerDependencies } = JSON.parse(read("../package.json"));
  assert.equal(peerDependencies["@vitest/coverage-v8"], peerDependencies.vitest);
});
