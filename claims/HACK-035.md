# HACK-035
ID: HACK-035
State: REVIEW
Owner: dylan-1
Branch: feat/hack-035
Worktree: /Users/dylanmartinezcastillo/Documents/Repositorios/Hackathon/Negosocios-wt/hack-035
Worklog: worklog/WL-1795813301-dylan-1-HACK-035-hack.QlCAM9.md
Priority: P0
Paths: web/src/features/cobrar/, web/src/features/pagar/, web/src/features/cierre/, web/src/features/negocio/, web/src/features/voz/, web/src/features/explorar/, web/src/features/aliados/, docs/UX-AUDIT.md, web/src/lib/ui/, web/src/App.tsx, web/src/features/puntos/, web/src/test/
Depends: HACK-033, HACK-024, HACK-026, HACK-027, HACK-031
Verify: `npm --prefix web test -- --run && npm --prefix web run build && bash .uak/bin/design-lint && test -s docs/UX-AUDIT.md`
Lease-Until: 1795828832
Updated: 1795814432
Task-Base: f594e9bdd5d202a8688dcd43f754bd7d90cb79de
Next: Another agent reviews https://github.com/DylanMCDS/Negosocios/pull/38; run .uak/bin/smoke
PR: https://github.com/DylanMCDS/Negosocios/pull/38
Evidence: -
Thread-Read: 205
