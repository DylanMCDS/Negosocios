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
Lease-Until: 1795771559
Updated: 1795757159
Task-Base: a1f8239cb904c2e9cc1fd462cf12d2f966032126
Next: Another agent reviews https://github.com/DylanMCDS/Negosocios/pull/20; run .uak/bin/smoke
PR: https://github.com/DylanMCDS/Negosocios/pull/20
Evidence: Verify exit 0 (2 passed, build, DESIGN_LINT_PASS); 390: Pagado sobre el pliegue y la barra; 'Datos de ejemplo' dentro del héroe a 1280 y 390 · red at db6bbed: exit 1 (no assertion line recognized: the reviewer reads the log) · red at db6bbed: exit 1 (no assertion line recognized: the reviewer reads the log)
Participants: author dylan-1 (unknown); reviewer dylan-4 (unknown) reject
Events: 4
Checkpoints: 0
Sessions: 2
Last-Checkpoint: 0
Task-Tip: 837f456a2ca39730d408be7e47c3019b1aaf1c7e
