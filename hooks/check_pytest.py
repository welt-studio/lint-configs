#!/usr/bin/env python3
"""Hook `pytest-base`: confere no `pyproject.toml` do projeto as opções do padrão de testes.

O pytest não tem `extends` e não mescla configs (vale o primeiro arquivo achado), então o padrão não
chega como cópia, como no Ruff e no Pyright: o projeto é dono do `[tool.pytest.ini_options]` e do
`[tool.coverage]`, e este hook reprova, com o motivo, quando falta o que o padrão exige. O que é
fato do projeto (`testpaths`, markers, `asyncio_mode`, os hosts liberados, os módulos nossos do
`filterwarnings`) fica com ele. Python stdlib, sem dependências.

Uso: `check_pytest.py [pasta]`, com a pasta do pacote Python (relativa à raiz) quando o
`pyproject.toml` não está na raiz.
"""

import re
import shlex
import sys
from itertools import pairwise
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
TEST_FILE_PREFIX = "test_"
PYTHON_FILES = [f"{TEST_FILE_PREFIX}*.py"]
# O filtro de avisos vale para o processo inteiro: com só `"error"`, aviso que nasce dentro de uma
# lib reprova teste nosso. Depois do `"error"`, a única forma aceita é a fronteira, inteira:
# `"default"` (aviso de lib aparece no relatório) e os `"error"` do que é nosso (o pytest aplica a
# última regra que casar). Exceção por lib ou por mensagem não entra: com a fronteira ela nunca é
# necessária.
WARNINGS_FIRST = "error"
WARNINGS_THIRD_PARTY = "default"
# Aviso do próprio pytest sobre os nossos testes (classe não coletada, exceção perdida numa thread,
# teste que devolve valor): sai sem módulo nosso, então só a categoria o pega.
WARNINGS_PYTEST = "error::pytest.PytestWarning"
# Recurso não fechado (conexão, arquivo): o aviso sai quando o coletor destrói o objeto e fica com o
# módulo que rodava naquela hora, não com quem abriu; por módulo, ia para o relatório.
WARNINGS_RESOURCE = "error::ResourceWarning"
# Módulo de teste em qualquer modo de import (`test_x`, `tests.test_x`) e o `conftest`.
WARNINGS_TESTS = rf"error:::(.+\.)?({TEST_FILE_PREFIX}\w*|conftest)$"
BOUNDARY_PROBLEM = "[tool.pytest.ini_options] filterwarnings sem exceção"
PACKAGES_PROBLEM = "[tool.coverage.run] source com os pacotes pelo nome de import"
WARNINGS_FLAGS_PROBLEM = "[tool.pytest.ini_options] addopts sem -W nem -p no:warnings"
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


def package_name(source: object) -> str | None:
    """O nome de import de uma entrada do `source` (`app`, `app/core` → `app.core`)."""
    name = str(source).replace("/", ".").strip(".")
    return name if name and all(part.isidentifier() for part in name.split(".")) else None


def package_filter(package: str) -> str:
    # O módulo do filtro é regex ancorada só no início: sem o fim, `app` pegaria a lib `apprise`.
    return rf"{WARNINGS_FIRST}:::{re.escape(package)}(\.|$)"


def warnings_boundary(packages: list[str]) -> list[str]:
    return [
        WARNINGS_THIRD_PARTY,
        WARNINGS_PYTEST,
        WARNINGS_RESOURCE,
        WARNINGS_TESTS,
        *(package_filter(package) for package in packages),
    ]


def warnings_problems(options: Table, sources: list[object]) -> list[str]:
    warnings = [str(entry).strip() for entry in items(options.get("filterwarnings"))]
    if not warnings or warnings[0] != WARNINGS_FIRST:
        return [f'[tool.pytest.ini_options] filterwarnings começando por "{WARNINGS_FIRST}"']
    boundary = warnings[1:]
    # Sem fronteira, nada a conferir; sem `source`, o `coverage_problems` já reprova, e a fronteira
    # depende dele.
    if not boundary or not sources:
        return []
    packages = [package_name(source) for source in sources]
    valid = [package for package in packages if package is not None]
    if len(valid) != len(packages):
        return [f"{PACKAGES_PROBLEM} (a fronteira do filterwarnings sai deles)"]
    expected = warnings_boundary(valid)
    if boundary[0] == WARNINGS_THIRD_PARTY and sorted(boundary) == sorted(expected):
        return []
    rendered = ", ".join(f"'{entry}'" for entry in [WARNINGS_FIRST, *expected])
    return [
        (
            f"{BOUNDARY_PROBLEM}: depois do '{WARNINGS_FIRST}', nada, ou a fronteira inteira "
            f"[{rendered}] (aviso de lib não reprova)"
        )
    ]


def disables_warnings(tokens: list[str]) -> bool:
    """`-W`/`--pythonwarnings` ou `-p no:warnings`: filtro de linha de comando vence o do ini."""
    return any(
        flag.startswith(("-W", "--pythonwarnings", "-pno:warnings"))
        or (flag == "-p" and following == "no:warnings")
        for flag, following in pairwise([*tokens, ""])
    )


def pytest_problems(options: Table, sources: list[object]) -> list[str]:
    problems: list[str] = []
    if options.get("strict") is not True:
        problems.append(
            "[tool.pytest.ini_options] strict = true (marker, config e xfail estritos; pytest 9)"
        )
    problems += warnings_problems(options, sources)
    if options.get("python_files") != PYTHON_FILES:
        problems.append(f"[tool.pytest.ini_options] python_files = {PYTHON_FILES}")
    tokens = addopts_tokens(options.get("addopts"))
    if disables_warnings(tokens):
        problems.append(WARNINGS_FLAGS_PROBLEM)
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
    sources = items(table(table(tool.get("coverage")).get("run")).get("source"))
    return (
        pytest_problems(table(table(tool.get("pytest")).get("ini_options")), sources)
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
