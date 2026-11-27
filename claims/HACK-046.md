# HACK-046
ID: HACK-046
State: CLAIMED
Owner: dylan-0
Branch: feat/hack-046
Worktree: /Users/dylanmartinezcastillo/Documents/Repositorios/Hackathon/Negosocios-wt/hack-046
Worklog: worklog/WL-1795819851-dylan-0-HACK-046-hack.9i9Y92.md
Priority: P1
Paths: app/services/profile.py, app/routers/profile.py, app/tests/test_profile.py, app/fixtures/population/profiles.json, web/src/features/perfil/, web/src/features/mipagina/, web/src/features/explorar/
Depends: HACK-024, HACK-036
Verify: `uv run pytest -q app/tests/test_profile.py && npm --prefix web test -- --run src/features/perfil src/features/mipagina src/features/explorar && npm --prefix web run build && bash .uak/bin/design-lint`
Lease-Until: 1795822551
Updated: 1795819851
Task-Base: 3e7339c86cf5ddc0b6cf5557c1b924c269a7e55c
Next: Definir contrato de perfil público y pruebas profile_roundtrip_saves_menu_and_description en rojo
PR: -
Evidence: -
Thread-Read: 211
