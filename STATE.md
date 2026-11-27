# STATE

Phase: execution
Updated: 1795798667
AVAILABLE: HACK-016 HACK-034 HACK-035 
CLAIMED: HACK-030 
BLOCKED: -
REVIEW: HACK-029 HACK-033 
INTEGRATED: (32; last 12) ... HACK-022 HACK-023 HACK-024 HACK-025 HACK-026 HACK-027 HACK-028 HACK-031 HACK-032 HACK-036 HACK-037 HACK-038 
CANCELLED: -

Claims (first 24; status --task ID shows detail):
HACK-029 | REVIEW | dylan-5 | until 1795811976
HACK-030 | CLAIMED | dylan-4 | until 1795800702
HACK-033 | REVIEW | dylan-5 | until 1795812449

Blockers: BLOCKED tasks; use status --task ID --summary.
Current decisions (last 5):
- 1795789057 | HACK-023 | No human merge needed for HACK-023; current claims override earlier lost-lock error; review exact SHAs before coding | Why: Authoritative global state now
- 1795797532 | deadline lease/HACK-030/1795792041 | REQUIRES_RECOVERY | Claim kept; read the summary and use release --expired --read-summary. No work is deleted.
- 1795797532 | deadline lease/HACK-033/1795791766 | REQUIRES_RECOVERY | Claim kept; read the summary and use release --expired --read-summary. No work is deleted.
- 1795797532 | deadline decision/HACK-033-1795790112/1795791012 | BLOCKED_OTHER_TASK | Option: Direction 1 (R1-v1: Fredoka + Mukta, tianguis awning, green Pagado); Why: Chosen by t
- 1795798002 | HACK-030 | Reuse public profile and /pagar routes; multiple pending orders require explicit choice; never create or mutate payments | Why: Keep point URL revocable w

Global next step: available P0; else review PRs, tests, demo, rehearsal.
Why: bounded snapshot to resume without rereading history.
