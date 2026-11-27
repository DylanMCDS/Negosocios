# HACK-040
ID: HACK-040
State: REVIEW
Owner: dylan-1
Branch: feat/hack-040
Worktree: /Users/dylanmartinezcastillo/Documents/Repositorios/Hackathon/Negosocios-wt/hack-040
Worklog: worklog/WL-1795818994-dylan-1-HACK-040-hack.mq62PB.md
Priority: P0
Paths: web/src/lib/business.ts, web/src/lib/business.test.ts, web/src/App.tsx, web/src/features/negocio/, app/tests/test_businesses_multi.py
Depends: HACK-035
Verify: `uv run pytest -q app/tests/test_businesses_multi.py && npm --prefix web test -- --run && npm --prefix web run build && bash .uak/bin/design-lint`
Lease-Until: 1795834095
Updated: 1795819695
Task-Base: 3e7339c86cf5ddc0b6cf5557c1b924c269a7e55c
Next: Another agent reviews https://github.com/DylanMCDS/Negosocios/pull/40; run .uak/bin/smoke
PR: https://github.com/DylanMCDS/Negosocios/pull/40
Evidence: -
Thread-Read: 228
