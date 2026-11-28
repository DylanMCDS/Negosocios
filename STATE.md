# STATE

Phase: execution
Updated: 1795895977
AVAILABLE: HACK-054 HACK-055 
CLAIMED: -
BLOCKED: -
REVIEW: HACK-048 HACK-051 HACK-052 HACK-053 
INTEGRATED: (49; last 12) ... HACK-038 HACK-039 HACK-040 HACK-041 HACK-042 HACK-043 HACK-044 HACK-045 HACK-046 HACK-047 HACK-049 HACK-050 
CANCELLED: -

Claims (first 24; status --task ID shows detail):
HACK-048 | REVIEW | dylan-1 | until 1795910169
HACK-051 | REVIEW | dylan-2 | until 1795910280
HACK-052 | REVIEW | dylan-5 | until 1795910377
HACK-053 | REVIEW | dylan-4 | until 1795909310

Blockers: BLOCKED tasks; use status --task ID --summary.
Current decisions (last 5):
- 1795894184 | HACK-053 | Reenviado a rejecter via done --note; no cambio API ni esquema | Why: Evitar que una reserva futura se vincule a un ID de otra compra
- 1795894438 | plan --amend | Dylan-Martinez/dylan-1 | amended: HACK-048 Paths: web/src/App.tsx, web/src/index.css, web/src/lib/ui/, web/src/lib/motion/ → web/src/App.tsx, web/sr
- 1795894778 | HACK-052 | fallo de dividir.test lists_pending_charges por fixture con expires_at vencido; pido allow --tests (msg #299) | Why: filtro de vigentes oculta el fixture 
- 1795894870 | allow | dylan | test change: HACK-052 | Why: dividir.test lists_pending_charges_to_split: expires_at del fixture relativo a la hora actual
- 1795894910 | HACK-053 | Vinculación explícita de reservas legadas nuevas con clave original; lectura histórica conservadora. | Why: Distinguir claves futuras e IDs de compras 

Global next step: available P0; else review PRs, tests, demo, rehearsal.
Why: bounded snapshot to resume without rereading history.
