// Produto traduzido (`i18n: true`): texto visível escrito direto no JSX (entre tags ou em atributo
// visível) ou num toast sai do catálogo de mensagens. Só procura o literal, então vale para qualquer
// biblioteca de tradução — o padrão dos projetos traduzidos é o `i18next`. Teste escreve o texto
// esperado direto, então fica de fora.
import i18next from "eslint-plugin-i18next";

import { testFiles } from "./files.mjs";

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

export const i18nConfigs = (files) => [
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
