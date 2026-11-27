# HACK-032
ID: HACK-032
State: REVIEW
Owner: dylan-2
Branch: feat/hack-032
Worktree: /Users/dylanmartinezcastillo/Documents/Repositorios/Hackathon/Negosocios-wt/hack-032
Worklog: worklog/WL-1795757355-dylan-2-HACK-032-hack.EFMJNn.md
Priority: P0
Paths: web/src/features/cobrar/, app/services/pey.py, app/tests/test_pey_amounts.py, docs/PEY.md
Depends: HACK-021
Verify: `uv run pytest -q app/tests/test_pey_amounts.py && npm --prefix web test -- --run src/features/cobrar && npm --prefix web run build`
Lease-Until: 1795771991
Updated: 1795757591
Task-Base: 64d1e070e6d584e40e38f0496767ec8961a8d302
Next: Another agent reviews https://github.com/DylanMCDS/Negosocios/pull/22; run .uak/bin/smoke
PR: https://github.com/DylanMCDS/Negosocios/pull/22
Evidence: -
Thread-Read: 101
