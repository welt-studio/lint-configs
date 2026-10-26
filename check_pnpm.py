#!/usr/bin/env python3
"""Hook `pnpm-base`: confere no projeto a política de scripts de instalação do padrão.

Nenhuma dependência roda script de instalação e o projeto só se instala pelo pnpm, com duas
declarações (README, "pnpm: scripts de instalação das dependências"): `strictDepBuilds: false` no
`pnpm-workspace.yaml`, sem `allowBuilds`, e `devEngines.packageManager` com o pnpm e
`onFail: "error"` no `package.json`. O hook reprova, com o motivo, quando uma delas falta ou quando
volta o que elas substituem. Python stdlib, sem dependências.

Uso: `check_pnpm.py [pasta]`, com a pasta do `pnpm-workspace.yaml` (relativa à raiz) quando ele não
está na raiz, como em `frontend/`.
"""

import json
import re
import sys
from pathlib import Path

# Chave de primeiro nível do YAML (coluna 0), com o valor e um comentário opcional. O
# `pnpm-workspace.yaml` só precisa ser lido nas chaves de primeiro nível, e a stdlib não tem YAML.
TOP_LEVEL_KEY = re.compile(r"^(?P<key>[A-Za-z][\w-]*):(?P<value>[^#]*)")

# O que a política substitui: lista de pacotes (cada `true` liberaria as versões futuras), e os
# desligamentos que pulam também os scripts do projeto sem avisar o que foi pulado.
FORBIDDEN_KEYS = {
    "allowBuilds": "sem `allowBuilds`: pacote fora dele nunca roda script",
    "onlyBuiltDependencies": "sem `onlyBuiltDependencies` (a lista antiga, removida no pnpm 11)",
    "dangerouslyAllowAllBuilds": "sem `dangerouslyAllowAllBuilds`: liberaria todo script",
    "ignoreScripts": "sem `ignoreScripts`: o `strictDepBuilds: false` já não roda nada e avisa",
}


def top_level_keys(text: str) -> dict[str, str]:
    keys = {}
    for line in text.splitlines():
        match = TOP_LEVEL_KEY.match(line)
        if match:
            keys[match["key"]] = match["value"].strip()
    return keys


def workspace_problems(text: str) -> list[str]:
    keys = top_level_keys(text)
    problems = []
    if keys.get("strictDepBuilds") != "false":
        problems.append("pnpm-workspace.yaml: `strictDepBuilds: false`")
    problems.extend(
        f"pnpm-workspace.yaml: {reason}" for key, reason in FORBIDDEN_KEYS.items() if key in keys
    )
    return problems


def package_problems(package: dict) -> list[str]:
    manager = package.get("devEngines", {}).get("packageManager", {})
    if manager.get("name") == "pnpm" and manager.get("onFail") == "error":
        return []
    expected = '{ "name": "pnpm", "onFail": "error" }'
    return [f"package.json: `devEngines.packageManager` = {expected} (o npm recusa o projeto)"]


def main(args: list[str]) -> int:
    if len(args) > 1:
        sys.stderr.write("uso: check_pnpm.py [pasta]\n")
        return 2
    folder = Path(*args)
    workspace = folder / "pnpm-workspace.yaml"
    package = folder / "package.json"
    missing = [str(path) for path in (workspace, package) if not path.is_file()]
    if missing:
        sys.stderr.write(f"pnpm-base: não existe: {', '.join(missing)}\n")
        return 1
    found = workspace_problems(workspace.read_text(encoding="utf-8")) + package_problems(
        json.loads(package.read_text(encoding="utf-8"))
    )
    if not found:
        return 0
    sys.stderr.write("pnpm-base: fora do padrão de scripts de instalação da Welt Studio:\n")
    sys.stderr.writelines(f"  - falta {item}\n" for item in found)
    return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
