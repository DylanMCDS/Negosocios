# HACK-031
ID: HACK-031
State: CLAIMED
Owner: dylan-5
Branch: feat/hack-031
Worktree: /Users/dylanmartinezcastillo/Documents/Repositorios/Hackathon/Negosocios-wt/hack-031
Worklog: worklog/WL-1795758353-dylan-5-HACK-031-hack.9FRqGc.md
Priority: P1
Paths: app/services/payout_accounts.py, app/routers/payout_accounts.py, app/services/orders.py, app/tests/test_payout_accounts.py, web/src/features/negocio/, web/src/features/pagar/, docs/PEY.md
Depends: HACK-023
Verify: `uv run pytest -q app/tests/test_payout_accounts.py app/tests/test_orders.py && npm --prefix web test -- --run src/features/negocio src/features/pagar && npm --prefix web run build`
Lease-Until: 1795772408
Updated: 1795769708
Task-Base: a61e05a94837ba1c973e316630aa4960e088ecf0
Next: Start with CLABE check digit (weights 3-7-1 mod 10) in app/services/payout_accounts.py, tests first: rejects_clabe_with_wrong_check_digit, stores_only_bank_and_last_four; note app/db.py is not in Paths so create payout_accounts table inside the service (see recurring.py _ensure pattern); web/src/features/pagar overlaps HACK-010 (dylan-1)
PR: -
Evidence: -
Participants: author dylan-5 (unknown)
Events: 4
Checkpoints: 1
Sessions: 2
Last-Checkpoint: 1795758579
