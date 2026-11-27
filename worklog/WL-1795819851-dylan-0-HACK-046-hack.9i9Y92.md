# worklog/WL-1795819851-dylan-0-HACK-046-hack.9i9Y92.md · HACK-046

## Live summary
- Done: Claim created; implementation pending
- Decision: Own branch and worktree
- Why: Parallel work without touching the main checkout
- Failing: No validation run yet
- Commands: `uv run pytest -q app/tests/test_profile.py && npm --prefix web test -- --run src/features/perfil src/features/mipagina src/features/explorar && npm --prefix web run build && bash .uak/bin/design-lint`
- Next: Definir contrato de perfil público y pruebas profile_roundtrip_saves_menu_and_description en rojo

## History
- 1795819851 | CLAIMED | dylan-0 | claim; next: Definir contrato de perfil público y pruebas profile_roundtrip_saves_menu_and_description en rojo | Harness: unknown | Model: unknown
- 1795820044 | CLAIMED | dylan-0 | pending decision HACK-046-1795820044; option: Mantener modelo de edición del prototipo existente; contrato público allowlist sin datos bancarios. Horario canónico en network_profiles compartido con Explorar.; Why: La tarea exige PUT para puesto activo y no incluye un sistema de propiedad/autenticación; introducirlo ampliaría alcance. Se valida privacidad y coherencia de horarios. | Harness: unknown | Model: unknown
