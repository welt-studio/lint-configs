#!/usr/bin/env python3
"""Hooks `ruff-base`, `pyright-base` e `prettier-base`: mantêm no projeto a cópia do padrão da tag.

O Ruff (`extend`) e o Pyright (`extends`) só leem arquivo local, e o Prettier não herda arquivo de
exclusão de pacote, então o padrão chega ao projeto como cópia, e a config do projeto herda dela.
O hook roda da cópia deste repo que o pre-commit baixou no `rev` declarado: a versão do padrão fica
só nesse `rev`. Como um formatter, reescreve a cópia quando ela diverge (ou não existe) e sai com
1; a segunda rodada passa. Python stdlib, sem dependências.

Uso: `sync_base.py <ruff|pyright|prettier> [pasta]`. A cópia vai na raiz do projeto, ou na `pasta`
(relativa à raiz) quando a ferramenta roda de dentro dela, como o Prettier em `frontend/`.
"""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent

# Padrão: (arquivo do padrão neste repo, nome da cópia no projeto, marca de comentário).
BASES = {
    "ruff": ("ruff/base.toml", "ruff-base.toml", "#"),
    "pyright": ("pyright/base.json", "pyright-base.json", "//"),
    "prettier": ("prettier/ignore", ".prettierignore", "#"),
}


def header(name: str, source: str, comment: str) -> str:
    lines = (
        f"GERADO pelo hook `{name}-base` de github.com/welt-studio/lint-configs ({source}).",
        "NÃO EDITE: o hook desfaz qualquer mudança. A versão do padrão é o `rev` desse hook no",
        ".pre-commit-config.yaml; regra nova entra no lint-configs, para todos os projetos.",
    )
    return "".join(f"{comment} {line}\n" for line in lines) + "\n"


def main(args: list[str]) -> int:
    if len(args) not in (1, 2) or args[0] not in BASES:
        sys.stderr.write(f"uso: sync_base.py <{'|'.join(BASES)}> [pasta]\n")
        return 2
    name = args[0]
    source, target_name, comment = BASES[name]
    target = Path(*args[1:], target_name)
    expected = header(name, source, comment) + (ROOT / source).read_text(encoding="utf-8")
    current = target.read_text(encoding="utf-8") if target.exists() else None
    if current == expected:
        return 0
    target.write_text(expected, encoding="utf-8", newline="\n")
    action = "criado" if current is None else "restaurado"
    sys.stdout.write(
        f"{name}-base: {target} {action} a partir do padrão (lint-configs). Adicione-o ao commit.\n"
    )
    return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
