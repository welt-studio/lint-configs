# Standards

Os padrões de desenvolvimento da Welt Studio (lint, tipos, formatação, duplicação, testes, scripts
de instalação do pnpm e a política de versões do Renovate), declarados uma vez para todos os
projetos.

## Desenvolver este repo

O standards segue o padrão que publica, com os mesmos hooks dos projetos
(`.pre-commit-config.yaml`); os hooks `*-base` rodam os scripts deste working tree, e as cópias que
eles geram na raiz (`ruff-base.toml`, `pyright-base.json`, `.prettierignore`, `.jscpd*.json`) não se
editam.

| Parte                                       | Onde                                                                                                                                    |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Scripts dos hooks (stdlib, sem dependência) | `hooks/`, em strict no Pyright; testes em `tests/`                                                                                      |
| Ferramentas do Python                       | `pyproject.toml` da raiz (grupo `dev`), só ambiente de desenvolvimento: `uv sync`                                                       |
| Pacotes publicados                          | `eslint/`, `prettier/`, `tsconfig/`, `vitest/`, num workspace pnpm na raiz; o `package.json` da raiz é só o ambiente de desenvolvimento |

```sh
uv sync && pnpm install
uvx pre-commit@4.7.0 install --hook-type pre-commit --hook-type commit-msg --hook-type pre-push
uv run pytest --cov   # testes dos hooks, com o piso de cobertura
pnpm test             # teste do pacote de ESLint
```

O workflow `Test` roda os hooks no repo inteiro e os dois testes em todo push e PR.

## ESLint: `@welt-studio/eslint-config`

Pacote em `eslint/`, instalado por tag do git (o repositório é público, então nenhum ambiente
precisa de token: máquina, CI e build Docker baixam como qualquer pacote):

```json
"@welt-studio/eslint-config": "github:welt-studio/standards#eslint-v4.3.2&path:/eslint"
```

O lockfile guarda o commit exato da tag. Atualizar um projeto é trocar a tag e rodar `pnpm install`;
o Renovate abre esse PR sozinho quando sai uma tag nova, já com o lockfile (ver "Renovate").

```javascript
// eslint.config.mjs
import { weltConfig } from "@welt-studio/eslint-config";

export default weltConfig({
  tsconfigRootDir: import.meta.dirname,
  files: ["src/**/*.{ts,tsx}"], // com tipo (o que o tsconfig inclui)
  framework: "vite", // app Vite; sem ele, pacote/biblioteca (globais do Node)
  query: true, // usa TanStack Query
  i18n: true, // produto traduzido
});
```

**O padrão é o mesmo em todos os projetos, e não existe regra exclusiva de projeto.** O arquivo do
projeto só declara onde estão os arquivos e o que o projeto é (framework, TanStack Query,
traduzido); limite, regra e plugin vêm daqui. Precisou de uma regra nova? Ela entra neste pacote,
para todos, numa versão nova.

`files` e `untypedFiles` não podem se sobrepor: um arquivo é lintado com tipo (está num `tsconfig`)
ou sem tipo (scripts, configs de ferramenta, `.mjs`). Os sem tipo (padrão `**/*.{js,jsx,mjs,cjs}`)
recebem o padrão inteiro menos as regras que exigem tipo, com os globais do Node.

`weltConfig` aplica, nesta ordem:

| Bloco                                                            | O que pega                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `typescript-eslint` `strictTypeChecked` + `stylisticTypeChecked` | promise sem `await`/`catch`, `async` onde se espera retorno síncrono, `any` vazando, condição sempre verdadeira                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `@eslint-react/eslint-plugin` (`recommended-type-checked`)       | key ausente ou instável, contexto recriado a cada render, API do React usada errado (substitui o `eslint-plugin-react`, parado no ESLint 9). As regras que repetem as do plugin de hooks ficam só lá                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `eslint-plugin-react-hooks` (`recommended-latest`)               | regras dos hooks e do React Compiler                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `eslint-plugin-jsx-a11y-x` (`recommended`)                       | acessibilidade (fork do `jsx-a11y` que suporta ESLint 10)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `framework: "vite"`                                              | no código do app, globais do navegador e Fast Refresh (`eslint-plugin-react-refresh`); configs de ferramenta (`*.config.ts`) ficam com os globais do Node. Liga também a arquitetura do app (`eslint-plugin-boundaries`, ver "Arquitetura do front"). Next não é suportado: os apps são Vite                                                                                                                                                                                                                                                                                                                                                           |
| `@tanstack/eslint-plugin-query` (`query: true`)                  | chave de query incompleta, `QueryClient` instável                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `eslint-plugin-i18next` (`i18n: true`)                           | texto visível escrito direto no JSX (entre tags ou em qualquer atributo) ou num toast (`toast("…")`, `toast.error("…")`, `description`, `toast.promise`). Ficam de fora só os atributos e chaves de objeto que são código — rota (`href`, `to`), `data-*`, `testId`, ícone (`name`, `icon`), classe (`className`, `classNames`, `cn(...)`), cor, `aria-hidden`, SVG, `type` —, locale e formato (`toLocaleString`, `Intl.*`), `toast.dismiss(id)` e os testes. Prop nova é cobrada até entrar nessa lista: erro a mais aparece, erro a menos passa calado. Vale para qualquer biblioteca de tradução, e o padrão dos projetos traduzidos é o `i18next` |
| `eslint-comments` + `linterOptions`                              | `eslint-disable` de arquivo inteiro, sem regra ou sem motivo (`-- motivo`), e diretiva que não desliga nada                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Tamanho, complexidade e boas práticas                            | `complexity` 12, função 80 linhas, arquivo 400, `max-statements` 30, `max-params` 5, `max-depth` 4, `max-nested-callbacks` 3, boas práticas, ignores comuns                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Regras com tipo além do `strict`                                 | `switch` sobre união que esquece um caso (`switch-exhaustiveness-check`), sombra de variável, retorno inconsistente, `readonly` onde cabe, método como propriedade (`method-signature-style`), `sort()` sem comparador, import/export de tipo marcado como tipo                                                                                                                                                                                                                                                                                                                                                                                        |
| Imports (`eslint-plugin-import-x`)                               | ciclo de import (resolvendo os aliases do `tsconfig`), import duplicado, import de si mesmo, caminho com segmento inútil e a ordem (biblioteca padrão, pacotes, código do projeto, um grupo por bloco, como o `I` do Ruff). Os aliases resolvem pelos `tsconfig.json` versionados no git a partir do `tsconfigRootDir`, um por app num monorepo                                                                                                                                                                                                                                                                                                        |
| O que o git ignora                                               | todo arquivo que o git ignora (`.gitignore` de qualquer pasta, `.git/info/exclude`) fica fora do lint, consultado no próprio git a partir do `tsconfigRootDir`: o lint local vê o mesmo que a CI. Saída de gerador (`**/*.gen.ts`, como o `routeTree.gen.ts` do TanStack Router) também fica fora, como no `.prettierignore`. O `ignores` do projeto fica só para o que está no git e não deve ser lintado (código gerado ou de terceiros versionado)                                                                                                                                                                                                  |
| Comentários                                                      | espaço depois de `//`, frase em maiúscula (menos quando começa com nome de código, como `hydrateRoot`), nenhum `TODO:`/`FIXME`/`HACK:` no código (vão para o débito técnico, parking lot ou roadmap)                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Testes (`*.test.ts(x)` ao lado do código, `e2e/`)                | sem limites de tamanho; o resto do padrão vale. Nos unitários, `@vitest/eslint-plugin` (`it.only` esquecido, teste sem `expect`, `expect` condicional), `eslint-plugin-testing-library` (query certa, sem `container`) e `eslint-plugin-jest-dom` (matcher no lugar de comparar booleano)                                                                                                                                                                                                                                                                                                                                                              |
| Prettier (`eslint-plugin-prettier`)                              | formatação como regra, por último, com a config do projeto (o `@welt-studio/prettier-config`); `curly` religado depois dele                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |

**Não há aviso:** toda regra é erro ou está desligada (os projetos rodam com `--max-warnings=0`, e
um aviso já reprovaria).

O pacote exporta só `weltConfig` (com tipos em `index.d.ts`): não há regra solta para reaplicar,
porque reaplicar pedaço do padrão é montar uma versão parcial dele.

`eslint` (10), `@eslint/js` (10), `typescript` (6), `typescript-eslint` e `prettier` (3) são
`peerDependencies`: a versão é a do projeto, e o padrão exige essas majors. Os plugins vêm com o
pacote, em versão fixa — o projeto não declara nem registra nenhum deles.

### Arquitetura do front

Todo app Vite (`framework: "vite"`) segue a mesma estrutura em `src/`, com a direção dos imports
travada pelo `eslint-plugin-boundaries` (decisão do PO, 2026-10-27). As regras são as do
[bulletproof-react](https://github.com/alan2207/bulletproof-react/blob/master/docs/project-structure.md),
e as rotas são as rotas por arquivo do TanStack Router, finas como no
[shadcn-admin](https://github.com/satnaing/shadcn-admin):

```
src/
  main.tsx                 # monta o app; importa o index.css
  index.css                # o CSS global (tema, fontes): uma porta de entrada, que importa os outros
  entry-server.tsx         # só com prerender SSR (`vite build --ssr`)
  vite-env.d.ts
  app/                     # providers, instância do router, layout global, error boundary
  routes/                  # rotas por arquivo do TanStack Router (`createFileRoute`)
  routeTree.gen.ts         # gerado pelo @tanstack/router-plugin
  features/<nome>/         # um domínio: api/ components/ hooks/ stores/ types/ utils/ (só as que usa)
  components/  hooks/  lib/  stores/  types/  utils/  config/  assets/  testing/   # a base
```

| Camada                                                                                                               | Importa                                             |
| -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| arquivos de entrada da raiz de `src/` (`main.tsx`, `entry-server.tsx`, `routeTree.gen.ts`, `vite-env.d.ts`) e `app/` | tudo                                                |
| `routes/`                                                                                                            | rotas, features e a base                            |
| `features/<nome>/`                                                                                                   | a própria feature e a base, **nunca outra feature** |
| a base                                                                                                               | só a base                                           |

- **Feature não conhece feature.** Quem junta duas é a rota ou o `app/`; o que duas usam sobe para a
  base. A página da feature fica em `features/<nome>/components/<nome>-page.tsx`, e a rota a importa
  direto: sem `index.ts` que só reexporta, que o bulletproof desaconselha (atrapalha o tree shaking
  do Vite).
- **Pasta ou arquivo de `src/` fora da lista reprova** (`boundaries/no-unknown-files`): a estrutura
  é a mesma em todos os apps. Na raiz de `src/` só ficam os arquivos de entrada da tabela e o
  `index.css`; `App.tsx` e `router.tsx` moram em `app/`.
- **CSS global:** um `src/index.css`, importado pelo `main.tsx`, como no bulletproof. Ele é parte da
  entrada, não de uma camada; `assets/` é para arquivo estático (imagem, fonte). Tema e fontes em
  arquivos separados entram pelo `index.css`. O ESLint não lê CSS, então esta regra fica escrita, sem
  trava.
- **Rota fina:** arquivo em `src/routes/` tem no máximo 60 linhas. Ele só declara o `createFileRoute`
  (parâmetros, busca com zod, loader, guarda) e o componente vem da feature.
- **Teste fica ao lado do código** e importa da própria feature e de `testing/`.
- Pacote e biblioteca (sem `framework`) não têm essa estrutura: não têm rota nem feature.

Os padrões casam pela direita, então valem igual com o app na raiz do projeto ou num monorepo
(`apps/admin/src/...`).

### Publicar uma versão

1. Mudar `eslint/`, subir `version` no `eslint/package.json`.
2. `pnpm test` na raiz: o fixture (`eslint/test/fixture/`, um monorepo mínimo) roda o padrão como
   um projeto que instala o pacote (montado só com o que o `files` do `eslint/package.json` publica)
   e confere o que cada arquivo reprova: feature importando feature, base importando feature, pasta
   fora da estrutura, rota grossa e ciclo que só passa por alias. Regra nova da arquitetura ganha
   caso no fixture, e módulo novo do pacote entra no `files`. O workflow `Test` roda o mesmo em todo
   push e PR, inclusive nos do Renovate que sobem os plugins.
3. Commit e tag `eslint-vX.Y.Z` no mesmo commit, push da tag.
4. O Renovate abre em cada projeto o PR que troca a tag, com o lockfile; revisar e fazer o merge.

## Ruff: `ruff/base.toml` pelo hook `ruff-base`

O `extend` do Ruff só lê arquivo local (sem URL nem pacote), então o padrão chega ao projeto como
cópia, mantida por um hook de pre-commit deste repo:

```yaml
# .pre-commit-config.yaml
- repo: https://github.com/welt-studio/standards
  rev: ruff-v1.5.2
  hooks:
    - id: ruff-base
```

O hook escreve `ruff-base.toml` na raiz do projeto, igual ao `ruff/base.toml` do `rev`. Se a cópia
diverge (editada à mão, ou o `rev` mudou), ele a reescreve e reprova o commit uma vez, como um
formatter. A versão do padrão fica só no `rev`.

```toml
# <pacote>/ruff.toml
extend = "../../ruff-base.toml" # caminho até a raiz do projeto

[lint.isort]
known-first-party = ["app"]
```

**O hook do Ruff passa `--config <pacote>/ruff.toml`.** Rodando da raiz com o arquivo pelo nome
(como o pre-commit roda), o Ruff decide as exclusões (`extend-exclude` + `force-exclude`) com a
config padrão dele, e não com a do pacote: migrations e `vendor/` seriam conferidos e corrigidos no
commit. Com `--config`, a exclusão vale. Na CI, rodar de dentro do pacote também resolve.

```yaml
- id: ruff
  entry: uv run --project backend ruff check --fix --config backend/ruff.toml
```

**O padrão é o mesmo em todos os projetos.** O `ruff.toml` do pacote só declara fatos do projeto:
`known-first-party` e, em `extend-exclude` (que soma com o do base), código gerado fora das pastas
que o base já exclui. Regra, limite e exceção vêm do base; precisou de regra nova, ela entra aqui,
para todos, numa tag nova.

| Bloco                          | O que fixa                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `required-version`             | a versão mínima do Ruff, a primeira que conhece todas as regras do padrão. A exata é a do `uv.lock` do projeto. Sem `preview`, porque uma versão patch do Ruff pode mudar o que está em preview                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `select` explícito (sem `ALL`) | a união das famílias que os projetos usavam: pycodestyle, pyflakes, isort, naming, pyupgrade, bandit, bugbear, pylint, async, timezone, pathlib, Ruff, tryceratops, logging (`LOG`), concatenação de string (`ISC001`/`ISC003`/`ISC004`), anotações, `TC`, FastAPI, Django, `noqa` sem código (`PGH004`) e sem uso (`RUF100`), `# type: ignore` sem o código da regra (`PGH003`). Desde a `ruff-v1.5.0`, também: estilo do pytest (`PT`), `breakpoint()` esquecido (`T10`), NumPy (`NPY`), `raise` (`RSE`), f-string (`FLY`), import relativo que sobe pasta (`TID252`) e mensagem de exceção numa variável (`EM`). Sem `INP`: as pastas que ela acusa (`tests/`, `scripts/`, `alembic/`) não são pacote de propósito, e o pytest no modo `importlib` não pede `__init__.py`. Sem `FA`: `from __future__ import annotations` é proibido (Python 3.14, PEP 649); `freezegun` também (relógio em teste é o `time-machine`) |
| Limites                        | complexidade 12 (igual ao ESLint), `max-args` 5, `max-branches` 12, `max-returns` 6, `max-statements` 50                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Runtime                        | `TC001`–`TC003` desligadas: no Python 3.14 mover import "só de tipo" para `TYPE_CHECKING` quase não ganha nada, e Pydantic, SQLAlchemy e FastAPI leem anotações em runtime. Fica o contrário (`TC004`: import de runtime escondido em `TYPE_CHECKING`), com Pydantic e rotas do FastAPI marcados como runtime                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Exceções padrão                | testes (assert, número mágico, fixture, tamanho); `@declared_attr` do SQLAlchemy como classmethod; migrations geradas e código de terceiros em `vendor/` ficam fora do lint e do format (`extend-exclude` + `force-exclude`), como no Prettier e no jscpd                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `[format]`                     | aspas duplas, espaço, `lf`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |

Os hooks `ruff` e `ruff-format` do projeto são locais (`uv run --project <pacote> ruff ...`), para
a versão do Ruff morar só no `uv.lock`.

### Publicar uma versão do padrão

1. Mudar `ruff/base.toml`. O `required-version` só sobe quando o padrão passa a usar uma regra que
   a versão mínima atual não conhece.
2. Commit e tag `ruff-vX.Y.Z` no mesmo commit, push da tag.
3. O Renovate troca o `rev` do hook `ruff-base` em cada projeto, no PR mensal.

### Subir o Ruff num projeto

É só o projeto: o pin `ruff==` do `pyproject.toml` e o `uv.lock`, sem tag aqui, e o Renovate faz
isso no PR mensal. O Ruff novo pode mudar o resultado do lint ou do format (as versões minor
promovem regras e mudam o estilo estável), e isso aparece na CI do próprio PR.

## Renovate: `renovate/default.json5`

A política de versões de todos os projetos, declarada uma vez. Cada projeto só a herda, com um
`renovate.json` na raiz. O Renovate roda no workflow do repositório privado `welt-studio/renovate`,
com um GitHub App da organização e saída de rede restrita a uma lista de domínios; nenhum serviço
de terceiros recebe o código:

```json
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": ["github>welt-studio/standards//renovate/default.json5"]
}
```

O preset é lido do `main`, sem tag: mudar a política aqui vale para todos no merge.

| Regra            | O que faz                                                                                                                                                                                                                                                                                         |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Calendário       | uma rodada por mês, na madrugada do dia 1 (`America/Sao_Paulo`), com a manutenção do lockfile junto                                                                                                                                                                                               |
| Idade mínima     | a versão mais nova com pelo menos 7 dias de publicada; sem data no registro, fica retida. A trava do pnpm (`minimumReleaseAge` do `pnpm-workspace.yaml`) continua na instalação                                                                                                                   |
| Agrupamento      | um PR por projeto com tudo que não é major; cada major no seu                                                                                                                                                                                                                                     |
| Merge            | todo PR espera a aprovação do PO. O merge automático está desligado até a CI dos projetos montar as imagens Docker em PR e testar o que cada PR muda (o motivo e como religar estão no preset)                                                                                                    |
| PR separado      | majors, minor do Python (depende de wheel do `torch`), major de Node e pnpm, e o `@welt-studio/eslint-config`                                                                                                                                                                                     |
| Segurança        | correção de vulnerabilidade (alerta do GitHub) abre PR na hora, fora do calendário e sem a idade mínima, todas num PR só por projeto (correções que dependem umas das outras resolvem o lockfile juntas). Correção do npm com menos de 7 dias ainda precisa do `minimumReleaseAgeExclude` do pnpm |
| Actions          | fixadas por SHA, com a versão num comentário                                                                                                                                                                                                                                                      |
| Fora do Renovate | os `overrides` do pnpm (correção de vulnerabilidade com faixa fechada) e o `rustsec/audit-check`, preso no commit do `main` até sair release em Node 24                                                                                                                                           |

Os gerenciadores do Renovate leem sozinhos `package.json` (inclusive `packageManager` e
`devEngines`), o `catalog` do pnpm, `pyproject.toml` e `uv.lock`, `.python-version`, Dockerfiles,
docker-compose, workflows e o `.pre-commit-config.yaml`. O preset acrescenta, por regex, o que eles
não leem: o `[tool.uv] required-version`, as imagens `ghcr.io/astral-sh/uv` e `ghcr.io/pnpm/pnpm`
(o GHCR não informa data, então andam pela versão do pacote no PyPI e no npm), o
`uvx <ferramenta>@<versão>` dos workflows e os pacotes deste repo pela tag de cada um
(`eslint-v*`, `tsconfig-v*`, `prettier-v*`). Esses pacotes chegam com o lockfile: o preset roda
`pnpm install --lockfile-only --ignore-scripts` no PR, o único comando que o runner permite
(`allowedCommands`), que recalcula o lockfile sem rodar código de pacote.

Duas regras ainda existem só por um projeto, cada uma com o débito que a tira no TECH_DEBT dele: o
`ARG PNPM_VERSION` (comichub, que deve usar o `FROM` direto como os outros) e o `UV_VERSION` do
instalador do nebulai (que deve ler o `required-version`). Regra nova no preset vale para todos;
versão escrita num lugar que só um projeto usa se corrige no projeto, não aqui.

Conferir uma mudança no preset antes do merge:
`npx --package renovate renovate-config-validator --no-global renovate/default.json5`.

## Pyright: `pyright/base.json` pelo hook `pyright-base`

O mesmo esquema do Ruff: o `extends` do Pyright só lê arquivo local, e o hook mantém a cópia na raiz
do projeto (o script `hooks/sync_base.py` é o mesmo dos dois hooks).

```yaml
# .pre-commit-config.yaml
- repo: https://github.com/welt-studio/standards
  rev: pyright-v1.1.1
  hooks:
    - id: pyright-base
```

```jsonc
// pyrightconfig.json, na raiz do projeto: só fatos dele
{
  "extends": "./pyright-base.json",
  "include": ["backend"],
  "venvPath": "backend",
  "venv": ".venv",
  // Código da aplicação em strict; o resto (testes) fica no standard da base.
  "strict": ["backend/app"],
}
```

| Bloco                                | O que fixa                                                                                                                                                                                          |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `typeCheckingMode`                   | `standard` em tudo; o código da aplicação sobe para strict pela lista `strict` do projeto (o strict cobra o contrato de cada função; nos testes, o ruído das fixtures sem anotação não paga a fila) |
| `reportUnnecessaryTypeIgnoreComment` | `# type: ignore` que não ignora nada reprova; o código da regra é cobrado pelo `PGH003` do Ruff                                                                                                     |
| `ignore`                             | código de terceiros em `vendor/` não é acusado (como no Ruff, no Prettier e no jscpd); quem o usa continua conferido contra os tipos dele. O projeto não declara `ignore`, que substituiria este    |

Nenhuma regra desligada: o projeto não declara `report*`. A versão do Pyright é o pin do
`pyproject.toml` de cada projeto, que o Renovate sobe. O hook do projeto checa os arquivos do commit
(a fatia que se commita); a CI checa o projeto inteiro e fica vermelha até a fila zerar, porque um
contrato quebrado aparece em quem chama a função, fora do commit.

**Projeto Django:** os stubs do Django são os do `django-types`, feitos para o Pyright. O
`django-stubs` depende do plugin do mypy, e sem ele todo campo de model sai `Unknown`. Os stubs do
DRF continuam os do `djangorestframework-stubs` (o `djangorestframework-types` está parado e perde o
tipo genérico do serializer). Como este puxa o `django-stubs` por dependência, e os dois se instalam
na mesma pasta, o `pyproject.toml` o exclui:

```toml
[tool.uv]
exclude-dependencies = ["django-stubs", "django-stubs-ext"]
```

No comichub, a troca levou o Pyright de 2374 para 1476 erros (2026-10-26).

## TypeScript: `@welt-studio/tsconfig`

Pacote em `tsconfig/`, instalado por tag do git como o do ESLint:

```json
"@welt-studio/tsconfig": "github:welt-studio/standards#tsconfig-v1.0.1&path:/tsconfig"
```

```jsonc
// tsconfig.json do projeto: só fatos dele
{
  "extends": "@welt-studio/tsconfig/base.json",
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM"],
    "jsx": "react-jsx",
    "noEmit": true,
  },
  "include": ["src"],
}
```

A base liga, além do `strict`: `noUncheckedIndexedAccess` (acesso por índice pode ser `undefined`),
`noImplicitOverride`, `noImplicitReturns`, `noFallthroughCasesInSwitch`, `verbatimModuleSyntax`,
`isolatedModules` e `erasableSyntaxOnly` (sem `enum` nem parameter property). Variável e parâmetro
sem uso ficam com o ESLint. Módulo `ESNext` com resolução `bundler`, `skipLibCheck`.

O `tsc` checa o projeto inteiro (não há "só os arquivos do commit"): com a base adotada, a CI fica
vermelha até o projeto zerar os erros que ela acusa, que estão no índice de adequação dele.

## Prettier: `@welt-studio/prettier-config` e o hook `prettier-base`

Pacote em `prettier/`, instalado por tag do git como os outros, e declarado no `package.json` do
projeto, que não tem `.prettierrc`:

```json
"prettier": "@welt-studio/prettier-config",
"devDependencies": {
  "@welt-studio/prettier-config": "github:welt-studio/standards#prettier-v1.1.1&path:/prettier"
}
```

O estilo é o padrão do Prettier (aspas duplas, vírgula no fim em tudo, parênteses na arrow
function, `lf`), com `printWidth` 100. O plugin de GLSL vem no pacote: formata shader
(`.glsl`, `.vert`, `.frag`) e não faz nada em projeto sem shader. O `prettier` (3) é
`peerDependency`, na versão do projeto.

O `.prettierignore` fica só com o que é versionado e não se formata (lockfiles, `*.gen.ts`,
`vendor/`, `*.min.*`, templates Jinja/Django). Ele não herda arquivo de pacote, então é cópia do
`prettier/ignore`, mantida pelo hook `prettier-base` (o mesmo `hooks/sync_base.py` do Ruff e do
Pyright).
Projeto em que o Prettier roda de dentro de uma pasta passa a pasta em `args`:

```yaml
# .pre-commit-config.yaml
- repo: https://github.com/welt-studio/standards
  rev: prettier-v1.1.1
  hooks:
    - id: prettier-base
      args: [frontend] # só onde o Prettier roda de `frontend/`
```

O hook do Prettier é o mesmo em todo projeto: `pnpm exec prettier --write --ignore-unknown`, nos
arquivos do commit; na CI, o TS/JS fora do formato reprova pelo `prettier/prettier` do ESLint. O
projeto inteiro se formata pelo mesmo hook, nunca por `prettier .` direto:
`uvx pre-commit@4.7.0 run prettier --all-files`. O hook só recebe arquivo versionado e respeita o
`exclude` dele; o `prettier .` lê só o `.gitignore` da pasta de onde roda (não os de subpastas) e
entraria em `dist/`, artefatos e pastas ignoradas mais abaixo.

## jscpd: `jscpd/` pelo hook `jscpd-base`

O jscpd não herda config de pacote, então o padrão chega como cópia, pelo mesmo `hooks/sync_base.py`: o
hook `jscpd-base` mantém na raiz do projeto o `.jscpd.json` (a trava) e o `.jscpd-semantic.json` (o
relatório semântico). O JSON do jscpd não aceita comentário nem chave a mais (avisa campo
desconhecido a cada execução), então a cópia sai sem o aviso de "gerado, não edite": ele fica no
comentário do bloco do hook no `.pre-commit-config.yaml` do projeto, e o hook desfaz qualquer
edição da cópia.

```yaml
# .pre-commit-config.yaml
- repo: https://github.com/welt-studio/standards
  rev: jscpd-v1.0.2
  hooks:
    - id: jscpd-base
```

| Arquivo                            | O que fixa                                                                                                                                                                                                                                                                                        |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.jscpd.json` (trava)              | Python, TS/TSX, JS/JSX e Rust, no repo inteiro; qualquer clone reprova (`exitCode` 1). Fora: o que o git ignora (o jscpd lê o `.gitignore`), migrations, `*.gen.ts`, `vendor/` e `*.min.*`. Linhas de import (TS/JS e Python) não contam: dois arquivos com os mesmos imports não duplicam lógica |
| `.jscpd-semantic.json` (relatório) | código que faz a mesma coisa escrito diferente, fora dos testes; não reprova. O projeto passa a pasta do relatório com `-o`                                                                                                                                                                       |

O hook da trava é o mesmo em todo projeto, sobre o repo inteiro (`pass_filenames: false`: a cópia
que importa é a de uma função que já existe em outro arquivo):
`pnpm exec jscpd .` na raiz, ou `bash -c 'cd frontend && pnpm exec jscpd -c ../.jscpd.json ..'` onde
o Node fica em `frontend/`. A versão do jscpd é a do lockfile do projeto. Os relatórios de código
morto e complexidade (`.jscpd-health.json`) são do projeto, porque os pontos de entrada são fatos
dele.

## pnpm: scripts de instalação das dependências

Nenhuma dependência roda script de instalação (`preinstall`/`install`/`postinstall`), e o projeto
só se instala pelo pnpm. São duas declarações, iguais em todo projeto, sem lista de pacotes:

```yaml
# pnpm-workspace.yaml
strictDepBuilds: false
```

```json
// package.json (a versão do pnpm fica só no `packageManager`)
"devEngines": {
  "packageManager": { "name": "pnpm", "onFail": "error" }
}
```

| Regra                                                          | Por quê                                                                                                                                                                                                                                                     |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sem `allowBuilds`                                              | no pnpm, pacote fora do `allowBuilds` nunca roda script. Sem lista, nada roda, em nenhuma versão (um `true` liberaria também as versões futuras: o cenário do worm Shai-Hulud). Pacote que precise mesmo do script é exceção do PO, registrada no TECH_DEBT |
| `strictDepBuilds: false`                                       | com ele ligado (o padrão), cada pacote com script teria de ser listado à mão como `false` só para a instalação não travar, inclusive os de outro sistema (o `fsevents` do macOS). Desligado, a instalação passa e avisa: `Ignored build scripts: …`         |
| `devEngines.packageManager` com `onFail: "error"`              | `npm install` reprova (`EBADDEVENGINES`) sem instalar nada, então não há `.npmrc` a manter                                                                                                                                                                  |
| Sem `ignoreScripts` e sem `--ignore-scripts` no `pnpm install` | já não roda script nenhum; essas formas também pulam os scripts do próprio projeto e não avisam o que foi pulado                                                                                                                                            |

O hook `pnpm-base` (`hooks/check_pnpm.py`) trava a política: reprova o commit se faltar o
`strictDepBuilds: false` ou o `devEngines.packageManager`, ou se voltar `allowBuilds`,
`onlyBuiltDependencies`, `dangerouslyAllowAllBuilds` ou `ignoreScripts`. Use o pnpm do
`packageManager`: versões antigas do pnpm 12 reescrevem o `pnpm-workspace.yaml` a cada instalação
com um `allowBuilds` de placeholders, que o hook então acusa.

```yaml
# .pre-commit-config.yaml
- repo: https://github.com/welt-studio/standards
  rev: pnpm-v1.0.0
  hooks:
    - id: pnpm-base
      args: [frontend] # só onde o pnpm-workspace.yaml não está na raiz
```

O `pnpm-lock.yaml` do pnpm 12 tem dois documentos YAML (o primeiro fixa o próprio pnpm, o segundo é
o lock), e o `check-yaml` recusa arquivo assim. A flag `--allow-multiple-documents` entra **só no
lockfile**, num hook próprio: valendo para todos os YAMLs, um `---` perdido num compose ou workflow,
que só lê o primeiro documento, passaria calado.

```yaml
# .pre-commit-config.yaml (repo pre-commit-hooks)
- id: check-yaml
  exclude: (^|/)pnpm-lock\.yaml$
- id: check-yaml
  name: Check YAML syntax (pnpm-lock, multi-documento)
  alias: check-yaml-pnpm-lock
  args: [--allow-multiple-documents]
  files: (^|/)pnpm-lock\.yaml$
```

## Testes (pytest): hook `pytest-base`

O pytest não tem `extends` e não mescla configs (vale o primeiro arquivo achado), então não há
cópia: o projeto é dono do `[tool.pytest.ini_options]` e do `[tool.coverage]`, e o hook
`pytest-base` (`hooks/check_pytest.py`) reprova, com o motivo, quando falta o que o padrão exige.

```yaml
# .pre-commit-config.yaml
- repo: https://github.com/welt-studio/standards
  rev: pytest-v1.0.0
  hooks:
    - id: pytest-base
      args: [backend] # a pasta do pacote Python, quando o pyproject.toml não está na raiz
```

| Exigido                                                                                                                          | Por quê                                                                                                                |
| -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `strict = true`                                                                                                                  | pytest 9: marker não declarado, opção de config desconhecida e `xfail` que passa viram erro                            |
| `filterwarnings` começando por `"error"`                                                                                         | aviso (depreciação, inclusive) reprova na hora                                                                         |
| `python_files = ["test_*.py"]`                                                                                                   | uma forma só de nome de arquivo de teste                                                                               |
| `addopts` com `--disable-socket` e `--allow-hosts=<hosts>`                                                                       | teste não acessa a rede; os hosts liberados (banco local) são fato do projeto                                          |
| `timeout = 60`                                                                                                                   | teste travado falha; o lento de propósito declara `@pytest.mark.timeout(...)`                                          |
| `[tool.coverage.run]` `branch = true`, `source`, sem `omit`                                                                      | a cobertura conta os dois lados de cada `if`, sobre todo o código da aplicação                                         |
| `[tool.coverage.report]` `fail_under = 80`                                                                                       | piso igual para todos (o do front é o mesmo)                                                                           |
| `[dependency-groups] dev` com `pytest-cov`, `pytest-xdist`, `pytest-randomly`, `pytest-timeout`, `pytest-socket`, `time-machine` | cobertura, paralelismo, ordem aleatória (pega teste que depende de outro), timeout, rede bloqueada, relógio controlado |

Fica com o projeto o que é fato dele: `testpaths`, `pythonpath`, markers, `asyncio_mode`,
`DJANGO_SETTINGS_MODULE`, o número de workers do xdist. Na CI, a suíte roda com
`uv run pytest --cov --cov-report=term-missing:skip-covered`. Os testes do hook ficam em
`tests/test_check_pytest.py` (ver "Desenvolver este repo").

## Testes (vitest): `@welt-studio/vitest-config`

Pacote em `vitest/`, instalado por tag do git como os outros. O projeto só declara os aliases (e um
setup próprio, se tiver):

```typescript
// vitest.config.ts
import { weltVitestConfig } from "@welt-studio/vitest-config";
import { mergeConfig } from "vitest/config";

import viteConfig from "./vite.config";

export default mergeConfig(weltVitestConfig(), { resolve: viteConfig.resolve });
```

| O que fixa                                               | Por quê                                                                                                                                                                                                                                                                                                              |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `jsdom`, `--no-webstorage`                               | o `localStorage` do Node 25+ cobriria o do jsdom                                                                                                                                                                                                                                                                     |
| `globals: false`                                         | `describe`/`it`/`expect` importados de `"vitest"`: sem import, o `tsc` reprova                                                                                                                                                                                                                                       |
| `include: ["src/**/*.test.{ts,tsx}"]`                    | teste unitário ao lado do arquivo que testa; E2E é do Playwright                                                                                                                                                                                                                                                     |
| `sequence.shuffle`                                       | ordem aleatória                                                                                                                                                                                                                                                                                                      |
| Cobertura v8 sobre `src/**`, piso 80 nas quatro métricas | o mesmo piso do backend, contando o código que nenhum teste importa                                                                                                                                                                                                                                                  |
| Setup                                                    | `jest-dom`, `cleanup()` entre testes (sem `globals` o Testing Library não limpa sozinho) e o servidor MSW com `onUnhandledFrame: "error"`: requisição sem handler reprova, nada sai para a rede. O projeto registra os handlers com `server.use(...)` (`import { server } from "@welt-studio/vitest-config/server"`) |

O jsdom e o `@vitest/coverage-v8` vêm do pacote. O que o teste importa (`@testing-library/react`,
`@testing-library/dom`, `@testing-library/jest-dom`, `msw`) o projeto declara, porque o pnpm só
deixa importar o que está no `package.json` (e o Knip cobra o mesmo); os `peerDependencies` do
pacote dizem as versões aceitas. Projeto sem nenhum teste reprova na CI (`vitest run` sem arquivo
de teste sai com erro). Scripts: `test` (`vitest run`) e `test:coverage` (`vitest run --coverage`),
este na CI.
