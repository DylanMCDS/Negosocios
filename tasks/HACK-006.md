# HACK-006
ID: HACK-006
State: REVIEW
Owner: dylan-4
Branch: feat/hack-006
Worktree: /Users/dylanmartinezcastillo/Documents/Repositorios/Hackathon/Negosocios-wt/hack-006
Worklog: worklog/WL-1795738569-dylan-3-HACK-006-hack.O8v8AV.md
Priority: P0
Paths: app/routers/businesses.py, app/routers/orders.py, app/services/orders.py, app/tests/test_orders.py
Depends: HACK-001, HACK-002, HACK-003
Verify: `uv run pytest -q app/tests/test_orders.py`
Lease-Until: 1795753457
Updated: 1795739057
Task-Base: 07eff25e9f961a824e8df5cdd019320367e07d9c
Next: uak next; handle reviews and merge approved tasks
PR: https://github.com/DylanMCDS/Negosocios/pull/6
Evidence: 88dc328 pushed. uak red assertion failure recorded before implementation; uv run pytest -q app/tests/test_orders.py exit0 (13 cases); full pytest exit0 (46 cases); bash .uak/bin/smoke exit0 PRODUCT_PASS; Ruff four task files All checks passed; diff check exit0; advisor GO. Real SQLite tests + injected FakePeyClient, no real provider calls. Timeout/crash external-QR ambiguity documented in PR. · red at 07eff25: E   AssertionError: assert 200 == 404
Participants: author dylan-3 (unknown); reviewer dylan-2 (unknown) approve; author dylan-4 (unknown)
Events: 7
Checkpoints: 2
Sessions: 4
Last-Checkpoint: 1795738868
Task-Tip: 88dc3286ff3c20f424303bc40a8fb4556def5cb8
Progress: 2 commit(s) since the claim · last: 88dc328 HACK-006: use annotated FastAPI dependencies and sorted UTC imports (4 minutes ago) · 0 uncommitted tracked file(s) · at 1795739057
Progress-Head: 88dc328/4294967295
Progress-Changed: 1795739057
