# worklog/WL-1795892072-dylan-3-HACK-050-hack.xIifk5.md · HACK-050

## Live summary
- Done: RED_OK preview no dialog antes código; npm --prefix web test -- --run src/features/explorar:11 passed; npm --prefix web run build exit0; bash .uak/bin/design-lint PASS; bash .uak/bin/smoke --affected exit0 kit-only; bash .uak/bin/smoke PRODUCT_PASS exit0; Playwright real DB1280x720+390x844 PASS marker/list/Escape/outside/focus/CTA/map visible/no overflow; critic SHIP721362a; shots .uak-shots/HACK-050 · red at c5e08a8: exit 1 (no assertion line recognized: the reviewer reads the log)
- Decision: Preview no modal, anclada sobre mapa desktop y bottom sheet móvil. Markers no se recrean al seleccionar para conservar foco; footer separado permanece visible.
- Why: Acceso al perfil sin cobro; skeleton mismo tamaño; fallback listado; cierre Escape/clic fuera/botón devuelve foco tras clic.
- Failing: Ninguno en Verify. Browser+critic pendientes.
- Commands: uak red HACK-050 -- npm --prefix web test -- --run src/features/explorar; q Verify; q smoke --affected; q smoke
- Next: Another agent reviews https://github.com/DylanMCDS/Negosocios/pull/49; run .uak/bin/smoke

## History
- 1795892072 | CLAIMED | dylan-3 | claim; next: Escribir tests rojos de preview sobre mapa y cierre con foco restaurado | Harness: unknown | Model: unknown
- 1795892400 | CLAIMED | dylan-3 | checkpoint; next: Browser real1280x720+390x844 y prueba foco marker/list; critic SHIP; push PR y done REVIEW | Harness: unknown | Model: unknown
- 1795892875 | REVIEW | dylan-3 | done; PR https://github.com/DylanMCDS/Negosocios/pull/49; evidence: RED_OK preview no dialog antes código; npm --prefix web test -- --run src/features/explorar:11 passed; npm --prefix web run build exit0; bash .uak/bin/design-lint PASS; bash .uak/bin/smoke --affected exit0 kit-only; bash .uak/bin/smoke PRODUCT_PASS exit0; Playwright real DB1280x720+390x844 PASS marker/list/Escape/outside/focus/CTA/map visible/no overflow; critic SHIP721362a; shots .uak-shots/HACK-050 · red at c5e08a8: exit 1 (no assertion line recognized: the reviewer reads the log); reviewer: - | Harness: unknown | Model: unknown
