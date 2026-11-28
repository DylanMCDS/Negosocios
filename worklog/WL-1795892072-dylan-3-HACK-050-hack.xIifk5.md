# worklog/WL-1795892072-dylan-3-HACK-050-hack.xIifk5.md · HACK-050

## Live summary
- Done: REVIEW PR49 SHA721362a;11 pruebas+build+design-lint+smoke producto exit0; browser real DB y critic SHIP
- Decision: Tarjeta no modal; footer CTA siempre visible; marcado estable al cargar reputaciones; atribución arriba a la derecha.
- Why: Preview sobre mapa y hoja móvil mantienen contexto; perfil público sin cobro; foco restaurado al seleccionado.
- Failing: Ninguno en Verify/browser/critic. Límites heredados del shell fuera de Paths.
- Commands: q Verify; q smoke --affected; q smoke; Playwright /tmp/hack050_browser.py; uak done HACK-050 --pr https://github.com/DylanMCDS/Negosocios/pull/49
- Next: Esperar dictamen independiente de PR49 en SHA721362a y corregir reject o merge tras approve según kit

## History
- 1795892072 | CLAIMED | dylan-3 | claim; next: Escribir tests rojos de preview sobre mapa y cierre con foco restaurado | Harness: unknown | Model: unknown
- 1795892400 | CLAIMED | dylan-3 | checkpoint; next: Browser real1280x720+390x844 y prueba foco marker/list; critic SHIP; push PR y done REVIEW | Harness: unknown | Model: unknown
- 1795892875 | REVIEW | dylan-3 | done; PR https://github.com/DylanMCDS/Negosocios/pull/49; evidence: RED_OK preview no dialog antes código; npm --prefix web test -- --run src/features/explorar:11 passed; npm --prefix web run build exit0; bash .uak/bin/design-lint PASS; bash .uak/bin/smoke --affected exit0 kit-only; bash .uak/bin/smoke PRODUCT_PASS exit0; Playwright real DB1280x720+390x844 PASS marker/list/Escape/outside/focus/CTA/map visible/no overflow; critic SHIP721362a; shots .uak-shots/HACK-050 · red at c5e08a8: exit 1 (no assertion line recognized: the reviewer reads the log); reviewer: - | Harness: unknown | Model: unknown
- 1795892892 | REVIEW | dylan-3 | checkpoint; next: Esperar dictamen independiente de PR49 en SHA721362a y corregir reject o merge tras approve según kit | Harness: unknown | Model: unknown
- 1795892897 | REVIEW | dylan-3 | handoff; next: Esperar dictamen independiente de PR49 en SHA721362a y corregir reject o merge tras approve según kit | Harness: unknown | Model: unknown
- 1795893164 | REVIEW | dylan-5 | review; approve; SHA 721362a5b35b0926ed8d76f59122e988577793bb; reviewer dylan-5 | Harness: claude-code | Model: claude-sonnet-5-5
- 1795893216 | REVIEW | dylan-3 | heartbeat; lease until 1795907616 | Harness: unknown | Model: unknown
