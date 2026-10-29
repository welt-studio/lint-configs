"""Leitura do `pyproject.toml` de um pacote Python, comum aos hooks que o conferem (`pytest-base`,
`deptry`): o arquivo, o erro de TOML e o grupo `dev` são lidos de um jeito só.

Python stdlib, sem dependências.
"""

import re
import sys
import tomllib
from pathlib import Path

from parsed import Table, items, table


def load(path: Path, hook: str) -> Table | None:
    """O `pyproject.toml` em `path`; `None`, com o motivo no stderr, quando falta ou não é TOML."""
    if not path.is_file():
        sys.stderr.write(f"{hook}: {path} não existe\n")
        return None
    try:
        return tomllib.loads(path.read_text(encoding="utf-8"))
    except tomllib.TOMLDecodeError as error:
        sys.stderr.write(f"{hook}: {path} não é TOML válido: {error}\n")
        return None


def requirement_name(requirement: str) -> str:
    """Nome normalizado (PEP 503) de um requisito como `pytest-cov==7.1.0`."""
    match = re.match(r"[A-Za-z0-9._-]+", requirement.strip())
    return re.sub(r"[-_.]+", "-", match.group(0)).lower() if match else ""


def dev_dependencies(config: Table) -> set[str]:
    """Nomes normalizados do grupo `dev` (`[dependency-groups]`); vazio quando ele falta."""
    dev = items(table(config.get("dependency-groups")).get("dev"))
    return {requirement_name(item) for item in dev if isinstance(item, str)}
