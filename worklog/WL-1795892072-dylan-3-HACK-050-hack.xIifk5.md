# worklog/WL-1795892072-dylan-3-HACK-050-hack.xIifk5.md · HACK-050

## Live summary
- Done: d71ba38:11 pruebas Explorar verdes; build/design-lint/smoke producto exit0; rojo registrado antes implementación
- Decision: Preview no modal, anclada sobre mapa desktop y bottom sheet móvil. Markers no se recrean al seleccionar para conservar foco; footer separado permanece visible.
- Why: Acceso al perfil sin cobro; skeleton mismo tamaño; fallback listado; cierre Escape/clic fuera/botón devuelve foco tras clic.
- Failing: Ninguno en Verify. Browser+critic pendientes.
- Commands: uak red HACK-050 -- npm --prefix web test -- --run src/features/explorar; q Verify; q smoke --affected; q smoke
- Next: Browser real1280x720+390x844 y prueba foco marker/list; critic SHIP; push PR y done REVIEW

## History
- 1795892072 | CLAIMED | dylan-3 | claim; next: Escribir tests rojos de preview sobre mapa y cierre con foco restaurado | Harness: unknown | Model: unknown
- 1795892400 | CLAIMED | dylan-3 | checkpoint; next: Browser real1280x720+390x844 y prueba foco marker/list; critic SHIP; push PR y done REVIEW | Harness: unknown | Model: unknown
