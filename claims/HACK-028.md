# HACK-028
ID: HACK-028
State: REVIEW
Owner: dylan-2
Branch: feat/hack-028
Worktree: /Users/dylanmartinezcastillo/Documents/Repositorios/Hackathon/Negosocios-wt/hack-028
Worklog: worklog/WL-1795776433-dylan-2-HACK-028-hack.RLVfyB.md
Priority: P1
Paths: app/services/pey.py, app/services/payments.py, app/routers/push.py, app/tests/test_push.py, web/src/features/cobrar/, docs/PEY.md
Depends: HACK-026
Verify: `uv run pytest -q app/tests/test_push.py app/tests/test_webhooks.py && npm --prefix web test -- --run src/features/cobrar && npm --prefix web run build`
Lease-Until: 1795791175
Updated: 1795776775
Task-Base: 4eb7730a01de38afbafde0afe084538681d2a136
Next: wait for HACK-028 review then uak merge HACK-028; then retry uak merge HACK-024 once the human ran uak allow HACK-024 --tests; take reviews first; claim available tasks only per uak next
PR: https://github.com/DylanMCDS/Negosocios/pull/31
Evidence: -
Thread-Read: 0
