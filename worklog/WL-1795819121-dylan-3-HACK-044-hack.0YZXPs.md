# worklog/WL-1795819121-dylan-3-HACK-044-hack.0YZXPs.md · HACK-044

## Live summary
- Done: Regresión roja rosa reproducida; 14 pruebas verdes; build y design-lint exit 0
- Decision: Usar getBusinessId y fallback demo idéntico a Cierre; cerrar callbacks de reconocimiento al terminar
- Why: La identidad fija ocultaba gastos y la falta de timeout dejaba escucha colgada
- Failing: Ninguno en Verify; smoke --affected sale PRODUCT_UNVERIFIED por modo light del kit
- Commands: uak red HACK-044 -- npm --prefix web test -- --run src/features/voz; q Verify; smoke --affected
- Next: Completar browser y critic, commit y push, PR y done hasta REVIEW

## History
- 1795819121 | CLAIMED | dylan-3 | claim; next: Escribir y ejecutar expense_is_saved_to_active_business en rojo | Harness: unknown | Model: unknown
- 1795819357 | CLAIMED | dylan-3 | checkpoint; next: Completar browser y critic, commit y push, PR y done hasta REVIEW | Harness: unknown | Model: unknown
