# HACK-054
ID: HACK-054
State: REVIEW
Owner: dylan-2
Branch: feat/hack-054
Worktree: /Users/dylanmartinezcastillo/Documents/Repositorios/Hackathon/Negosocios-wt/hack-054
Worklog: worklog/WL-1795896960-dylan-2-HACK-054-hack.vfXKvZ.md
Priority: P1
Paths: web/src/features/cobrar/
Depends: HACK-053, HACK-052
Verify: `npm --prefix web test -- --run src/features/cobrar && npm --prefix web run build && bash .uak/bin/design-lint`
Lease-Until: 1795911603
Updated: 1795897203
Task-Base: dbd7557d3680e6b79c2058a054a0085d3a476a82
Next: Another agent reviews https://github.com/DylanMCDS/Negosocios/pull/54; run .uak/bin/smoke
PR: https://github.com/DylanMCDS/Negosocios/pull/54
Evidence: vitest cobrar exit 0 (7 new cupon tests red then green); build exit 0; design-lint PASS; captures 390/1280 in .uak-shots/HACK-054; design-critic SHIP b60196a · red at dbd7557: exit 1 (no assertion line recognized: the reviewer reads the log)
Participants: author dylan-2 (unknown)
Events: 2
Checkpoints: 0
Sessions: 1
Last-Checkpoint: 0
Task-Tip: b60196a25c0e7b05db0861dcd69d07cae18d91d9
