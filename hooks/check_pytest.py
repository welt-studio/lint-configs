#!/usr/bin/env python3
"""Hook `pytest-base`: confere no `pyproject.toml` do projeto as opções do padrão de testes.

O pytest não tem `extends` e não mescla configs (vale o primeiro arquivo achado), então o padrão não
chega como cópia, como no Ruff e no Pyright: o projeto é dono do `[tool.pytest.ini_options]` e do
`[tool.coverage]`, e este hook reprova, com o motivo, quando falta o que o padrão exige. O que é
fato do projeto (`testpaths`, markers, `asyncio_mode`, os hosts liberados) fica com ele. Python
stdlib, sem dependências.

Uso: `check_pytest.py [pasta]`, com a pasta do pacote Python (relativa à raiz) quando o
`pyproject.toml` não está na raiz.
"""

import shlex
import sys
from pathlib import Path

from parsed import Table, items, table
from pyproject import dev_dependencies, load

HOOK = "pytest-base"

# Teste que passa disso trava a suíte: falha em vez de esperar para sempre. Teste lento de propósito
# declara o dele com `@pytest.mark.timeout(...)`.
TIMEOUT_SECONDS = 60
# Piso de cobertura, igual para todos (decisão do PO, 2026-10-25). O do front é o mesmo número, no
# `@welt-studio/vitest-config`.
COVERAGE_FLOOR = 80
PYTHON_FILES = ["test_*.py"]
# No grupo `dev` (`[dependency-groups]`): cobertura, paralelismo, ordem aleatória (pega teste que
# depende de outro), timeout, rede bloqueada e relógio controlado.
REQUIRED_PLUGINS = (
    "pytest-cov",
    "pytest-xdist",
    "pytest-randomly",
    "pytest-timeout",
    "pytest-socket",
    "time-machine",
)


def addopts_tokens(value: object) -> list[str]:
    if isinstance(value, str):
        return shlex.split(value)
    return [str(item) for item in items(value)]


def pytest_problems(options: Table) -> list[str]:
    problems: list[str] = []
    if options.get("strict") is not True:
        problems.append(
            "[tool.pytest.ini_options] strict = true (marker, config e xfail estritos; pytest 9)"
        )
    warnings = items(options.get("filterwarnings"))
    if not warnings or warnings[0] != "error":
        problems.append('[tool.pytest.ini_options] filterwarnings começando por "error"')
    if options.get("python_files") != PYTHON_FILES:
        problems.append(f"[tool.pytest.ini_options] python_files = {PYTHON_FILES}")
    tokens = addopts_tokens(options.get("addopts"))
    if "--disable-socket" not in tokens:
        problems.append("[tool.pytest.ini_options] addopts com --disable-socket (teste sem rede)")
    if not any(token.startswith("--allow-hosts") for token in tokens):
        problems.append("[tool.pytest.ini_options] addopts com --allow-hosts=<hosts do projeto>")
    # O `fail_under` do `[tool.coverage.report]` só vale quando a cobertura roda: sem `--cov` no
    # `addopts`, um `pytest` sem a flag passa abaixo do piso sem ninguém ver.
    if not any(flag == "--cov" or flag.startswith("--cov=") for flag in tokens):
        problems.append(
            "[tool.pytest.ini_options] addopts com --cov (o fail_under só vale com ele)"
        )
    if options.get("timeout") != TIMEOUT_SECONDS:
        problems.append(f"[tool.pytest.ini_options] timeout = {TIMEOUT_SECONDS}")
    return problems


def coverage_problems(coverage: Table) -> list[str]:
    problems: list[str] = []
    run = table(coverage.get("run"))
    if run.get("branch") is not True:
        problems.append("[tool.coverage.run] branch = true")
    if not run.get("source"):
        problems.append("[tool.coverage.run] source com as pastas do código da aplicação")
    if "omit" in run:
        problems.append("[tool.coverage.run] sem omit: o piso vale para todo o código do source")
    if table(coverage.get("report")).get("fail_under") != COVERAGE_FLOOR:
        problems.append(f"[tool.coverage.report] fail_under = {COVERAGE_FLOOR}")
    return problems


def plugin_problems(config: Table) -> list[str]:
    present = dev_dependencies(config)
    missing = [plugin for plugin in REQUIRED_PLUGINS if plugin not in present]
    if not missing:
        return []
    return [f"[dependency-groups] dev com: {', '.join(missing)}"]


def problems(config: Table) -> list[str]:
    tool = table(config.get("tool"))
    return (
        pytest_problems(table(table(tool.get("pytest")).get("ini_options")))
        + coverage_problems(table(tool.get("coverage")))
        + plugin_problems(config)
    )


def main(args: list[str]) -> int:
    if len(args) > 1:
        sys.stderr.write("uso: check_pytest.py [pasta]\n")
        return 2
    path = Path(*args, "pyproject.toml")
    config = load(path, HOOK)
    if config is None:
        return 1
    found = problems(config)
    if not found:
        return 0
    sys.stderr.write(f"{HOOK}: {path} fora do padrão de testes da Welt Studio:\n")
    sys.stderr.writelines(f"  - falta {item}\n" for item in found)
    return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
