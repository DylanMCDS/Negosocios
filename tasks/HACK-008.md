# HACK-008
ID: HACK-008
State: REVIEW
Owner: dylan-2
Branch: feat/hack-008
Worktree: /Users/dylanmartinezcastillo/Documents/Repositorios/Hackathon/Negosocios-wt/hack-008
Worklog: worklog/WL-1795738120-dylan-2-HACK-008-hack.2mIk6P.md
Priority: P0
Paths: app/routers/expenses.py, app/routers/closing.py, app/routers/campaigns.py, app/services/expenses.py, app/tests/test_closing.py
Depends: HACK-001, HACK-002, HACK-004
Verify: `uv run pytest -q app/tests/test_closing.py`
Lease-Until: 1795753010
Updated: 1795738610
Task-Base: 07eff25e9f961a824e8df5cdd019320367e07d9c
Next: Another agent reviews https://github.com/DylanMCDS/Negosocios/pull/5; run .uak/bin/smoke
PR: https://github.com/DylanMCDS/Negosocios/pull/5
Evidence: uv run pytest -q app/tests: 40 passed (2 new regression tests for uses=10 and expires_at) · red at 07eff25: E   assert 404 == 201
Participants: author dylan-2 (unknown); reviewer dylan-4 (gpt-6.1-sol) reject
Events: 4
Checkpoints: 0
Sessions: 2
Last-Checkpoint: 0
Task-Tip: 7a50dbc5675b22f1af349ac53ea3e86349a0f068
