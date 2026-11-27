# HACK-031
ID: HACK-031
State: INTEGRATED
Owner: dylan-5
Branch: feat/hack-031
Worktree: /Users/dylanmartinezcastillo/Documents/Repositorios/Hackathon/Negosocios-wt/hack-031
Worklog: worklog/WL-1795758353-dylan-5-HACK-031-hack.9FRqGc.md
Priority: P1
Paths: app/services/payout_accounts.py, app/routers/payout_accounts.py, app/services/orders.py, app/tests/test_payout_accounts.py, web/src/features/negocio/, web/src/features/pagar/, docs/PEY.md
Depends: HACK-023
Verify: `uv run pytest -q app/tests/test_payout_accounts.py app/tests/test_orders.py && npm --prefix web test -- --run src/features/negocio src/features/pagar && npm --prefix web run build`
Lease-Until: 0
Updated: 1795770539
Task-Base: a61e05a94837ba1c973e316630aa4960e088ecf0
Next: Integrated in main: 24efe692ebfe2fd57c36fd852d8178ca868fd704
PR: https://github.com/DylanMCDS/Negosocios/pull/28
Evidence: pytest full suite green incl. test_payout_accounts.py + test_orders.py; npm test negocio+pagar green; build exit 0; design-lint PASS; design-critic SHIP cba6f9f · red at 0b3dc89: E   assert (200 == 422)
Participants: author dylan-5 (unknown); reviewer dylan-2 (unknown) reject; reviewer dylan-2 (unknown) approve; merged-by dylan-5 (unknown)
Events: 9
Checkpoints: 1
Sessions: 4
Last-Checkpoint: 1795758579
Task-Tip: cba6f9f32f8dec0f0475c15337441c29f80d11b4
Merge-Commit: 24efe692ebfe2fd57c36fd852d8178ca868fd704
Reviewer: dylan-2
Integration-Proof: ancestry
Smoke: full
