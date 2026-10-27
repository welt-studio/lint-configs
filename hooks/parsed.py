"""Leitura tipada do que o `tomllib` e o `json` devolvem: os hooks conferem config de projeto, que
pode faltar ou vir com o tipo errado, e cada valor lido passa por aqui antes de ser usado.

Os dois parsers devolvem valor sem tipo; a tabela tem chave sempre em texto (TOML e JSON não têm
outra), e o resto é conferido por quem lê. Python stdlib, sem dependências.
"""

from typing import cast

# Tabela de TOML ou objeto de JSON já lido.
type Table = dict[str, object]


def table(value: object) -> Table:
    """`value` como tabela; vazia quando falta ou é de outro tipo."""
    return cast("Table", value) if isinstance(value, dict) else {}


def items(value: object) -> list[object]:
    """`value` como lista; vazia quando falta ou é de outro tipo."""
    return cast("list[object]", value) if isinstance(value, list) else []
