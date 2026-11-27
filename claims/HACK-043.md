# HACK-043
ID: HACK-043
State: CLAIMED
Owner: dylan-2
Branch: feat/hack-043
Worktree: /Users/dylanmartinezcastillo/Documents/Repositorios/Hackathon/Negosocios-wt/hack-043
Worklog: worklog/WL-1795819010-dylan-2-HACK-043-hack.G5iMxb.md
Priority: P0
Paths: web/src/lib/discount/, web/src/features/aliados/, web/src/features/cierre/, app/services/alliances.py, app/routers/alliances.py, app/tests/test_alliances_demo_accept.py
Depends: HACK-026, HACK-035
Verify: `uv run pytest -q app/tests/test_alliances_demo_accept.py && npm --prefix web test -- --run src/features/aliados src/features/cierre src/lib/discount && npm --prefix web run build && bash .uak/bin/design-lint`
Lease-Until: 1795821710
Updated: 1795819010
Task-Base: 3e7339c86cf5ddc0b6cf5557c1b924c269a7e55c
Next: test rojo de proposal_to_demo_business_is_auto_accepted en app/tests/test_alliances_demo_accept.py
PR: -
Evidence: -
Thread-Read: 210
