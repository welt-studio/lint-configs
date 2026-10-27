import type { Linter } from "eslint";

export interface WeltConfigOptions {
  /** Pasta do `tsconfig.json` (em geral `import.meta.dirname`). */
  tsconfigRootDir: string;
  /** Arquivos lintados com tipo (regras de TS e React). Padrão: `["**\/*.{ts,tsx}"]`. */
  files?: string[];
  /**
   * Arquivos fora de qualquer `tsconfig` (scripts, configs de ferramenta, `.mjs`): recebem o padrão
   * sem as regras que exigem tipo, com os globais do Node. Não podem casar com `files`.
   * Padrão: `["**\/*.{js,jsx,mjs,cjs}"]`.
   */
  untypedFiles?: string[];
  /** Liga React (`@eslint-react`), React Hooks e acessibilidade. Padrão: `true`. */
  react?: boolean;
  /**
   * App Vite: no código do app, globais do navegador, Fast Refresh e a arquitetura do padrão em
   * `src/` (camadas, direção dos imports, rota fina); as configs de ferramenta (`*.config.ts`) ficam
   * com os do Node. Sem ele, os arquivos com tipo recebem os globais do Node (pacote ou biblioteca).
   */
  framework?: "vite";
  /** Liga as regras do TanStack Query. Padrão: `false`. */
  query?: boolean;
  /**
   * Produto traduzido: texto no JSX (entre tags ou em atributo que não seja código, como rota,
   * `data-*`, ícone e classe) e texto de toast só pelo catálogo de mensagens. Testes ficam de fora.
   * Padrão: `false`.
   */
  i18n?: boolean;
  /**
   * Ignores do projeto (código gerado ou de terceiros que está no git), somados aos comuns. O que o
   * git ignora (`.gitignore`) já fica de fora sem constar aqui.
   */
  ignores?: string[];
}

export function weltConfig(options: WeltConfigOptions): Linter.Config[];
