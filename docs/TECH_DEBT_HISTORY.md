# Débitos Técnicos — Histórico

## Arquitetura / Design

### [Pyright] Hook `pyright-django` para os stubs do Django

- [x] **Severidade**: Baixa · `2026-10-27`
- **Descrição**: proposta de pôr no standards um hook opt-in com a configuração de Pyright para
  projeto Django (stubs `django-types`/`djangorestframework-stubs`), depois da comparação
  Pyright × Pyrefly × mypy, em que o padrão ficou no Pyright.
- **Sugestão**: hook `pyright-django` no `.pre-commit-hooks.yaml`, usado só por projeto Django.
- **Resolvido**: `2026-10-30` — Descartado (decisão do PO): o comichub, único projeto Django,
  resolveu os stubs no próprio projeto, e um hook que só um projeto usa vai contra o padrão único.
  Volta a valer se um segundo projeto Django entrar.
