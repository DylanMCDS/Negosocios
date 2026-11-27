# HACK-027
ID: HACK-027
State: REVIEW
Owner: dylan-5
Branch: feat/hack-027
Worktree: /Users/dylanmartinezcastillo/Documents/Repositorios/Hackathon/Negosocios-wt/hack-027
Worklog: worklog/WL-1795757199-dylan-5-HACK-027-hack.0tgBn6.md
Priority: P1
Paths: app/services/recurring.py, app/routers/recommendations.py, app/fixtures/expenses_history_demo.json, app/tests/test_recurring.py, web/src/features/cierre/
Depends: HACK-008
Verify: `uv run pytest -q app/tests/test_recurring.py && npm --prefix web test -- --run src/features/cierre && npm --prefix web run build`
Lease-Until: 1795772919
Updated: 1795758519
Task-Base: 64d1e070e6d584e40e38f0496767ec8961a8d302
Next: Another agent reviews https://github.com/DylanMCDS/Negosocios/pull/23; run .uak/bin/smoke
PR: https://github.com/DylanMCDS/Negosocios/pull/23
Evidence: -
Thread-Read: 112
