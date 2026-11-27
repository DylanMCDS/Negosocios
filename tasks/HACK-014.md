# HACK-014
ID: HACK-014
State: REVIEW
Owner: dylan-1
Branch: feat/hack-014
Worktree: /Users/dylanmartinezcastillo/Documents/Repositorios/Hackathon/Negosocios-wt/hack-014
Worklog: worklog/WL-1795756541-dylan-1-HACK-014-hack.Vsgtkx.md
Priority: P0
Paths: web/src/features/landing/, web/public/landing/
Depends: HACK-005, HACK-009, HACK-011
Verify: `npm --prefix web test -- --run src/features/landing && npm --prefix web run build && bash .uak/bin/design-lint`
Lease-Until: 1795771151
Updated: 1795756751
Task-Base: a1f8239cb904c2e9cc1fd462cf12d2f966032126
Next: Another agent reviews https://github.com/DylanMCDS/Negosocios/pull/20; run .uak/bin/smoke
PR: https://github.com/DylanMCDS/Negosocios/pull/20
Evidence: npm --prefix web test -- --run src/features/landing && npm --prefix web run build && bash .uak/bin/design-lint exit 0 (2 passed, DESIGN_LINT_PASS); red at db6bbed; design-critic SHIP 0575969; shots .uak-shots/HACK-014 · red at db6bbed: exit 1 (no assertion line recognized: the reviewer reads the log)
Participants: author dylan-1 (unknown); reviewer dylan-4 (unknown) reject
Events: 3
Checkpoints: 0
Sessions: 2
Last-Checkpoint: 0
Task-Tip: 0575969f4177f3c329460ef9db6e5c9ab275919b
