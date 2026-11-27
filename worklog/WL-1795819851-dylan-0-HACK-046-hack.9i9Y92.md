# worklog/WL-1795819851-dylan-0-HACK-046-hack.9i9Y92.md · HACK-046

## Live summary
- Done: WIP 67ab591: backend+UI pruebas y stubs; RED_OK backend None != descripcion; RED_OK frontend falta perfil/editor/Ver negocio
- Decision: Contrato public_business_profiles JSON allowlist; schedule canónico network_profiles; 36 fixtures insert-only; edición mantiene modelo de prototipo actual sin ampliar auth
- Why: No tocar db.py ni populate/main fuera de Paths; datos públicos excluyen bancarios, costes, ubicación exacta y order_id de reseña
- Failing: Implementación pendiente: servicios retornan {}; UI stubs. Test explorar existente exige enlace antiguo; permiso --tests solicitado a human msg222.
- Commands: uak red HACK-046 -- uv run pytest -q app/tests/test_profile.py; uak red HACK-046 -- npm --prefix web test -- --run src/features/perfil src/features/mipagina src/features/explorar
- Next: Implementar profile.py modelos validados y store JSON; profiles.json de 36 productos sin costes; GET/PUT sincronizan schedule network; construir Perfil y MiPagina compartiendo renderer; sustituir enlace Explorar al recibir permiso. Luego Verify, browser, critic y REVIEW.

## History
- 1795819851 | CLAIMED | dylan-0 | claim; next: Definir contrato de perfil público y pruebas profile_roundtrip_saves_menu_and_description en rojo | Harness: unknown | Model: unknown
- 1795820044 | CLAIMED | dylan-0 | pending decision HACK-046-1795820044; option: Mantener modelo de edición del prototipo existente; contrato público allowlist sin datos bancarios. Horario canónico en network_profiles compartido con Explorar.; Why: La tarea exige PUT para puesto activo y no incluye un sistema de propiedad/autenticación; introducirlo ampliaría alcance. Se valida privacidad y coherencia de horarios. | Harness: unknown | Model: unknown
- 1795820166 | CLAIMED | dylan-0 | checkpoint; next: Implementar profile.py modelos validados y store JSON; profiles.json de 36 productos sin costes; GET/PUT sincronizan schedule network; construir Perfil y MiPagina compartiendo renderer; sustituir enlace Explorar al recibir permiso. Luego Verify, browser, critic y REVIEW. | Harness: unknown | Model: unknown
- 1795820172 | CLAIMED | dylan-0 | handoff; next: Implementar profile.py modelos validados y store JSON; profiles.json de 36 productos sin costes; GET/PUT sincronizan schedule network; construir Perfil y MiPagina compartiendo renderer; sustituir enlace Explorar al recibir permiso. Luego Verify, browser, critic y REVIEW. | Harness: unknown | Model: unknown
- 1795820184 | AVAILABLE | dylan-0 | release; claim released by dylan-0; reason: -; summary kept | Harness: unknown | Model: unknown
- 1795820465 | CLAIMED | dylan-0 | claim; next: Implementar profile.py modelos validados y store JSON; profiles.json de 36 productos sin costes; GET/PUT sincronizan schedule network; construir Perfil y MiPagina compartiendo renderer; sustituir enlace Explorar al recibir permiso. Luego Verify, browser, critic y REVIEW. | Harness: unknown | Model: unknown
