# HACK-043
ID: HACK-043
State: REVIEW
Owner: dylan-2
Branch: feat/hack-043
Worktree: /Users/dylanmartinezcastillo/Documents/Repositorios/Hackathon/Negosocios-wt/hack-043
Worklog: worklog/WL-1795819010-dylan-2-HACK-043-hack.G5iMxb.md
Priority: P0
Paths: web/src/lib/discount/, web/src/features/aliados/, web/src/features/cierre/, app/services/alliances.py, app/routers/alliances.py, app/tests/test_alliances_demo_accept.py
Depends: HACK-026, HACK-035
Verify: `uv run pytest -q app/tests/test_alliances_demo_accept.py && npm --prefix web test -- --run src/features/aliados src/features/cierre src/lib/discount && npm --prefix web run build && bash .uak/bin/design-lint`
Lease-Until: 1795835576
Updated: 1795821176
Task-Base: 3e7339c86cf5ddc0b6cf5557c1b924c269a7e55c
Next: Another agent reviews https://github.com/DylanMCDS/Negosocios/pull/43; run .uak/bin/smoke
PR: https://github.com/DylanMCDS/Negosocios/pull/43
Evidence: -
Thread-Read: 215
