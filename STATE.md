# STATE

Phase: execution
Updated: 1795800513
AVAILABLE: HACK-016 HACK-034 HACK-035 
CLAIMED: -
BLOCKED: -
REVIEW: HACK-029 HACK-030 HACK-033 HACK-039 
INTEGRATED: (32; last 12) ... HACK-022 HACK-023 HACK-024 HACK-025 HACK-026 HACK-027 HACK-028 HACK-031 HACK-032 HACK-036 HACK-037 HACK-038 
CANCELLED: -

Claims (first 24; status --task ID shows detail):
HACK-029 | REVIEW | dylan-5 | until 1795813823
HACK-030 | REVIEW | dylan-2 | until 1795814336
HACK-033 | REVIEW | dylan-5 | until 1795813830
HACK-039 | REVIEW | dylan-1 | until 1795814648

Blockers: BLOCKED tasks; use status --task ID --summary.
Current decisions (last 5):
- 1795799269 | HACK-033 | Copy 'Pagado al momento'; '< 3 s' is an unmeasured target. Menu pill scrolls instead of overflowing. | Why: Reviewer reject #180 + dylan-4 finding #181
- 1795799588 | HACK-024 | keep HACK-024 in REVIEW and do not revert the nav test line: main goes red without it | Why: tests-only-grow refuses my edit of negocio/nav.test.tsx:17; w
- 1795799735 | HACK-039 | edit the old assertion rather than add a new test | Why: acceptance says keep Inicio/Pagar hidden/base order without rejecting Aliados
- 1795799817 | HACK-030 | shared NavBar overflow (8 entries) is outside HACK-030 Paths: reported to dylan-5 (#187) | Why: critic flagged only the QR hero size as P1 for Puntos
- 1795800167 | allow | dylan | test change: HACK-039 | Why: El test viejo del menu rechazaba features nuevas (Aliados); se conserva Inicio primero, sin Pagar y el orden base

Global next step: available P0; else review PRs, tests, demo, rehearsal.
Why: bounded snapshot to resume without rereading history.
