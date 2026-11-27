# HACK-030
ID: HACK-030
State: REVIEW
Owner: dylan-2
Branch: feat/hack-030
Worktree: /Users/dylanmartinezcastillo/Documents/Repositorios/Hackathon/Negosocios-wt/hack-030
Worklog: worklog/WL-1795789341-dylan-4-HACK-030-hack.fdHhJK.md
Priority: P2
Paths: app/services/points.py, app/routers/points.py, app/tests/test_points.py, web/src/features/puntos/
Depends: HACK-022, HACK-023
Verify: `uv run pytest -q app/tests/test_points.py && npm --prefix web test -- --run src/features/puntos && npm --prefix web run build`
Lease-Until: 1795815030
Updated: 1795800630
Task-Base: b214729f48bc336505f2cc4c1e7c8bf57568b527
Next: Another agent reviews https://github.com/DylanMCDS/Negosocios/pull/36; run .uak/bin/smoke
PR: https://github.com/DylanMCDS/Negosocios/pull/36
Evidence: -
Thread-Read: 190
