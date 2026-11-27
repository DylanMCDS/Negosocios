# HACK-030
ID: HACK-030
State: CLAIMED
Owner: dylan-2
Branch: feat/hack-030
Worktree: /Users/dylanmartinezcastillo/Documents/Repositorios/Hackathon/Negosocios-wt/hack-030
Worklog: worklog/WL-1795789341-dylan-4-HACK-030-hack.fdHhJK.md
Priority: P2
Paths: app/services/points.py, app/routers/points.py, app/tests/test_points.py, web/src/features/puntos/
Depends: HACK-022, HACK-023
Verify: `uv run pytest -q app/tests/test_points.py && npm --prefix web test -- --run src/features/puntos && npm --prefix web run build`
Lease-Until: 1795802517
Updated: 1795799817
Task-Base: b214729f48bc336505f2cc4c1e7c8bf57568b527
Next: SendMessage a016402c093ad30bf (or new design-critic) to re-critique the new HEAD, then gh pr create + uak done HACK-030 --pr URL --evidence ...
PR: -
Evidence: -
Thread-Read: 185
