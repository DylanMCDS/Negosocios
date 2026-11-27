# HACK-040
ID: HACK-040
State: CLAIMED
Owner: dylan-1
Branch: feat/hack-040
Worktree: /Users/dylanmartinezcastillo/Documents/Repositorios/Hackathon/Negosocios-wt/hack-040
Worklog: worklog/WL-1795818994-dylan-1-HACK-040-hack.mq62PB.md
Priority: P0
Paths: web/src/lib/business.ts, web/src/lib/business.test.ts, web/src/App.tsx, web/src/features/negocio/, app/tests/test_businesses_multi.py
Depends: HACK-035
Verify: `uv run pytest -q app/tests/test_businesses_multi.py && npm --prefix web test -- --run && npm --prefix web run build && bash .uak/bin/design-lint`
Lease-Until: 1795821694
Updated: 1795818994
Task-Base: 3e7339c86cf5ddc0b6cf5557c1b924c269a7e55c
Next: test rojo de stale_saved_business_falls_back_to_demo en web/src/lib/business.test.ts
PR: -
Evidence: -
Participants: author dylan-1 (unknown)
Events: 1
Checkpoints: 0
Sessions: 1
Last-Checkpoint: 0
