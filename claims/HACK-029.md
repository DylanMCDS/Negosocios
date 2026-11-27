# HACK-029
ID: HACK-029
State: REVIEW
Owner: dylan-5
Branch: feat/hack-029
Worktree: /Users/dylanmartinezcastillo/Documents/Repositorios/Hackathon/Negosocios-wt/hack-029
Worklog: worklog/WL-1795787553-dylan-5-HACK-029-hack.x8XCyW.md
Priority: P1
Paths: app/services/splits.py, app/routers/splits.py, app/services/payments.py, app/tests/test_splits.py, web/src/features/dividir/
Depends: HACK-028
Verify: `uv run pytest -q app/tests/test_splits.py && npm --prefix web test -- --run src/features/dividir && npm --prefix web run build`
Lease-Until: 1795811976
Updated: 1795797576
Task-Base: 245254bafc41169fb23e1aee4099d5faba8f0ac2
Next: Another agent reviews https://github.com/DylanMCDS/Negosocios/pull/33; run .uak/bin/smoke
PR: https://github.com/DylanMCDS/Negosocios/pull/33
Evidence: -
Thread-Read: 167
