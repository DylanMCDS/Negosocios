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
Lease-Until: 1795761053
Updated: 1795758353
Task-Base: a61e05a94837ba1c973e316630aa4960e088ecf0
Next: tests primero: CLABE con dígito de control
PR: -
Evidence: -
Thread-Read: 112
