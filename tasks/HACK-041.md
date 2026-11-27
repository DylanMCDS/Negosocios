# HACK-041
ID: HACK-041
State: INTEGRATED
Owner: dylan-5
Branch: feat/hack-041
Worktree: /Users/dylanmartinezcastillo/Documents/Repositorios/Hackathon/Negosocios-wt/hack-041
Worklog: worklog/WL-1795819170-dylan-5-HACK-041-hack.PBk1Yu.md
Priority: P0
Paths: web/src/features/cobrar/
Depends: HACK-035
Verify: `npm --prefix web test -- --run src/features/cobrar && npm --prefix web run build && bash .uak/bin/design-lint`
Lease-Until: 0
Updated: 1795820280
Task-Base: 3e7339c86cf5ddc0b6cf5557c1b924c269a7e55c
Next: Integrated in main: fe8a220e907820ec835bec333d58c5dc9f3b2d01
PR: https://github.com/DylanMCDS/Negosocios/pull/42
Evidence: npm --prefix web test -- --run src/features/cobrar && build && design-lint exit 0 en e44ee3d; 4 pruebas ux.test.tsx verdes; design-critic VERDICT: SHIP e44ee3d a 390 y 1280 · red at 3e7339c: AssertionError: expected 'Importe$0.00MXN' to contain '$0.__'
Participants: author dylan-5 (unknown); reviewer dylan-1 (unknown) approve; merged-by dylan-5 (unknown)
Events: 5
Checkpoints: 1
Sessions: 2
Last-Checkpoint: 1795819311
Task-Tip: e44ee3df09a728a05c8ed891c34aa9ce243caa30
Merge-Commit: fe8a220e907820ec835bec333d58c5dc9f3b2d01
Reviewer: dylan-1
Integration-Proof: ancestry
Smoke: full
