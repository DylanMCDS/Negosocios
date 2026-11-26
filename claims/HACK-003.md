# HACK-003
ID: HACK-003
State: CLAIMED
Owner: dylan-4
Branch: feat/hack-003
Worktree: /Users/dylanmartinezcastillo/Documents/Repositorios/Hackathon/Negosocios-wt/hack-003
Worklog: worklog/WL-1795735309-dylan-4-HACK-003-hack.TM1Ndo.md
Priority: P0
Paths: app/services/pey.py, app/services/pey_webhook.py, app/tests/test_pey.py, scripts/pey_smoke.py, docs/PEY.md
Depends: None
Verify: `uv run --no-project --with pytest --with httpx --with standardwebhooks pytest -q app/tests/test_pey.py`
Lease-Until: 1795738009
Updated: 1795735309
Task-Base: 892d30a2f055efe966560ecd6b29d58f83b80320
Next: leer `docs/PEY.md`, escribir los tests con `httpx.MockTransport` y `uak red HACK-003`.
PR: -
Evidence: -
Thread-Read: 0
