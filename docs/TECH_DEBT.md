# Débitos Técnicos

## Produção / Infra

### [Renovate] `rustsec/audit-check` fora do Renovate, preso num commit do `main`

- [ ] **Severidade**: Média · `2026-10-28`
- **Arquivos**: `renovate/default.json5`
- **Descrição**: a última release do `rustsec/audit-check` é a v2.0.0 (2024), que roda em Node 20,
  e o GitHub está tirando o Node 20 dos runners. A migração para Node 24 (rustsec/audit-check#48)
  entrou no `main` em 2026-03-20, mas ainda não saiu em tag (conferido em 2026-10-28). Os projetos
  usam a action fixada no commit do `main`, e a regra `enabled: false` do preset impede o Renovate
  de propô-la: correção de segurança da própria action, ou release nova, não chega a ninguém
  sozinha.
- **Sugestão**: quando sair release com Node 24, tirar a regra do preset; o Renovate passa a
  fixar a action pelo SHA da tag, como as outras (`helpers:pinGitHubActionDigests`). Até lá,
  conferir a cada rodada mensal se a release saiu.

## Arquitetura / Design

### [Renovate] Regras de regex que existem só por causa do comichub e do nebulai

- [ ] **Severidade**: Baixa · `2026-10-28`
- **Arquivos**: `renovate/default.json5`
- **Descrição**: dois `customManagers` do preset, que vale para todos os projetos, carregam padrão
  que só um projeto usa. No de uv, o `managerFilePatterns` `"/(^|/)scripts/[^/]+\\.m?js$/"` e o
  `matchStrings` `UV_VERSION\s*=\s*"…"` existem só pela constante do instalador do nebulai, que
  repete a versão do uv em vez de ler o `[tool.uv] required-version`. No de pnpm, o `matchStrings`
  `ARG PNPM_VERSION=…` existe só pelo Dockerfile do comichub, que declara a versão num `ARG` em
  vez do `FROM ghcr.io/pnpm/pnpm:<versão>` direto dos outros. Enquanto isso, o preset varre
  `scripts/*.mjs` de todo projeto e aceita `ARG PNPM_VERSION` como forma válida. No
  `eslint/index.mjs` e no `eslint/i18n.mjs` não há regra exclusiva de projeto: as listas de
  atributos e chamadas do i18n são genéricas (o comentário do pg-studio no `commonIgnores` só conta
  o caso que motivou o `**/`).
- **Sugestão**: corrigir nos projetos (débitos já registrados no TECH_DEBT de cada um): o
  instalador do nebulai lê o `required-version`, e o Dockerfile do comichub usa o `FROM` direto.
  Feito isso, sai do preset o terceiro padrão de arquivo e o terceiro `matchStrings` do uv, e o
  segundo `matchStrings` do pnpm.

## DX (Developer Experience)

### [ESLint] Resolver do TypeScript ignora os `tsconfig` quando o `cwd` do ESLint difere do processo

- [ ] **Severidade**: Média · `2026-10-28`
- **Arquivos**: `eslint/package.json`, `eslint/test/architecture.test.mjs`
- **Descrição**: o `eslint-import-resolver-typescript` 4.4.5 (a última versão publicada) deixa de
  usar os `tsconfig.json` (e com eles os aliases `@/…`) quando o `cwd` do ESLint é diferente do
  diretório do processo. É o que acontece na extensão ESLint do VS Code quando a pasta aberta não é
  a do `eslint.config.mjs` (num monorepo, por exemplo): os imports por alias não resolvem, e as
  regras de arquitetura (`boundaries/dependencies`) e o `import-x/no-cycle` ficam caladas no
  editor. Na linha de comando, no pre-commit e na CI (que rodam na raiz do projeto) o padrão vale
  inteiro. O teste do pacote roda com o processo na pasta do fixture por isso.
- **Sugestão**: correção upstream no `eslint-import-resolver-typescript`; a issue com o caso
  mínimo só se abre com o OK do PO. Corrigido, subir a versão no `eslint/package.json` e conferir
  o teste com o processo fora da pasta do fixture.
