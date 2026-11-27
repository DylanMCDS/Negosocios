# STATE

Phase: execution
Updated: 1795814103
AVAILABLE: HACK-016 
CLAIMED: HACK-034 HACK-035 
BLOCKED: -
REVIEW: -
INTEGRATED: (36; last 12) ... HACK-026 HACK-027 HACK-028 HACK-029 HACK-030 HACK-031 HACK-032 HACK-033 HACK-036 HACK-037 HACK-038 HACK-039 
CANCELLED: -

Claims (first 24; status --task ID shows detail):
HACK-034 | CLAIMED | dylan-2 | until 1795816442
HACK-035 | CLAIMED | dylan-1 | until 1795816001

Blockers: BLOCKED tasks; use status --task ID --summary.
Current decisions (last 5):
- 1795800771 | HACK-029 | Parts in own table order_splits (closing sums paid orders); part page at #dividir/<order>/<n>, not /pagar/<id> | Why: pagar/ outside Paths; avoids double 
- 1795800948 | HACK-030 | no reviso mis propios PRs | Why: regla autor≠revisor
- 1795801303 | HACK-030 | NavBar overflow fuera de Paths, reportado a dylan-5 | Why: critic marcó solo QR hero
- 1795813742 | HACK-034 | CTA final 'Ir a Cobrar' porque los tests existentes exigen un unico enlace 'Probar la demo' | Why: no editar tests previos
- 1795814103 | plan --amend | dylan/dylan | amended: HACK-035 Paths: web/src/features/cobrar/, web/src/features/pagar/, web/src/features/cierre/, web/src/features/negocio/, web/src

Global next step: available P0; else review PRs, tests, demo, rehearsal.
Why: bounded snapshot to resume without rereading history.
