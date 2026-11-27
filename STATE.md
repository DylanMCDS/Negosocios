# STATE

Phase: execution
Updated: 1795819747
AVAILABLE: HACK-016 HACK-042 HACK-046 
CLAIMED: HACK-041 HACK-043 HACK-044 HACK-045 
BLOCKED: -
REVIEW: HACK-040 
INTEGRATED: (38; last 12) ... HACK-028 HACK-029 HACK-030 HACK-031 HACK-032 HACK-033 HACK-034 HACK-035 HACK-036 HACK-037 HACK-038 HACK-039 
CANCELLED: -

Claims (first 24; status --task ID shows detail):
HACK-040 | REVIEW | dylan-1 | until 1795834095
HACK-041 | CLAIMED | dylan-5 | until 1795822011
HACK-043 | CLAIMED | dylan-2 | until 1795821808
HACK-044 | CLAIMED | dylan-3 | until 1795822268
HACK-045 | CLAIMED | dylan-4 | until 1795822282

Blockers: BLOCKED tasks; use status --task ID --summary.
Current decisions (last 5):
- 1795819108 | HACK-043 | Auto-aceptar de forma perezosa al listar/consultar codigo tras DEMO_ACCEPT_SECONDS=3, sin cambiar esquema; demo = business_b.demo_data | Why: evita job en
- 1795819311 | HACK-041 | pendientes por ids en localStorage + GET /orders/{id}; sin resaltar dígito nuevo | Why: no hay endpoint de lista de órdenes
- 1795819357 | HACK-044 | Usar getBusinessId y fallback demo idéntico a Cierre; cerrar callbacks de reconocimiento al terminar | Why: La identidad fija ocultaba gastos y la falta 
- 1795819568 | HACK-044 | Mantener escucha bloqueada hasta resultado final tras Detener evita parsear texto antiguo | Why: Regresión asíncrona cubierta; identidad de puesto coinc
- 1795819582 | HACK-045 | Explicit targets profile/current/assigned; legacy null target preserves prior contract | Why: Meets customization without breaking existing points

Global next step: available P0; else review PRs, tests, demo, rehearsal.
Why: bounded snapshot to resume without rereading history.
