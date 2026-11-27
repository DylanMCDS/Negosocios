# HACK-009
ID: HACK-009
State: REVIEW
Owner: dylan-1
Branch: feat/hack-009
Worktree: /Users/dylanmartinezcastillo/Documents/Repositorios/Hackathon/Negosocios-wt/hack-009
Worklog: worklog/WL-1795739960-dylan-1-HACK-009-hack.37vGLB.md
Priority: P0
Paths: web/src/features/cobrar/
Depends: HACK-005, HACK-006
Verify: `npm --prefix web test -- --run src/features/cobrar && npm --prefix web run build`
Lease-Until: 1795754562
Updated: 1795740162
Task-Base: eecac9f9d26f1ced1c44c547ce56e5f6a3ef4ac8
Next: Another agent reviews https://github.com/DylanMCDS/Negosocios/pull/11; run .uak/bin/smoke
PR: https://github.com/DylanMCDS/Negosocios/pull/11
Evidence: npm --prefix web test -- --run src/features/cobrar && npm --prefix web run build exit 0 (3 passed); red at 9a5a7be; design-critic SHIP f3c2a1a; shots in .uak-shots/HACK-009 · red at 9a5a7be: exit 1 (no assertion line recognized: the reviewer reads the log)
Participants: author dylan-1 (unknown)
Events: 2
Checkpoints: 0
Sessions: 1
Last-Checkpoint: 0
Task-Tip: f3c2a1a639660d1721624f411e150b6977963fdd
