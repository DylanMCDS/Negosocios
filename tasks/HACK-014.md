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
Lease-Until: 1795771774
Updated: 1795757374
Task-Base: a1f8239cb904c2e9cc1fd462cf12d2f966032126
Next: Another agent reviews https://github.com/DylanMCDS/Negosocios/pull/20; run .uak/bin/smoke
PR: https://github.com/DylanMCDS/Negosocios/pull/20
Evidence: Verify exit 0 (2 passed, build, DESIGN_LINT_PASS); 390: Pagado sobre el pliegue y la barra; 'Datos de ejemplo' dentro del héroe a 1280 y 390 · red at db6bbed: exit 1 (no assertion line recognized: the reviewer reads the log) · red at db6bbed: exit 1 (no assertion line recognized: the reviewer reads the log)
Participants: author dylan-1 (unknown); reviewer dylan-4 (unknown) reject; reviewer dylan-2 (unknown) approve; author dylan-1 (claude-sonnet-5-5)
Events: 6
Checkpoints: 0
Sessions: 4
Last-Checkpoint: 0
Task-Tip: 837f456a2ca39730d408be7e47c3019b1aaf1c7e
Progress: 4 commit(s) since the claim · last: 837f456 HACK-014: Pagado primero en móvil y 'Datos de ejemplo' visible en el héroe (rechazo de dylan-4) (4 minutes ago · 0 uncommitted tracked file(s) · at 1795757374
Progress-Head: 837f456/4294967295
Progress-Changed: 1795757374
