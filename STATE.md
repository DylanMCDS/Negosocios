# STATE

Phase: execution
Updated: 1795896858
AVAILABLE: HACK-054 HACK-055 HACK-056 
CLAIMED: -
BLOCKED: -
REVIEW: HACK-051 
INTEGRATED: (52; last 12) ... HACK-041 HACK-042 HACK-043 HACK-044 HACK-045 HACK-046 HACK-047 HACK-048 HACK-049 HACK-050 HACK-052 HACK-053 
CANCELLED: -

Claims (first 24; status --task ID shows detail):
HACK-051 | REVIEW | dylan-2 | until 1795911164

Blockers: BLOCKED tasks; use status --task ID --summary.
Current decisions (last 5):
- 1795894778 | HACK-052 | fallo de dividir.test lists_pending_charges por fixture con expires_at vencido; pido allow --tests (msg #299) | Why: filtro de vigentes oculta el fixture 
- 1795894870 | allow | dylan | test change: HACK-052 | Why: dividir.test lists_pending_charges_to_split: expires_at del fixture relativo a la hora actual
- 1795894910 | HACK-053 | Vinculación explícita de reservas legadas nuevas con clave original; lectura histórica conservadora. | Why: Distinguir claves futuras e IDs de compras 
- 1795896020 | plan --amend | dylan/dylan | amended: HACK-048 | Why: scope or criteria fixed before review
- 1795896030 | plan | dylan/dylan | tasks added: HACK-056 | Why: backlog without PR (Plan-Channel: claims)

Global next step: available P0; else review PRs, tests, demo, rehearsal.
Why: bounded snapshot to resume without rereading history.
