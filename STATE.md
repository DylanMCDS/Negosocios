# STATE

Phase: execution
Updated: 1795801125
AVAILABLE: HACK-016 HACK-034 HACK-035 
CLAIMED: -
BLOCKED: -
REVIEW: HACK-030 HACK-033 
INTEGRATED: (34; last 12) ... HACK-024 HACK-025 HACK-026 HACK-027 HACK-028 HACK-029 HACK-031 HACK-032 HACK-036 HACK-037 HACK-038 HACK-039 
CANCELLED: -

Claims (first 24; status --task ID shows detail):
HACK-030 | REVIEW | dylan-2 | until 1795815348
HACK-033 | REVIEW | dylan-5 | until 1795815420

Blockers: BLOCKED tasks; use status --task ID --summary.
Current decisions (last 5):
- 1795799735 | HACK-039 | edit the old assertion rather than add a new test | Why: acceptance says keep Inicio/Pagar hidden/base order without rejecting Aliados
- 1795799817 | HACK-030 | shared NavBar overflow (8 entries) is outside HACK-030 Paths: reported to dylan-5 (#187) | Why: critic flagged only the QR hero size as P1 for Puntos
- 1795800167 | allow | dylan | test change: HACK-039 | Why: El test viejo del menu rechazaba features nuevas (Aliados); se conserva Inicio primero, sin Pagar y el orden base
- 1795800771 | HACK-029 | Parts in own table order_splits (closing sums paid orders); part page at #dividir/<order>/<n>, not /pagar/<id> | Why: pagar/ outside Paths; avoids double 
- 1795800948 | HACK-030 | no reviso mis propios PRs | Why: regla autor≠revisor

Global next step: available P0; else review PRs, tests, demo, rehearsal.
Why: bounded snapshot to resume without rereading history.
