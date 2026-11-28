# worklog/WL-1795893732-dylan-5-HACK-052-hack.wNX5UT.md · HACK-052

## Live summary
- Done: npm --prefix web test -- --run src/features/dividir src/features/cierre src/features/cobrar src/lib && build && design-lint exit 0 en 56efbae; nueva prueba dividir_drops_order_when_it_expires_while_open; design-critic SHIP b4c93b6 (sin cambio visual desde entonces) · red at d6a3c73: AssertionError: expected undefined to be 409 // Object.is equality
- Decision: fallo de dividir.test lists_pending_charges por fixture con expires_at vencido; pido allow --tests (msg #299)
- Why: filtro de vigentes oculta el fixture de ayer
- Failing: dividir.test lists_pending_charges_to_split
- Commands: npm --prefix web test -- --run src/features/dividir src/features/cierre src/features/cobrar src/lib
- Next: Humano: New file outside Paths: web/src/lib/api.test.ts. Move it into the task's Paths, or a human adds its dir to Additive-Paths in PROJECT.md (new files there need no reservation)

## History
- 1795893732 | CLAIMED | dylan-5 | claim; next: primer test rojo | Harness: unknown | Model: unknown
- 1795894778 | CLAIMED | dylan-5 | checkpoint; next: tras allow: fixture relativo, Verify, critic 390/1280, done | Harness: unknown | Model: unknown
- 1795895053 | REVIEW | dylan-5 | done; PR https://github.com/DylanMCDS/Negosocios/pull/53; evidence: npm --prefix web test -- --run src/features/dividir src/features/cierre src/features/cobrar src/lib && build && design-lint exit 0 en b4c93b6; 5 pruebas con nombre verdes; design-critic VERDICT: SHIP b4c93b6 (mensaje 409 a 390/1280, enlace 44px) · red at d6a3c73: AssertionError: expected undefined to be 409 // Object.is equality; reviewer: - | Harness: unknown | Model: unknown
- 1795895422 | REVIEW | dylan-3 | review; reject; SHA b4c93b6c24128d430f2b79b0a7b6d414e1cfaa1c; reviewer dylan-3 | Harness: unknown | Model: unknown
- 1795895977 | REVIEW | dylan-5 | done; PR https://github.com/DylanMCDS/Negosocios/pull/53; evidence: npm --prefix web test -- --run src/features/dividir src/features/cierre src/features/cobrar src/lib && build && design-lint exit 0 en 56efbae; nueva prueba dividir_drops_order_when_it_expires_while_open; design-critic SHIP b4c93b6 (sin cambio visual desde entonces) · red at d6a3c73: AssertionError: expected undefined to be 409 // Object.is equality; reviewer: - | Harness: unknown | Model: unknown
- 1795896490 | REVIEW | dylan-2 | review; approve; SHA 56efbae10c4decc8cac844b3199c724eaf9a8c6e; reviewer dylan-2 | Harness: unknown | Model: unknown
- 1795896545 | REVIEW | dylan-5 | merge rechazado; New file outside Paths: web/src/lib/api.test.ts. Move it into the task's Paths, or a human adds its dir to Additive-Paths in PROJECT.md (new files there need no reservation) | Harness: unknown | Model: unknown
