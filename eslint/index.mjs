/**
 * Configuração ESLint padrão da Welt Studio para os frontends em TypeScript.
 *
 * O padrão é um só para todos os projetos: o pacote exporta apenas `weltConfig`. O projeto só
 * declara onde estão os arquivos e o que ele é (framework, TanStack Query, traduzido); regra
 * exclusiva de projeto não existe. Mudar o padrão é mudar este pacote e publicar uma versão.
 *
 *   import { weltConfig } from "@welt-studio/eslint-config";
 *   export default weltConfig({
 *     tsconfigRootDir: import.meta.dirname,
 *     files: ["src/**\/*.{ts,tsx}"],
 *     framework: "vite",
 *     query: true,
 *   });
 */
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";

import js from "@eslint/js";
import commentConfigs from "@eslint-community/eslint-plugin-eslint-comments/configs";
import eslintReact from "@eslint-react/eslint-plugin";
import pluginQuery from "@tanstack/eslint-plugin-query";
import vitest from "@vitest/eslint-plugin";
import { createTypeScriptImportResolver } from "eslint-import-resolver-typescript";
import boundaries from "eslint-plugin-boundaries";
import i18next from "eslint-plugin-i18next";
import { importX } from "eslint-plugin-import-x";
import jestDom from "eslint-plugin-jest-dom";
import jsxA11y from "eslint-plugin-jsx-a11y-x";
import prettierRecommended from "eslint-plugin-prettier/recommended";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import testingLibrary from "eslint-plugin-testing-library";
import globals from "globals";
import tseslint from "typescript-eslint";

// Tamanho e complexidade. Valores medidos nos projetos: abaixo deles a regra vira ruído.
const complexityRules = {
  complexity: ["error", { max: 12 }],
  "max-lines-per-function": ["error", { max: 80, skipBlankLines: true, skipComments: true }],
  "max-params": ["error", 5],
  "max-depth": ["error", 4],
  "max-nested-callbacks": ["error", 3],
  "max-statements": ["error", 30],
  "max-lines": ["error", { max: 400, skipBlankLines: true, skipComments: true }],
};

// Arquivos de teste dos projetos: o unitário, com uma forma só de nome, fica ao lado do arquivo que
// testa (é o `include` do `@welt-studio/vitest-config`); o E2E é do Playwright, em `e2e/`.
const unitTestFiles = ["**/*.test.{ts,tsx}"];
const testFiles = [...unitTestFiles, "**/e2e/**"];

// Nos testes, tamanho não é defeito: `describe` → `describe` → `it` → callback já são 4 níveis, e
// o `describe` cresce com o número de casos. O resto do padrão continua valendo — em especial as
// regras com tipo, que pegam `expect(...).rejects` sem `await` (teste que passa sem testar nada).
const testRelaxedRules = {
  "max-lines-per-function": "off",
  "max-statements": "off",
  "max-nested-callbacks": "off",
  "max-lines": "off",
};

// Boas práticas de JS que o `recommended` não liga. As de promise ficam com as versões com tipo do
// typescript-eslint (`require-await`, `prefer-promise-reject-errors`), que o `strictTypeChecked`
// já traz.
const bestPracticesRules = {
  "no-nested-ternary": "error",
  "prefer-const": "error",
  "no-var": "error",
  eqeqeq: ["error", "always"],
  curly: ["error", "all"],
  "no-console": ["error", { allow: ["warn", "error"] }],
  "array-callback-return": "error",
  "no-async-promise-executor": "error",
  "no-promise-executor-return": "error",
  "no-new-func": "error",
  "no-script-url": "error",
  "no-unsafe-optional-chaining": "error",
  "prefer-object-has-own": "error",
  "prefer-object-spread": "error",
  "prefer-template": "error",
  "no-useless-concat": "error",
  "no-implicit-coercion": "error",
  "no-param-reassign": "error",
  radix: "error",
  "prefer-exponentiation-operator": "error",
  "object-shorthand": "error",
  "prefer-arrow-callback": "error",
  // `alert`/`confirm`/`prompt` travam a página e fogem do design system: diálogo é componente.
  "no-alert": "error",
  "no-unmodified-loop-condition": "error",
  "no-useless-return": "error",
  "no-else-return": "error",
  "no-lonely-if": "error",
  "no-useless-rename": "error",
  "no-unneeded-ternary": "error",
  "no-return-assign": "error",
  "no-self-compare": "error",
  "no-template-curly-in-string": "error",
  "no-constructor-return": "error",
  "no-unreachable-loop": "error",
  "no-sequences": "error",
  "logical-assignment-operators": "error",
  "default-case-last": "error",
  "no-extend-native": "error",
  "no-new-wrappers": "error",
  "no-lone-blocks": "error",
  "no-multi-assign": "error",
  "no-object-constructor": "error",
  "operator-assignment": "error",
  "prefer-regex-literals": "error",
  yoda: "error",
  "no-useless-call": "error",
  "no-useless-computed-key": "error",
  "no-eval": "error",
  "grouped-accessor-pairs": "error",
  "no-inner-declarations": "error",
};

// Imports: sem ciclo, sem duplicata, na ordem do `I` do Ruff (biblioteca padrão, pacotes, código do
// projeto, cada grupo separado por linha em branco). O resolver do TypeScript entende os aliases
// do `tsconfig` (`@/…`); sem ele o `no-cycle` não veria os ciclos que passam por alias.
const importXTypescriptSettings = importX.flatConfigs.typescript.settings;
const importRules = {
  "import-x/no-cycle": "error",
  "import-x/no-duplicates": "error",
  "import-x/no-self-import": "error",
  "import-x/no-useless-path-segments": "error",
  "import-x/order": [
    "error",
    {
      groups: ["builtin", "external", "internal", ["parent", "sibling", "index"]],
      "newlines-between": "always",
      alphabetize: { order: "asc", caseInsensitive: true },
    },
  ],
};

// Comentários: espaço depois de `//`, frase começando em maiúscula e nenhuma pendência no código —
// TODO/FIXME/HACK vão para o débito técnico, o parking lot ou o roadmap, onde alguém os vê.
//
// `capitalized-comments` não mexe em comentário que começa com nome de código (`hydrateRoot`,
// `user_id`, `api.get`): o `--fix` do pre-commit o trocaria por `HydrateRoot`, que é outro nome.
// `no-warning-comments` casa o marcador (`TODO:`, `TODO(`), não a palavra "todo" do português.
const CODE_IDENTIFIER = "[a-z][\\w$]*[A-Z0-9_.][\\w$.]*";
const commentRules = {
  "capitalized-comments": [
    "error",
    "always",
    {
      ignorePattern: `pragma|ignore|prettier-ignore|webpack\\w+:|c8|eslint|ts-|${CODE_IDENTIFIER}`,
      ignoreInlineComments: true,
      ignoreConsecutiveComments: true,
    },
  ],
  "spaced-comment": ["error", "always", { markers: ["/"] }],
  "no-warning-comments": [
    "error",
    { terms: ["todo:", "todo(", "fixme", "hack:", "xxx:"], location: "anywhere" },
  ],
};

const typescriptRules = {
  "@typescript-eslint/no-unused-vars": [
    "error",
    { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
  ],
  "@typescript-eslint/consistent-type-imports": ["error", { prefer: "type-imports" }],
  "@typescript-eslint/no-import-type-side-effects": "error",
  "@typescript-eslint/consistent-type-exports": "error",
  // `switch` sobre união que esquece um caso reprova, mesmo com `default`.
  "@typescript-eslint/switch-exhaustiveness-check": "error",
  "@typescript-eslint/no-shadow": "error",
  "@typescript-eslint/consistent-return": "error",
  "@typescript-eslint/prefer-readonly": "error",
  // Método como propriedade: o parâmetro passa a ser checado de forma segura (contravariante).
  "@typescript-eslint/method-signature-style": "error",
  // `[10, 2].sort()` ordena como texto.
  "@typescript-eslint/require-array-sort-compare": "error",
  "@typescript-eslint/default-param-last": "error",
  "@typescript-eslint/no-loop-func": "error",
  "@typescript-eslint/no-useless-empty-export": "error",
  "@typescript-eslint/no-unnecessary-qualifier": "error",
};

// Desligar regra é exceção: nunca o arquivo inteiro, nunca sem dizer quais regras, nunca sem motivo
// (`// eslint-disable-next-line regra -- motivo`). Diretiva que não desliga nada é erro pelo
// `linterOptions` abaixo.
const disableDirectiveRules = {
  "@eslint-community/eslint-comments/no-unlimited-disable": "error",
  "@eslint-community/eslint-comments/disable-enable-pair": ["error", { allowWholeFile: false }],
  "@eslint-community/eslint-comments/require-description": "error",
};

// O prefixo `**/` é obrigatório: no flat config os padrões são relativos à raiz da config e `*` não
// atravessa `/`. Sem ele, `*.min.js` só pega minificado na raiz e `dist/**` só o `dist` de primeiro
// nível — foi assim que um `eslint --fix` reescreveu um UMD minificado de terceiro no pg-studio.
const commonIgnores = [
  "**/node_modules/**",
  "**/dist/**",
  "**/build/**",
  "**/coverage/**",
  "**/*.min.js",
  "**/*.min.mjs",
  // Código de terceiros: entra no repo como está e não é nosso para arrumar.
  "**/vendor/**",
  ".env*",
  "**/.next/**",
  "**/out/**",
  // Saída de gerador (`routeTree.gen.ts` do TanStack Router, clientes OpenAPI): o gerador a reescreve
  // no estilo dele a cada rodada. O mesmo padrão do `.prettierignore`.
  "**/*.gen.ts",
];

/**
 * O que o git ignora a partir de `dir` (todo `.gitignore`, o `.git/info/exclude` e o global), como
 * padrões relativos a `dir`. O ESLint 10 não lê `.gitignore`: sem isto, o lint local pega `.venv`,
 * cópias de referência e afins que a CI, que só vê o que está no git, nunca vê. Fora de um
 * repositório git (ou sem o git instalado), não ignora nada a mais.
 */
function gitIgnored(dir) {
  let output;
  try {
    output = execFileSync(
      "git",
      ["ls-files", "--others", "--ignored", "--exclude-standard", "--directory", "-z"],
      { cwd: dir, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 64 * 1024 * 1024 },
    );
  } catch {
    return [];
  }
  return output
    .split("\0")
    .filter(Boolean)
    .map((path) => {
      // Nome de arquivo é literal: escapa o que o minimatch leria como glob (rota `[id]`, por exemplo).
      const literal = path.replace(/[*?[\]{}()!]/g, "\\$&");
      return literal.endsWith("/") ? `${literal}**` : literal;
    });
}

/**
 * Os `tsconfig.json` versionados a partir de `dir`, para o resolver de imports do TypeScript achar o
 * de cada arquivo (e com ele os aliases `@/…`). Só a pasta não basta: num monorepo sem
 * `tsconfig.json` na raiz, o resolver não acha o do app e todo import por alias fica sem resolver.
 * Glob também não: varre o `node_modules`, e o tsconfig de pacote de terceiro derruba o resolver. O
 * git só lista o que é do projeto. Fora de um repositório git, fica a pasta.
 */
function typescriptProjects(dir) {
  let output;
  try {
    output = execFileSync("git", ["ls-files", "-z", "--", "tsconfig.json", "**/tsconfig.json"], {
      cwd: dir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return [dir];
  }
  const projects = output
    .split("\0")
    .filter(Boolean)
    .map((path) => `${dir}/${path}`);
  return projects.length > 0 ? projects : [dir];
}

// Regras que não dependem de tipo: valem nos arquivos com tipo e nos que estão fora do `tsconfig`.
const untypedStandardRules = {
  ...complexityRules,
  ...bestPracticesRules,
  ...commentRules,
  ...disableDirectiveRules,
  ...importRules,
};

// Testes unitários: `it.only` esquecido, teste sem `expect`, `expect` dentro de `if` (vitest);
// query certa do Testing Library; matcher do jest-dom no lugar de comparar booleano.
const unitTestConfigs = [
  { ...vitest.configs.recommended, files: unitTestFiles },
  { ...testingLibrary.configs["flat/react"], files: unitTestFiles },
  { ...jestDom.configs["flat/recommended"], files: unitTestFiles },
];

const hookRules = reactHooks.configs.flat["recommended-latest"];
const hookRuleNames = new Set(Object.keys(hookRules.rules).map((rule) => rule.split("/")[1]));

// O `@eslint-react` reimplementa regras do plugin oficial de hooks. Fica a versão oficial, que é a
// fonte das regras do React Compiler; as gêmeas do `@eslint-react` saem para não reportar em dobro.
const eslintReactWithoutHookTwins = (() => {
  const config = eslintReact.configs["recommended-type-checked"];
  const rules = Object.fromEntries(
    Object.entries(config.rules).filter(([rule]) => !hookRuleNames.has(rule.split("/")[1])),
  );
  return { ...config, rules };
})();

// Configs de ferramenta (`vite.config.ts`, `vitest.config.ts`, `playwright.config.ts`): estão no
// `tsconfig`, mas rodam no Node, não no app. Ficam fora do que o `framework` liga.
const toolConfigFiles = ["**/*.config.{ts,mts,cts}"];

// App Vite: o código do app roda no navegador, e o Fast Refresh exige que arquivo de componente só
// exporte componente (senão o HMR recarrega a página).
function frameworkConfigs(framework, files) {
  if (framework !== "vite") {
    return [];
  }
  return [
    {
      name: "welt/app-globals",
      files,
      ignores: toolConfigFiles,
      languageOptions: { globals: globals.browser },
    },
    { ...reactRefresh.configs.vite, files, ignores: toolConfigFiles },
  ];
}

// Arquitetura do app (decisão do PO, 2026-10-27): as regras de direção do bulletproof-react com as
// rotas por arquivo do TanStack Router. Toda pasta de `src/` é uma camada, e cada camada só importa as
// de baixo:
//   os arquivos de entrada na raiz de `src/` (`main.tsx`, `entry-server.tsx` do prerender SSR,
//   `routeTree.gen.ts`, `vite-env.d.ts`) e `app/` → tudo;
//   `routes/` (rota fina: parâmetros, busca, loader, guarda) → features e base;
//   `features/<nome>/` → a própria feature e a base, nunca outra feature;
//   base (`components`, `hooks`, `lib`, `stores`, `types`, `utils`, `config`, `assets`, `testing`) → base.
// Quem junta duas features é a rota ou o `app/`; o que duas features usam sobe para a base. Pasta ou
// arquivo de `src/` fora dessa lista reprova (`no-unknown-files`): `App.tsx` e `router.tsx` moram em
// `app/`. Os padrões casam pela direita, então valem igual na raiz do projeto e num app de monorepo
// (`apps/admin/src/...`).
const SHARED_FOLDERS = "(components|hooks|lib|stores|types|utils|config|assets|testing)";
const architectureSettings = {
  "boundaries/files": [
    {
      pattern: "**/src/{main.tsx,entry-server.tsx,routeTree.gen.ts,vite-env.d.ts}",
      category: "entry",
    },
  ],
  "boundaries/elements": [
    { type: "app", pattern: "src/app" },
    { type: "route", pattern: "src/routes" },
    { type: "feature", pattern: "src/features/*", capture: ["featureName"] },
    { type: "shared", pattern: `src/${SHARED_FOLDERS}` },
  ],
};
const everyLayer = [
  { to: { element: { type: ["app", "route", "feature", "shared"] } } },
  { to: { file: { categories: "entry" } } },
];
const architectureRules = {
  "boundaries/no-unknown-files": "error",
  "boundaries/dependencies": [
    "error",
    {
      default: "disallow",
      policies: [
        { from: { file: { categories: "entry" } }, allow: everyLayer },
        { from: { element: { type: "app" } }, allow: everyLayer },
        {
          from: { element: { type: "route" } },
          allow: [{ to: { element: { type: ["route", "feature", "shared"] } } }],
        },
        {
          from: { element: { type: "feature" } },
          allow: [
            {
              to: {
                element: { type: "feature", captured: { featureName: "{{ from.featureName }}" } },
              },
            },
            { to: { element: { type: "shared" } } },
          ],
        },
        { from: { element: { type: "shared" } }, allow: [{ to: { element: { type: "shared" } } }] },
      ],
    },
  ],
};

// Rota fina: a tela mora na feature, e o arquivo de rota só tem `createFileRoute` com parâmetros,
// busca, loader e guarda. O limite trava a tela de voltar para a rota (decisão do PO, 2026-10-27).
const ROUTE_MAX_LINES = 60;

// O boundaries resolve os imports pelo `import/resolver` legado (do `eslint-module-utils`), não pelo
// `resolver-next` do import-x: sem o resolver do TypeScript, import por alias (`@/features/...`) não
// resolve e passa sem ser conferido. O resolver vai pelo caminho absoluto, que o `eslint-module-utils`
// aceita no lugar do nome: pelo nome, ele procuraria o pacote a partir do projeto, que no pnpm não o
// enxerga (é dependência deste pacote).
const TYPESCRIPT_RESOLVER = createRequire(import.meta.url).resolve(
  "eslint-import-resolver-typescript",
);

// App Vite: a estrutura de pastas e a direção dos imports do padrão, em `src/`. Só no app: pacote e
// biblioteca não têm rota nem feature.
function architectureConfigs(framework, files, resolverOptions) {
  if (framework !== "vite") {
    return [];
  }
  const inSrc = (folder) => files.map((pattern) => [pattern, `**/src/${folder}**`]);
  return [
    {
      name: "welt/architecture",
      files: inSrc(""),
      ignores: toolConfigFiles,
      plugins: { boundaries },
      settings: {
        ...architectureSettings,
        "import/resolver": { [TYPESCRIPT_RESOLVER]: resolverOptions },
      },
      rules: architectureRules,
    },
    {
      name: "welt/thin-routes",
      files: inSrc("routes/"),
      rules: {
        "max-lines": ["error", { max: ROUTE_MAX_LINES, skipBlankLines: true, skipComments: true }],
      },
    },
  ];
}

// Atributos que são código, não texto de tela: rota, id de teste, nome de ícone, classe, cor, valor
// de formulário, SVG. Todo o resto é cobrado — prop de componente nova (`badge`, `unit`, `detail`)
// é texto até prova em contrário, porque erro a mais aparece e erro a menos passa calado. Os
// padrões casam o nome inteiro; os `aria-*` que o leitor de tela lê continuam cobrados.
const codeAttributes = [
  // Os do próprio plugin (o `exclude` da opção substitui o padrão dele).
  "className",
  "styleName",
  "style",
  "type",
  "key",
  "id",
  "width",
  "height",
  "\\w*(ClassName|Class|Color|Icon|Id)",
  "classNames",
  "data-[\\w-]+",
  "testId",
  "aria-(?!label$|description$|roledescription$|valuetext$|placeholder$)[\\w-]+",
  "role",
  // `action` fica cobrado: em componente é rótulo de botão (`action="Ver vendas"`), e o `action` do
  // `<form>` no React 19 é função.
  "(href|to|src|srcSet)",
  "[a-z]\\w*(To|Href|Url|Path|Src)",
  // `value` fica cobrado: no `<SelectItem>` é código, mas em componente de exibição
  // (`<Metric value="3 Models">`) é texto de tela.
  "(htmlFor|form|name|accept|autoComplete|inputMode|pattern|rel|target|method)",
  "(icon|layoutId|variant|size|side|align|orientation|mode|slot|as|lang|dir|loading|decoding|sizes)",
  "(viewBox|d|fill|stroke|xmlns|transform|points|cx|cy|r|x|y|x1|x2|y1|y2|clipPath|mask)",
  "(fill|stroke|clip|font|text)[A-Z]\\w*",
];

// Chamadas cujos argumentos são código: classes (`cn`, `clsx`, `cva`, `twMerge`), locale e formato
// (`toLocaleString("pt-BR")`, `new Intl.DateTimeFormat(...)`). Os primeiros itens são o padrão do
// plugin (a opção substitui a lista dele).
const codeCallees = [
  "i18n(ext)?",
  "t",
  "require",
  "addEventListener",
  "removeEventListener",
  "postMessage",
  "getElementById",
  "dispatch",
  "commit",
  "includes",
  "indexOf",
  "endsWith",
  "startsWith",
  "(cn|clsx|cva|twMerge)",
  "toLocale\\w*String",
  "Intl\\.\\w+",
];

// Objeto dentro do JSX segue a mesma lista dos atributos: `transition={{ type: "spring" }}` e
// `toastOptions={{ classNames: { … } }}` são código; `{ label: "Valor" }` é texto. O primeiro padrão
// é o do plugin (chave em CAIXA_ALTA).
const codeObjectProperties = ["[A-Z_-]+", ...codeAttributes];

// Toast é texto visível fora do JSX, que a regra do i18next (no modo só-JSX) não vê: `toast("…")`,
// `toast.error("…")` e `description`/`title` nas opções dele. Casa só as chamadas que mostram
// mensagem — `toast.dismiss("upload-id")` recebe um id, não texto.
const TOAST_CALL =
  'CallExpression:matches([callee.name="toast"], [callee.object.name="toast"][callee.property.name=/^(success|error|info|warning|loading|message)$/])';
const TOAST_MESSAGE = "Texto do toast vem do catálogo de mensagens (t(...)), não escrito direto.";
const toastLiteralRule = [
  "error",
  ...[
    `${TOAST_CALL} > Literal[value=/\\S/]`,
    `${TOAST_CALL} > TemplateLiteral`,
    `${TOAST_CALL} > ObjectExpression > Property[key.name=/^(title|description)$/] > :matches(Literal[value=/\\S/], TemplateLiteral)`,
    // `toast.promise(p, { loading: "…", success: "…", error: "…" })`
    'CallExpression[callee.object.name="toast"][callee.property.name="promise"] > ObjectExpression > Property[key.name=/^(loading|success|error|description)$/] > :matches(Literal[value=/\\S/], TemplateLiteral)',
  ].map((selector) => ({ selector, message: TOAST_MESSAGE })),
];

// Texto visível escrito direto no JSX (entre tags ou em atributo visível) ou num toast, num produto
// traduzido: sai do catálogo de mensagens. Só procura o literal, então vale para qualquer biblioteca
// de tradução — o padrão dos projetos traduzidos é o `i18next`. Teste escreve o texto esperado
// direto, então fica de fora.
const i18nConfigs = (files) => [
  {
    name: "welt/i18n",
    files,
    plugins: { i18next },
    rules: {
      "i18next/no-literal-string": [
        "error",
        {
          mode: "jsx-only",
          "jsx-attributes": { exclude: codeAttributes },
          "object-properties": { exclude: codeObjectProperties },
          callees: { exclude: codeCallees },
        },
      ],
      "no-restricted-syntax": toastLiteralRule,
    },
  },
  {
    name: "welt/i18n-tests",
    files: testFiles,
    rules: { "i18next/no-literal-string": "off", "no-restricted-syntax": "off" },
  },
];

const isWarn = (level) => level === "warn" || level === 1;

// Aviso não existe no padrão: os projetos rodam com `--max-warnings=0`, então todo aviso já reprova.
// Cada regra é erro ou está desligada, sem meio-termo que pareça opcional.
function warningsAsErrors(config) {
  if (!config.rules) {
    return config;
  }
  const rules = Object.fromEntries(
    Object.entries(config.rules).map(([rule, value]) => {
      if (isWarn(value)) {
        return [rule, "error"];
      }
      if (Array.isArray(value) && isWarn(value[0])) {
        return [rule, ["error", ...value.slice(1)]];
      }
      return [rule, value];
    }),
  );
  return { ...config, rules };
}

/**
 * @param {object} options
 * @param {string} options.tsconfigRootDir pasta do `tsconfig.json` (em geral `import.meta.dirname`)
 * @param {string[]} [options.files] arquivos lintados com tipo (regras de TS e React)
 * @param {string[]} [options.untypedFiles] arquivos fora de qualquer `tsconfig` (scripts, configs de
 *   ferramenta, regras próprias em `.mjs`): recebem o padrão sem as regras que exigem tipo, com os
 *   globais do Node
 * @param {boolean} [options.react] liga React (`@eslint-react`), React Hooks e acessibilidade
 *   (padrão: true)
 * @param {"vite"} [options.framework] app Vite: no código do app, globais do navegador, Fast
 *   Refresh e a arquitetura do padrão em `src/` (camadas, direção dos imports, rota fina); as
 *   configs de ferramenta (`*.config.ts`) ficam com os do Node. Sem ele, os arquivos com tipo
 *   recebem os globais do Node (pacote ou biblioteca)
 * @param {boolean} [options.query] liga as regras do TanStack Query (padrão: false)
 * @param {boolean} [options.i18n] produto traduzido: texto visível no JSX só pelo catálogo
 *   (padrão: false)
 * @param {string[]} [options.ignores] ignores do projeto (código gerado ou de terceiros que está no
 *   git), somados aos comuns; o que o git ignora já fica de fora sem constar aqui
 */
export function weltConfig({
  tsconfigRootDir,
  files = ["**/*.{ts,tsx}"],
  untypedFiles = ["**/*.{js,jsx,mjs,cjs}"],
  react = true,
  framework,
  query = false,
  i18n = false,
  ignores = [],
}) {
  const scoped = (configs) => configs.map((config) => ({ ...config, files }));
  const formatted = [...files, ...untypedFiles];
  // Config de ferramenta que está entre os arquivos com tipo: no flat config, um array dentro de
  // `files` exige que todos os padrões dele casem.
  const typedToolConfigs = files.flatMap((pattern) =>
    toolConfigFiles.map((toolConfig) => [pattern, toolConfig]),
  );

  const gitIgnores = gitIgnored(tsconfigRootDir);
  // Um resolver de imports só, para o import-x (ciclos) e o boundaries (arquitetura).
  const resolverOptions = {
    project: typescriptProjects(tsconfigRootDir),
    noWarnOnMultipleProjects: true,
  };

  const configs = [
    { name: "welt/ignores", ignores: [...commonIgnores, ...ignores] },
    // Padrões relativos à pasta de onde o git foi consultado, seja qual for a pasta da config.
    ...(gitIgnores.length > 0
      ? [{ name: "welt/gitignore", basePath: tsconfigRootDir, ignores: gitIgnores }]
      : []),
    {
      name: "welt/linter-options",
      linterOptions: {
        reportUnusedDisableDirectives: "error",
        reportUnusedInlineConfigs: "error",
      },
    },
    { ...js.configs.recommended, files: formatted },
    { ...commentConfigs.recommended, files: formatted },
    {
      name: "welt/imports",
      files: formatted,
      plugins: { "import-x": importX },
      settings: {
        // Extensões e parser do TS (da config `typescript` do plugin): sem eles, o plugin não segue
        // import para arquivo `.ts`. O resolver dela (pelo nome do pacote) sai: o `resolver-next`
        // abaixo recebe a instância, que o pnpm resolve a partir deste pacote.
        "import-x/extensions": importXTypescriptSettings["import-x/extensions"],
        "import-x/external-module-folders":
          importXTypescriptSettings["import-x/external-module-folders"],
        "import-x/parsers": importXTypescriptSettings["import-x/parsers"],
        "import-x/resolver-next": [createTypeScriptImportResolver(resolverOptions)],
      },
    },
    ...scoped(tseslint.configs.strictTypeChecked),
    ...scoped(tseslint.configs.stylisticTypeChecked),
    {
      name: "welt/type-info",
      files,
      languageOptions: { parserOptions: { projectService: true, tsconfigRootDir } },
    },
    // Globais do Node em pacote e biblioteca; no app Vite, só nas configs de ferramenta (o código do
    // app recebe os do navegador em `frameworkConfigs`). Os globais de configs diferentes se somam,
    // por isso cada arquivo recebe um conjunto só.
    {
      name: "welt/node-globals",
      files: framework === "vite" ? typedToolConfigs : files,
      languageOptions: { globals: globals.node },
    },
    ...(react
      ? [
          { ...eslintReactWithoutHookTwins, files },
          { ...hookRules, files },
          { ...jsxA11y.configs.recommended, files },
        ]
      : []),
    ...frameworkConfigs(framework, files),
    ...(query ? scoped(pluginQuery.configs["flat/recommended"]) : []),
    ...(i18n ? i18nConfigs(files) : []),
    { name: "welt/rules", files, rules: { ...typescriptRules, ...untypedStandardRules } },
    // Depois de `welt/rules`, para o limite da rota fina valer sobre o `max-lines` geral.
    ...architectureConfigs(framework, files, resolverOptions),
    // Fora do `tsconfig` não há informação de tipo: o TS entra com o `recommended` sem tipo, e o resto
    // do padrão vale igual. Nesses arquivos roda Node (scripts, configs de ferramenta).
    ...tseslint.configs.recommended.map((config) => ({ ...config, files: untypedFiles })),
    {
      name: "welt/untyped",
      files: untypedFiles,
      // `tsconfigRootDir` mesmo sem tipo: num monorepo com várias configs no mesmo processo, o
      // parser do TS recusa adivinhar a raiz ("multiple candidate TSConfigRootDirs").
      languageOptions: { globals: globals.node, parserOptions: { tsconfigRootDir } },
      rules: untypedStandardRules,
    },
    ...unitTestConfigs,
    { name: "welt/tests", files: testFiles, rules: testRelaxedRules },
    // Prettier por último: formata como regra e desliga o que conflita com ele.
    { ...prettierRecommended, files: formatted },
    // O `eslint-config-prettier` desliga `curly`, mas na forma `all` ela não conflita com o Prettier
    // (é uma das "special rules" dele). Sem religar aqui, o `curly` do padrão nunca rodaria.
    {
      name: "welt/curly-after-prettier",
      files: formatted,
      rules: { curly: bestPracticesRules.curly },
    },
  ];

  return configs.map(warningsAsErrors);
}
